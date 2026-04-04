import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { baseUrl, ...orderNoteData } = body;
    console.log('📝 Order Note API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    // Order note creation

    const response = await fetch(`${wrappBaseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(orderNoteData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Wrapp API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Try to parse error as JSON for better error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
        console.error('📋 Detailed error:', errorJson);
      } catch (e) {
        console.error('📋 Raw error text:', errorText);
      }
      
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Order note creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
