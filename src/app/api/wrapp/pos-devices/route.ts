import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, ...deviceData } = body;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    console.log('🔍 POS Device Test API call');
    console.log('📱 Device data:', deviceData);
    console.log('🌐 Base URL:', baseUrl);

    // Forward request to WRAPP API
    const wrappResponse = await fetch(`${baseUrl}/pos_devices`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(deviceData)
    });

    console.log('📱 WRAPP API response status:', wrappResponse.status);
    
    const responseText = await wrappResponse.text();
    console.log('📱 WRAPP API response:', responseText);

    if (!wrappResponse.ok) {
      return NextResponse.json(
        { error: responseText || 'WRAPP API error' }, 
        { status: wrappResponse.status }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      responseData = { message: 'Success', raw_response: responseText };
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ POS devices API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');
    
    if (!baseUrl) {
      return NextResponse.json({ error: 'Missing baseUrl parameter' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    console.log('🔍 Get POS Devices API call');
    console.log('🌐 Base URL:', baseUrl);

    // Forward request to WRAPP API
    const wrappResponse = await fetch(`${baseUrl}/pos_devices`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📱 WRAPP API response status:', wrappResponse.status);
    
    const responseText = await wrappResponse.text();
    console.log('📱 WRAPP API response:', responseText);

    if (!wrappResponse.ok) {
      return NextResponse.json(
        { error: responseText || 'WRAPP API error' }, 
        { status: wrappResponse.status }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      responseData = [];
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Get POS devices API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}
