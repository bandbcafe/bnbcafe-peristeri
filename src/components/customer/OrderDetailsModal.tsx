"use client";

import {
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaUtensils,
  FaBoxOpen,
  FaTruck,
  FaMapMarkerAlt,
} from "react-icons/fa";

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

const statusSteps = [
  {
    key: "pending",
    label: "Αναμονή Αποδοχής",
    icon: FaClock,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
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
    color: "text-gray-700",
    bgColor: "bg-gray-200",
  },
  {
    key: "ready",
    label: "Έτοιμη",
    icon: FaBoxOpen,
    color: "text-gray-800",
    bgColor: "bg-gray-300",
  },
  {
    key: "delivering",
    label: "Σε Παράδοση",
    icon: FaTruck,
    color: "text-black",
    bgColor: "bg-gray-200",
  },
  {
    key: "completed",
    label: "Ολοκληρώθηκε",
    icon: FaMapMarkerAlt,
    color: "text-green-700",
    bgColor: "bg-green-200",
  },
];

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: OrderDetailsModalProps) {
  if (!isOpen || !order) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex((step) => step.key === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  // Calculate duration for each step
  const getStepDuration = (stepKey: string) => {
    const timestamps: any = {
      pending: order.createdAt,
      accepted: order.acceptedAt,
      preparing: order.preparingAt,
      ready: order.readyAt,
      delivering: order.deliveringAt,
      completed: order.completedAt,
    };

    const stepIndex = statusSteps.findIndex((s) => s.key === stepKey);
    if (stepIndex === -1) return null;

    const currentTime = timestamps[stepKey];
    const previousStep = statusSteps[stepIndex - 1];
    const previousTime = previousStep ? timestamps[previousStep.key] : null;

    if (!currentTime || !previousTime) return null;

    const current = currentTime.toDate
      ? currentTime.toDate()
      : new Date(currentTime);
    const previous = previousTime.toDate
      ? previousTime.toDate()
      : new Date(previousTime);
    const diffMinutes = Math.round(
      (current.getTime() - previous.getTime()) / 60000,
    );

    return diffMinutes;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-black text-white p-3 sm:p-6 rounded-t-2xl sm:rounded-t-3xl flex justify-between items-center z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold truncate">
              Λεπτομέρειες Παραγγελίας
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm mt-1 truncate">
              #{order.id.slice(-8).toUpperCase()} •{" "}
              {formatDate(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors flex-shrink-0 ml-2"
          >
            <FaTimes size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Κατάσταση</p>
                <p className="font-bold text-sm sm:text-lg text-black truncate">
                  {statusSteps.find((s) => s.key === order.status)?.label ||
                    order.status}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Σύνολο</p>
                <p className="font-bold text-sm sm:text-lg text-green-700">
                  €{order.total.toFixed(2)}
                </p>
              </div>
              {order.estimatedDeliveryTime && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Εκτιμώμενος Χρόνος
                  </p>
                  <p className="font-bold text-sm sm:text-lg text-gray-800">
                    {order.estimatedDeliveryTime} λεπτά
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Πληρωμή</p>
                <p className="font-semibold text-sm sm:text-base text-gray-800">
                  {order.paymentMethod === "cash_on_delivery"
                    ? "Μετρητά"
                    : "Κάρτα"}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-3 sm:mb-4">
              Χρονολόγιο Παραγγελίας
            </h3>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div
                className="absolute left-4 sm:left-6 top-0 w-0.5 bg-black transition-all duration-500"
                style={{
                  height: `${
                    (currentStepIndex / (statusSteps.length - 1)) * 100
                  }%`,
                }}
              ></div>

              {/* Timeline Steps */}
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                const stepTime = formatTime(
                  index === 0
                    ? order.createdAt
                    : index === 1
                      ? order.acceptedAt
                      : index === 2
                        ? order.preparingAt
                        : index === 3
                          ? order.readyAt
                          : index === 4
                            ? order.deliveringAt
                            : order.completedAt,
                );
                const duration = getStepDuration(step.key);

                return (
                  <div
                    key={step.key}
                    className={`relative flex items-start gap-2 sm:gap-4 pb-6 sm:pb-8 transition-all duration-300 ${
                      isActive ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    {/* Icon Circle */}
                    <div
                      className={`relative z-10 w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-lg transition-all duration-300 ${
                        isActive
                          ? `${step.bgColor} ${step.color}`
                          : "bg-gray-100 text-gray-400"
                      } ${
                        isCurrent
                          ? "scale-110 ring-2 sm:ring-4 ring-gray-300"
                          : ""
                      }`}
                    >
                      <Icon className="w-3 h-3 sm:w-5 sm:h-5" />
                    </div>

                    {/* Step Info */}
                    <div className="flex-1 pt-1 sm:pt-2 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-semibold text-sm sm:text-base truncate ${
                              isActive ? "text-gray-800" : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          {stepTime && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              🕐 {stepTime}
                            </p>
                          )}
                          {duration && duration > 0 && (
                            <p className="text-xs text-gray-600 mt-1">
                              ⏱️ Διάρκεια: {duration} λεπτά
                            </p>
                          )}
                        </div>
                        {isActive && index < currentStepIndex && (
                          <FaCheckCircle className="text-green-600 w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        )}
                        {isCurrent && (
                          <span className="text-[10px] sm:text-xs bg-[#9F7D41] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold animate-pulse whitespace-nowrap flex-shrink-0">
                            Τώρα
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-3 sm:mb-4">
              Προϊόντα
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {order.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-2 sm:p-3 border-l-4 border-[#C9AC7A]"
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-gray-800">
                        {item.quantity}x {item.name}
                      </p>
                    </div>
                    <p className="font-bold text-sm sm:text-base text-gray-800 flex-shrink-0">
                      €{item.totalPrice.toFixed(2)}
                    </p>
                  </div>

                  {/* Variations */}
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.selectedOptions.map(
                        (option: any, optIndex: number) => (
                          <div key={optIndex} className="text-xs text-gray-600">
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
                        ),
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="ml-4 mt-2 text-xs text-[#9F7D41] italic">
                      📝 {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="border-t pt-3 sm:pt-4">
              <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-2 sm:mb-3">
                Διεύθυνση Παράδοσης
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-2 border-gray-200">
                <p className="font-semibold text-sm sm:text-base text-gray-800 break-words">
                  {order.deliveryAddress.street}, {order.deliveryAddress.city}
                </p>
                {order.deliveryAddress.postalCode && (
                  <p className="text-sm text-gray-600">
                    ΤΚ: {order.deliveryAddress.postalCode}
                  </p>
                )}
                {order.deliveryAddress.floor && (
                  <p className="text-sm text-gray-600">
                    Όροφος: {order.deliveryAddress.floor}
                  </p>
                )}
                {order.deliveryAddress.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    📝 {order.deliveryAddress.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
