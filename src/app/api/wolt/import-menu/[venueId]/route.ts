import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

// POST /api/wolt/import-menu/[venueId] - Import menu from Wolt to POS
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Get base URL from environment or use test by default
    const baseUrl = process.env.WOLT_BASE_URL || 'https://pos-integration-service.development.dev.woltapi.com';
    
    // Fetch menu from Wolt
    const response = await fetch(`${baseUrl}/v2/venues/${venueId}/menu`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { 
          error: 'Wolt Menu API error',
          status: response.status,
          message: errorData 
        },
        { status: response.status }
      );
    }

    const woltMenu = await response.json();
    
    // Transform Wolt menu to POS format
    const importedCategories = [];
    const importedProducts = [];

    // Process categories
    for (const woltCategory of woltMenu.categories || []) {
      const categoryData = {
        name: woltCategory.name.find((n: any) => n.lang === 'el')?.value || 
              woltCategory.name[0]?.value || 'Unnamed Category',
        description: woltCategory.description?.find((d: any) => d.lang === 'el')?.value || '',
        order: 0,
        isActive: true,
        woltId: woltCategory.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const categoryRef = await addDoc(collection(db, 'categories'), categoryData);
      importedCategories.push({
        id: categoryRef.id,
        woltId: woltCategory.id,
        name: categoryData.name,
      });
    }

    // Process items/products
    for (const woltItem of woltMenu.items || []) {
      const product = woltItem.product;
      
      // Find corresponding category
      const categoryBinding = woltMenu.categories?.find((cat: any) => 
        cat.item_bindings?.some((binding: any) => binding.item_id === woltItem.id)
      );
      
      const matchedCategory = importedCategories.find(cat => 
        cat.woltId === categoryBinding?.id
      );

      const productData = {
        name: product.name.find((n: any) => n.lang === 'el')?.value || 
              product.name[0]?.value || 'Unnamed Product',
        description: product.description?.find((d: any) => d.lang === 'el')?.value || '',
        sku: `WOLT-${woltItem.id}`,
        barcode: '',
        category: matchedCategory?.id || '',
        isActive: woltItem.enabled !== false,
        stock: woltItem.enabled !== false ? 100 : 0,
        woltId: woltItem.id,
        woltPrice: woltItem.price, // Price in cents
        woltVatPercentage: woltItem.vat_percentage || 24,
        
        // Create price list entries
        priceListPrices: [{
          priceListId: 'default', // You might want to create a "Wolt Import" price list
          price: woltItem.price / 100, // Convert cents to euros
          vatRate: (woltItem.vat_percentage || 24) / 100,
          isActive: true,
        }],
        
        // Recipe/options handling
        recipes: woltItem.option_set_bindings?.map((binding: any) => {
          const optionSet = woltMenu.options?.find((opt: any) => opt.id === binding.option_set_id);
          return {
            id: binding.option_set_id,
            name: optionSet?.name?.find((n: any) => n.lang === 'el')?.value || 'Options',
            options: optionSet?.values?.map((value: any) => ({
              id: value.id,
              name: value.name?.find((n: any) => n.lang === 'el')?.value || value.name[0]?.value,
              price: value.price || 0,
            })) || [],
            isActive: true,
          };
        }) || [],
        
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const productRef = await addDoc(collection(db, 'products'), productData);
      importedProducts.push({
        id: productRef.id,
        woltId: woltItem.id,
        name: productData.name,
        price: productData.priceListPrices[0].price,
      });
    }

    // Create import log
    const importLog = {
      venueId,
      importDate: new Date(),
      categoriesImported: importedCategories.length,
      productsImported: importedProducts.length,
      woltMenuId: woltMenu.id,
      currency: woltMenu.currency,
      primaryLanguage: woltMenu.primary_language,
      categories: importedCategories,
      products: importedProducts,
    };

    await addDoc(collection(db, 'wolt_imports'), importLog);

    return NextResponse.json({
      success: true,
      message: 'Menu imported successfully from Wolt',
      summary: {
        categoriesImported: importedCategories.length,
        productsImported: importedProducts.length,
        currency: woltMenu.currency,
        primaryLanguage: woltMenu.primary_language,
      },
      data: {
        categories: importedCategories,
        products: importedProducts,
      }
    });

  } catch (error: any) {
    console.error('Wolt menu import error:', error);
    return NextResponse.json(
      { error: 'Failed to import menu from Wolt', details: error.message },
      { status: 500 }
    );
  }
}
