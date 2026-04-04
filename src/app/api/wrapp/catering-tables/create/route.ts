import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables`;

    console.log('🍽️ Creating catering table:', name);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP create table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create catering table', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering table created:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Create catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
