import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    console.log('📚 Billing books API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Get base URL from query parameters (passed from client)
    const { searchParams } = new URL(req.url);
    const wrappBaseUrl = searchParams.get('baseUrl') || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    const response = await fetch(`${wrappBaseUrl}/billing_books`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Billing books API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Billing books error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { baseUrl, ...bookData } = body;
    
    console.log('📝 Create billing book API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    console.log('📝 Creating billing book with data:', JSON.stringify(bookData, null, 2));

    const response = await fetch(`${wrappBaseUrl}/billing_books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(bookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Create billing book API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Billing book created successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Create billing book error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
