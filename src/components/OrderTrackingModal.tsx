"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getCurrentUser } from "@/utils/auth";
import {
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaUtensils,
  FaBoxOpen,
  FaTruck,
  FaMapMarkerAlt,
} from "react-icons/fa";

interface OrderTrackingModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface OrderData {
  status: string;
  estimatedDeliveryTime: number | null;
  acceptedAt: any;
  preparingAt: any;
  readyAt: any;
  deliveringAt: any;
  completedAt: any;
  cancellationReason?: string;
  missingItems?: string[];
  cancelledAt?: string;
  customerInfo: {
    firstName: string;
    lastName: string;
  };
  total: number;
  items: any[];
}

const statusSteps = [
  {
    key: "pending",
    label: "Αναμονή Αποδοχής",
    icon: FaClock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  {
    key: "accepted",
    label: "Αποδεκτή",
    icon: FaCheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    key: "preparing",
    label: "Προετοιμασία",
    icon: FaUtensils,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    key: "ready",
    label: "Έτοιμη",
    icon: FaBoxOpen,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    key: "delivering",
    label: "Σε Παράδοση",
    icon: FaTruck,
    color: "text-[#9F7D41]",
    bgColor: "bg-[#E8DFD3]",
  },
  {
    key: "completed",
    label: "Ολοκληρώθηκε",
    icon: FaMapMarkerAlt,
    color: "text-green-700",
    bgColor: "bg-green-200",
  },
];

export default function OrderTrackingModal({
  orderId,
  isOpen,
  onClose,
}: OrderTrackingModalProps) {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Real-time listener for order updates
    const orderRef = doc(db, "orders", orderId);
    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as OrderData;
          setOrderData(data);
          setLoading(false);

          // Auto-close modal when order is completed
          if (data.status === "completed") {
            setTimeout(async () => {
              onClose();
              // Clear activeOrderId from user profile in Firestore
              const currentUser = getCurrentUser();
              if (currentUser) {
                try {
                  const userRef = doc(db, "customers", currentUser.id);
                  await updateDoc(userRef, {
                    activeOrderId: null,
                  });
                } catch (error) {
                  console.error("Error clearing activeOrderId:", error);
                }
              }
            }, 5000); // Close after 5 seconds
          }
        } else {
          // Order doesn't exist
          setOrderData(null);
          setLoading(false);
          // Auto-close modal after 3 seconds if order not found
          setTimeout(async () => {
            onClose();
            const currentUser = getCurrentUser();
            if (currentUser) {
              try {
                const userRef = doc(db, "customers", currentUser.id);
                await updateDoc(userRef, {
                  activeOrderId: null,
                });
              } catch (error) {
                console.error("Error clearing activeOrderId:", error);
              }
            }
          }, 3000);
        }
      },
      (error) => {
        console.error("Error listening to order:", error);
        setOrderData(null);
        setLoading(false);
        // Auto-close on error
        setTimeout(async () => {
          onClose();
          const currentUser = getCurrentUser();
          if (currentUser) {
            try {
              const userRef = doc(db, "customers", currentUser.id);
              await updateDoc(userRef, {
                activeOrderId: null,
              });
            } catch (error) {
              console.error("Error clearing activeOrderId:", error);
            }
          }
        }, 3000);
      }
    );

    return () => unsubscribe();
  }, [orderId, onClose]);

  if (!isOpen) return null;

  const getCurrentStepIndex = () => {
    if (!orderData) return 0;
    return statusSteps.findIndex((step) => step.key === orderData.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "Υπολογίζεται...";
    if (minutes < 60) return `${minutes} λεπτά`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ω ${mins}'`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#C9AC7A] to-[#9F7D41] text-white p-6 rounded-t-3xl flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Παρακολούθηση Παραγγελίας</h2>
            <p className="text-[#EBE4D8] text-sm mt-1">
              Παραγγελία #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            title="Κλείσιμο"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9AC7A] mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση παραγγελίας...</p>
          </div>
        ) : !orderData ? (
          <div className="p-12 text-center">
            <div className="mb-4">
              <FaTimes className="text-6xl text-red-500 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Δεν βρέθηκε η παραγγελία
            </h3>
            <p className="text-gray-600 mb-4">
              Η παραγγελία που αναζητάτε δεν υπάρχει ή έχει διαγραφεί.
            </p>
            <p className="text-sm text-gray-500">
              Θα κλείσει αυτόματα σε λίγα δευτερόλεπτα...
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Customer Info */}
            <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-2xl p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Στοιχεία Παραγγελίας
              </h3>
              <p className="text-gray-700">
                Πελάτης: {orderData.customerInfo.firstName}{" "}
                {orderData.customerInfo.lastName}
              </p>
              <p className="text-gray-700">
                Σύνολο: €{orderData.total.toFixed(2)}
              </p>
            </div>

            {/* Cancellation Reason */}
            {orderData.status === "cancelled" &&
              orderData.cancellationReason && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <FaTimes className="text-red-600 text-2xl mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-2">
                        Η παραγγελία ακυρώθηκε
                      </p>
                      <p className="text-red-800 mb-3">
                        <strong>Λόγος:</strong> {orderData.cancellationReason}
                      </p>
                      {orderData.missingItems &&
                        orderData.missingItems.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-sm font-semibold text-red-900 mb-2">
                              Προϊόντα που έλειπαν:
                            </p>
                            <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                              {orderData.missingItems.map(
                                (itemId: string, idx: number) => {
                                  const item = orderData.items.find(
                                    (i: any) =>
                                      i.id === itemId || i.name === itemId
                                  );
                                  return (
                                    <li key={idx}>
                                      {item ? item.name : itemId}
                                    </li>
                                  );
                                }
                              )}
                            </ul>
                          </div>
                        )}
                      <p className="text-xs text-red-700 mt-3">
                        Λυπούμαστε για την ταλαιπωρία. Μπορείτε να
                        επικοινωνήσετε μαζί μας για περισσότερες πληροφορίες.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Estimated Time */}
            {orderData.estimatedDeliveryTime &&
              orderData.status !== "cancelled" && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <FaClock className="text-blue-600 text-2xl" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      Εκτιμώμενος Χρόνος Παράδοσης
                    </p>
                    <p className="text-blue-700 text-lg font-bold">
                      {formatTime(orderData.estimatedDeliveryTime)}
                    </p>
                  </div>
                </div>
              )}

            {/* Status Timeline */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg">
                Κατάσταση Παραγγελίας
              </h3>
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div
                  className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-[#C9AC7A] to-[#9F7D41] transition-all duration-500"
                  style={{
                    height: `${
                      (currentStepIndex / (statusSteps.length - 1)) * 100
                    }%`,
                  }}
                ></div>

                {/* Status Steps */}
                {statusSteps.map((step, index) => {
                  const isActive = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.key}
                      className={`relative flex items-start gap-4 pb-8 transition-all duration-300 ${
                        isActive ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      {/* Icon Circle */}
                      <div
                        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all duration-300 ${
                          isActive
                            ? `${step.bgColor} ${step.color}`
                            : "bg-gray-100 text-gray-400"
                        } ${
                          isCurrent ? "scale-110 ring-4 ring-[#D9C9B0]" : ""
                        }`}
                      >
                        <Icon size={20} />
                      </div>

                      {/* Status Info */}
                      <div className="flex-1 pt-2">
                        <p
                          className={`font-semibold ${
                            isActive ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </p>
                        {isActive && index < currentStepIndex && (
                          <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                            <FaCheckCircle size={12} />
                            Ολοκληρώθηκε
                          </p>
                        )}
                        {isCurrent && (
                          <p className="text-sm text-[#C9AC7A] font-medium mt-1 animate-pulse">
                            Σε εξέλιξη...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Προϊόντα Παραγγελίας
              </h3>
              <div className="space-y-3">
                {orderData.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-3 border-l-4 border-[#C9AC7A]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {item.quantity}x {item.name}
                        </p>
                      </div>
                      <p className="font-bold text-gray-800">
                        €{item.totalPrice.toFixed(2)}
                      </p>
                    </div>

                    {/* Selected Options / Variations */}
                    {item.selectedOptions &&
                      item.selectedOptions.length > 0 && (
                        <div className="ml-4 mt-2 space-y-1">
                          {item.selectedOptions.map(
                            (option: any, optIndex: number) => (
                              <div
                                key={optIndex}
                                className="text-xs text-gray-600"
                              >
                                <span className="font-medium text-[#9F7D41]">
                                  {option.groupName}:
                                </span>{" "}
                                <span>
                                  {option.items && option.items.length > 0
                                    ? option.items
                                        .map((i: any) => i.name)
                                        .join(", ")
                                    : option.name || option.value}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}

                    {/* Item Notes */}
                    {item.notes && (
                      <div className="ml-4 mt-2 text-xs text-[#9F7D41] italic">
                        📝 {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
