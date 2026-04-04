"use client";

import { useState } from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";

interface WebsiteSettings {
  heroSection?: {
    title?: string;
    subtitle?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
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
  reservationSettings?: {
    maxGuests?: number;
    advanceBookingDays?: number;
    cancellationHours?: number;
    depositRequired?: boolean;
    depositAmount?: number;
    tableHoldMinutes?: number;
    requireEmail?: boolean;
  };
  pageHeaders?: {
    menu?: string;
    reservations?: string;
    contact?: string;
  };
}

export default function CustomerReservationsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    guests: "2",
    specialRequests: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });
  const { websiteSettings } = useWebsiteSettings();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
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
    setIsSubmitting(true);

    try {
      setFormStatus({ type: "loading", message: "Αποστολή κράτησης..." });

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          status: "pending",
          createdAt: new Date(),
          source: "website",
        }),
      });

      if (response.ok) {
        setFormStatus({
          type: "success",
          message:
            "Η κράτησή σας καταχωρήθηκε επιτυχώς! Θα επικοινωνήσουμε μαζί σας σύντομα για επιβεβαίωση.",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          date: "",
          time: "",
          guests: "2",
          specialRequests: "",
        });

        // Hide success message after 5 seconds
        setTimeout(() => setFormStatus({ type: null, message: "" }), 5000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit reservation");
      }
    } catch (error: any) {
      setFormStatus({
        type: "error",
        message:
          error.message ||
          "Σφάλμα κατά την αποστολή της κράτησης. Παρακαλώ δοκιμάστε ξανά.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 12; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      timeSlots.push(timeString);
    }
  }

  // Get today's date for min date
  const today = new Date().toISOString().split("T")[0];

  // Format business hours for display
  const formatBusinessHours = () => {
    if (!websiteSettings?.deliverySettings?.weeklyHours) {
      return "Δευτέρα - Κυριακή: 12:00 - 23:00";
    }

    const hours = websiteSettings.deliverySettings.weeklyHours;
    const daysInGreek = {
      monday: "Δευτέρα",
      tuesday: "Τρίτη",
      wednesday: "Τετάρτη",
      thursday: "Πέμπτη",
      friday: "Παρασκευή",
      saturday: "Σάββατο",
      sunday: "Κυριακή",
    };

    // Group consecutive days with same hours
    const openDays = Object.entries(hours)
      .filter(([_, dayInfo]) => (dayInfo as any).isOpen)
      .map(([day, dayInfo]) => ({
        day: daysInGreek[day as keyof typeof daysInGreek],
        hours: `${(dayInfo as any).start} - ${(dayInfo as any).end}`,
      }));

    if (openDays.length === 0) return "Κλειστά";

    // If all days have same hours, show as range
    const firstHours = openDays[0].hours;
    if (openDays.every((d) => d.hours === firstHours)) {
      return `${openDays[0].day} - ${
        openDays[openDays.length - 1].day
      }: ${firstHours}`;
    }

    return openDays.map((d) => `${d.day}: ${d.hours}`).join(", ");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Custom Header Image */}
      <section
        className="relative bg-black py-28 md:py-36 overflow-hidden"
        style={{
          backgroundImage: websiteSettings?.pageHeaders?.reservations
            ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${websiteSettings.pageHeaders.reservations})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Κλείστε Τραπέζι
            </h1>
            <p className="text-xl sm:text-2xl mb-8 leading-relaxed opacity-90">
              Κάντε κράτηση για μια αξέχαστη εμπειρία
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm sm:text-base">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <FaClock className="text-[#8B7355]" />
                <span>Άμεση Επιβεβαίωση</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <FaUsers className="text-[#8B7355]" />
                <span>
                  Έως {websiteSettings?.reservationSettings?.maxGuests || 12}{" "}
                  Άτομα
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <FaPhone className="text-[#8B7355]" />
                <span>{websiteSettings?.contactInfo?.phone || ""}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Status Messages */}
          {formStatus.type && (
            <div className="max-w-4xl mx-auto mb-8">
              <div
                className={`px-6 py-4 rounded-lg flex items-center gap-3 shadow-md ${
                  formStatus.type === "success"
                    ? "bg-green-100/80 border border-green-300 text-green-800"
                    : formStatus.type === "error"
                      ? "bg-red-100/80 border border-red-300 text-red-800"
                      : "bg-blue-100/80 border border-blue-300 text-blue-800"
                }`}
              >
                {formStatus.type === "success" && (
                  <FaCheckCircle className="text-green-600 text-xl" />
                )}
                {formStatus.type === "error" && (
                  <FaExclamationTriangle className="text-red-600 text-xl" />
                )}
                {formStatus.type === "loading" && (
                  <FaSpinner className="text-blue-600 text-xl animate-spin" />
                )}
                <div>
                  <p className="font-semibold">{formStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Left Column - Restaurant Info */}
            <div className="xl:col-span-1 space-y-6">
              {/* Restaurant Details Card */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    {websiteSettings?.heroSection?.title || ""}
                  </h3>
                  <p className="text-slate-600">
                    {websiteSettings?.heroSection?.subtitle ||
                      "Αυθεντικές γεύσεις με φρέσκα υλικά"}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaPhone className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Τηλέφωνο</p>
                      <p className="font-semibold text-slate-800">
                        {websiteSettings?.contactInfo?.phone || ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaMapMarkerAlt className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Διεύθυνση</p>
                      <p className="font-semibold text-slate-800">
                        {websiteSettings?.contactInfo?.address?.street || ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        {websiteSettings?.contactInfo?.address?.postalCode ||
                          ""}{" "}
                        {websiteSettings?.contactInfo?.address?.city || ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[#8B7355] rounded-lg flex items-center justify-center">
                      <FaClock className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Ωράριο</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {formatBusinessHours()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policies Card */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  Πολιτική Κρατήσεων
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B7355] mt-1">•</span>
                    <span>
                      Οι κρατήσεις επιβεβαιώνονται τηλεφωνικά ή μέσω email
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B7355] mt-1">•</span>
                    <span>
                      Ακύρωση τουλάχιστον{" "}
                      {websiteSettings?.reservationSettings
                        ?.cancellationHours || 2}{" "}
                      ώρες νωρίτερα
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B7355] mt-1">•</span>
                    <span>
                      Το τραπέζι διατηρείται για{" "}
                      {websiteSettings?.reservationSettings?.tableHoldMinutes ||
                        15}{" "}
                      λεπτά
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B7355] mt-1">•</span>
                    <span>
                      Για ομάδες άνω των 8 ατόμων μπορεί να απαιτηθεί
                      προκαταβολή
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - Reservation Form */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 lg:p-10">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-slate-800 mb-3">
                    Κλείστε το Τραπέζι σας
                  </h2>
                  <p className="text-slate-600">
                    Συμπληρώστε τα στοιχεία σας για να κάνετε κράτηση
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                      👤 Στοιχεία Επικοινωνίας
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Ονοματεπώνυμο *
                        </label>
                        <div className="relative">
                          <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 antialiased" />
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-[#8B7355] transition-all duration-300 bg-white"
                            placeholder="Το όνομά σας"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Τηλέφωνο *
                        </label>
                        <div className="relative">
                          <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 antialiased" />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-[#8B7355] transition-all duration-300 bg-white"
                            placeholder="Το τηλέφωνό σας"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Email{" "}
                        {!websiteSettings?.reservationSettings?.requireEmail &&
                          "(προαιρετικό)"}
                      </label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 antialiased" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#C9AC7A] focus:border-[#C9AC7A] transition-all duration-300 bg-white"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reservation Details Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                      📅 Στοιχεία Κράτησης
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Ημερομηνία *
                        </label>
                        <div className="relative">
                          <FaCalendarAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 antialiased" />
                          <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            min={today}
                            required
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-[#8B7355] transition-all duration-300 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Ώρα *
                        </label>
                        <div className="relative">
                          <FaClock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 antialiased" />
                          <select
                            name="time"
                            value={formData.time}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#C9AC7A] focus:border-[#C9AC7A] transition-all duration-300 bg-white appearance-none"
                          >
                            <option value="">Επιλέξτε ώρα</option>
                            {timeSlots.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Άτομα *
                        </label>
                        <div className="relative">
                          <FaUsers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 antialiased" />
                          <select
                            name="guests"
                            value={formData.guests}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#C9AC7A] focus:border-[#C9AC7A] transition-all duration-300 bg-white appearance-none"
                          >
                            {[
                              ...Array(
                                websiteSettings?.reservationSettings
                                  ?.maxGuests || 12,
                              ),
                            ].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} άτομο{i > 0 ? "α" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Requests Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                      📝 Ειδικές Παρατηρήσεις
                    </h3>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Μήνυμα (προαιρετικό)
                      </label>
                      <textarea
                        name="specialRequests"
                        value={formData.specialRequests}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B7355] focus:border-[#8B7355] transition-all duration-300 bg-white resize-none"
                        placeholder="Αλλεργίες, διατροφικές προτιμήσεις, ειδικές αιτήσεις..."
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#8B7355] hover:bg-[#A0826D] disabled:bg-gray-400 text-white py-4 px-8 rounded-lg font-bold text-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-wide"
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin text-xl" />
                          Αποστολή κράτησης...
                        </>
                      ) : (
                        <>
                          <FaCalendarAlt className="text-xl" />
                          Κλείσιμο Τραπεζιού
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
