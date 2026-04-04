import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, baseUrl } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing table ID' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      );
    }

    console.log('🍽️ Open catering table API call - Auth header:', authHeader.substring(0, 20) + '...');
    
    // Use baseUrl from request or fallback to env
    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // Call WRAPP API to open table
    const url = `${wrappBaseUrl}/catering_tables/open_table`;
    console.log(`🍽️ Opening catering table: ${id}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ id }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ WRAPP open table error:', response.status, data);
      return NextResponse.json(
        { 
          error: 'Failed to open table in WRAPP',
          details: data.errors?.[0]?.title || data.error || 'Unknown error',
          wrappResponse: data
        },
        { status: response.status }
      );
    }

    console.log('✅ WRAPP open table response:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Open table API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
