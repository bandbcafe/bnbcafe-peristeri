import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, api_key, baseUrl } = await req.json();
    
    // Trim whitespace from credentials
    const cleanEmail = email?.trim();
    const cleanApiKey = api_key?.trim();
    
    console.log('🔐 Login attempt:', {
      email: cleanEmail,
      api_key: cleanApiKey ? `${cleanApiKey.substring(0, 8)}...` : 'missing'
    });

    if (!cleanEmail || !cleanApiKey) {
      return NextResponse.json({ error: 'Email and API key are required' }, { status: 400 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('Using Wrapp API URL:', wrappBaseUrl);
    
    const response = await fetch(`${wrappBaseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, api_key: cleanApiKey }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Wrapp login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
