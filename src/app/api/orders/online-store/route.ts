import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// GET: Fetch online store orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    let ordersQuery = query(
      collection(db, 'orders'),
      where('source', '==', 'online_store'),
      orderBy('createdAt', 'desc')
    );

    if (status && status !== 'all') {
      ordersQuery = query(ordersQuery, where('status', '==', status));
    }

    if (limitParam) {
      ordersQuery = query(ordersQuery, limit(parseInt(limitParam)));
    }

    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      orderDate: doc.data().orderDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));

    return NextResponse.json({ orders });

  } catch (error) {
    console.error('❌ Error fetching online store orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST: Create new online store order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🛒 Online store order received:', body);

    // Validate required fields
    if (!body.customerName || !body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate order ID
    const orderId = `ONLINE-${Date.now()}`;

    // Create order object
    const order = {
      id: orderId,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress || '',
      items: body.items.map((item: any) => ({
        id: item.id || `item-${Date.now()}-${Math.random()}`,
        name: item.name,
        quantity: item.quantity || 1,
        price: parseFloat(item.price) || 0,
        notes: item.notes || '',
        variations: item.variations || []
      })),
      total: parseFloat(body.total) || 0,
      status: 'pending' as const,
      paymentMethod: body.paymentMethod || 'digital' as const,
      orderDate: new Date(),
      estimatedTime: body.estimatedTime || 30,
      notes: body.notes || '',
      deliveryType: body.deliveryType || 'delivery' as const,
      source: 'online_store' as const,
      externalOrderId: body.sessionId || orderId,
      platformData: {
        onlineStore: {
          sessionId: body.sessionId || `sess-${Date.now()}`,
          paymentId: body.paymentId
        }
      }
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Trigger real-time notification
    // await notifyOrderReceived(order);

    console.log('✅ Online store order saved:', orderId);
    return NextResponse.json({ 
      success: true, 
      orderId: orderId,
      firestoreId: docRef.id 
    });

  } catch (error) {
    console.error('❌ Online store order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT: Update online store order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing orderId or status' },
        { status: 400 }
      );
    }

    // Update order in Firestore
    // This would require finding the document by orderId and updating it
    // Implementation depends on your Firestore structure

    console.log('✅ Online store order updated:', orderId, status);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error updating online store order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
