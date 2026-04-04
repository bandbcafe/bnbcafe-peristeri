"use client";

import { useEffect, useRef, useState } from "react";
import { FaMapMarkerAlt, FaCheck, FaTimes, FaSpinner } from "react-icons/fa";

// Types
interface DeliveryMapCheckerProps {
  storeAddress: string;
  deliveryRadius: number; // in kilometers
  onDeliveryCheck: (available: boolean, distance?: number) => void;
  customerAddress?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

// Calculate distance between two points
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Google Maps Geocoding API - Using server-side API route
const getCoordinatesFromAddress = async (
  address: string,
): Promise<Coordinates | null> => {
  try {
    // Call our server-side API route instead of calling Google directly
    const response = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Geocoding failed");
    }

    const coordinates = await response.json();
    return coordinates;
  } catch (error) {
    console.error("Google Maps Geocoding Error:", error);
    throw error; // Re-throw to be handled by calling function
  }
};

export default function DeliveryMapChecker({
  storeAddress,
  deliveryRadius,
  onDeliveryCheck,
  customerAddress,
}: DeliveryMapCheckerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeCoords, setStoreCoords] = useState<Coordinates | null>(null);
  const [customerCoords, setCustomerCoords] = useState<Coordinates | null>(
    null,
  );
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(
    null,
  );
  const [distance, setDistance] = useState<number | null>(null);

  // Load Google Maps and initialize map
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Fetch API key from settings (configured via Ordio)
        const keyResponse = await fetch("/api/maps-key");
        if (!keyResponse.ok) {
          throw new Error(
            "Google Maps API key δεν έχει ρυθμιστεί. Ρυθμίστε το από τις ρυθμίσεις Delivery στο Ordio.",
          );
        }
        const keyData = await keyResponse.json();
        const apiKey = keyData.apiKey;

        if (!apiKey) {
          throw new Error(
            "Google Maps API key δεν βρέθηκε. Προσθέστε το από το Ordio → Website → Delivery.",
          );
        }

        // Load Google Maps JavaScript API (check if already loaded or loading)
        if (!(window as any).google?.maps) {
          // Check if script is already in the document
          const existingScript = document.querySelector(
            'script[src*="maps.googleapis.com/maps/api/js"]',
          );

          if (!existingScript) {
            await new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
              script.async = true;
              script.defer = true;
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          } else {
            // Wait for existing script to load
            await new Promise((resolve) => {
              const checkLoaded = setInterval(() => {
                if ((window as any).google?.maps) {
                  clearInterval(checkLoaded);
                  resolve(true);
                }
              }, 100);
            });
          }
        }

        // Get store coordinates
        const coords = await getCoordinatesFromAddress(storeAddress);

        if (!coords) {
          throw new Error(`Δεν βρέθηκαν συντεταγμένες για: ${storeAddress}`);
        }

        setStoreCoords(coords);

        // Wait for mapRef to be available before initializing
        const initMapWithRetry = () => {
          if (mapRef.current) {
            initializeMap(coords);
          } else {
            // Retry after a short delay
            setTimeout(initMapWithRetry, 100);
          }
        };

        initMapWithRetry();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα φόρτωσης χάρτη");
      } finally {
        setLoading(false);
      }
    };

    loadGoogleMaps();
  }, [storeAddress]);

  // Check customer address when it changes
  useEffect(() => {
    if (customerAddress && customerAddress.trim() && storeCoords) {
      checkCustomerAddress(customerAddress);
    } else if (!customerAddress || !customerAddress.trim()) {
      // Clear customer data
      setCustomerCoords(null);
      setDeliveryAvailable(null);
      setDistance(null);
      onDeliveryCheck(false);

      // Remove customer marker from map (Google Maps)
      if (mapInstanceRef.current?.customerMarker) {
        mapInstanceRef.current.customerMarker.setMap(null);
        mapInstanceRef.current.customerMarker = null;
      }
    }
  }, [customerAddress, storeCoords, onDeliveryCheck]);

  const initializeMap = (coords: Coordinates) => {
    if (!mapRef.current || !(window as any).google?.maps) {
      console.log("Map ref or Google Maps not available yet");
      return;
    }

    const google = (window as any).google;

    try {
      // Initialize Google Map
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: coords.lat, lng: coords.lng },
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      // Add store marker
      const storeMarker = new google.maps.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map: map,
        title: "Κατάστημα",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        label: {
          text: "🏪",
          fontSize: "16px",
        },
      });

      // Add info window for store
      const storeInfoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;"><b>Κατάστημα</b><br>${storeAddress}</div>`,
      });

      storeMarker.addListener("click", () => {
        storeInfoWindow.open(map, storeMarker);
      });

      // Add delivery radius circle
      const circle = new google.maps.Circle({
        map: map,
        center: { lat: coords.lat, lng: coords.lng },
        radius: deliveryRadius * 1000, // Convert km to meters
        fillColor: "#10b981",
        fillOpacity: 0.15,
        strokeColor: "#10b981",
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });

      // Add info window for circle
      const circleInfoWindow = new google.maps.InfoWindow();
      google.maps.event.addListener(circle, "click", (event: any) => {
        circleInfoWindow.setContent(
          `<div style="padding: 8px;">Ζώνη Παράδοσης<br>Ακτίνα: ${deliveryRadius}km</div>`,
        );
        circleInfoWindow.setPosition(event.latLng);
        circleInfoWindow.open(map);
      });

      mapInstanceRef.current = map;
    } catch (error) {
      console.error("Error initializing map:", error);
      setError("Σφάλμα κατά την αρχικοποίηση του χάρτη");
    }
  };

  const checkCustomerAddress = async (address: string) => {
    if (!storeCoords) return;

    try {
      const coords = await getCoordinatesFromAddress(address);
      if (!coords) {
        setError("Δεν βρέθηκαν συντεταγμένες για τη διεύθυνση");
        return;
      }

      setCustomerCoords(coords);

      // Calculate distance
      const dist = calculateDistance(
        storeCoords.lat,
        storeCoords.lng,
        coords.lat,
        coords.lng,
      );

      const roundedDistance = Math.round(dist * 100) / 100;
      const available = dist <= deliveryRadius;

      setDistance(roundedDistance);
      setDeliveryAvailable(available);
      onDeliveryCheck(available, roundedDistance);

      // Add customer marker to map (Google Maps)
      if (mapInstanceRef.current && (window as any).google?.maps) {
        const google = (window as any).google;

        // Remove existing customer marker
        if (mapInstanceRef.current.customerMarker) {
          mapInstanceRef.current.customerMarker.setMap(null);
        }

        // Add new customer marker
        const customerMarker = new google.maps.Marker({
          position: { lat: coords.lat, lng: coords.lng },
          map: mapInstanceRef.current,
          title: "Διεύθυνση Παράδοσης",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: available ? "#10b981" : "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: {
            text: "📍",
            fontSize: "14px",
          },
        });

        // Add info window for customer marker
        const customerInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <b>Διεύθυνση Παράδοσης</b><br>
              ${address}<br>
              <span style="color: ${
                available ? "#10b981" : "#ef4444"
              }; font-weight: bold;">
                ${available ? "✅ Διαθέσιμη" : "❌ Μη Διαθέσιμη"}
              </span><br>
              Απόσταση: ${roundedDistance}km
            </div>
          `,
        });

        customerMarker.addListener("click", () => {
          customerInfoWindow.open(mapInstanceRef.current, customerMarker);
        });

        // Store reference to customer marker
        mapInstanceRef.current.customerMarker = customerMarker;

        // Fit map to show both markers
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: storeCoords.lat, lng: storeCoords.lng });
        bounds.extend({ lat: coords.lat, lng: coords.lng });
        mapInstanceRef.current.fitBounds(bounds);

        // Add some padding
        setTimeout(() => {
          const zoom = mapInstanceRef.current.getZoom();
          if (zoom && zoom > 15) {
            mapInstanceRef.current.setZoom(15);
          }
        }, 100);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Σφάλμα κατά τον έλεγχο διεύθυνσης";
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-amber-600 mr-2" />
          <span>Φόρτωση χάρτη...</span>
        </div>
      </div>
    );
  }

  if (error) {
    // Don't show technical errors to customers - just show a friendly message
    console.error("DeliveryMapChecker error:", error);

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <FaMapMarkerAlt className="text-blue-500 mr-3 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-blue-800 font-semibold mb-2">
              Έλεγχος Απόστασης
            </h3>
            <p className="text-blue-700 text-sm">
              Ο έλεγχος απόστασης δεν είναι διαθέσιμος αυτή τη στιγμή.
              Παρακαλούμε επικοινωνήστε μαζί μας για να επιβεβαιώσουμε ότι
              παραδίδουμε στην περιοχή σας.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaMapMarkerAlt className="mr-2" />
            <span className="font-semibold">Ζώνη Παράδοσης</span>
          </div>
          <span className="text-sm">Ακτίνα: {deliveryRadius}km</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="h-80 sm:h-96 w-full" />

      {/* Status */}
      {deliveryAvailable !== null && (
        <div className="p-4">
          <div
            className={`flex items-center justify-between p-3 rounded-lg ${
              deliveryAvailable
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center">
              {deliveryAvailable ? (
                <FaCheck className="text-green-600 mr-2" />
              ) : (
                <FaTimes className="text-red-600 mr-2" />
              )}
              <span
                className={`font-medium ${
                  deliveryAvailable ? "text-green-800" : "text-red-800"
                }`}
              >
                {deliveryAvailable
                  ? "✅ Διαθέσιμη Παράδοση"
                  : "❌ Μη Διαθέσιμη"}
              </span>
            </div>
            {distance && (
              <span
                className={`text-sm ${
                  deliveryAvailable ? "text-green-600" : "text-red-600"
                }`}
              >
                Απόσταση: {distance}km
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
