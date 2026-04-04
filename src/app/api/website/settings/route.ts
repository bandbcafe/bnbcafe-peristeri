import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    // First, try to load saved settings from POS system configuration
    const posSettingsRef = doc(db, 'config', 'settings');
    const posSettingsSnap = await getDoc(posSettingsRef);
    
    // Also load website-specific settings
    const websiteSettingsRef = doc(db, 'website_settings', 'main');
    const websiteSettingsSnap = await getDoc(websiteSettingsRef);
    
    let data: any = {};
    
    // Priority 1: Load from POS system settings if they exist
    if (posSettingsSnap.exists()) {
      const posData = posSettingsSnap.data();
      
      // Map POS settings to website settings structure
      if (posData.businessInfo) {
        data = {
          ...data,
          heroSection: {
            backgroundImages: [],
            title: posData.businessInfo.name || "",
            subtitle: posData.businessInfo.description || ""
          },
          contactInfo: {
            phone: posData.businessInfo.phone || "",
            email: posData.businessInfo.email || "",
            address: {
              street: posData.businessInfo.address || "",
              city: posData.businessInfo.city || "",
              postalCode: posData.businessInfo.postalCode || ""
            }
          }
        };
        
        // Map operating hours to delivery settings if available
        if (posData.businessInfo.operatingHours) {
          data.deliverySettings = {
            weeklyHours: posData.businessInfo.operatingHours,
            fee: posData.businessInfo.deliveryFee || 2.50
          };
        }
      }
      
      // Map online ordering settings if they exist
      if (posData.onlineOrdering) {
        data.customerSettings = {
          selectedPriceListId: posData.onlineOrdering.selectedPriceListId || "",
        };
        
        // Override delivery settings with online ordering specific settings
        if (posData.onlineOrdering.deliveryRadius || posData.onlineOrdering.minimumOrderAmount) {
          data.deliverySettings = {
            ...data.deliverySettings,
            radius: posData.onlineOrdering.deliveryRadius || 5,
            minimumOrder: posData.onlineOrdering.minimumOrderAmount || 0,
            fee: data.deliverySettings?.fee || 2.50
          };
        }
      }
    }
    
    // Priority 2: Override with website-specific settings if they exist
    if (websiteSettingsSnap.exists()) {
      const websiteData = websiteSettingsSnap.data();
      data = { ...data, ...websiteData };
    }
    
    // If we have any data, process and return it
    if (Object.keys(data).length > 0) {
      
      // Migration: Convert old delivery hours to weekly hours
      if (data.deliverySettings && data.deliverySettings.hours && !data.deliverySettings.weeklyHours) {
        const oldHours = data.deliverySettings.hours;
        data.deliverySettings.weeklyHours = {
          monday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          tuesday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          wednesday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          thursday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          friday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          saturday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          sunday: { isOpen: true, start: oldHours.start, end: oldHours.end },
        };
        delete data.deliverySettings.hours;
      }

      // Ensure weeklyHours exists
      if (data.deliverySettings && !data.deliverySettings.weeklyHours) {
        data.deliverySettings.weeklyHours = {
          monday: { isOpen: true, start: "12:00", end: "23:00" },
          tuesday: { isOpen: true, start: "12:00", end: "23:00" },
          wednesday: { isOpen: true, start: "12:00", end: "23:00" },
          thursday: { isOpen: true, start: "12:00", end: "23:00" },
          friday: { isOpen: true, start: "12:00", end: "23:00" },
          saturday: { isOpen: true, start: "12:00", end: "23:00" },
          sunday: { isOpen: true, start: "12:00", end: "23:00" },
        };
      }

      // Ensure deliverySettings exists with default structure
      if (!data.deliverySettings) {
        data.deliverySettings = {
          weeklyHours: {
            monday: { isOpen: true, start: "12:00", end: "23:00" },
            tuesday: { isOpen: true, start: "12:00", end: "23:00" },
            wednesday: { isOpen: true, start: "12:00", end: "23:00" },
            thursday: { isOpen: true, start: "12:00", end: "23:00" },
            friday: { isOpen: true, start: "12:00", end: "23:00" },
            saturday: { isOpen: true, start: "12:00", end: "23:00" },
            sunday: { isOpen: true, start: "12:00", end: "23:00" },
          },
          radius: 5,
          fee: 2.50,
          enableDistanceValidation: true
        };
      }

      // Ensure enableDistanceValidation exists in deliverySettings
      if (data.deliverySettings && data.deliverySettings.enableDistanceValidation === undefined) {
        data.deliverySettings.enableDistanceValidation = true;
      }

      // Ensure customerSettings exists
      if (!data.customerSettings) {
        data.customerSettings = {
          selectedPriceListId: "",
        };
      }

      // Ensure paymentSettings exists
      if (!data.paymentSettings) {
        data.paymentSettings = {
          enabledMethods: {
            cashOnDelivery: true,
            creditCard: false,
            iris: false,
            paypal: false,
            applePay: false,
          },
          vivaWallet: {
            enabled: false,
            merchantId: "",
            apiKey: "",
            clientId: "",
            clientSecret: "",
            sourceCode: "",
            testMode: true,
            successUrl: "",
            failureUrl: "",
          },
        };
      }

      // Ensure reservationSettings exists
      if (!data.reservationSettings) {
        data.reservationSettings = {
          enabled: true,
          maxGuests: 12,
          advanceBookingDays: 30,
          cancellationHours: 2,
          depositRequired: false,
          depositAmount: 0,
          tableHoldMinutes: 15,
          requirePhone: true,
          requireEmail: false,
          autoConfirm: false,
        };
      }
      
      return NextResponse.json(data);
    } else {
      // Return default settings if none exist
      const defaultSettings = {
        heroSection: {
          backgroundImage: "",
          title: "",
          subtitle: ""
        },
        contactInfo: {
          phone: "",
          email: "",
          address: {
            street: "",
            city: "",
            postalCode: ""
          }
        },
        deliverySettings: {
          weeklyHours: {
            monday: { isOpen: true, start: "12:00", end: "23:00" },
            tuesday: { isOpen: true, start: "12:00", end: "23:00" },
            wednesday: { isOpen: true, start: "12:00", end: "23:00" },
            thursday: { isOpen: true, start: "12:00", end: "23:00" },
            friday: { isOpen: true, start: "12:00", end: "23:00" },
            saturday: { isOpen: true, start: "12:00", end: "23:00" },
            sunday: { isOpen: true, start: "12:00", end: "23:00" },
          },
          radius: 5,
          fee: 2.50,
          enableDistanceValidation: true
        },
        customerSettings: {
          selectedPriceListId: "",
        },
        paymentSettings: {
          enabledMethods: {
            cashOnDelivery: true,
            creditCard: false,
            iris: false,
            paypal: false,
            applePay: false,
          },
          vivaWallet: {
            enabled: false,
            merchantId: "",
            apiKey: "",
            clientId: "",
            clientSecret: "",
            sourceCode: "",
            testMode: true,
            successUrl: "",
            failureUrl: "",
          },
        },
        reservationSettings: {
          enabled: true,
          maxGuests: 12,
          advanceBookingDays: 30,
          cancellationHours: 2,
          depositRequired: false,
          depositAmount: 0,
          tableHoldMinutes: 15,
          requirePhone: true,
          requireEmail: false,
          autoConfirm: false,
        }
      };
      
      return NextResponse.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση ρυθμίσεων' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    
    const docRef = doc(db, 'website_settings', 'main');
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving website settings:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την αποθήκευση ρυθμίσεων' },
      { status: 500 }
    );
  }
}
