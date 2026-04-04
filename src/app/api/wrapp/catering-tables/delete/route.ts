import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');
    const tableId = searchParams.get('tableId');

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    const url = `${wrappBaseUrl}/catering_tables/${tableId}`;

    console.log('🗑️ Deleting WRAPP catering table:', tableId);
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP delete table error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to delete catering table', details: errorText },
        { status: response.status }
      );
    }

    // WRAPP DELETE may return empty response or success message
    let responseData = {};
    try {
      const text = await response.text();
      if (text) {
        responseData = JSON.parse(text);
      }
    } catch (e) {
      // Empty response is OK for DELETE
      console.log('✅ WRAPP table deleted successfully (empty response)');
    }

    console.log('✅ WRAPP table deleted successfully:', tableId);
    return NextResponse.json({ 
      success: true, 
      message: 'Table deleted successfully',
      data: responseData 
    });
  } catch (error) {
    console.error('❌ Delete catering table API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
