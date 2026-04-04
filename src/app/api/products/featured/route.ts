import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get website settings to find selected price list
    const settingsDoc = await getDoc(doc(db, 'website_settings', 'main'));
    const settings = settingsDoc.exists() ? settingsDoc.data() : {};
    const selectedPriceListId = settings.customerSettings?.selectedPriceListId;

    if (!selectedPriceListId) {
      return NextResponse.json({ 
        error: 'Δεν έχει οριστεί τιμοκατάλογος στις ρυθμίσεις' 
      }, { status: 400 });
    }

    // Get all products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const allProducts = productsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    // Filter products to only include those that have prices in the selected price list and are active
    const filteredProducts = allProducts.filter((product: any) => {
      const isVisible = (product.isActive === true || product.isActive === undefined) || 
                       (product.status === "active" || product.status === undefined);
      
      const hasPrice = product.priceListPrices?.some((price: any) => price.priceListId === selectedPriceListId);
      
      const isInStock = product.neverOutOfStock === true || 
                       !product.trackStock || 
                       product.trackStock === false || 
                       (product.trackStock === true && (product.currentStock || 0) > 0);
      
      return isVisible && hasPrice && isInStock;
    });

    // Return first 6 products as featured
    const featuredProducts = filteredProducts.slice(0, 6);

    return NextResponse.json(featuredProducts);

  } catch (error) {
    console.error('Error fetching featured products:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση προϊόντων' },
      { status: 500 }
    );
  }
}
