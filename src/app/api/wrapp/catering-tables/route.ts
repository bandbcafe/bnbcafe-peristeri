import { NextRequest, NextResponse } from 'next/server';

// GET - List all catering tables
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const name = searchParams.get('name');
    const baseUrl = searchParams.get('baseUrl');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🍽️ Catering tables API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const url = `${wrappBaseUrl}/catering_tables`;
    console.log('🍽️ Fetching catering tables from:', url);

    // Build request body with query parameters as per documentation
    const requestBody: any = {};
    if (status) requestBody.status = status;
    if (name) requestBody.name = name;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      ...(Object.keys(requestBody).length > 0 && { body: JSON.stringify(requestBody) })
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

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Catering tables API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new catering table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseUrl } = body;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🍽️ Create catering table API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const url = `${wrappBaseUrl}/catering_tables`;

    console.log('🍽️ Creating catering table:', { name });

    const requestBody: any = {};
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
      console.error('❌ WRAPP create table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create catering table', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering table created:', data.id, data.name);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Create catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
