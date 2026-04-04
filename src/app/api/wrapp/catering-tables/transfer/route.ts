import { NextRequest, NextResponse } from 'next/server';

// GET - Transfer catering order notes between tables (per documentation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const current_table = searchParams.get('current_table');
    const target_table = searchParams.get('target_table');
    const marks = searchParams.get('marks');
    const baseUrl = searchParams.get('baseUrl');

    if (!current_table || !target_table) {
      return NextResponse.json({ error: 'Current table and target table IDs are required' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables/transfer`;

    console.log('🔄 Transferring orders between WRAPP tables:', { current_table, target_table, marks });
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const transferData: any = {
      current_table,
      target_table,
    };

    // Add marks if provided
    if (marks && Array.isArray(marks) && marks.length > 0) {
      transferData.marks = marks;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(transferData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP transfer error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to transfer orders', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Orders transferred successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Transfer orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
