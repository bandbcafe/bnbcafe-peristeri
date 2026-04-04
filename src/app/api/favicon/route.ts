import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedSize = searchParams.get('size') || '32';

    // Load website settings for favicon
    const websiteSettingsRef = doc(db, 'website_settings', 'main');
    const websiteSettingsSnap = await getDoc(websiteSettingsRef);

    if (!websiteSettingsSnap.exists()) {
      return new NextResponse(null, { status: 404 });
    }

    const data = websiteSettingsSnap.data();

    // Try to get the requested size from faviconSizes first, then fall back to main favicon
    let faviconBase64 = data.faviconSizes?.[requestedSize] || data.favicon;

    if (!faviconBase64) {
      return new NextResponse(null, { status: 404 });
    }

    // Extract the actual base64 data (remove data:image/...;base64, prefix)
    const matches = faviconBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse(null, { status: 400 });
    }

    const base64Data = matches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving favicon:', error);
    return new NextResponse(null, { status: 500 });
  }
}
