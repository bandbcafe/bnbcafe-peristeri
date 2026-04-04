"use client";

import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import Link from "next/link";
import {
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaFacebook,
  FaInstagram,
  FaEnvelope,
} from "react-icons/fa";

export default function CustomerFooter() {
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const isLoadingSettings = !isLoaded;

  // Helper function to format delivery hours for footer
  const formatFooterDeliveryHours = () => {
    if (!websiteSettings?.deliverySettings?.weeklyHours) {
      return { days: "Δευτέρα - Κυριακή", hours: "08:00 - 24:00" };
    }

    const weeklyHours = websiteSettings.deliverySettings.weeklyHours;
    const openDays: string[] = [];
    const closedDays: string[] = [];
    let commonHours = "";

    const dayNames = {
      monday: "Δευ",
      tuesday: "Τρι",
      wednesday: "Τετ",
      thursday: "Πεμ",
      friday: "Παρ",
      saturday: "Σαβ",
      sunday: "Κυρ",
    };

    // Check if all open days have the same hours
    let firstOpenHours = "";
    let allSameHours = true;

    // Use ordered days array to maintain consistent order
    const orderedDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    orderedDays.forEach((day) => {
      const hours = weeklyHours[day];
      const dayName = dayNames[day as keyof typeof dayNames];
      if (hours.isOpen) {
        const dayHours = `${hours.start}-${hours.end}`;
        if (!firstOpenHours) {
          firstOpenHours = dayHours;
        } else if (firstOpenHours !== dayHours) {
          allSameHours = false;
        }
        openDays.push(dayName);
      } else {
        closedDays.push(dayName);
      }
    });

    if (openDays.length === 0) {
      return { days: "Κλειστά", hours: "όλες τις μέρες" };
    }

    if (allSameHours && openDays.length === 7) {
      return { days: "Δευτέρα - Κυριακή", hours: firstOpenHours };
    }

    if (allSameHours) {
      const daysText =
        openDays.length > 3
          ? `${openDays[0]} - ${openDays[openDays.length - 1]}`
          : openDays.join(", ");
      return { days: daysText, hours: firstOpenHours };
    }

    // If different hours, show general info
    return { days: "Ανάλογα με τη μέρα", hours: "Δείτε λεπτομέρειες" };
  };
  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {isLoadingSettings ? (
                // Loading Skeleton
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ) : websiteSettings?.heroSection?.logo ? (
                // Custom Logo - with brightness filter for dark background
                <div className="h-14 flex items-center">
                  <img
                    src={
                      websiteSettings.footerLogo ||
                      websiteSettings.heroSection.logo
                    }
                    alt={websiteSettings?.heroSection?.title || "Logo"}
                    className="h-full w-auto object-contain"
                    style={
                      !websiteSettings.footerLogo
                        ? { filter: "brightness(0) invert(1)" }
                        : undefined
                    }
                  />
                </div>
              ) : (
                // Default Logo (text from settings)
                <>
                  <div className="w-12 h-12 bg-[#8B7355] rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-xl">
                      {(websiteSettings?.heroSection?.title || "").substring(
                        0,
                        3,
                      ) || "☕"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {websiteSettings?.heroSection?.title || ""}
                    </h3>
                    {websiteSettings?.heroSection?.subtitle && (
                      <p className="text-gray-400 font-medium truncate max-w-[200px]">
                        {websiteSettings.heroSection.subtitle}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            {websiteSettings?.heroSection?.subtitle && (
              <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
                {websiteSettings.heroSection.subtitle}
              </p>
            )}
            <div className="flex gap-4">
              {websiteSettings?.socialMedia?.facebook && (
                <a
                  href={websiteSettings.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Σελίδα Facebook"
                  className="w-10 h-10 bg-[#8B7355] hover:bg-[#A0826D] rounded-lg flex items-center justify-center transition-colors"
                >
                  <FaFacebook size={20} />
                </a>
              )}
              {websiteSettings?.socialMedia?.instagram && (
                <a
                  href={websiteSettings.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Σελίδα Instagram"
                  className="w-10 h-10 bg-[#8B7355] hover:bg-[#A0826D] rounded-lg flex items-center justify-center transition-colors"
                >
                  <FaInstagram size={20} />
                </a>
              )}
              {websiteSettings?.contactInfo?.email && (
                <a
                  href={`mailto:${websiteSettings.contactInfo.email}`}
                  aria-label="Αποστολή email"
                  className="w-10 h-10 bg-[#8B7355] hover:bg-[#A0826D] rounded-lg flex items-center justify-center transition-colors"
                >
                  <FaEnvelope size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-[#8B7355]">
              Γρήγοροι Σύνδεσμοι
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-[#8B7355] transition-colors font-medium"
                >
                  Αρχική
                </Link>
              </li>
              <li>
                <Link
                  href="/menu"
                  className="text-gray-300 hover:text-[#8B7355] transition-colors font-medium"
                >
                  Μενού
                </Link>
              </li>
              <li>
                <Link
                  href="/order"
                  className="text-gray-300 hover:text-[#8B7355] transition-colors font-medium"
                >
                  Online Παραγγελία
                </Link>
              </li>
              <li>
                <Link
                  href="/reservations"
                  className="text-gray-300 hover:text-[#8B7355] transition-colors font-medium"
                >
                  Κρατήσεις
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-[#8B7355] transition-colors font-medium"
                >
                  Επικοινωνία
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-[#8B7355]">
              Επικοινωνία
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-[#8B7355] mt-1" size={18} />
                <div>
                  <p className="text-gray-300 font-medium">
                    {websiteSettings?.contactInfo?.address?.street || ""}
                  </p>
                  <p className="text-gray-300 font-medium">
                    {websiteSettings?.contactInfo?.address?.postalCode || ""}{" "}
                    {websiteSettings?.contactInfo?.address?.city || ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FaPhone className="text-[#8B7355]" size={18} />
                <p className="text-gray-300 font-medium">
                  {websiteSettings?.contactInfo?.phone || ""}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <FaClock className="text-[#8B7355] mt-1" size={18} />
                <div>
                  <p className="text-gray-300 font-medium">
                    {formatFooterDeliveryHours().days}
                  </p>
                  <p className="text-gray-300 font-medium">
                    {formatFooterDeliveryHours().hours}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-gray-400 text-sm">
            <span className="font-medium">
              © {new Date().getFullYear()}{" "}
              {websiteSettings?.heroSection?.title || ""}. Όλα τα δικαιώματα
              διατηρούνται.
            </span>
            <span className="hidden sm:inline">|</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/privacy"
                className="hover:text-[#8B7355] font-medium transition-colors"
              >
                Πολιτική Απορρήτου
              </Link>
              <span>|</span>
              <Link
                href="/terms"
                className="hover:text-[#8B7355] font-medium transition-colors"
              >
                Όροι Χρήσης
              </Link>
              <span>|</span>
              <Link
                href="/cookies"
                className="hover:text-[#8B7355] font-medium transition-colors"
              >
                Cookies
              </Link>
              <span>|</span>
              <button
                onClick={() => {
                  localStorage.removeItem("cookieConsent");
                  window.location.reload();
                }}
                aria-label="Άνοιγμα ρυθμίσεων cookies"
                className="hover:text-[#8B7355] underline font-medium transition-colors"
              >
                Ρυθμίσεις Cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
