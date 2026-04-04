import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { baseUrl, cart, billingBook, tableId, customerInfo } = body;
    console.log('📝 Order Note API call - Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const wrappBaseUrl = baseUrl || process.env.WRAPP_API_URL || 'https://staging.wrapp.ai/api/v1';
    console.log('🌐 Using Wrapp API URL:', wrappBaseUrl);

    // Calculate totals using same logic as working invoice API
    const invoiceLines = cart.map((item: any, index: number) => {
      const vatRate = item.vatRate || 24; // VAT rate as percentage (e.g., 24 for 24%)
      const vatRateDecimal = vatRate / 100; // Convert to decimal for calculations (e.g., 24 -> 0.24)
      const grossAmount = Math.round(item.totalPrice * 100) / 100; // Round to 2 decimals
      const netAmount = Math.round((grossAmount / (1 + vatRateDecimal)) * 100) / 100; // Round to 2 decimals
      const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100; // Round to 2 decimals
      const unitNetPrice = Math.round((item.unitPrice / (1 + vatRateDecimal)) * 100) / 100; // Round to 2 decimals
      
      console.log(`Order note line ${index + 1}: ${item.product.name}, VAT Rate: ${vatRate}%, Net: €${netAmount.toFixed(2)}, VAT: €${vatAmount.toFixed(2)}, Gross: €${grossAmount.toFixed(2)}`);
      
      // Check if this is a plastic tax item (SKU 999.999.998 or 999.999.999)
      const isPlasticTax = item.product.sku === "999.999.998" || item.product.sku === "999.999.999";
      
      const lineItem = {
        line_number: index + 1,
        name: item.product.name,
        description: item.product.name,
        quantity: item.quantity,
        quantity_type: 1, // 1 = pieces
        unit_price: unitNetPrice,
        net_total_price: netAmount,
        vat_rate: vatRate, // VAT rate as percentage (e.g., 24)
        vat_total: vatAmount,
        subtotal: grossAmount,
        // Plastic tax items use E3_881_002, others use category1_95
        classification_category: isPlasticTax ? "category1_17" : "category1_95",
        classification_type: isPlasticTax ? "E3_881_002" : "_",
        // Add recipe information if available
        ...(item.selectedRecipes && item.selectedRecipes.length > 0 && {
          notes: item.selectedRecipes.map((recipe: any) => 
            Object.entries(recipe.selectedOptions || {})
              .map(([groupId, options]: [string, any]) => 
                Array.isArray(options) ? options.join(', ') : options
              ).join(' | ')
          ).join(' • ')
        })
      };
      
      // Log tax items with special formatting
      if (isPlasticTax) {
        console.log(`🏷️  TAX ITEM DETECTED:`);
        console.log(`   📋 Name: ${lineItem.name}`);
        console.log(`   🔢 SKU: ${item.product.sku}`);
        console.log(`   💰 Amount: €${grossAmount.toFixed(2)} (Net: €${netAmount.toFixed(2)}, VAT 24%: €${vatAmount.toFixed(2)})`);
        console.log(`   📊 Classification: ${lineItem.classification_category} / ${lineItem.classification_type}`);
        console.log(`   ✅ Will appear in Πεδίο 17 (Λοιποί Φόροι) - E3_881_002`);
      }
      
      return lineItem;
    });

    // Calculate totals from invoice lines to ensure consistency with rounding
    const calculatedNetTotal = Math.round(invoiceLines.reduce((sum: number, line: any) => sum + line.net_total_price, 0) * 100) / 100;
    const calculatedVatTotal = Math.round(invoiceLines.reduce((sum: number, line: any) => sum + line.vat_total, 0) * 100) / 100;
    const calculatedGrossTotal = Math.round(invoiceLines.reduce((sum: number, line: any) => sum + line.subtotal, 0) * 100) / 100;
    
    // Summary logging
    const taxItems = invoiceLines.filter((line: any) => 
      line.classification_type === "E3_881_002"
    );
    const regularItems = invoiceLines.filter((line: any) => 
      line.classification_type !== "E3_881_002"
    );
    
    console.log(`\n📊 ORDER NOTE SUMMARY:`);
    console.log(`   Regular Items: ${regularItems.length} (Classification: category1_95 / _)`);
    console.log(`   Tax Items: ${taxItems.length} (Classification: category1_17 / E3_881_002)`);
    console.log(`   Total Lines: ${invoiceLines.length}`);
    console.log(`   Net Total: €${calculatedNetTotal.toFixed(2)}`);
    console.log(`   VAT Total: €${calculatedVatTotal.toFixed(2)}`);
    console.log(`   Gross Total: €${calculatedGrossTotal.toFixed(2)}\n`);

    // Prepare invoice data for WRAPP using EXACT format from documentation
    const invoiceData = {
      invoice_type_code: "8.6", // Δελτίο Παραγγελίας Εστίασης
      billing_book_id: billingBook,
      payment_method_type: 0, // 0=Cash as per documentation examples
      net_total_amount: calculatedNetTotal,
      vat_total_amount: calculatedVatTotal,
      total_amount: calculatedGrossTotal,
      payable_total_amount: calculatedGrossTotal,
      
      // REQUIRED: catering_table_id for order notes (from documentation)
      catering_table_id: tableId,
      
      invoice_lines: invoiceLines,
      
      // Customer information (optional for order notes)
      ...(customerInfo && customerInfo.name && {
        counterpart: {
          name: customerInfo.name,
          country_code: customerInfo.country || "GR",
          vat: customerInfo.vatNumber || "",
          city: customerInfo.city || "",
          address: customerInfo.address || "",
          zip: customerInfo.postalCode || "",
          phone: customerInfo.phone || "",
          email: customerInfo.email || ""
        }
      })
    };

    console.log('📝 Creating order note for table:', tableId);
    console.log('📋 Order note data:', JSON.stringify(invoiceData, null, 2));

    const url = `${wrappBaseUrl}/invoices`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WRAPP order note creation error:', response.status, errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }

      return NextResponse.json(
        { 
          error: 'Failed to create order note', 
          details: errorDetails,
          invoiceData: invoiceData // Include for debugging
        },
        { status: response.status }
      );
    } else {
      const result = await response.json();
      console.log('✅ Order note created successfully:', result.invoice_number);

      return NextResponse.json({
        success: true,
        orderNote: result,
        tableId: tableId,
        message: `Δελτίο Παραγγελίας ${result.invoice_number} δημιουργήθηκε επιτυχώς`
      });
    }

  } catch (error) {
    console.error('❌ Create order note API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
