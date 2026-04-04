import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    console.log('📋 VAT exemptions API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    const response = await fetch(`${wrappBaseUrl}/vat_exemptions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ VAT exemptions API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ VAT exemptions retrieved:', data.length || 0, 'exemptions');
    return NextResponse.json(data);
  } catch (error) {
    console.error('VAT exemptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
