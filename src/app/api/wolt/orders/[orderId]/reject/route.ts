import { NextRequest, NextResponse } from 'next/server';

// POST /api/wolt/orders/[orderId]/reject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const body = await request.json();
    
    // Get base URL from environment or use test by default
    const baseUrl = process.env.WOLT_BASE_URL || 'https://pos-integration-service.development.dev.woltapi.com';
    
    const response = await fetch(`${baseUrl}/v1/orders/${orderId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { 
          error: 'Wolt Order API error',
          status: response.status,
          message: errorData 
        },
        { status: response.status }
      );
    }

    // Order rejection typically returns 204 No Content
    if (response.status === 204) {
      return NextResponse.json({ success: true, message: 'Order rejected successfully' });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Wolt order rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject order', details: error.message },
      { status: 500 }
    );
  }
}
