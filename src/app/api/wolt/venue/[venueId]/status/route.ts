import { NextRequest, NextResponse } from 'next/server';

// GET /api/wolt/venue/[venueId]/status
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
    
    const response = await fetch(`${baseUrl}/venues/${venueId}/status`, {
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
          error: 'Wolt API error',
          status: response.status,
          message: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Wolt venue status error:', error);
    return NextResponse.json(
      { error: 'Failed to get venue status', details: error.message },
      { status: 500 }
    );
  }
}
