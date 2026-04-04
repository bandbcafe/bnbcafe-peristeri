"use client";

import { useState } from "react";
import {
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaUser,
  FaPhone,
  FaEnvelope,
} from "react-icons/fa";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledData?: {
    customerName?: string;
    phone?: string;
    email?: string;
  };
}

export default function ReservationModal({
  isOpen,
  onClose,
  onSuccess,
  prefilledData,
}: ReservationModalProps) {
  const [formData, setFormData] = useState({
    customerName: prefilledData?.customerName || "",
    phone: prefilledData?.phone || "",
    email: prefilledData?.email || "",
    date: "",
    time: "",
    numberOfPeople: 2,
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "reservations"), {
        customerName: formData.customerName,
        phone: formData.phone,
        email: formData.email,
        date: formData.date,
        time: formData.time,
        numberOfPeople: formData.numberOfPeople,
        notes: formData.notes,
        status: "pending",
        source: "manual",
        createdAt: new Date(),
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating reservation:", error);
      alert("Σφάλμα κατά τη δημιουργία κράτησης");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaCalendarAlt className="text-2xl" />
              <h2 className="text-2xl font-bold">Νέα Κράτηση</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FaUser className="mr-2 text-purple-600" />
              Στοιχεία Πελάτη
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Όνομα *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Όνομα πελάτη"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Τηλέφωνο *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Τηλέφωνο"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Email (προαιρετικό)"
                />
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FaCalendarAlt className="mr-2 text-purple-600" />
              Στοιχεία Κράτησης
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ημερομηνία *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ώρα *
                </label>
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Άτομα *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="50"
                  value={formData.numberOfPeople}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfPeople: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Σημειώσεις
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Ειδικές παρατηρήσεις..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Αποθήκευση..." : "Δημιουργία Κράτησης"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
