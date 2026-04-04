import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const params = await context.params;
    const orderId = params.orderId;
    const body = await request.json();
    const { status, estimatedDeliveryTime } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Check if order exists
    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    // Update status if provided
    if (status) {
      updateData.status = status;

      // Add timestamp for status changes
      switch (status) {
        case "accepted":
          updateData.acceptedAt = serverTimestamp();
          break;
        case "preparing":
          updateData.preparingAt = serverTimestamp();
          break;
        case "ready":
          updateData.readyAt = serverTimestamp();
          break;
        case "delivering":
          updateData.deliveringAt = serverTimestamp();
          break;
        case "completed":
          updateData.completedAt = serverTimestamp();
          break;
      }
    }

    // Update estimated delivery time if provided
    if (estimatedDeliveryTime !== undefined) {
      updateData.estimatedDeliveryTime = estimatedDeliveryTime;
    }

    // Update the order
    await updateDoc(orderRef, updateData);

    return NextResponse.json(
      {
        success: true,
        message: "Order updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
