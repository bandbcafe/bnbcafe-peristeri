import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// POST - Convert Order Note to Receipt (Δελτίο Παραγγελίας -> Απόδειξη Λιανικής)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const { 
      tableId,
      orderNotes, // Array of order note IDs to convert
      paymentMethod, // 'cash', 'card', or 'mixed'
      paymentDetails, // For mixed payments: { cash: amount, card: amount }
      billingBook, // Receipt billing book (11.1)
      priceListId, // Price list ID for classifications
      customerInfo,
      baseUrl
    } = body;
    
    // Load classifications with priority: Price List > Global Settings > Defaults
    let defaultCategory = "category1_1";
    let defaultType = "E3_561_003";
    let categorySource = "hardcoded";
    let typeSource = "hardcoded";
    
    // First, try to load from price list if provided
    if (priceListId) {
      try {
        const priceListDoc = await getDoc(doc(db, 'priceLists', priceListId));
        if (priceListDoc.exists()) {
          const priceListData = priceListDoc.data();
          if (priceListData.myDataClassificationCategory) {
            defaultCategory = priceListData.myDataClassificationCategory;
            categorySource = "price_list";
          }
          if (priceListData.myDataClassificationType) {
            defaultType = priceListData.myDataClassificationType;
            typeSource = "price_list";
          }
          console.log(`📋 Loaded classifications from price list "${priceListData.name}": ${defaultCategory} / ${defaultType}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not load price list classifications:', error);
      }
    }
    
    // Fallback to global WRAPP settings ONLY if not found in price list
    try {
      const wrappDoc = await getDoc(doc(db, "config", "wrapp"));
      if (wrappDoc.exists()) {
        const wrappData = wrappDoc.data();
        if (wrappData.default_settings) {
          // Only use global if not already set by price list
          if (categorySource === "hardcoded" && wrappData.default_settings.defaultClassificationCategory) {
            defaultCategory = wrappData.default_settings.defaultClassificationCategory;
            categorySource = "global";
          }
          if (typeSource === "hardcoded" && wrappData.default_settings.defaultClassificationType) {
            defaultType = wrappData.default_settings.defaultClassificationType;
            typeSource = "global";
          }
          console.log(`📊 Final classification settings: ${defaultCategory} / ${defaultType} (category from: ${categorySource}, type from: ${typeSource})`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load WRAPP settings, using defaults:', error);
    }

    console.log('🧾 Convert to receipt API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    if (!tableId || !orderNotes || orderNotes.length === 0) {
      return NextResponse.json(
        { error: 'tableId and orderNotes are required' },
        { status: 400 }
      );
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // First, get the table details to retrieve all order notes
    const tableUrl = `${wrappBaseUrl}/catering_tables/${tableId}`;
    
    const tableResponse = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!tableResponse.ok) {
      const errorText = await tableResponse.text();
      console.error('❌ Failed to get table details:', tableResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to get table details', details: errorText },
        { status: tableResponse.status }
      );
    }

    const tableData = await tableResponse.json();
    console.log('🍽️ Table data:', {
      id: tableData.id,
      status: tableData.status,
      name: tableData.name,
      total: tableData.total,
      invoices: tableData.invoices,
      error_message: tableData.error_message
    });
    
    // CRITICAL CHECK: Table must be open to create receipts
    if (tableData.status === 'closed') {
      return NextResponse.json(
        { 
          error: 'Cannot create receipt for closed table', 
          details: 'Το τραπέζι είναι κλειστό. Ανοίξτε το ξανά για να δημιουργήσετε νέα παραγγελία.',
          tableStatus: tableData.status
        },
        { status: 422 }
      );
    }

    let allLineItems: any[] = [];
    let totalNetValue = 0;
    let totalVatAmount = 0;
    let totalValue = 0;
    let orderNoteMarks: string[] = [];
    let firestoreData: any = null; // Initialize outside loop for later access

    for (const orderNoteId of orderNotes) {
      try {
        const orderNoteUrl = `${wrappBaseUrl}/invoices/${orderNoteId}`;
        
        const orderNoteResponse = await fetch(orderNoteUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader,
          },
        });

        if (orderNoteResponse.ok) {
          const orderNoteData = await orderNoteResponse.json();
          console.log('📋 Order note data:', orderNoteData);
          
          // Collect myDATA mark for closing the order note
          if (orderNoteData.my_data_mark) {
            orderNoteMarks.push(orderNoteData.my_data_mark);
            console.log('📋 Collected myDATA mark:', orderNoteData.my_data_mark);
          }
          
          // WRAPP API doesn't return line items for order notes (8.6)
          // Always load from Firestore to get the complete line items data
          console.log('📋 Loading line items from Firestore (WRAPP doesn\'t return them for order notes)...');
          let lineItems = [];
          
          try {
            // Dynamic import to avoid build issues
            const { db } = await import('@/lib/firebase');
            const { doc, getDoc } = await import('firebase/firestore');
            
            const orderNoteDoc = await getDoc(doc(db, 'order_notes_data', orderNoteId));
              if (orderNoteDoc.exists()) {
                firestoreData = orderNoteDoc.data(); // Store in outer scope variable
                console.log('✅ Loaded order note data from Firestore');
                
                // Check for applied discount
                const appliedDiscount = firestoreData.appliedDiscount;
                if (appliedDiscount) {
                  console.log('💰 Found discount in order note:', appliedDiscount);
                }
                
                // Convert cart items to line items
                if (firestoreData.cart && firestoreData.cart.length > 0) {
                  // Calculate discount ratio if discount exists
                  let discountRatio = 1;
                  if (appliedDiscount && appliedDiscount.amount) {
                    const originalTotal = firestoreData.cart.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
                    const discountedTotal = originalTotal - appliedDiscount.amount;
                    discountRatio = discountedTotal / originalTotal;
                    console.log(`💰 Applying discount: Original €${originalTotal.toFixed(2)} → Final €${discountedTotal.toFixed(2)} (ratio: ${discountRatio.toFixed(4)})`);
                  }
                  
                  lineItems = firestoreData.cart.map((cartItem: any) => {
                    // VAT rate can be stored as decimal (0.24) or percentage (24)
                    let vatRateDecimal = cartItem.vatRate || 0.24;
                    // If it's already a percentage (>= 1), convert to decimal
                    if (vatRateDecimal >= 1) {
                      vatRateDecimal = vatRateDecimal / 100;
                    }
                    
                    // Apply discount to totalPrice
                    const originalTotalWithVat = cartItem.totalPrice || 0;
                    const totalWithVat = originalTotalWithVat * discountRatio;
                    const quantity = cartItem.quantity || 1;
                    
                    // Calculate net price (without VAT)
                    const netTotal = totalWithVat / (1 + vatRateDecimal);
                    const vatTotal = totalWithVat - netTotal;
                    const unitPriceNet = netTotal / quantity;
                    
                    // Convert quantity to grams/ml for WRAPP API (type 2=kg->g, type 3=L->ml)
                    const quantityType = cartItem.product?.quantityType || 1;
                    const apiQuantity = (quantityType === 2 || quantityType === 3) 
                      ? Math.round(quantity * 1000) // Convert kg/L to g/ml
                      : quantity;
                    
                    return {
                      name: cartItem.product?.name || cartItem.name || 'Προϊόν',
                      description: cartItem.product?.name || cartItem.name || 'Προϊόν',
                      quantity: apiQuantity, // Send as grams/ml for weight/volume products
                      quantity_type: quantityType,
                      unit_price: Math.round(unitPriceNet * 100) / 100, // Round to 2 decimals
                      net_total_price: Math.round(netTotal * 100) / 100,
                      vat_rate: Math.round(vatRateDecimal * 100), // Convert decimal to percentage (0.24 -> 24)
                      vat_total: Math.round(vatTotal * 100) / 100,
                      subtotal: Math.round(totalWithVat * 100) / 100
                    };
                  });
                  console.log(`✅ Converted ${lineItems.length} cart items to line items`);
                  console.log('📋 Sample line item:', lineItems[0]);
                }
              }
            } catch (firestoreError) {
              console.error('❌ Failed to load from Firestore:', firestoreError);
            }
          
          if (lineItems.length > 0) {
            allLineItems = allLineItems.concat(
              lineItems.map((item: any, index: number) => ({
                line_number: allLineItems.length + index + 1,
                name: item.name || item.description || 'Προϊόν',
                description: item.description || item.name || 'Προϊόν',
                quantity: item.quantity || 1,
                quantity_type: item.quantity_type || 1, // Preserve quantity type from line item
                unit_price: parseFloat(item.unit_price || item.net_unit_price || 0),
                net_total_price: parseFloat(item.net_total_price || item.net_value || 0),
                vat_rate: parseFloat(item.vat_rate || 24),
                vat_total: parseFloat(item.vat_total || item.vat_amount || 0),
                subtotal: parseFloat(item.subtotal || item.total_value || 0),
                rec_type: 1,
                classification_category: "category1_2",
                classification_type: "E3_561_003"
              }))
            );
            
            // Update totals from actual line items
            lineItems.forEach((item: any) => {
              totalNetValue += parseFloat(item.net_total_price || 0);
              totalVatAmount += parseFloat(item.vat_total || 0);
              totalValue += parseFloat(item.subtotal || 0);
            });
          } else {
            // Create line item from order note totals if no line items found
            console.log('⚠️ No line items found, creating from order note totals');
            console.log('📋 Available order note fields:', Object.keys(orderNoteData));
            
            // Use table total since order note doesn't have totals
            const tableTotal = parseFloat(tableData.total || 0);
            const netTotal = Math.round((tableTotal / 1.24) * 100) / 100;
            const vatTotal = Math.round((tableTotal - netTotal) * 100) / 100;
            
            console.log(`💰 Using table total: €${tableTotal}, Net: €${netTotal}, VAT: €${vatTotal}`);
            
            allLineItems.push({
              line_number: allLineItems.length + 1,
              name: `Παραγγελία ${orderNoteData.series || 'ΔΠΕ'}-${orderNoteData.num || ''}`,
              description: `Παραγγελία ${orderNoteData.series || 'ΔΠΕ'}-${orderNoteData.num || ''}`,
              quantity: 1,
              quantity_type: 1,
              unit_price: netTotal,
              net_total_price: netTotal,
              vat_rate: 24,
              vat_total: vatTotal,
              subtotal: tableTotal,
              rec_type: 1
            });
            
            // Update totals
            totalNetValue += netTotal;
            totalVatAmount += vatTotal;
            totalValue += tableTotal;
          }
        }
      } catch (error) {
        console.error('❌ Error fetching order note:', orderNoteId, error);
      }
    }

    // Map payment method to WRAPP format (from documentation)
    // 0=Μετρητά, 1=Κάρτα
    console.log(`💳 Payment method received: "${paymentMethod}" (type: ${typeof paymentMethod})`);
    let wrappPaymentMethod = 0; // Default to cash (Μετρητά)
    if (paymentMethod === 'card') {
      wrappPaymentMethod = 1; // Κάρτα
    } else if (paymentMethod === 'mixed') {
      // For mixed payments, use the primary method
      wrappPaymentMethod = paymentDetails?.card > paymentDetails?.cash ? 1 : 0;
    }
    console.log(`💳 WRAPP payment_method_type: ${wrappPaymentMethod} (${wrappPaymentMethod === 0 ? 'Μετρητά' : 'Κάρτα'})`);
    console.log(`💳 Will save to Firestore as paymentMethod: "${paymentMethod}"`);

    // Prepare CLOSING receipt data to close 8.6 invoices
    // According to WRAPP: 8.6 gets "closed" with 11.1 (positive amounts, correlated)
    const receiptData = {
      invoice_type_code: "11.1", // Απόδειξη Λιανικής Πώλησης (from documentation)
      billing_book_id: billingBook,
      payment_method_type: wrappPaymentMethod, // 0=Μετρητά, 1=Κάρτα
      
      // POSITIVE amounts to match the 8.6 totals (zeroing happens via correlation)
      net_total_amount: totalNetValue,
      vat_total_amount: totalVatAmount,
      total_amount: totalValue,
      payable_total_amount: totalValue,
      
      // Counterpart object (from documentation) - use standard retail customer name
      counterpart: {
        name: customerInfo?.name || "ΠΕΛΑΤΗΣ ΛΙΑΝΙΚΗΣ RETAIL CUSTOMER", // Standard for retail receipts
        country_code: customerInfo?.country || "GR", // Required for B2B, optional for retail
        vat: customerInfo?.vatNumber || "", // Optional for retail receipts
        city: customerInfo?.city || "",
        street: customerInfo?.address || "",
        number: "",
        postal_code: customerInfo?.postalCode || "",
        email: customerInfo?.email || ""
      },

      // Invoice lines using exact format from documentation
      invoice_lines: allLineItems.map(item => {
        // Check if this is a plastic tax item by name or description
        const isPlasticTax = item.name?.includes("Φόρος Πλαστικών") || 
                            item.name?.includes("Φόρος Σακούλας") ||
                            item.description?.includes("999.999.998") ||
                            item.description?.includes("999.999.999");
        
        const lineItem: any = {
          line_number: item.line_number,
          name: item.name,
          description: item.description || item.name,
          quantity: item.quantity,
          quantity_type: item.quantity_type || 1, // Preserve original quantity type (1=τεμάχια, 2=κιλά, 3=λίτρα)
          unit_price: item.unit_price,
          net_total_price: item.net_total_price,
          vat_rate: item.vat_rate,
          vat_total: item.vat_total,
          subtotal: item.subtotal,
          // Use settings for regular items, hardcoded for plastic tax
          classification_category: isPlasticTax ? "category1_7" : defaultCategory,
          classification_type: isPlasticTax ? "E3_881_002" : defaultType,
        };
        
        // Log tax items in receipt conversion
        if (isPlasticTax) {
          console.log(`🏷️  TAX ITEM IN RECEIPT:`);
          console.log(`   📋 Name: ${lineItem.name}`);
          console.log(`   💰 Amount: €${item.subtotal?.toFixed(2)} (Net: €${item.net_total_price?.toFixed(2)}, VAT: €${item.vat_total?.toFixed(2)})`);
          console.log(`   📊 Classification: ${lineItem.classification_category} / ${lineItem.classification_type}`);
          console.log(`   ✅ Πεδίο 1.7 (Έσοδα για λ/σμο τρίτων) - E3_881_002`);
        }
        
        return lineItem;
      }),
      
      // Correlated invoices - REQUIRED by WRAPP to close the ΔΠΕ and the table
      // The ΕΑΛΠ automatically closes the ΔΠΕ when this is included
      correlated_invoices: orderNoteMarks,
      
      // Notes referencing the original order notes
      notes: `Απόδειξη Λιανικής για Τραπέζι ${tableData.name} - Αναφορά σε Δελτία Παραγγελίας: ${orderNotes.map((id: string) => orderNoteMarks[orderNotes.indexOf(id)] || id).join(', ')}`
    };

    console.log('🧾 Converting order notes to receipt for table:', tableId);
    console.log('📋 Collected myDATA marks:', orderNoteMarks);
    
    // Create ΕΑΛΠ (receipt) to close the ΔΠΕ
    console.log('📋 Creating ΕΑΛΠ to close ΔΠΕ...');
    
    // Add catering_table_id to receipt data - this will auto-close the table
    const receiptDataWithTable = {
      ...receiptData,
      catering_table_id: tableId // REQUIRED to close catering table
    };
    
    // Receipt creation

    // Create receipt - this will automatically close the order notes
    console.log('🔄 Creating receipt...');
    
    const url = `${wrappBaseUrl}/invoices`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(receiptDataWithTable),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP receipt creation error:', response.status, errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }

      return NextResponse.json(
        { 
          error: 'Failed to create receipt', 
          details: errorDetails,
          receiptData: receiptData // Include for debugging
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`✅ ΕΑΛΠ-${result.num} created - MARK: ${result.my_data_mark}`);
    
    // CRITICAL: Check what WRAPP returns for correlated_invoices
    try {
      const wrappReceiptResponse = await fetch(`${wrappBaseUrl}/invoices/${result.id}`, {
        headers: { 'Authorization': authHeader },
      });
      
      if (wrappReceiptResponse.ok) {
        const wrappReceiptData = await wrappReceiptResponse.json();
        console.log('🔍 WRAPP correlated_invoices:', wrappReceiptData.correlated_invoices || 'NOT SET');
        console.log('✅ ΕΑΛΠ-' + result.num + ' created - MARK: ' + result.my_data_mark);
        console.log('✅ ΕΑΛΠ created with correlated ΔΠΕ marks:', orderNoteMarks);
      }
      
      // Save receipt data to Firestore
      await setDoc(doc(db, 'invoices', result.id), {
        id: result.id,
        num: result.num,
        series: result.series, // Add series field for RestaurantFloorModal query
        invoiceNumber: result.num, // Store only number to avoid duplicate series prefix
        total: totalValue, // For InvoiceHistoryModal compatibility
        timestamp: new Date(), // For InvoiceHistoryModal compatibility
        my_data_mark: result.my_data_mark,
        my_data_uid: result.my_data_uid,
        my_data_qr_url: result.my_data_qr_url,
        wrapp_invoice_url: result.wrapp_invoice_url,
        invoice_type_code: '11.1',
        correlated_invoices: orderNoteMarks,
        catering_table_id: tableId,
        invoice_lines: allLineItems,
        net_total_amount: totalNetValue,
        vat_total_amount: totalVatAmount,
        total_amount: totalValue,
        paymentMethod: paymentMethod,
        created_at: new Date(),
        // Additional fields for InvoiceHistoryModal
        cart: allLineItems, // Use line items as cart data
        businessInfo: {}, // Empty for now
        invoiceData: receiptData, // Store the WRAPP receipt data
        userId: '', // Empty for table receipts
        userName: 'Τραπέζι ' + (tableData?.name || 'Άγνωστο'), // Table name as user
        recipes: [] // Empty for now
      });
      console.log('✅ Receipt data saved to Firestore');
      
      // CRITICAL: Update table to remove closed order notes and add receipt
      // The table should only have the ΕΑΛΠ, not the ΔΠΕ anymore
      try {
        // Find the Firestore table by WRAPP ID
        const tablesRef = collection(db, 'tables');
        const q = query(tablesRef, where('wrappId', '==', tableId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const tableDoc = querySnapshot.docs[0];
          const currentInvoices = tableDoc.data().invoices || [];
          
          // Remove the closed order notes and add the new receipt
          const updatedInvoices = currentInvoices
            .filter((id: string) => !orderNotes.includes(id)) // Remove ΔΠΕ
            .concat(result.id); // Add ΕΑΛΠ
          
          await updateDoc(tableDoc.ref, {
            invoices: updatedInvoices,
            updatedAt: new Date()
          });
          
          console.log('✅ Table invoices updated - removed ΔΠΕ, added ΕΑΛΠ');
          console.log('📋 Updated invoices:', updatedInvoices);
        } else {
          console.warn('⚠️ Table not found in Firestore with wrappId:', tableId);
        }
      } catch (tableUpdateError) {
        console.error('⚠️ Failed to update table invoices:', tableUpdateError);
      }
    } catch (firestoreError) {
      console.error('⚠️ Failed to save receipt to Firestore:', firestoreError);
    }

    return NextResponse.json({
      success: true,
      receipt: {
        ...result,
        correlated_marks: orderNoteMarks // Add correlated marks to response
      },
      receiptNumber: `${result.series}-${result.num}`,
      tableId,
      orderNotes,
      paymentMethod,
      billingBook,
      correlatedMarks: orderNoteMarks, // Also include at top level for easy access
      // Add line items for printing since WRAPP doesn't return them
      invoice_lines: allLineItems,
      cart_data: firestoreData?.cart || [], // Original cart data from Firestore with fallback
      message: `Απόδειξη ${result.series}-${result.num} δημιουργήθηκε επιτυχώς. Τα δελτία παραγγελίας (${orderNotes.length}) μετατράπηκαν και ακυρώθηκαν. Το τραπέζι μπορεί πλέον να κλείσει.`
    });

  } catch (error) {
    console.error('❌ Convert to receipt API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
