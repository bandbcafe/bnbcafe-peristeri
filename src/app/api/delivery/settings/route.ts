import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// In-memory cache for delivery settings
let cachedSettings: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1 * 60 * 1000; // 1 minute

// GET - Get delivery settings
export async function GET() {
  // Check cache first
  const now = Date.now();
  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('✅ Returning cached delivery settings');
    return NextResponse.json(cachedSettings);
  }
  try {
    const settingsDoc = await adminDb.collection('website_settings').doc('main').get();
    
    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: 'Δεν βρέθηκαν ρυθμίσεις' },
        { status: 404 }
      );
    }

    const data = settingsDoc.data();
    
    // Fallback address - should match what's in the admin panel
    const fallbackContactInfo = {
      address: {
        street: '',
        city: '',
        postalCode: ''
      }
    };
    
    const response = {
      deliverySettings: data?.deliverySettings || {
        radius: 5,
        fee: 2.50,
        weeklyHours: {
          monday: { isOpen: true, start: '12:00', end: '23:00' },
          tuesday: { isOpen: true, start: '12:00', end: '23:00' },
          wednesday: { isOpen: true, start: '12:00', end: '23:00' },
          thursday: { isOpen: true, start: '12:00', end: '23:00' },
          friday: { isOpen: true, start: '12:00', end: '23:00' },
          saturday: { isOpen: true, start: '12:00', end: '23:00' },
          sunday: { isOpen: true, start: '12:00', end: '23:00' }
        }
      },
      contactInfo: data?.contactInfo || fallbackContactInfo
    };
    
    // Cache the response
    cachedSettings = response;
    cacheTimestamp = Date.now();
    console.log('💾 Cached delivery settings');
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching delivery settings:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ρυθμίσεων' },
      { status: 500 }
    );
  }
}
