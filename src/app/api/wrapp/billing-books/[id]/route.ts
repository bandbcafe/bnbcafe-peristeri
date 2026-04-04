import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { baseUrl, ...updateData } = body;
    
    console.log('📝 Update billing book API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    console.log('📝 Updating billing book with data:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${wrappBaseUrl}/billing_books/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update billing book API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Billing book updated successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update billing book error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { baseUrl } = body;
    
    console.log('🗑️ Delete billing book API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);
    
    console.log('🗑️ Deleting billing book ID:', id);

    const response = await fetch(`${wrappBaseUrl}/billing_books/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Delete billing book API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    console.log('✅ Billing book deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete billing book error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
