"use client";

import { useState } from "react";
import {
  FiUser,
  FiPhone,
  FiClock,
  FiCheckCircle,
  FiPackage,
  FiTruck,
  FiCreditCard,
} from "react-icons/fi";
import { FaMapMarkerAlt, FaMoneyBillWave } from "react-icons/fa";
import OrderAcceptModal from "../OrderAcceptModal";
import { useOrderNotifications } from "@/contexts/OrderNotificationContext";

interface Order {
  id: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    floor?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
    selectedOptions?: Array<{
      groupName: string;
      items?: Array<{ name: string }>;
      name?: string;
      value?: string;
    }>;
    notes?: string;
  }>;
  total: number;
  status: string;
  paymentMethod?: string;
  estimatedDeliveryTime?: number;
  createdAt: any;
}

interface ActiveOrdersGridProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: string) => void;
}

export default function ActiveOrdersGrid({
  orders,
  onUpdateStatus,
}: ActiveOrdersGridProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const { clearNotifications } = useOrderNotifications();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Αναμονή",
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: FiClock,
        };
      case "accepted":
        return {
          label: "Αποδεκτή",
          color: "bg-green-100 text-green-800 border-green-300",
          icon: FiCheckCircle,
        };
      case "preparing":
        return {
          label: "Προετοιμασία",
          color: "bg-blue-100 text-blue-800 border-blue-300",
          icon: FiPackage,
        };
      case "ready":
        return {
          label: "Έτοιμη",
          color: "bg-purple-100 text-purple-800 border-purple-300",
          icon: FiCheckCircle,
        };
      case "delivering":
        return {
          label: "Παράδοση",
          color: "bg-orange-100 text-orange-800 border-orange-300",
          icon: FiTruck,
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800 border-gray-300",
          icon: FiClock,
        };
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case "cashOnDelivery":
      case "cash_on_delivery":
      case "cash":
        return {
          label: "Μετρητά",
          icon: FaMoneyBillWave,
          color: "text-green-600",
        };
      case "creditCard":
      case "credit_card":
        return { label: "Κάρτα", icon: FiCreditCard, color: "text-blue-600" };
      case "iris":
        return { label: "Iris", icon: FiCreditCard, color: "text-purple-600" };
      case "paypal":
        return { label: "PayPal", icon: FiCreditCard, color: "text-blue-500" };
      case "applePay":
        return {
          label: "Apple Pay",
          icon: FiCreditCard,
          color: "text-gray-800",
        };
      default:
        return {
          label: "Μετρητά",
          icon: FaMoneyBillWave,
          color: "text-green-600",
        };
    }
  };

  const handleAcceptOrder = async (orderId: string, estimatedTime: number) => {
    try {
      console.log("🎯 Accepting order in modal");

      const response = await fetch(`/api/orders/${orderId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          estimatedDeliveryTime: estimatedTime,
        }),
      });

      if (!response.ok) throw new Error("Failed to accept order");

      // Stop notification sound when order is accepted
      console.log("🔇 Stopping sound from modal accept");
      clearNotifications();

      setShowAcceptModal(false);
    } catch (error) {
      console.error("Error accepting order:", error);
      throw error;
    }
  };

  const handleRejectOrder = async (
    orderId: string,
    reason: string,
    missingItems?: string[]
  ) => {
    try {
      console.log("🎯 Rejecting order in modal");

      const response = await fetch(`/api/orders/${orderId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancellationReason: reason,
          missingItems: missingItems,
          cancelledAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to reject order");

      // Stop notification sound when order is cancelled
      console.log("🔇 Stopping sound from modal reject");
      clearNotifications();

      setShowAcceptModal(false);
    } catch (error) {
      console.error("Error rejecting order:", error);
      throw error;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
        <FiCheckCircle className="mx-auto text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">
          Δεν υπάρχουν ενεργές παραγγελίες
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.map((order) => {
          const statusInfo = getStatusInfo(order.status);
          const StatusIcon = statusInfo.icon;

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">
                      #{order.id.slice(-6).toUpperCase()}
                    </h3>
                    <p className="text-sm text-amber-100">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 flex items-center gap-1 ${statusInfo.color}`}
                  >
                    <StatusIcon size={12} />
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Customer */}
                <div className="flex items-center gap-2 text-sm">
                  <FiUser className="text-amber-600" />
                  <span className="font-semibold">
                    {order.customerInfo.firstName} {order.customerInfo.lastName}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <FiPhone className="text-amber-600" />
                  <span>{order.customerInfo.phone}</span>
                </div>

                {/* Payment Method */}
                {order.paymentMethod && (
                  <div className="flex items-center gap-2 text-sm">
                    {(() => {
                      const paymentInfo = getPaymentMethodLabel(
                        order.paymentMethod
                      );
                      const PaymentIcon = paymentInfo.icon;
                      return (
                        <>
                          <PaymentIcon className={paymentInfo.color} />
                          <span
                            className={`font-semibold ${paymentInfo.color}`}
                          >
                            {paymentInfo.label}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}

                {order.deliveryAddress && (
                  <div className="flex items-start gap-2 text-sm">
                    <FaMapMarkerAlt className="text-amber-600 mt-0.5" />
                    <span className="text-gray-700">
                      {order.deliveryAddress.street},{" "}
                      {order.deliveryAddress.city}
                    </span>
                  </div>
                )}

                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Προϊόντα ({order.items.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold">
                            €{item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                        {item.selectedOptions &&
                          item.selectedOptions.length > 0 && (
                            <div className="ml-4 mt-1 space-y-0.5">
                              {item.selectedOptions.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="text-xs text-gray-600"
                                >
                                  <span className="font-medium">
                                    {opt.groupName}:
                                  </span>{" "}
                                  {opt.items?.map((i) => i.name).join(", ") ||
                                    opt.name ||
                                    opt.value}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-700">Σύνολο:</span>
                  <span className="text-xl font-bold text-amber-600">
                    €{order.total.toFixed(2)}
                  </span>
                </div>

                {/* Estimated Time */}
                {order.estimatedDeliveryTime && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mt-3">
                    <div className="flex items-center gap-2">
                      <FiClock className="text-blue-600 text-lg" />
                      <div>
                        <p className="text-xs text-blue-700 font-medium">
                          Εκτιμώμενος Χρόνος Παράδοσης
                        </p>
                        <p className="text-lg font-bold text-blue-900">
                          {order.estimatedDeliveryTime} λεπτά
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setShowAcceptModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
                    >
                      Αποδοχή
                    </button>
                  )}
                  {order.status === "accepted" && (
                    <button
                      onClick={() => onUpdateStatus(order.id, "preparing")}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Ξεκίνησε Προετοιμασία
                    </button>
                  )}
                  {order.status === "preparing" && (
                    <button
                      onClick={() => onUpdateStatus(order.id, "ready")}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all"
                    >
                      Έτοιμη
                    </button>
                  )}
                  {order.status === "ready" && (
                    <button
                      onClick={() => onUpdateStatus(order.id, "delivering")}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
                    >
                      Σε Παράδοση
                    </button>
                  )}
                  {order.status === "delivering" && (
                    <button
                      onClick={() => onUpdateStatus(order.id, "completed")}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all"
                    >
                      Ολοκλήρωση
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accept Modal */}
      {selectedOrderId && (
        <OrderAcceptModal
          orderId={selectedOrderId}
          isOpen={showAcceptModal}
          onClose={() => setShowAcceptModal(false)}
          onAccept={(orderId, estimatedTime) =>
            handleAcceptOrder(orderId, estimatedTime)
          }
          onReject={handleRejectOrder}
          orderItems={
            orders
              .find((o) => o.id === selectedOrderId)
              ?.items.map((item) => ({
                id: item.name,
                name: item.name,
                quantity: item.quantity,
                price: item.totalPrice / item.quantity,
              })) || []
          }
        />
      )}
    </>
  );
}
