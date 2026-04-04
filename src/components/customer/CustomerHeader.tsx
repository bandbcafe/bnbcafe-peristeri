"use client";

import { useState, useEffect } from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser, clearUserSession } from "@/utils/auth";
import {
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaBars,
  FaTimes,
  FaShoppingCart,
  FaUser,
  FaEnvelope,
  FaChevronDown,
  FaSignInAlt,
  FaUserPlus,
  FaUserCircle,
  FaHistory,
  FaSignOutAlt,
  FaDirections,
  FaExternalLinkAlt,
} from "react-icons/fa";
import CartSidebar from "./CartSidebar";

export default function CustomerHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressPopup, setIsAddressPopup] = useState(false);
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const isLoadingSettings = !isLoaded;
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    updateCartCount();
    checkAuthStatus();

    // Listen for cart updates
    const handleStorageChange = () => {
      updateCartCount();
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-dropdown")) {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cartUpdated", handleStorageChange);
    window.addEventListener("authChanged", checkAuthStatus);
    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cartUpdated", handleStorageChange);
      window.removeEventListener("authChanged", checkAuthStatus);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("customerCart") || "[]");
      const totalItems = cart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
      );
      setCartItemCount(totalItems);
    } catch (error) {
      console.error("Error updating cart count:", error);
      setCartItemCount(0);
    }
  };

  const checkAuthStatus = () => {
    try {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const handleLogout = () => {
    clearUserSession();
    setUser(null);
    setIsLoggedIn(false);
    setIsUserMenuOpen(false);
    window.dispatchEvent(new Event("authChanged"));
  };

  // Helper function to get today's name in Greek
  const getTodayNameGreek = () => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const greekDayNames = [
      "Κυριακή",
      "Δευτέρα",
      "Τρίτη",
      "Τετάρτη",
      "Πέμπτη",
      "Παρασκευή",
      "Σάββατο",
    ];
    return greekDayNames[today];
  };

  // Helper function to format delivery hours for header
  const formatHeaderDeliveryHours = () => {
    if (!websiteSettings?.deliverySettings?.weeklyHours) {
      return "08:00 - 24:00";
    }

    const weeklyHours = websiteSettings.deliverySettings.weeklyHours;
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayKey = dayNames[today];

    const todayHours = weeklyHours[todayKey];

    if (todayHours && todayHours.isOpen) {
      return `${todayHours.start} - ${todayHours.end}`;
    } else {
      return "Κλειστά";
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* Top Info Bar */}
      <div className="bg-[#1a1a1a] text-white py-1.5 px-4 w-full">
        <div className="flex justify-between items-center text-xs">
          {/* Left side - Phone and Address */}
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href={`tel:${websiteSettings?.contactInfo?.phone || ""}`}
              className="flex items-center gap-1.5 hover:text-[#C9AC7A] transition-colors"
            >
              <FaPhone size={10} />
              <span className="whitespace-nowrap font-medium">
                {websiteSettings?.contactInfo?.phone || ""}
              </span>
            </a>
            {/* Address - clickable popup */}
            <button
              onClick={() => setIsAddressPopup(true)}
              className="hidden sm:flex items-center gap-1.5 hover:text-[#C9AC7A] transition-colors"
            >
              <FaMapMarkerAlt size={10} />
              <span className="whitespace-nowrap font-medium underline decoration-dotted underline-offset-2">
                {websiteSettings?.contactInfo?.address?.street || ""},{" "}
                {websiteSettings?.contactInfo?.address?.city || ""}
              </span>
            </button>
          </div>

          {/* Right side - Hours */}
          <div className="flex items-center gap-1.5">
            <FaClock size={10} />
            <span className="whitespace-nowrap font-medium">
              {getTodayNameGreek()}: {formatHeaderDeliveryHours()}
            </span>
          </div>
        </div>
      </div>

      {/* Address Popup */}
      {isAddressPopup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setIsAddressPopup(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1a1a1a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FaMapMarkerAlt className="text-[#C9AC7A]" />Η Τοποθεσία μας
              </h3>
              <button
                onClick={() => setIsAddressPopup(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {websiteSettings?.heroSection?.title || ""}
                </p>
                <p className="text-gray-600 mt-1">
                  {websiteSettings?.contactInfo?.address?.street || ""}
                </p>
                <p className="text-gray-600">
                  {websiteSettings?.contactInfo?.address?.postalCode || ""}{" "}
                  {websiteSettings?.contactInfo?.address?.city || ""}
                </p>
              </div>
              {websiteSettings?.contactInfo?.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <FaPhone className="text-[#8B7355]" />
                  <a
                    href={`tel:${websiteSettings.contactInfo.phone}`}
                    className="hover:text-[#8B7355] font-medium"
                  >
                    {websiteSettings.contactInfo.phone}
                  </a>
                </div>
              )}
              {websiteSettings?.contactInfo?.email && (
                <div className="flex items-center gap-3 text-gray-700">
                  <FaEnvelope className="text-[#8B7355]" />
                  <a
                    href={`mailto:${websiteSettings.contactInfo.email}`}
                    className="hover:text-[#8B7355] font-medium"
                  >
                    {websiteSettings.contactInfo.email}
                  </a>
                </div>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${websiteSettings?.contactInfo?.address?.street || ""}, ${websiteSettings?.contactInfo?.address?.city || ""}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#8B7355] hover:bg-[#A0826D] text-white py-3 rounded-xl font-bold transition-colors"
              >
                <FaDirections size={18} />
                Οδηγίες στο Google Maps
                <FaExternalLinkAlt size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between py-3 sm:py-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isLoadingSettings ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="hidden xs:block space-y-2">
                  <div className="h-6 sm:h-8 w-32 sm:w-40 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ) : websiteSettings?.heroSection?.logo ? (
              <div className="h-10 sm:h-14 flex items-center py-1">
                <img
                  src={websiteSettings.heroSection.logo}
                  alt={websiteSettings?.heroSection?.title || "Logo"}
                  className="h-full w-auto object-contain max-w-[180px] sm:max-w-[220px]"
                />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#8B7355] rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg sm:text-xl">
                    {(websiteSettings?.heroSection?.title || "").substring(
                      0,
                      2,
                    ) || "☕"}
                  </span>
                </div>
                <div className="hidden xs:block">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {websiteSettings?.heroSection?.title || ""}
                  </h1>
                </div>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "/", label: "Αρχική" },
              { href: "/menu", label: "Μενού" },
              { href: "/reservations", label: "Κρατήσεις" },
              { href: "/contact", label: "Επικοινωνία" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-2 text-gray-700 hover:text-[#8B7355] font-semibold transition-colors text-sm uppercase tracking-wider after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0.5 after:bg-[#8B7355] after:transition-all after:duration-300 hover:after:w-3/4"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Άνοιγμα καλαθιού"
              className="relative p-2 text-gray-700 hover:text-[#8B7355] transition-colors"
            >
              <FaShoppingCart size={20} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative user-dropdown">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="Μενού χρήστη"
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-2 p-2 text-gray-700 hover:text-[#8B7355] transition-colors"
              >
                <FaUser size={20} />
                <FaChevronDown size={12} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  {!isLoggedIn ? (
                    // Not logged in menu
                    <div className="py-2">
                      <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FaSignInAlt className="text-[#8B7355]" />
                        <span className="font-medium">Σύνδεση</span>
                      </Link>
                      <Link
                        href="/register"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FaUserPlus className="text-[#8B7355]" />
                        <span className="font-medium">Εγγραφή</span>
                      </Link>
                    </div>
                  ) : (
                    // Logged in menu
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm text-gray-500">Συνδεδεμένος ως</p>
                        <p className="font-semibold text-black">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email || "Χρήστης"}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FaUserCircle className="text-[#8B7355]" />
                        <span className="font-medium">Προφίλ</span>
                      </Link>
                      <Link
                        href="/orders"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FaHistory className="text-[#8B7355]" />
                        <span className="font-medium">
                          Προηγούμενες Παραγγελίες
                        </span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FaSignOutAlt className="text-black" />
                        <span className="font-medium">Αποσύνδεση</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Άνοιγμα καλαθιού"
              className="relative p-2 text-gray-700 hover:text-[#8B7355] transition-colors"
            >
              <FaShoppingCart size={18} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
              aria-expanded={isMenuOpen}
              className="p-2 text-gray-700 hover:text-[#8B7355]"
            >
              {isMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 px-2 bg-white">
            <nav className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-gray-700 hover:text-[#8B7355] font-semibold py-2 px-2 rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Αρχική
              </Link>
              <Link
                href="/menu"
                className="text-gray-700 hover:text-[#8B7355] font-semibold py-2 px-2 rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Μενού
              </Link>
              <Link
                href="/reservations"
                className="text-gray-700 hover:text-[#8B7355] font-semibold py-2 px-2 rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Κρατήσεις
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-[#8B7355] font-semibold py-2 px-2 rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Επικοινωνία
              </Link>
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 text-gray-700 hover:text-[#8B7355] font-semibold mb-4 w-full"
                >
                  <FaShoppingCart size={20} />
                  <span>Καλάθι</span>
                  {cartItemCount > 0 && (
                    <span className="bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {!isLoggedIn ? (
                  <div className="space-y-2">
                    <Link
                      href="/login"
                      className="flex items-center gap-3 text-gray-700 hover:text-[#8B7355] font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaSignInAlt />
                      <span>Σύνδεση</span>
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center gap-3 text-gray-700 hover:text-[#8B7355] font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaUserPlus />
                      <span>Εγγραφή</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 mb-2 font-medium">
                      Συνδεδεμένος:{" "}
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email || "Χρήστης"}
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 text-gray-700 hover:text-[#8B7355] font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaUserCircle />
                      <span>Προφίλ</span>
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 text-gray-700 hover:text-[#8B7355] font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaHistory />
                      <span>Παραγγελίες</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 text-gray-700 hover:text-black font-semibold"
                    >
                      <FaSignOutAlt />
                      <span>Αποσύνδεση</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
