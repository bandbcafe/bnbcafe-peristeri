import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    console.log('🔍 VAT search API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const vat = searchParams.get('vat');
    const countryCode = searchParams.get('country_code') || 'EL';
    const baseUrl = searchParams.get('baseUrl');

    if (!vat) {
      return NextResponse.json({ error: 'VAT number is required' }, { status: 400 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    const response = await fetch(`${wrappBaseUrl}/vat_search?vat=${vat}&country_code=${countryCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ VAT search API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ VAT search successful for:', vat);
    return NextResponse.json(data);
  } catch (error) {
    console.error('VAT search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
