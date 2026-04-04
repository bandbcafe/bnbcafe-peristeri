import { NextRequest, NextResponse } from 'next/server';

// POST - Open catering table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, baseUrl } = body;

    if (!id && !name) {
      return NextResponse.json(
        { error: 'id or name is required' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables/open_table`;

    console.log('🍽️ Opening catering table:', { id, name });
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // Prepare request body according to WRAPP API documentation
    const requestBody: any = {};
    if (id) requestBody.id = id;
    if (name) requestBody.name = name;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP open table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to open catering table', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering table opened:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Open catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
