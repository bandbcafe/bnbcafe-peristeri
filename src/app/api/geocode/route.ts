import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Coordinates {
  lat: number;
  lng: number;
}

// In-memory cache for geocoding results
const geocodeCache = new Map<string, { coordinates: Coordinates; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache for API key (avoid reading Firestore on every geocode request)
let cachedApiKey: string | null = null;
let apiKeyCachedAt = 0;
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getGoogleMapsApiKey(): Promise<string | null> {
  const now = Date.now();
  if (cachedApiKey && (now - apiKeyCachedAt) < API_KEY_CACHE_TTL) {
    return cachedApiKey;
  }

  try {
    // Try Firestore settings first (configured from Ordio)
    const settingsRef = doc(db, 'website_settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const key = settingsSnap.data().googleMapsApiKey;
      if (key) {
        cachedApiKey = key;
        apiKeyCachedAt = now;
        return key;
      }
    }
  } catch (err) {
    console.error('Error reading Google Maps API key from settings:', err);
  }

  // Fallback to env var
  const envKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (envKey) {
    cachedApiKey = envKey;
    apiKeyCachedAt = now;
  }
  return envKey || null;
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    const cached = geocodeCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`✅ Returning cached geocode for: ${address}`);
      return NextResponse.json(cached.coordinates);
    }

    // Get API key from settings (Ordio) or env fallback
    const apiKey = await getGoogleMapsApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured. Set it from Ordio → Website → Delivery settings." },
        { status: 500 }
      );
    }

    // Clean and format address for Greece
    const formattedAddress = `${address}, Greece`;

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      formattedAddress
    )}&key=${apiKey}&region=gr&language=el`;

    const response = await fetch(geocodeUrl);

    if (!response.ok) {
      throw new Error(
        `Google Maps API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      const coordinates: Coordinates = {
        lat: location.lat,
        lng: location.lng,
      };

      // Cache the result
      geocodeCache.set(cacheKey, { coordinates, timestamp: Date.now() });
      console.log(`💾 Cached geocode for: ${address}`);

      return NextResponse.json(coordinates);
    } else if (data.status === "REQUEST_DENIED") {
      return NextResponse.json(
        {
          error: `Google Maps API access denied: ${
            data.error_message || "Invalid API key or API not enabled"
          }`,
        },
        { status: 403 }
      );
    } else if (data.status === "ZERO_RESULTS") {
      return NextResponse.json(
        { error: `Address not found: ${address}` },
        { status: 404 }
      );
    } else {
      return NextResponse.json(
        {
          error: `Geocoding failed: ${data.status} - ${
            data.error_message || "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Geocoding API Error:", error);
    return NextResponse.json(
      { error: "Internal server error during geocoding" },
      { status: 500 }
    );
  }
}
