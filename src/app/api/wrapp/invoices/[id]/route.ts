import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    
    // Get base URL from query params or use default
    const baseUrl = request.nextUrl.searchParams.get('baseUrl') || 
                   process.env.WRAPP_API_URL || 
                   'https://staging.wrapp.ai/api/v1';


    // Call WRAPP API to get full invoice details
    const response = await fetch(`${baseUrl}/invoices/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ WRAPP API error: ${errorText}`);
      return NextResponse.json(
        { error: `WRAPP API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    let invoiceData = await response.json();
    
    // CRITICAL: Load correlated_invoices AND line items from Firestore if this is a receipt
    // WRAPP API doesn't return these fields, but we need them for UI
    if (invoiceData.series === 'ΕΑΛΠ') {
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        
        const firestoreDoc = await getDoc(doc(db, 'invoices', id));
        if (firestoreDoc.exists()) {
          const firestoreData = firestoreDoc.data();
          
          // Load correlated invoices
          if (firestoreData.correlated_invoices) {
            invoiceData.correlated_invoices = firestoreData.correlated_invoices;
          }
          
          // Load line items and totals
          if (firestoreData.invoice_lines && firestoreData.invoice_lines.length > 0) {
            invoiceData.invoice_lines = firestoreData.invoice_lines;
            invoiceData.net_total_amount = firestoreData.net_total_amount || 0;
            invoiceData.vat_total_amount = firestoreData.vat_total_amount || 0;
            invoiceData.total_amount = firestoreData.total_amount || 0;
          }
        }
      } catch (error) {
        console.error('⚠️ Failed to load from Firestore:', error);
      }
    }
    
    // If WRAPP doesn't return line items, try to load from Firestore
    if (!invoiceData.invoice_lines && !invoiceData.line_items && !invoiceData.total_amount) {
      try {
        // Dynamic import to avoid build issues
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        
        // For ΕΑΛΠ (receipts), try to find the original ΔΠΕ data from correlated invoices
        if (invoiceData.series === 'ΕΑΛΠ') {
          
          // Try to find correlated invoices in the same table
          // Get table data to find all invoices
          const tableResponse = await fetch(`${baseUrl}/catering_tables/${invoiceData.catering_table_id}`, {
            method: 'GET',
            headers: {
              'Authorization': request.headers.get('Authorization') || '',
              'Content-Type': 'application/json',
            },
          });
          
          if (tableResponse.ok) {
            const tableData = await tableResponse.json();
            
            // Find ΔΠΕ invoices in the same table
            for (const invoiceId of tableData.invoices || []) {
              if (invoiceId !== id) { // Skip current invoice
                try {
                  const otherInvoiceResponse = await fetch(`${baseUrl}/invoices/${invoiceId}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': request.headers.get('Authorization') || '',
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (otherInvoiceResponse.ok) {
                    const otherInvoiceData = await otherInvoiceResponse.json();
                    if (otherInvoiceData.series === 'ΔΠΕ') {
                      
                      // Try to load this ΔΠΕ's data from Firestore
                      const orderNoteDoc = await getDoc(doc(db, 'order_notes_data', invoiceId));
                      if (orderNoteDoc.exists()) {
                        const orderNoteData = orderNoteDoc.data();
                        
                        // Use the ΔΠΕ's line items for the ΕΑΛΠ
                        invoiceData = {
                          ...invoiceData,
                          invoice_lines: orderNoteData.cart_items || [],
                          total_amount: orderNoteData.total || 0,
                          net_total_amount: orderNoteData.net_total || 0,
                          vat_total_amount: orderNoteData.vat_total || 0,
                        };
                        break; // Found data, stop looking
                      }
                    }
                  }
                } catch (error) {
                  console.log(`⚠️ Error checking invoice ${invoiceId}:`, error);
                }
              }
            }
          }
        }
        
        const orderNoteDoc = await getDoc(doc(db, 'order_notes_data', id));
        if (orderNoteDoc.exists()) {
          const orderNoteData = orderNoteDoc.data();
          
          // Add cart items as invoice_lines and calculate totals
          if (orderNoteData.cart && orderNoteData.cart.length > 0) {
            // Convert cart items to proper invoice line format
            invoiceData.invoice_lines = orderNoteData.cart.map((cartItem: any, index: number) => {
              const vatRatePercentage = cartItem.vatRate || 24;
              const vatRateDecimal = vatRatePercentage / 100;
              const totalWithVat = cartItem.totalPrice || 0;
              const quantity = cartItem.quantity || 1;
              
              const netTotal = totalWithVat / (1 + vatRateDecimal);
              const vatTotal = totalWithVat - netTotal;
              const unitPriceNet = netTotal / quantity;
              
              return {
                line_number: index + 1,
                name: cartItem.product?.name || cartItem.name || 'Προϊόν',
                description: cartItem.product?.name || cartItem.name || 'Προϊόν',
                quantity: quantity,
                unit_price: Math.round(unitPriceNet * 100) / 100,
                net_total_price: Math.round(netTotal * 100) / 100,
                vat_rate: vatRatePercentage,
                vat_total: Math.round(vatTotal * 100) / 100,
                subtotal: Math.round(totalWithVat * 100) / 100
              };
            });
            
            invoiceData.total_amount = orderNoteData.total || 0;
            
            // Calculate totals from converted line items
            const net = invoiceData.invoice_lines.reduce((sum: number, item: any) => {
              return sum + (item.net_total_price || 0);
            }, 0);
            
            const vat = invoiceData.invoice_lines.reduce((sum: number, item: any) => {
              return sum + (item.vat_total || 0);
            }, 0);
            
            invoiceData.net_total_amount = Math.round(net * 100) / 100;
            invoiceData.vat_total_amount = Math.round(vat * 100) / 100;
          }
        }
      } catch (firestoreError) {
        console.error('❌ Failed to load from Firestore:', firestoreError);
      }
    }
    
    console.log('✅ Full invoice data retrieved successfully');
    
    return NextResponse.json(invoiceData);

  } catch (error) {
    console.error('❌ Error fetching invoice details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
