"use client";

import { useState } from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import Image from "next/image";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaWhatsapp,
  FaPaperPlane,
  FaUser,
  FaComments,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";

interface WebsiteSettings {
  heroSection?: {
    backgroundImages: string[];
    title: string;
    subtitle: string;
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
  businessInfo?: {
    name?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      whatsapp?: string;
    };
  };
  deliverySettings?: {
    weeklyHours?: {
      [key: string]: {
        isOpen: boolean;
        start: string;
        end: string;
      };
    };
  };
  pageHeaders?: {
    menu?: string;
    reservations?: string;
    contact?: string;
  };
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const { websiteSettings } = useWebsiteSettings();
  const [formData, setFormData] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus({ type: "loading", message: "Αποστολή μηνύματος..." });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormStatus({
          type: "success",
          message:
            "Το μήνυμά σας στάλθηκε επιτυχώς! Θα επικοινωνήσουμε μαζί σας σύντομα.",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        throw new Error("Αποτυχία αποστολής");
      }
    } catch (error) {
      setFormStatus({
        type: "error",
        message:
          "Σφάλμα κατά την αποστολή του μηνύματος. Παρακαλώ δοκιμάστε ξανά.",
      });
    }
  };

  // Helper function to format delivery hours
  const formatDeliveryHours = () => {
    if (!websiteSettings?.deliverySettings?.weeklyHours) {
      return "Δευτέρα - Κυριακή: 12:00 - 23:00";
    }

    const dayNames = {
      monday: "Δευ",
      tuesday: "Τρι",
      wednesday: "Τετ",
      thursday: "Πεμ",
      friday: "Παρ",
      saturday: "Σαβ",
      sunday: "Κυρ",
    };

    const weeklyHours = websiteSettings.deliverySettings.weeklyHours;
    const openDays: string[] = [];

    Object.entries(weeklyHours).forEach(([day, hours]: [string, any]) => {
      const dayName = dayNames[day as keyof typeof dayNames];
      if (hours.isOpen) {
        openDays.push(`${dayName}: ${hours.start}-${hours.end}`);
      }
    });

    return openDays.length > 0 ? openDays.join(", ") : "Κλειστά όλες τις μέρες";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Custom Header Image */}
      <section
        className="relative bg-black py-28 sm:py-32 md:py-36 lg:py-40"
        style={{
          backgroundImage: websiteSettings?.pageHeaders?.contact
            ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${websiteSettings.pageHeaders.contact})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            Επικοινωνήστε Μαζί Μας
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed px-4">
            Είμαστε εδώ για να σας εξυπηρετήσουμε. Στείλτε μας το μήνυμά σας ή
            επισκεφθείτε μας στο κατάστημά μας.
          </p>
        </div>
      </section>

      {/* Contact Information & Form */}
      <section className="py-8 sm:py-12 lg:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Contact Information */}
            <div className="space-y-6 lg:space-y-8 h-full flex flex-col">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">
                  Στοιχεία Επικοινωνίας
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Επικοινωνήστε μαζί μας για παραγγελίες, κρατήσεις ή
                  οποιαδήποτε ερώτηση έχετε.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4 sm:space-y-6 flex-1">
                {/* Phone */}
                <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaPhone className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Τηλέφωνο
                      </h3>
                      <p className="text-gray-600">
                        {websiteSettings?.contactInfo?.phone || ""}
                      </p>
                      {websiteSettings?.deliverySettings?.weeklyHours && (
                        <p className="text-sm text-gray-500">
                          {(() => {
                            const wh =
                              websiteSettings.deliverySettings.weeklyHours;
                            const days = Object.values(wh);
                            const openDays = days.filter((d: any) => d.isOpen);
                            if (openDays.length === 0) return "Κλειστά";
                            const first = openDays[0] as any;
                            const allSame = openDays.every(
                              (d: any) =>
                                d.start === first.start && d.end === first.end,
                            );
                            if (allSame)
                              return `Καθημερινά ${first.start} - ${first.end}`;
                            return "Δείτε ωράριο";
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaEnvelope className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Email
                      </h3>
                      <p className="text-gray-600">
                        {websiteSettings?.contactInfo?.email || ""}
                      </p>
                      <p className="text-sm text-gray-500">
                        Απαντάμε εντός 24 ωρών
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaMapMarkerAlt className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Διεύθυνση
                      </h3>
                      <p className="text-gray-600">
                        {websiteSettings?.contactInfo?.address?.street || ""}
                      </p>
                      <p className="text-gray-600">
                        {websiteSettings?.contactInfo?.address?.postalCode ||
                          ""}{" "}
                        {websiteSettings?.contactInfo?.address?.city || ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaClock className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Ωράριο Λειτουργίας
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {formatDeliveryHours()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Ακολουθήστε μας
                </h3>
                <div className="flex gap-4">
                  <a
                    href={
                      websiteSettings?.businessInfo?.socialMedia?.facebook ||
                      "#"
                    }
                    className="w-10 h-10 bg-[#8B7355] rounded-lg flex items-center justify-center text-white hover:bg-[#A0826D] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaFacebook />
                  </a>
                  <a
                    href={
                      websiteSettings?.businessInfo?.socialMedia?.instagram ||
                      "#"
                    }
                    className="w-10 h-10 bg-[#8B7355] rounded-lg flex items-center justify-center text-white hover:bg-[#A0826D] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaInstagram />
                  </a>
                  <a
                    href={
                      websiteSettings?.businessInfo?.socialMedia?.whatsapp ||
                      "#"
                    }
                    className="w-10 h-10 bg-[#8B7355] rounded-lg flex items-center justify-center text-white hover:bg-[#A0826D] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaWhatsapp />
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md h-full flex flex-col border border-gray-200">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
                Στείλτε μας Μήνυμα
              </h2>

              {/* Form Status */}
              {formStatus.type && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    formStatus.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : formStatus.type === "error"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  {formStatus.type === "success" && <FaCheckCircle />}
                  {formStatus.type === "error" && <FaExclamationTriangle />}
                  {formStatus.type === "loading" && (
                    <FaSpinner className="animate-spin" />
                  )}
                  <span>{formStatus.message}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-4 sm:space-y-6 flex-1 flex flex-col"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Όνομα *
                    </label>
                    <div className="relative">
                      <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
                        placeholder="Το όνομά σας"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τηλέφωνο
                    </label>
                    <div className="relative">
                      <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
                        placeholder="Το τηλέφωνό σας"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Θέμα *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
                    >
                      <option value="">Επιλέξτε θέμα</option>
                      <option value="order">Παραγγελία</option>
                      <option value="reservation">Κράτηση</option>
                      <option value="complaint">Παράπονο</option>
                      <option value="suggestion">Πρόταση</option>
                      <option value="other">Άλλο</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Μήνυμα *
                  </label>
                  <div className="relative h-full">
                    <FaComments className="absolute left-3 top-4 text-gray-400 z-10" />
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full h-full min-h-[120px] pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-transparent resize-none"
                      placeholder="Γράψτε το μήνυμά σας εδώ..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formStatus.type === "loading"}
                  className="w-full bg-[#8B7355] hover:bg-[#A0826D] text-white py-3 sm:py-4 px-6 rounded-lg font-bold text-base sm:text-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mt-auto uppercase tracking-wide"
                >
                  {formStatus.type === "loading" ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Αποστολή...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Αποστολή Μηνύματος
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Βρείτε μας
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Επισκεφθείτε το κατάστημά μας για μια μοναδική εμπειρία γεύσης
            </p>
          </div>

          {/* Google Maps Embed */}
          <div className="rounded-lg overflow-hidden shadow-md border border-gray-200">
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                `${
                  websiteSettings?.contactInfo?.address?.street || ""
                }, ${websiteSettings?.contactInfo?.address?.postalCode || ""} ${
                  websiteSettings?.contactInfo?.address?.city || ""
                }, Ελλάδα`,
              )}&output=embed`}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-64 sm:h-80 lg:h-96"
              title={`Χάρτης - ${
                websiteSettings?.contactInfo?.address?.street || ""
              }`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
