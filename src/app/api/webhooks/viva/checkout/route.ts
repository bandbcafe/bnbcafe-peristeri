import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

// POST: Webhook από Viva για Transaction Payment Created (1796) / Failed (1798)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventTypeId = body.EventTypeId;
    const eventData = body.EventData;

    if (!eventData) {
      return NextResponse.json({ success: true });
    }

    const transactionId = eventData.TransactionId;
    const orderCode = eventData.OrderCode?.toString();
    const statusId = eventData.StatusId;
    const amount = eventData.Amount;

    console.log(
      `[Viva Webhook] Event ${eventTypeId}, Transaction: ${transactionId}, OrderCode: ${orderCode}, Status: ${statusId}`
    );

    // Μόνο για επιτυχή πληρωμή (1796 = Transaction Payment Created)
    if (eventTypeId === 1796 && statusId === "F" && orderCode) {
      // Έλεγχος αν υπάρχει ήδη order (αποφυγή duplicate)
      const existingSnap = await adminDb
        .collection("orders")
        .where("vivaOrderCode", "==", orderCode)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        console.log(`[Viva Webhook] Order already exists for orderCode: ${orderCode}`);
        return NextResponse.json({ success: true });
      }

      // Φόρτωση pending order
      const pendingDoc = await adminDb.collection("pending_orders").doc(orderCode).get();
      if (!pendingDoc.exists) {
        console.error(`[Viva Webhook] No pending order found for: ${orderCode}`);
        // Αποθηκεύουμε το webhook event για manual review
        await adminDb.collection("viva_webhook_events").add({
          eventTypeId,
          transactionId,
          orderCode,
          statusId,
          amount,
          eventData,
          processed: false,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ success: true });
      }

      const pendingOrder = pendingDoc.data() || {};

      // Check if there's an existing order to update (new acceptance flow)
      const existingOrderId = pendingOrder.existingOrderId;
      let finalOrderId: string;

      if (existingOrderId) {
        // UPDATE existing order with payment info
        await adminDb.collection("orders").doc(existingOrderId).update({
          paymentStatus: "paid",
          vivaTransactionId: transactionId,
          vivaOrderCode: orderCode,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        finalOrderId = existingOrderId;
        console.log(`[Viva Webhook] Existing order updated: ${existingOrderId}`);
      } else {
        // CREATE new order (legacy flow)
        const orderData: any = {
          customerId: pendingOrder.customerInfo?.id || "",
          customerInfo: {
            firstName: pendingOrder.customerInfo?.firstName || "",
            lastName: pendingOrder.customerInfo?.lastName || "",
            email: pendingOrder.customerInfo?.email || "",
            phone: pendingOrder.customerInfo?.phone || "",
          },
          items: (pendingOrder.cartItems || []).map((item: any) => ({
            id: item.id || "",
            name: item.name || "",
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            totalPrice: Number(item.totalPrice) || 0,
            vatRate: Number(item.vatRate) || 24,
            notes: item.notes || "",
            selectedOptions: item.selectedOptions || [],
          })),
          paymentMethod: pendingOrder.paymentMethod || "creditCard",
          paymentStatus: "paid",
          vivaTransactionId: transactionId,
          vivaOrderCode: orderCode,
          subtotal: Number(pendingOrder.subtotal) || 0,
          vat: Number(pendingOrder.vat) || 0,
          deliveryFee: Number(pendingOrder.deliveryFee) || 0,
          total: Number(pendingOrder.total) || 0,
          status: "pending",
          source: "website",
          viewed: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (pendingOrder.deliveryAddress) {
          orderData.deliveryAddress = {
            street: pendingOrder.deliveryAddress.street || "",
            city: pendingOrder.deliveryAddress.city || "",
            postalCode: pendingOrder.deliveryAddress.postalCode || "",
            floor: pendingOrder.deliveryAddress.floor || "",
            doorbell: pendingOrder.deliveryAddress.doorbell || "",
            notes: pendingOrder.deliveryAddress.notes || "",
          };
        }

        const docRef = await adminDb.collection("orders").add(orderData);
        finalOrderId = docRef.id;
        console.log(`[Viva Webhook] Order created: ${docRef.id}`);
      }

      // Update pending order
      try {
        await adminDb.collection("pending_orders").doc(orderCode).update({
          status: "completed",
          orderId: finalOrderId,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          completedBy: "webhook",
        });
      } catch (e) {
        console.error("[Viva Webhook] Error updating pending order:", e);
      }

      // Save payment record
      try {
        await adminDb.collection("payments").add({
          transactionId,
          orderCode,
          amount: amount || pendingOrder.total,
          currency: "EUR",
          status: "completed",
          customerEmail: pendingOrder.customerInfo?.email || eventData.Email || "",
          customerName:
            `${pendingOrder.customerInfo?.firstName || ""} ${pendingOrder.customerInfo?.lastName || ""}`.trim() ||
            eventData.FullName || "",
          paymentMethod: "viva_wallet",
          cardNumber: eventData.CardNumber || "",
          source: "webhook",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("[Viva Webhook] Error saving payment:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Viva Webhook] Error:", error);
    // Πάντα 200 στη Viva — αλλιώς θα ξανα-στείλει
    return NextResponse.json({ success: true });
  }
}

// GET: Viva Wallet webhook verification
export async function GET(_request: NextRequest) {
  try {
    const settingsDoc = await adminDb.collection("website_settings").doc("main").get();
    if (!settingsDoc.exists) {
      return NextResponse.json({ Key: "" });
    }

    const settings = settingsDoc.data() || {};
    const vivaConfig = settings.paymentSettings?.vivaWallet;

    if (!vivaConfig?.merchantId || !vivaConfig?.apiKey) {
      return NextResponse.json({ Key: "" });
    }

    const baseUrl = vivaConfig.testMode
      ? "https://demo-api.vivapayments.com"
      : "https://api.vivapayments.com";

    const credentials = Buffer.from(
      `${vivaConfig.merchantId}:${vivaConfig.apiKey}`
    ).toString("base64");

    const response = await fetch(
      `${baseUrl}/api/messages/config/token`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ Key: data.Key });
    }

    return NextResponse.json({ Key: "" });
  } catch (error) {
    console.error("[Viva Webhook] Verification error:", error);
    return NextResponse.json({ Key: "" });
  }
}
