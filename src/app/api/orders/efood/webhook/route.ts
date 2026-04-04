import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// e-food webhook για νέες παραγγελίες
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🍔 e-food webhook received:', body);

    // Validate e-food webhook signature (θα προστεθεί)
    // const signature = request.headers.get('x-efood-signature');
    // if (!validateEfoodSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Transform e-food order to our format
    const order = transformEfoodOrder(body);

    // Save to Firestore
    await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Trigger real-time notification (WebSocket/SSE)
    // await notifyOrderReceived(order);

    console.log('✅ e-food order saved:', order.id);
    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error) {
    console.error('❌ e-food webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process e-food order' },
      { status: 500 }
    );
  }
}

// Transform e-food order format to our internal format
function transformEfoodOrder(efoodOrder: any) {
  return {
    id: `EFOOD-${efoodOrder.order_id}`,
    customerName: efoodOrder.customer?.full_name || 'e-food Customer',
    customerPhone: efoodOrder.customer?.phone || '',
    customerAddress: efoodOrder.delivery_address?.full_address || '',
    items: efoodOrder.order_items?.map((item: any) => ({
      id: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      notes: item.comments,
      variations: item.extras?.map((e: any) => e.name) || []
    })) || [],
    total: parseFloat(efoodOrder.total_amount),
    status: 'pending' as const,
    paymentMethod: efoodOrder.payment_method === 'cash_on_delivery' ? 'cash' : 'card' as const,
    orderDate: new Date(efoodOrder.order_date),
    estimatedTime: efoodOrder.estimated_delivery_minutes,
    notes: efoodOrder.order_comments,
    deliveryType: efoodOrder.order_type === 'delivery' ? 'delivery' : 'pickup' as const,
    source: 'efood' as const,
    externalOrderId: efoodOrder.order_id,
    platformData: {
      efood: {
        orderId: efoodOrder.order_id,
        storeId: efoodOrder.store_id,
        deliveryFee: parseFloat(efoodOrder.delivery_fee || '0')
      }
    }
  };
}

// Validate e-food webhook signature (θα υλοποιηθεί με το documentation)
function validateEfoodSignature(body: any, signature: string | null): boolean {
  // TODO: Implement e-food signature validation
  return true; // Temporary - always valid for development
}
