"use client";

import { useState, useEffect } from "react";
import {
  FaTools,
  FaClock,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface MaintenanceSettings {
  enabled: boolean;
  title: string;
  message: string;
  backgroundImage?: string;
  showLogo: boolean;
  showContactInfo: boolean;
  estimatedEndTime?: string;
}

interface WebsiteSettings {
  heroSection?: {
    logo?: string;
  };
  contactInfo?: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  maintenanceMode?: MaintenanceSettings;
}

export default function MaintenancePage() {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, "website_settings", "main");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSettings(docSnap.data() as WebsiteSettings);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatEstimatedTime = (dateTimeString?: string) => {
    if (!dateTimeString) return null;

    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString("el-GR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F0E8] via-white to-[#F2EBE0]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#C9AC7A]"></div>
      </div>
    );
  }

  const maintenanceSettings = settings?.maintenanceMode;
  const backgroundImage = maintenanceSettings?.backgroundImage;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image or Gradient */}
      {backgroundImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#F5F0E8] via-white to-[#F2EBE0]">
          {/* Decorative Circles */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#C9AC7A]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9F7D41]/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9AC7A]/5 rounded-full blur-3xl" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl w-full">
          {/* Logo */}
          {maintenanceSettings?.showLogo && settings?.heroSection?.logo && (
            <div className="flex justify-center mb-8 animate-fade-in">
              <img
                src={settings.heroSection.logo}
                alt="Logo"
                className="h-20 sm:h-24 md:h-28 w-auto drop-shadow-2xl"
              />
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border-2 border-[#D9C9B0] p-8 sm:p-12 md:p-16 animate-slide-up">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-[#C9AC7A]/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-[#C9AC7A] to-[#9F7D41] p-6 rounded-full">
                  <FaTools className="text-white text-5xl sm:text-6xl animate-bounce-slow" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-6 bg-gradient-to-r from-[#C9AC7A] to-[#9F7D41] bg-clip-text text-transparent">
              {maintenanceSettings?.title || "Είμαστε σε Συντήρηση"}
            </h1>

            {/* Message */}
            <p className="text-lg sm:text-xl text-gray-700 text-center mb-8 leading-relaxed max-w-2xl mx-auto">
              {maintenanceSettings?.message ||
                "Η ιστοσελίδα μας βρίσκεται προσωρινά σε συντήρηση. Θα επιστρέψουμε σύντομα!"}
            </p>

            {/* Estimated End Time */}
            {maintenanceSettings?.estimatedEndTime && (
              <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-gradient-to-r from-[#F5F0E8] to-[#F2EBE0] rounded-xl border border-[#D9C9B0]">
                <FaClock className="text-[#C9AC7A] text-2xl flex-shrink-0" />
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">
                    Εκτιμώμενη Επαναλειτουργία:
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatEstimatedTime(maintenanceSettings.estimatedEndTime)}
                  </p>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500 font-medium">
                  Παραμένουμε στη διάθεσή σας
                </span>
              </div>
            </div>

            {/* Contact Info */}
            {maintenanceSettings?.showContactInfo && settings?.contactInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Phone */}
                <a
                  href={`tel:${settings.contactInfo.phone}`}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-[#F5F0E8] to-white rounded-xl border-2 border-[#D9C9B0] hover:border-[#C9AC7A] hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="p-4 bg-gradient-to-br from-[#C9AC7A] to-[#9F7D41] rounded-full group-hover:scale-110 transition-transform">
                    <FaPhone className="text-white text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      Τηλέφωνο
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      {settings.contactInfo.phone}
                    </p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${settings.contactInfo.email}`}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-[#F5F0E8] to-white rounded-xl border-2 border-[#D9C9B0] hover:border-[#C9AC7A] hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="p-4 bg-gradient-to-br from-[#C9AC7A] to-[#9F7D41] rounded-full group-hover:scale-110 transition-transform">
                    <FaEnvelope className="text-white text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      Email
                    </p>
                    <p className="text-sm font-bold text-gray-800 break-all">
                      {settings.contactInfo.email}
                    </p>
                  </div>
                </a>

                {/* Address */}
                <div className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-[#F5F0E8] to-white rounded-xl border-2 border-[#D9C9B0]">
                  <div className="p-4 bg-gradient-to-br from-[#C9AC7A] to-[#9F7D41] rounded-full">
                    <FaMapMarkerAlt className="text-white text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      Διεύθυνση
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      {settings.contactInfo.address.street}
                    </p>
                    <p className="text-xs text-gray-600">
                      {settings.contactInfo.address.city},{" "}
                      {settings.contactInfo.address.postalCode}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Message */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Ευχαριστούμε για την κατανόησή σας! 🙏
              </p>
            </div>
          </div>

          {/* Admin Link */}
          <div className="mt-8 text-center">
            <a
              href="/admin/website"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#C9AC7A] transition-colors"
            >
              <FaTools />
              Διαχείριση Maintenance Mode
            </a>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
