import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    // Load Google Maps API key from website settings (set via Ordio)
    const websiteSettingsRef = doc(db, 'website_settings', 'main');
    const websiteSettingsSnap = await getDoc(websiteSettingsRef);

    if (websiteSettingsSnap.exists()) {
      const data = websiteSettingsSnap.data();
      if (data.googleMapsApiKey) {
        return NextResponse.json(
          { apiKey: data.googleMapsApiKey },
          {
            headers: {
              'Cache-Control': 'public, max-age=300, s-maxage=300',
            },
          }
        );
      }
    }

    // Fallback to env var if not set in settings
    const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      return NextResponse.json({ apiKey: envKey });
    }

    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
}
