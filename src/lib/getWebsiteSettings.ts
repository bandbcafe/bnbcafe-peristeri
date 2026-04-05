import { adminDb } from './firebase-admin';

let cachedSettings: any = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

/** Clear the in-memory settings cache (called after sync/revalidate) */
export function clearSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}

/**
 * Fetch website settings server-side using firebase-admin.
 * Used by generateMetadata in layout.tsx so Google sees real SEO tags.
 */
export async function getWebsiteSettings() {
  // Simple in-memory cache to avoid hitting Firestore on every request
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const [posSnap, websiteSnap] = await Promise.all([
      adminDb.collection('config').doc('settings').get(),
      adminDb.collection('website_settings').doc('main').get(),
    ]);

    let data: any = {};

    if (posSnap.exists) {
      const posData = posSnap.data();
      if (posData?.businessInfo) {
        data = {
          heroSection: {
            backgroundImages: [],
            title: posData.businessInfo.name || '',
            subtitle: posData.businessInfo.description || '',
          },
          contactInfo: {
            phone: posData.businessInfo.phone || '',
            email: posData.businessInfo.email || '',
            address: {
              street: posData.businessInfo.address || '',
              city: posData.businessInfo.city || '',
              postalCode: posData.businessInfo.postalCode || '',
            },
          },
        };

        if (posData.businessInfo.operatingHours) {
          data.deliverySettings = {
            weeklyHours: posData.businessInfo.operatingHours,
          };
        }
      }
    }

    if (websiteSnap.exists) {
      const websiteData = websiteSnap.data();
      data = { ...data, ...websiteData };
    }

    cachedSettings = data;
    cacheTime = Date.now();
    return data;
  } catch (error) {
    console.error('Error fetching website settings server-side:', error);
    return null;
  }
}
