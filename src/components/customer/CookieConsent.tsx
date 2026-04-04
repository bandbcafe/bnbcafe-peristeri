"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaCookie,
  FaTimes,
  FaCheck,
  FaCog,
  FaShieldAlt,
  FaChartBar,
  FaAd,
} from "react-icons/fa";

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
        applyCookiePreferences(saved);
      } catch (error) {
        console.error("Error loading cookie preferences:", error);
      }
    }
  }, []);

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Apply cookie preferences
    if (prefs.analytics) {
      // Enable analytics cookies (e.g., Google Analytics)
      enableAnalytics();
    } else {
      disableAnalytics();
    }

    if (prefs.marketing) {
      // Enable marketing cookies
      enableMarketing();
    } else {
      disableMarketing();
    }

    if (prefs.functional) {
      // Enable functional cookies
      enableFunctional();
    } else {
      disableFunctional();
    }
  };

  const enableAnalytics = () => {
    // Example: Enable Google Analytics
    console.log("Analytics cookies enabled");
    // window.gtag('consent', 'update', { analytics_storage: 'granted' });
  };

  const disableAnalytics = () => {
    console.log("Analytics cookies disabled");
    // window.gtag('consent', 'update', { analytics_storage: 'denied' });
  };

  const enableMarketing = () => {
    console.log("Marketing cookies enabled");
    // window.gtag('consent', 'update', { ad_storage: 'granted' });
  };

  const disableMarketing = () => {
    console.log("Marketing cookies disabled");
    // window.gtag('consent', 'update', { ad_storage: 'denied' });
  };

  const enableFunctional = () => {
    console.log("Functional cookies enabled");
  };

  const disableFunctional = () => {
    console.log("Functional cookies disabled");
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookieConsent", JSON.stringify(prefs));
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    applyCookiePreferences(prefs);

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("cookieConsentChanged"));
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(onlyNecessary);
    savePreferences(onlyNecessary);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleTogglePreference = (key: keyof CookiePreferences) => {
    if (key === "necessary") return; // Can't disable necessary cookies
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] animate-fadeIn" />

      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slideInUp">
        <div className="container mx-auto px-4 pb-4 md:pb-6">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-w-5xl mx-auto overflow-hidden">
            {/* Main Banner View */}
            {!showSettings ? (
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Icon and Content */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                          <FaCookie className="text-white text-2xl" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                          Χρησιμοποιούμε Cookies 🍪
                        </h3>
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                          Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία
                          σας, να αναλύσουμε την επισκεψιμότητα και να
                          εξατομικεύσουμε το περιεχόμενο. Με την αποδοχή,
                          συμφωνείτε με τη χρήση cookies σύμφωνα με την{" "}
                          <Link
                            href="/privacy"
                            className="text-black hover:text-gray-700 font-medium underline"
                            target="_blank"
                          >
                            Πολιτική Απορρήτου
                          </Link>{" "}
                          μας.
                        </p>
                      </div>
                    </div>

                    {/* Quick Info Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <FaShieldAlt className="text-xs" />
                        Ασφαλή
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <FaChartBar className="text-xs" />
                        Ανάλυση
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <FaCog className="text-xs" />
                        Προσαρμόσιμα
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 md:min-w-[200px]">
                    <button
                      onClick={handleAcceptAll}
                      aria-label="Αποδοχή όλων των cookies"
                      className="w-full px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FaCheck />
                      Αποδοχή Όλων
                    </button>
                    <button
                      onClick={handleRejectAll}
                      aria-label="Απόρριψη όλων των cookies"
                      className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FaTimes />
                      Απόρριψη Όλων
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      aria-label="Άνοιγμα ρυθμίσεων cookies"
                      className="w-full px-6 py-3 border-2 border-gray-300 hover:border-black text-gray-700 hover:text-black rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FaCog />
                      Ρυθμίσεις
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Settings View */
              <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaCog className="text-black" />
                    Ρυθμίσεις Cookies
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    aria-label="Κλείσιμο ρυθμίσεων"
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FaTimes className="text-gray-600" />
                  </button>
                </div>

                <p className="text-gray-600 mb-6">
                  Επιλέξτε ποια cookies επιθυμείτε να ενεργοποιήσετε. Τα
                  απαραίτητα cookies είναι πάντα ενεργά για τη σωστή λειτουργία
                  της ιστοσελίδας.
                </p>

                <div className="space-y-4">
                  {/* Necessary Cookies */}
                  <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaShieldAlt className="text-green-600" />
                          <h4 className="font-semibold text-gray-800">
                            Απαραίτητα Cookies
                          </h4>
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                            Πάντα Ενεργά
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Αυτά τα cookies είναι απαραίτητα για τη βασική
                          λειτουργία της ιστοσελίδας, όπως η πλοήγηση και η
                          πρόσβαση σε ασφαλείς περιοχές. Δεν μπορούν να
                          απενεργοποιηθούν.
                        </p>
                      </div>
                      <div className="ml-4">
                        <div className="w-12 h-6 bg-green-600 rounded-full flex items-center justify-end px-1">
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Functional Cookies */}
                  <div
                    className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                      preferences.functional
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => handleTogglePreference("functional")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaCog className="text-blue-600" />
                          <h4 className="font-semibold text-gray-800">
                            Λειτουργικά Cookies
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Αυτά τα cookies επιτρέπουν τη λειτουργία βελτιωμένων
                          χαρακτηριστικών και εξατομίκευσης, όπως η αποθήκευση
                          των προτιμήσεών σας και η απομνημόνευση των επιλογών
                          σας.
                        </p>
                      </div>
                      <div className="ml-4">
                        <div
                          className={`w-12 h-6 rounded-full flex items-center transition-all ${
                            preferences.functional
                              ? "bg-blue-600 justify-end"
                              : "bg-gray-300 justify-start"
                          } px-1`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div
                    className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                      preferences.analytics
                        ? "border-purple-300 bg-purple-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => handleTogglePreference("analytics")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaChartBar className="text-purple-600" />
                          <h4 className="font-semibold text-gray-800">
                            Cookies Ανάλυσης
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Αυτά τα cookies μας βοηθούν να κατανοήσουμε πώς οι
                          επισκέπτες αλληλεπιδρούν με την ιστοσελίδα,
                          συλλέγοντας και αναφέροντας πληροφορίες ανώνυμα για
                          βελτίωση των υπηρεσιών μας.
                        </p>
                      </div>
                      <div className="ml-4">
                        <div
                          className={`w-12 h-6 rounded-full flex items-center transition-all ${
                            preferences.analytics
                              ? "bg-purple-600 justify-end"
                              : "bg-gray-300 justify-start"
                          } px-1`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marketing Cookies */}
                  <div
                    className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                      preferences.marketing
                        ? "border-pink-300 bg-pink-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => handleTogglePreference("marketing")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaAd className="text-pink-600" />
                          <h4 className="font-semibold text-gray-800">
                            Cookies Marketing
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Αυτά τα cookies χρησιμοποιούνται για την παρακολούθηση
                          επισκεπτών σε ιστοσελίδες με σκοπό την εμφάνιση
                          διαφημίσεων που είναι σχετικές και ελκυστικές για τον
                          μεμονωμένο χρήστη.
                        </p>
                      </div>
                      <div className="ml-4">
                        <div
                          className={`w-12 h-6 rounded-full flex items-center transition-all ${
                            preferences.marketing
                              ? "bg-pink-600 justify-end"
                              : "bg-gray-300 justify-start"
                          } px-1`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={handleSavePreferences}
                    aria-label="Αποθήκευση προτιμήσεων cookies"
                    className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FaCheck />
                    Αποθήκευση Προτιμήσεων
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    aria-label="Αποδοχή όλων των cookies"
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all duration-200"
                  >
                    Αποδοχή Όλων
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Μπορείτε να αλλάξετε τις προτιμήσεις σας ανά πάσα στιγμή από
                  τις ρυθμίσεις cookies στο footer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
