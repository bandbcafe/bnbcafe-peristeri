import { NextRequest, NextResponse } from 'next/server';

// POST - List all catering tables (using POST to send baseUrl in body)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, status, name } = body;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables`;

    console.log('🍽️ Fetching catering tables from WRAPP');
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (name) queryParams.append('name', name);

    const finalUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP catering tables error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch catering tables', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering tables retrieved:', data.length || 0, 'tables');
    
    // Debug: Log first few tables to see what WRAPP returns
    if (data.length > 0) {
      console.log('📋 Sample WRAPP tables:', data.slice(0, 5).map((t: any) => ({
        name: t.name,
        status: t.status,
        total: t.total
      })));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Catering tables API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
