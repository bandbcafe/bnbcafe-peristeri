import { NextRequest, NextResponse } from 'next/server';

// POST /api/wolt/menu/[venueId] - Create or update menu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
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
    
    const response = await fetch(`${baseUrl}/v1/restaurants/${venueId}/menu`, {
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
          error: 'Wolt Menu API error',
          status: response.status,
          message: errorData 
        },
        { status: response.status }
      );
    }

    // Menu creation typically returns 202 Accepted
    if (response.status === 202) {
      return NextResponse.json({ success: true, message: 'Menu update accepted' });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Wolt menu creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update menu', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/wolt/menu/[venueId] - Get menu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Get base URL from environment or use test by default
    const baseUrl = process.env.WOLT_BASE_URL || 'https://pos-integration-service.development.dev.woltapi.com';
    
    const response = await fetch(`${baseUrl}/v2/venues/${venueId}/menu`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { 
          error: 'Wolt Menu API error',
          status: response.status,
          message: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Wolt menu retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve menu', details: error.message },
      { status: 500 }
    );
  }
}
