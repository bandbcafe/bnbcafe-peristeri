import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/wolt/venue/[venueId]/online
export async function PATCH(
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
    
    const response = await fetch(`${baseUrl}/venues/${venueId}/online`, {
      method: 'PATCH',
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
          error: 'Wolt API error',
          status: response.status,
          message: errorData 
        },
        { status: response.status }
      );
    }

    // PATCH requests typically return 204 No Content
    if (response.status === 204) {
      return NextResponse.json({ success: true });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Wolt venue online status error:', error);
    return NextResponse.json(
      { error: 'Failed to update venue online status', details: error.message },
      { status: 500 }
    );
  }
}
