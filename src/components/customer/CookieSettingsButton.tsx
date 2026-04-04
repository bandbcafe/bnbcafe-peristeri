"use client";

import React, { useState, useEffect } from "react";
import { FaCookie } from "react-icons/fa";

export default function CookieSettingsButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem("cookieConsent");
    setHasConsent(!!consent);

    // Listen for storage changes (when consent is saved)
    const handleStorageChange = () => {
      const consent = localStorage.getItem("cookieConsent");
      setHasConsent(!!consent);
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event from same tab
    window.addEventListener("cookieConsentChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cookieConsentChanged", handleStorageChange);
    };
  }, []);

  const handleOpenSettings = () => {
    // Clear consent to show banner again
    localStorage.removeItem("cookieConsent");
    // Reload page to show banner
    window.location.reload();
  };

  // Don't show button if user has already accepted cookies
  if (hasConsent) return null;

  return (
    <div className="relative">
      <button
        onClick={handleOpenSettings}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="fixed bottom-6 left-6 z-[9997] w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center group"
        aria-label="Ρυθμίσεις Cookies"
      >
        <FaCookie className="text-2xl group-hover:rotate-12 transition-transform duration-200" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="fixed bottom-20 left-6 z-[9998] bg-gray-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-xl animate-fadeIn">
          Ρυθμίσεις Cookies
          <div className="absolute -bottom-1 left-6 w-2 h-2 bg-gray-900 transform rotate-45" />
        </div>
      )}
    </div>
  );
}
