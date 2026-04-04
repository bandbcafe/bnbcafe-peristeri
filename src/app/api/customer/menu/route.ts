import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    // Get website settings to find selected price list
    const settingsDoc = await getDoc(doc(db, 'website_settings', 'main'));
    const settings = settingsDoc.exists() ? settingsDoc.data() : {};
    const selectedPriceListId = settings.customerSettings?.selectedPriceListId;
    

    if (!selectedPriceListId) {
      return NextResponse.json({
        products: [],
        categories: [],
        recipes: [],
        priceListName: 'Menu',
        selectedPriceListId: null,
        error: 'Δεν έχει οριστεί τιμοκατάλογος στις ρυθμίσεις'
      });
    }

    // Get all products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const allProducts = productsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    // Get categories and sort by displayOrder
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categories = categoriesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Get recipes
    const recipesSnapshot = await getDocs(collection(db, 'recipes'));
    const recipes = recipesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));


    // Filter products to only include those that have prices in the selected price list and are active
    // Then sort by displayOrder
    const filteredProducts = allProducts
      .filter((product: any) => {
        // Product must be active - if status is "inactive" or "draft", hide it
        const isActive = product.status === "active" || product.status === undefined;
        // Also check isActive field if it exists
        const isNotDeactivated = product.isActive !== false;
        const isVisible = isActive && isNotDeactivated;
        
        const hasPrice = product.priceListPrices?.some((price: any) => price.priceListId === selectedPriceListId);
        
        const isInStock = product.neverOutOfStock === true || 
                         !product.trackStock || 
                         product.trackStock === false || 
                         (product.trackStock === true && (product.currentStock || 0) > 0);
        
        return isVisible && hasPrice && isInStock;
      })
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Filter categories: only return categories that have at least one visible product
    const visibleCategoryIds = new Set(
      filteredProducts.map((p: any) => p.category?.id).filter(Boolean)
    );
    const filteredCategories = categories.filter((cat: any) => visibleCategoryIds.has(cat.id));

    // Get price list name
    const priceListsSnapshot = await getDocs(collection(db, 'priceLists'));
    const selectedPriceList = priceListsSnapshot.docs.find(doc => doc.id === selectedPriceListId);
    const priceListName = selectedPriceList?.data()?.name || 'Menu';

    return NextResponse.json({
      products: filteredProducts,
      categories: filteredCategories,
      recipes: recipes,
      priceListName: priceListName,
      selectedPriceListId: selectedPriceListId,
      websiteSettings: settings
    });

  } catch (error) {
    console.error('Error loading menu data:', error);
    return NextResponse.json(
      { 
        products: [],
        categories: [],
        recipes: [],
        error: 'Σφάλμα κατά την ανάκτηση δεδομένων μενού' 
      },
      { status: 500 }
    );
  }
}
