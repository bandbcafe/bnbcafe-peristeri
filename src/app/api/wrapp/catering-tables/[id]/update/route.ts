import { NextRequest, NextResponse } from 'next/server';

// PATCH - Update catering table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tableId } = await params;
    const body = await request.json();
    const { name, baseUrl } = body;

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables/${tableId}`;

    console.log('🔄 Updating catering table:', { id: tableId, name });
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

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
    console.log('✅ Catering table updated:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error updating catering table:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
