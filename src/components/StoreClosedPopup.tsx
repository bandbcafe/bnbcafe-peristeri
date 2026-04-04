"use client";

import { useState, useEffect } from "react";
import { FaClock, FaTimes } from "react-icons/fa";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

const dayKeys = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const dayNamesGreek: Record<string, string> = {
  monday: "Δευτέρα",
  tuesday: "Τρίτη",
  wednesday: "Τετάρτη",
  thursday: "Πέμπτη",
  friday: "Παρασκευή",
  saturday: "Σάββατο",
  sunday: "Κυριακή",
};

function getNextOpenInfo(weeklyHours: any): string | null {
  if (!weeklyHours) return null;

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0=Sun

  // Check today first (if we're before opening time), then next 7 days
  for (let offset = 0; offset < 7; offset++) {
    const checkDayIndex = (currentDayIndex + offset) % 7;
    const dayKey = dayKeys[checkDayIndex];
    const hours = weeklyHours[dayKey];

    if (hours && hours.isOpen) {
      if (offset === 0) {
        // Today — check if store opens later today
        const [startH, startM] = (hours.start || "12:00")
          .split(":")
          .map(Number);
        const openTime = new Date(now);
        openTime.setHours(startH, startM, 0, 0);

        if (now < openTime) {
          return `Σήμερα στις ${hours.start}`;
        }

        // Check if store is still open (we might be past closing time)
        const [endH, endM] = (hours.end || "23:00").split(":").map(Number);
        const closeTime = new Date(now);
        closeTime.setHours(endH, endM, 0, 0);

        if (now < closeTime) {
          // Store is currently open — no popup needed
          return null;
        }

        // Past closing, check next days
        continue;
      }

      const dayName = dayNamesGreek[dayKey] || dayKey;
      return `${dayName} στις ${hours.start}`;
    }
  }

  return null;
}

function isStoreCurrentlyOpen(weeklyHours: any): boolean {
  if (!weeklyHours) return true; // Default: open if no hours configured

  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const hours = weeklyHours[dayKey];

  if (!hours || !hours.isOpen) return false;

  const [startH, startM] = (hours.start || "00:00").split(":").map(Number);
  const [endH, endM] = (hours.end || "23:59").split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export default function StoreClosedPopup() {
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const weeklyHours = websiteSettings?.deliverySettings?.weeklyHours;

  useEffect(() => {
    if (!isLoaded || !weeklyHours) return;
    setIsOpen(isStoreCurrentlyOpen(weeklyHours));

    // Re-check every minute
    const interval = setInterval(() => {
      setIsOpen(isStoreCurrentlyOpen(weeklyHours));
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoaded, weeklyHours]);

  if (!isLoaded || isOpen || dismissed) return null;

  const nextOpen = getNextOpenInfo(weeklyHours);

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-[#8B7355] p-6 text-white text-center relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
          <FaClock className="text-5xl mx-auto mb-3 opacity-90" />
          <h2 className="text-2xl font-bold">Αυτή τη στιγμή είμαστε κλειστά</h2>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          {nextOpen ? (
            <>
              <p className="text-gray-600 text-lg mb-2">Ανοίγουμε ξανά:</p>
              <p className="text-2xl font-bold text-gray-800">{nextOpen}</p>
            </>
          ) : (
            <p className="text-gray-600 text-lg">
              Δεν υπάρχει διαθέσιμο πρόγραμμα λειτουργίας αυτή τη στιγμή.
            </p>
          )}

          <p className="text-gray-500 text-sm mt-4">
            Μπορείτε να περιηγηθείτε στο μενού μας και να παραγγείλετε όταν
            ανοίξουμε.
          </p>

          <button
            onClick={() => setDismissed(true)}
            className="mt-6 px-8 py-3 bg-[#8B7355] hover:bg-[#6B5A45] text-white rounded-full font-semibold transition-colors shadow-md"
          >
            Κατάλαβα
          </button>
        </div>
      </div>
    </div>
  );
}
