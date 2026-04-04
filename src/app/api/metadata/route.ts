import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    // Load website settings
    const websiteSettingsRef = doc(db, 'website_settings', 'main');
    const websiteSettingsSnap = await getDoc(websiteSettingsRef);
    
    // Load POS settings
    const posSettingsRef = doc(db, 'config', 'settings');
    const posSettingsSnap = await getDoc(posSettingsRef);
    
    let metadata: any = {
      title: "",
      description: "",
      keywords: [],
      businessName: "",
      phone: "",
      email: "",
      address: {
        street: "",
        city: "",
        postalCode: ""
      }
    };
    
    // Override with website settings if they exist
    if (websiteSettingsSnap.exists()) {
      const data = websiteSettingsSnap.data();
      if (data.heroSection) {
        metadata.title = data.heroSection.title || metadata.title;
        metadata.description = data.heroSection.subtitle || metadata.description;
        metadata.businessName = data.heroSection.title || metadata.businessName;
      }
      if (data.contactInfo) {
        metadata.phone = data.contactInfo.phone || metadata.phone;
        metadata.email = data.contactInfo.email || metadata.email;
        if (data.contactInfo.address) {
          metadata.address = {
            ...metadata.address,
            ...data.contactInfo.address
          };
        }
      }
    }
    
    // Override with POS settings if they exist
    if (posSettingsSnap.exists()) {
      const posData = posSettingsSnap.data();
      if (posData.businessInfo) {
        metadata.businessName = posData.businessInfo.name || metadata.businessName;
        metadata.phone = posData.businessInfo.phone || metadata.phone;
        metadata.email = posData.businessInfo.email || metadata.email;
        metadata.address.street = posData.businessInfo.address || metadata.address.street;
        metadata.address.city = posData.businessInfo.city || metadata.address.city;
        metadata.address.postalCode = posData.businessInfo.postalCode || metadata.address.postalCode;
      }
    }
    
    // Generate keywords
    metadata.keywords = generateKeywords(metadata);
    
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

function generateKeywords(data: any): string[] {
  return [
    // Core keywords
    "καφετέρια",
    "εστιατόριο",
    "brunch",
    "coffee",
    "cafe",
    "καφές",
    "πρωινό",
    "φαγητό",
    
    // Location
    data.address.city,
    "κέντρο",
    "delivery",
    "παράδοση",
    
    // Services
    "online παραγγελία",
    "κρατήσεις",
    "reservations",
    "τραπέζι",
    "booking",
    
    // Food types
    `brunch ${data.address.city}`,
    `πρωινό ${data.address.city}`,
    `καφές ${data.address.city}`,
    `εστιατόριο ${data.address.city}`,
    
    // Features
    "φρέσκα υλικά",
    "ποιότητα",
    "healthy",
    "vegan",
    "vegetarian",
    
    // Atmosphere
    "cozy cafe",
    "άνετος χώρος",
    "wifi",
    "parking",
    
    // Business
    "business meetings",
    "συναντήσεις",
    "εργασία",
    
    // Brand
    data.businessName,
  ].filter(Boolean);
}
