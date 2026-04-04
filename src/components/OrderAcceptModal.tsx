"use client";

import { useState } from "react";
import {
  FaTimes,
  FaClock,
  FaCheck,
  FaBan,
  FaExclamationTriangle,
} from "react-icons/fa";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderAcceptModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (orderId: string, estimatedTime: number) => Promise<void>;
  onReject: (
    orderId: string,
    reason: string,
    missingItems?: string[]
  ) => Promise<void>;
  orderItems?: OrderItem[];
}

export default function OrderAcceptModal({
  orderId,
  isOpen,
  onClose,
  onAccept,
  onReject,
  orderItems = [],
}: OrderAcceptModalProps) {
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [accepting, setAccepting] = useState(false);
  const [showRejectOptions, setShowRejectOptions] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [selectedMissingItems, setSelectedMissingItems] = useState<string[]>(
    []
  );
  const [customReason, setCustomReason] = useState<string>("");

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(orderId, estimatedTime);
      onClose();
    } catch (error) {
      console.error("Error accepting order:", error);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      let finalReason = "";

      if (rejectReason === "missing_items" && selectedMissingItems.length > 0) {
        const itemNames = selectedMissingItems.map((itemId) => {
          const item = orderItems.find((i) => i.id === itemId);
          return item ? item.name : itemId;
        });
        finalReason = `Λείπουν προϊόντα: ${itemNames.join(", ")}`;
      } else if (rejectReason === "custom") {
        finalReason = customReason;
      } else {
        const reasons: Record<string, string> = {
          out_of_stock: "Εξαντλημένα προϊόντα",
          too_busy: "Πολύ μεγάλη ζήτηση αυτή τη στιγμή",
          delivery_unavailable: "Δεν μπορούμε να παραδώσουμε στην περιοχή",
          technical_issue: "Τεχνικό πρόβλημα",
        };
        finalReason = reasons[rejectReason] || "Άλλος λόγος";
      }

      await onReject(
        orderId,
        finalReason,
        selectedMissingItems.length > 0 ? selectedMissingItems : undefined
      );
      onClose();
      // Reset state
      setShowRejectOptions(false);
      setRejectReason("");
      setSelectedMissingItems([]);
      setCustomReason("");
    } catch (error) {
      console.error("Error rejecting order:", error);
    } finally {
      setRejecting(false);
    }
  };

  const toggleMissingItem = (itemId: string) => {
    setSelectedMissingItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div
          className={`${
            showRejectOptions
              ? "bg-gradient-to-r from-red-600 to-rose-600"
              : "bg-gradient-to-r from-green-600 to-emerald-600"
          } text-white p-6 rounded-t-2xl flex justify-between items-center sticky top-0 z-10`}
        >
          <div>
            <h2 className="text-xl font-bold">
              {showRejectOptions
                ? "Ακύρωση Παραγγελίας"
                : "Αποδοχή Παραγγελίας"}
            </h2>
            <p className="text-white/90 text-sm mt-1">
              {showRejectOptions
                ? "Επιλέξτε λόγο ακύρωσης"
                : "Ορίστε τον εκτιμώμενο χρόνο παράδοσης"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!showRejectOptions ? (
            <>
              {/* Accept Mode - Time Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <FaClock className="inline mr-2 text-[#C9AC7A]" />
                  Εκτιμώμενος Χρόνος Παράδοσης
                </label>

                {/* Quick Time Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[15, 20, 30, 45].map((time) => (
                    <button
                      key={time}
                      onClick={() => setEstimatedTime(time)}
                      className={`py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                        estimatedTime === time
                          ? "bg-gradient-to-r from-[#C9AC7A] to-[#9F7D41] text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {time}'
                    </button>
                  ))}
                </div>

                {/* Custom Time Input */}
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#C9AC7A] focus:outline-none text-center text-lg font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    λεπτά
                  </span>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Σημείωση:</strong> Ο πελάτης θα ενημερωθεί αυτόματα
                  για τον εκτιμώμενο χρόνο παράδοσης της παραγγελίας του.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectOptions(true)}
                  disabled={accepting}
                  className="px-6 py-3 border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FaBan />
                  Ακύρωση Παραγγελίας
                </button>
                <button
                  onClick={handleAccept}
                  disabled={accepting || estimatedTime < 5}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Αποδοχή...
                    </>
                  ) : (
                    <>
                      <FaCheck />
                      Αποδοχή
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Reject Mode - Reason Selection */}
              <div className="space-y-4">
                {/* Predefined Reasons */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <FaExclamationTriangle className="inline mr-2 text-red-600" />
                    Επιλέξτε Λόγο Ακύρωσης
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "out_of_stock", label: "Εξαντλημένα προϊόντα" },
                      {
                        value: "missing_items",
                        label: "Λείπουν συγκεκριμένα προϊόντα",
                      },
                      {
                        value: "too_busy",
                        label: "Πολύ μεγάλη ζήτηση αυτή τη στιγμή",
                      },
                      {
                        value: "delivery_unavailable",
                        label: "Δεν μπορούμε να παραδώσουμε στην περιοχή",
                      },
                      { value: "technical_issue", label: "Τεχνικό πρόβλημα" },
                      {
                        value: "custom",
                        label: "Άλλος λόγος (γράψτε παρακάτω)",
                      },
                    ].map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => {
                          setRejectReason(reason.value);
                          if (
                            reason.value !== "missing_items" &&
                            reason.value !== "custom"
                          ) {
                            setSelectedMissingItems([]);
                            setCustomReason("");
                          }
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          rejectReason === reason.value
                            ? "border-red-500 bg-red-50 text-red-900 font-semibold"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Missing Items Selection */}
                {rejectReason === "missing_items" && orderItems.length > 0 && (
                  <div className="bg-[#F2EBE0] border-2 border-[#D9C9B0] rounded-lg p-4">
                    <p className="text-sm font-semibold text-[#8B6B38] mb-3">
                      Επιλέξτε τα προϊόντα που λείπουν:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {orderItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-2 hover:bg-[#E8DFD3] rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMissingItems.includes(item.id)}
                            onChange={() => toggleMissingItem(item.id)}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-800">
                            {item.name} (x{item.quantity})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Reason Input */}
                {rejectReason === "custom" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Γράψτε τον λόγο ακύρωσης:
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="π.χ. Το κατάστημα κλείνει νωρίτερα σήμερα..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {/* Warning Box */}
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Προσοχή:</strong> Ο πελάτης θα ενημερωθεί αυτόματα
                    για την ακύρωση της παραγγελίας του με τον λόγο που θα
                    επιλέξετε.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectOptions(false);
                    setRejectReason("");
                    setSelectedMissingItems([]);
                    setCustomReason("");
                  }}
                  disabled={rejecting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Πίσω
                </button>
                <button
                  onClick={handleReject}
                  disabled={
                    rejecting ||
                    !rejectReason ||
                    (rejectReason === "missing_items" &&
                      selectedMissingItems.length === 0) ||
                    (rejectReason === "custom" && !customReason.trim())
                  }
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {rejecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Ακύρωση...
                    </>
                  ) : (
                    <>
                      <FaBan />
                      Επιβεβαίωση Ακύρωσης
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
