import { NextRequest, NextResponse } from 'next/server';

// DELETE - Delete catering table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { baseUrl } = body;
    const { id: tableId } = await params;

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables/${tableId}`;

    console.log('🗑️ Deleting catering table:', { id: tableId });
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

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
    console.log('✅ Catering table deleted:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error deleting catering table:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
