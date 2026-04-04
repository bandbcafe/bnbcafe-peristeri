import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, orderCode, pendingOrderData } = body;

    if (!transactionId || !orderCode) {
      return NextResponse.json(
        { error: "Απαιτούνται transactionId και orderCode" },
        { status: 400 }
      );
    }

    const orderCodeStr = orderCode.toString();

    // Έλεγχος αν υπάρχει ήδη order με αυτό το vivaOrderCode (αποφυγή duplicate)
    const existingSnap = await adminDb
      .collection("orders")
      .where("vivaOrderCode", "==", orderCodeStr)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingOrder = existingSnap.docs[0];
      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        message: "Order already exists",
        alreadyCreated: true,
      });
    }

    // Φόρτωση pending order: πρώτα Firestore, μετά fallback στα data από frontend
    let pendingOrder: any = null;
    try {
      const pendingDoc = await adminDb.collection("pending_orders").doc(orderCodeStr).get();
      if (pendingDoc.exists) {
        pendingOrder = pendingDoc.data();
      }
    } catch (e) {
      console.error("Error reading pending order:", e);
    }

    if (!pendingOrder && pendingOrderData) {
      pendingOrder = {
        customerInfo: pendingOrderData.customerInfo || {},
        cartItems: pendingOrderData.cartItems || [],
        paymentMethod: pendingOrderData.paymentMethod || "creditCard",
        subtotal: Number(pendingOrderData.subtotal) || 0,
        vat: Number(pendingOrderData.vat) || 0,
        deliveryFee: Number(pendingOrderData.deliveryFee) || 0,
        total: Number(pendingOrderData.total) || 0,
        deliveryAddress: pendingOrderData.deliveryAddress || null,
        existingOrderId: pendingOrderData.existingOrderId || null,
      };
    }

    if (!pendingOrder) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε η εκκρεμής παραγγελία" },
        { status: 404 }
      );
    }

    // Check if there's an existing order to update (new acceptance flow)
    const existingOrderId = pendingOrder.existingOrderId || pendingOrderData?.existingOrderId;

    if (existingOrderId) {
      // UPDATE existing order with payment info
      try {
        await adminDb.collection("orders").doc(existingOrderId).update({
          paymentStatus: "paid",
          vivaTransactionId: transactionId,
          vivaOrderCode: orderCodeStr,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark pending order as completed
        try {
          await adminDb.collection("pending_orders").doc(orderCodeStr).update({
            status: "completed",
            orderId: existingOrderId,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (updateError) {
          console.error("Error updating pending order:", updateError);
        }

        return NextResponse.json({
          success: true,
          orderId: existingOrderId,
          message: "Existing order updated with payment info",
        });
      } catch (updateError) {
        console.error("Error updating existing order:", updateError);
        // Fall through to create new order as fallback
      }
    }

    // CREATE new order (legacy flow - no existing order)
    const orderData: any = {
      customerId: pendingOrder.customerInfo?.id || pendingOrder.customerInfo?.customerId || "",
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
      vivaOrderCode: orderCodeStr,
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

    // Mark pending order ως completed
    try {
      await adminDb.collection("pending_orders").doc(orderCodeStr).update({
        status: "completed",
        orderId: docRef.id,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error("Error updating pending order:", updateError);
    }

    return NextResponse.json(
      {
        success: true,
        orderId: docRef.id,
        message: "Order created successfully from payment",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order from payment:", error);
    return NextResponse.json(
      {
        error: "Failed to create order from payment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
