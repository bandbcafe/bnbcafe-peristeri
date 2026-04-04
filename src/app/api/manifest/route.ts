import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    // Load website settings for business name and favicon
    const websiteSettingsRef = doc(db, 'website_settings', 'main');
    const websiteSettingsSnap = await getDoc(websiteSettingsRef);
    
    let businessName = '';
    let description = '';
    let hasFavicon = false;
    
    if (websiteSettingsSnap.exists()) {
      const data = websiteSettingsSnap.data();
      businessName = data.heroSection?.title || '';
      description = data.heroSection?.subtitle || '';
      hasFavicon = !!data.favicon;
    }

    // If no website settings, try POS settings
    if (!businessName) {
      const posSettingsRef = doc(db, 'config', 'settings');
      const posSettingsSnap = await getDoc(posSettingsRef);
      if (posSettingsSnap.exists()) {
        const posData = posSettingsSnap.data();
        businessName = posData.businessInfo?.name || '';
        description = posData.businessInfo?.description || '';
      }
    }

    // Build icon entries - use dynamic favicon route if custom favicon exists
    const icons = hasFavicon
      ? [
          {
            src: '/api/favicon?size=192',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/api/favicon?size=512',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/api/favicon?size=180',
            sizes: '180x180',
            type: 'image/png',
          },
        ]
      : [
          {
            src: '/favicon.ico',
            sizes: '32x32',
            type: 'image/x-icon',
          },
        ];

    const manifest = {
      name: businessName || 'Online Κατάστημα',
      short_name: businessName || 'Κατάστημα',
      description: description || 'Παραγγείλτε online',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#C9AC7A',
      orientation: 'portrait-primary',
      icons,
      categories: ['food', 'restaurant'],
      lang: 'el',
      dir: 'ltr',
      scope: '/',
      prefer_related_applications: false,
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('Error generating manifest:', error);
    // Return minimal manifest on error
    return NextResponse.json(
      {
        name: 'Online Κατάστημα',
        short_name: 'Κατάστημα',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#C9AC7A',
        icons: [],
      },
      {
        headers: {
          'Content-Type': 'application/manifest+json',
        },
      }
    );
  }
}
