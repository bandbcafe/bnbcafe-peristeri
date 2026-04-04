import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables`;

    console.log('🍽️ Listing all WRAPP catering tables from:', url);

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
      console.error('❌ WRAPP list tables error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to list catering tables', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ WRAPP tables retrieved:', data.length, 'tables');
    
    // Log each table for debugging
    if (data && data.length > 0) {
      console.log('📋 All WRAPP tables:');
      data.forEach((table: any, index: number) => {
        console.log(`  Table ${index + 1}:`, {
          id: table.id,
          name: table.name,
          status: table.status,
          total: table.total,
          invoices: table.invoices?.length || 0
        });
      });
    } else {
      console.log('📋 No tables found in WRAPP');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ List catering tables API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
