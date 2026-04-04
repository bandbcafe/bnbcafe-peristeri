import { NextRequest, NextResponse } from 'next/server';

// GET - Show specific catering table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');

    const authHeader = request.headers.get('authorization');
    console.log('🍽️ Get catering table API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const url = `${wrappBaseUrl}/catering_tables/${id}`;

    console.log('🍽️ Fetching catering table details:', id);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP get table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch catering table', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering table retrieved:', data.id, data.name, data.status);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Get catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Update catering table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, baseUrl } = body;

    const authHeader = request.headers.get('authorization');
    console.log('🍽️ Update catering table API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const url = `${wrappBaseUrl}/catering_tables/${id}`;

    console.log('🍽️ Updating catering table:', id, { name });

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP update table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to update catering table', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering table updated:', data.id, data.name);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Update catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete catering table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');

    const authHeader = request.headers.get('authorization');
    console.log('🍽️ Delete catering table API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const url = `${wrappBaseUrl}/catering_tables/${id}`;

    console.log('🍽️ Deleting catering table:', id);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP delete table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to delete catering table', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Catering table deleted:', id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Delete catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
