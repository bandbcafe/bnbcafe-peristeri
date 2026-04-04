import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const popupsRef = collection(db, 'website_popups');
    // Simplified query to avoid composite index - filter in memory instead
    const q = query(
      popupsRef,
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const activePopups = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((popup: any) => {
        // Filter by date range in memory to avoid composite index
        return popup.startDate <= today && popup.endDate >= today;
      })
      .sort((a: any, b: any) => {
        // Sort by createdAt in memory
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    
    return NextResponse.json(activePopups);
  } catch (error) {
    console.error('Error fetching active popups:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση popups' },
      { status: 500 }
    );
  }
}
