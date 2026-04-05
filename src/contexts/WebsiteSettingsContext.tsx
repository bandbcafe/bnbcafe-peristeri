"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface WebsiteSettingsContextType {
  websiteSettings: any;
  isLoaded: boolean;
}

const WebsiteSettingsContext = createContext<WebsiteSettingsContextType>({
  websiteSettings: null,
  isLoaded: false,
});

export function useWebsiteSettings() {
  return useContext(WebsiteSettingsContext);
}

export function WebsiteSettingsProvider({ children }: { children: ReactNode }) {
  const [websiteSettings, setWebsiteSettings] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/website/settings?t=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const settings = await response.json();
        try {
          sessionStorage.setItem("websiteSettings", JSON.stringify(settings));
          sessionStorage.setItem("websiteSettingsTime", Date.now().toString());
        } catch {
          // sessionStorage may not be available in Safari private mode
        }
        setWebsiteSettings(settings);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Settings request timed out");
      } else {
        console.error("Error loading website settings:", error);
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Initial load: use sessionStorage cache if fresh
    let usedCache = false;
    try {
      const cachedSettings = sessionStorage.getItem("websiteSettings");
      const cacheTime = sessionStorage.getItem("websiteSettingsTime");

      if (
        cachedSettings &&
        cacheTime &&
        Date.now() - parseInt(cacheTime) < 1 * 60 * 1000
      ) {
        setWebsiteSettings(JSON.parse(cachedSettings));
        setIsLoaded(true);
        usedCache = true;
      }
    } catch {
      // sessionStorage not available
    }

    if (!usedCache) {
      fetchSettings();
    }

    // Listen for version changes in Firestore - when ordio syncs,
    // it updates _version doc, triggering a refresh on all open tabs
    const unsubscribe = onSnapshot(
      doc(db, "website_settings", "_version"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const lastUpdate = data?.updatedAt;

        // Check if this is a newer update than our cached version
        try {
          const cacheTime = sessionStorage.getItem("websiteSettingsTime");
          if (cacheTime && lastUpdate && lastUpdate > parseInt(cacheTime)) {
            console.log("[Settings] Detected sync update, refreshing...");
            // Clear sessionStorage cache and re-fetch
            sessionStorage.removeItem("websiteSettings");
            sessionStorage.removeItem("websiteSettingsTime");
            fetchSettings();
          }
        } catch {
          // sessionStorage not available, just fetch
          fetchSettings();
        }
      },
      (error) => {
        // Don't crash if listener fails - settings still work via API
        console.error("[Settings] Version listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [fetchSettings]);

  return (
    <WebsiteSettingsContext.Provider value={{ websiteSettings, isLoaded }}>
      {children}
    </WebsiteSettingsContext.Provider>
  );
}
