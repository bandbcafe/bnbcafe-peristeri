import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Wolt webhook για νέες παραγγελίες
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🚚 Wolt webhook received:', body);

    // Validate Wolt webhook signature (θα προστεθεί)
    // const signature = request.headers.get('x-wolt-signature');
    // if (!validateWoltSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Transform Wolt order to our format
    const order = transformWoltOrder(body);

    // Save to Firestore
    await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Trigger real-time notification (WebSocket/SSE)
    // await notifyOrderReceived(order);

    console.log('✅ Wolt order saved:', order.id);
    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error) {
    console.error('❌ Wolt webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process Wolt order' },
      { status: 500 }
    );
  }
}

// Transform Wolt order format to our internal format
function transformWoltOrder(woltOrder: any) {
  return {
    id: `WOLT-${woltOrder.order_id}`,
    customerName: woltOrder.customer?.name || 'Wolt Customer',
    customerPhone: woltOrder.customer?.phone || '',
    customerAddress: woltOrder.delivery_address?.formatted_address || '',
    items: woltOrder.items?.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price / 100, // Wolt uses cents
      notes: item.special_instructions,
      variations: item.modifiers?.map((m: any) => m.name) || []
    })) || [],
    total: woltOrder.total_amount / 100, // Wolt uses cents
    status: 'pending' as const,
    paymentMethod: woltOrder.payment_method === 'cash' ? 'cash' : 'card' as const,
    orderDate: new Date(woltOrder.created_at),
    estimatedTime: woltOrder.estimated_delivery_time,
    notes: woltOrder.special_instructions,
    deliveryType: 'delivery' as const,
    source: 'wolt' as const,
    externalOrderId: woltOrder.order_id,
    platformData: {
      wolt: {
        orderId: woltOrder.order_id,
        restaurantId: woltOrder.restaurant_id,
        deliveryFee: woltOrder.delivery_fee / 100
      }
    }
  };
}

// Validate Wolt webhook signature (θα υλοποιηθεί με το documentation)
function validateWoltSignature(body: any, signature: string | null): boolean {
  // TODO: Implement Wolt signature validation
  return true; // Temporary - always valid for development
}
