import { NextRequest, NextResponse } from 'next/server';

// POST - Close catering table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse body for baseUrl
    let baseUrl = process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    try {
      const body = await request.json();
      if (body.baseUrl) {
        baseUrl = body.baseUrl;
      }
    } catch (e) {
      // No body or invalid JSON - use default baseUrl
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';

    // Get current table status
    const showUrl = `${wrappBaseUrl}/catering_tables/${id}`;
    
    const showResponse = await fetch(showUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!showResponse.ok) {
      const errorText = await showResponse.text();
      return NextResponse.json(
        { error: 'Failed to get table status', details: errorText },
        { status: showResponse.status }
      );
    }

    const showData = await showResponse.json();

    // Close the table
    const closeUrl = `${wrappBaseUrl}/catering_tables/${id}/close`;
    
    const closeResponse = await fetch(closeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!closeResponse.ok) {
      const errorText = await closeResponse.text();
      return NextResponse.json(
        { error: 'Failed to close table', details: errorText },
        { status: closeResponse.status }
      );
    }

    const closeData = await closeResponse.json();

    // Check if WRAPP returned errors (even with 200 status)
    if (closeData.errors && closeData.errors.length > 0) {
      const errorMessages = closeData.errors.map((e: any) => e.title || e.message).join(', ');
      return NextResponse.json(
        { error: 'Failed to close table', details: errorMessages, wrappErrors: closeData.errors },
        { status: 422 }
      );
    }

    // Get final table status
    const finalShowResponse = await fetch(`${wrappBaseUrl}/catering_tables/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (finalShowResponse.ok) {
      const finalShowData = await finalShowResponse.json();
      
      // IMPORTANT: WRAPP API deletes tables on close, so we must recreate it
      // This maintains the table layout and position for the restaurant
      
      try {
        // Get the original table name from Firestore before recreation
        const { db } = await import('@/lib/firebase');
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        
        // Find the table in Firestore by WRAPP ID
        const tablesQuery = query(collection(db, 'tables'), where('wrappId', '==', id));
        const tablesSnapshot = await getDocs(tablesQuery);
        
        if (!tablesSnapshot.empty) {
          const tableDoc = tablesSnapshot.docs[0];
          const tableData = tableDoc.data();
          const originalTableName = tableData.name || 'Unknown';
          
          // Recreate the table with the same name
          const recreateUrl = `${wrappBaseUrl}/catering_tables`;
          const recreateResponse = await fetch(recreateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              name: originalTableName
            }),
          });

          if (recreateResponse.ok) {
            const recreatedTable = await recreateResponse.json();
            // Update Firestore with new WRAPP ID but keep all layout properties
            const { updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'tables', tableDoc.id), {
              wrappId: recreatedTable.id,
              status: 'available', // Ensure it's available for new orders
              total: 0,
              invoices: [],
              updatedAt: new Date(),
              wrappData: {
                ...tableData.wrappData,
                lastSyncedAt: new Date(),
                wrappStatus: 'available',
              }
            });
            
            // Return success with recreation info
            return NextResponse.json({
              success: true,
              message: 'Table closed and recreated successfully',
              status: finalShowData.status,
              recreated: true,
              newWrappId: recreatedTable.id
            });
            
          } else {
            const recreateError = await recreateResponse.text();
            // Still return success for close, but warn about recreation failure
            return NextResponse.json({
              success: true,
              message: 'Table closed but failed to recreate',
              status: finalShowData.status,
              recreated: false,
              warning: 'Table closed but failed to recreate. Please refresh or use \'Καθαρισμός\' to restore layout.'
            });
          }
        } else {
          // Try to recreate with a generic name
          const recreateUrl = `${wrappBaseUrl}/catering_tables`;
          const recreateResponse = await fetch(recreateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              name: 'Table' // Generic fallback name
            }),
          });

          if (recreateResponse.ok) {
            const recreatedTable = await recreateResponse.json();
            // Return success with recreation info
            return NextResponse.json({
              success: true,
              message: 'Table closed and recreated successfully',
              status: finalShowData.status,
              recreated: true,
              newWrappId: recreatedTable.id,
              warning: 'Table recreated with generic name. Please update in settings.'
            });
          }
        }
        
      } catch (recreateError) {
        // Still return success for close operation
        return NextResponse.json({
          success: true,
          message: 'Table closed but automatic recreation failed',
          status: finalShowData.status,
          recreated: false,
          warning: 'Table closed but automatic recreation failed. Please refresh the page.'
        });
      }
      
      // Return success without recreation
      return NextResponse.json({
        success: true,
        message: 'Table closed successfully',
        status: finalShowData.status,
        recreated: false
      });
    } else {
      // If final SHOW fails, return the close response
      return NextResponse.json(closeData);
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
          
 