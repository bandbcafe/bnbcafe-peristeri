import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { orderItems } = await request.json();

    if (!orderItems || !Array.isArray(orderItems)) {
      return NextResponse.json(
        { error: 'Invalid order items' },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomic stock updates
    await runTransaction(db, async (transaction) => {
      const stockUpdates: { productId: string; newStock: number }[] = [];

      // First, read all products and calculate new stock levels
      for (const item of orderItems) {
        const { productId, quantity } = item;
        
        if (!productId || !quantity || quantity <= 0) {
          continue;
        }

        const productRef = doc(db, 'products', productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists()) {
          throw new Error(`Product ${productId} not found`);
        }

        const productData = productDoc.data();
        
        // Only reduce stock if product tracks stock and is not set to never out of stock
        if (productData.trackStock === true && productData.neverOutOfStock !== true) {
          const currentStock = productData.currentStock || 0;
          const newStock = Math.max(0, currentStock - quantity);
          
          stockUpdates.push({
            productId,
            newStock
          });
        }
      }

      // Then, update all products with new stock levels
      for (const update of stockUpdates) {
        const productRef = doc(db, 'products', update.productId);
        transaction.update(productRef, {
          currentStock: update.newStock,
          updatedAt: new Date()
        });
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Stock updated successfully' 
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}
