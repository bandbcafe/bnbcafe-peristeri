import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    console.log('📋 Get defaults API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Get base URL from query parameters
    const { searchParams } = new URL(req.url);
    const wrappBaseUrl = searchParams.get('baseUrl') || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    // Get user defaults from WRAPP API
    const response = await fetch(`${wrappBaseUrl}/user_defaults`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Get defaults API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Defaults retrieved:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get defaults error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { baseUrl, ...defaultsData } = body;
    
    console.log('💾 Save defaults API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    console.log('💾 Saving defaults with data:', JSON.stringify(defaultsData, null, 2));

    const response = await fetch(`${wrappBaseUrl}/user_defaults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(defaultsData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Save defaults API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Defaults saved successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Save defaults error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
