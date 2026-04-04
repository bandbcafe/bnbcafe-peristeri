import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerInfo,
      cartItems,
      paymentMethod,
      subtotal,
      vat,
      deliveryFee,
      total,
      deliveryAddress,
    } = body;

    console.log("[Order Create] paymentMethod:", paymentMethod, "paymentStatus from body:", body.paymentStatus);

    // Validation
    if (!customerInfo || !cartItems || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    // Create order object - Remove undefined values for Firestore
    const orderData: any = {
      // Customer ID for tracking
      customerId: customerInfo.id || customerInfo.customerId || "",
      
      // Customer Information
      customerInfo: {
        firstName: customerInfo.firstName || "",
        lastName: customerInfo.lastName || "",
        email: customerInfo.email || "",
        phone: customerInfo.phone || "",
      },

      // Order Items
      items: cartItems.map((item: any) => ({
        id: item.id || "",
        name: item.name || "",
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        totalPrice: Number(item.totalPrice) || 0,
        vatRate: Number(item.vatRate) || 24,
        notes: item.notes || "",
        selectedOptions: item.selectedOptions || [],
      })),

      // Payment Information
      paymentMethod: paymentMethod || "cashOnDelivery",
      paymentStatus: body.paymentStatus || ((paymentMethod === "cashOnDelivery" || paymentMethod === "cash_on_delivery" || paymentMethod === "cash") ? "pending" : "paid"),

      // Pricing
      subtotal: Number(subtotal) || 0,
      vat: Number(vat) || 0,
      deliveryFee: Number(deliveryFee) || 0,
      total: Number(total) || 0,

      // Order Status
      status: "pending", // pending, accepted, preparing, ready, delivering, completed, cancelled

      // Metadata
      source: "website",
      viewed: false, // For notification system
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add delivery address only if it exists (avoid undefined)
    if (deliveryAddress) {
      orderData.deliveryAddress = {
        street: deliveryAddress.street || "",
        city: deliveryAddress.city || "",
        postalCode: deliveryAddress.postalCode || "",
        floor: deliveryAddress.floor || "",
        doorbell: deliveryAddress.doorbell || "",
        notes: deliveryAddress.notes || "",
      };
    }

    // Save to Firestore
    const ordersRef = collection(db, "orders");
    const docRef = await addDoc(ordersRef, orderData);

    return NextResponse.json(
      {
        success: true,
        orderId: docRef.id,
        message: "Order created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: "Failed to create order",
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    );
  }
}
