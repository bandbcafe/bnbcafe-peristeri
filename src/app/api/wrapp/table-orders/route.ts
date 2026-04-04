import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('tableId');
    const baseUrl = searchParams.get('baseUrl');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    if (!tableId) {
      return NextResponse.json({ error: 'tableId parameter required' }, { status: 400 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // Get catering table details which includes invoices using SHOW endpoint
    const url = `${wrappBaseUrl}/catering_tables/${tableId}`;
    
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
      console.error('❌ Wrapp API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const tableData = await response.json();
    
    // Extract invoices from table data (these are invoice IDs)
    const invoices = tableData.invoices || [];
    
    // Parse total as number (WRAPP returns it as string)
    const totalAmount = tableData.total ? parseFloat(tableData.total) : 0;
    
    // Return both invoices and table metadata for UI updates
    return NextResponse.json({
      invoices: invoices,
      tableStatus: tableData.status,
      tableTotal: totalAmount,
      tableName: tableData.name,
      tableId: tableData.id,
      invoiceCount: invoices.length
    });
  } catch (error) {
    console.error('Table orders fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST method to receive baseUrl in body
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { tableId, baseUrl } = body;
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    if (!tableId) {
      return NextResponse.json({ error: 'tableId parameter required' }, { status: 400 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // Get catering table details which includes invoices using SHOW endpoint
    const url = `${wrappBaseUrl}/catering_tables/${tableId}`;
    
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
      console.error('❌ Wrapp API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const tableData = await response.json();
    
    // Extract invoices from table data (these are invoice IDs)
    const invoices = tableData.invoices || [];
    
    // Parse total as number (WRAPP returns it as string)
    const totalAmount = tableData.total ? parseFloat(tableData.total) : 0;
    
    // Return both invoices and table metadata for UI updates
    return NextResponse.json({
      invoices: invoices,
      tableStatus: tableData.status,
      tableTotal: totalAmount,
      tableName: tableData.name,
      tableId: tableData.id,
      invoiceCount: invoices.length
    });
  } catch (error) {
    console.error('Table orders fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
