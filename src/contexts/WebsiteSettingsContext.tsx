"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Check sessionStorage cache first (wrapped in try-catch for Safari private mode)
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
          return;
        }
      } catch (cacheError) {
        // sessionStorage may not be available in Safari private mode
      }

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
        } catch (cacheError) {
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
  };

  return (
    <WebsiteSettingsContext.Provider value={{ websiteSettings, isLoaded }}>
      {children}
    </WebsiteSettingsContext.Provider>
  );
}
