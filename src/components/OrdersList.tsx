"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  FaShoppingBag,
  FaClock,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaCheckCircle,
  FaUtensils,
  FaTruck,
} from "react-icons/fa";
import OrderAcceptModal from "./OrderAcceptModal";

interface Order {
  id: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  deliveryAddress: any;
  items: any[];
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  status: string;
  estimatedDeliveryTime: number | null;
  createdAt: any;
  source: string;
}

interface OrdersListProps {
  onNewOrder?: () => void;
}

export default function OrdersList({ onNewOrder }: OrdersListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrdersCount = useRef<number>(-1); // -1 means not initialized yet
  const isFirstLoad = useRef<boolean>(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Initialize audio with loop
    audioRef.current = new Audio("/sounds/ring.mp3");
    audioRef.current.loop = true; // Loop continuously

    // Real-time listener for orders
    // Note: Removed where clause to avoid needing composite index
    // Filter for website orders will be done client-side if needed
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const allOrders: Order[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];

        // Filter for website orders only (client-side)
        const ordersData = allOrders.filter(
          (order) => order.source === "website"
        );

        // Check for new orders (skip on first load)
        if (isFirstLoad.current) {
          // First load - just set the count
          isFirstLoad.current = false;
          previousOrdersCount.current = ordersData.length;
        } else if (ordersData.length > previousOrdersCount.current) {
          // New order detected - play sound
          console.log(" New order detected! Playing sound...");
          audioRef.current?.play().catch((error) => {
            console.error("Error playing sound:", error);
            console.log(
              " Tip: Click 'Test Sounds' button first to enable audio"
            );
          });
          setIsPlaying(true);

          // Call callback
          if (onNewOrder) {
            onNewOrder();
          }

          previousOrdersCount.current = ordersData.length;
        }

        // Check if there are any pending orders
        const hasPendingOrders = ordersData.some(
          (order) => order.status === "pending"
        );

        // Stop sound if no pending orders
        if (!hasPendingOrders && isPlaying) {
          console.log(" No pending orders - stopping sound");
          audioRef.current?.pause();
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
          setIsPlaying(false);
        }

        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to orders:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [onNewOrder]);

  const handleAcceptOrder = async (orderId: string, estimatedTime: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "accepted",
          estimatedDeliveryTime: estimatedTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept order");
      }
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
      const response = await fetch(`/api/orders/${orderId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
          cancellationReason: reason,
          missingItems: missingItems,
          cancelledAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject order");
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      throw error;
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Αναμονή Αποδοχής",
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: FaClock,
        };
      case "accepted":
        return {
          label: "Αποδεκτή",
          color: "bg-green-100 text-green-800 border-green-300",
          icon: FaCheckCircle,
        };
      case "preparing":
        return {
          label: "Προετοιμασία",
          color: "bg-blue-100 text-blue-800 border-blue-300",
          icon: FaUtensils,
        };
      case "ready":
        return {
          label: "Έτοιμη",
          color: "bg-purple-100 text-purple-800 border-purple-300",
          icon: FaShoppingBag,
        };
      case "delivering":
        return {
          label: "Σε Παράδοση",
          color: "bg-orange-100 text-orange-800 border-orange-300",
          icon: FaTruck,
        };
      case "completed":
        return {
          label: "Ολοκληρώθηκε",
          color: "bg-gray-100 text-gray-800 border-gray-300",
          icon: FaCheckCircle,
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800 border-gray-300",
          icon: FaClock,
        };
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <FaShoppingBag className="mx-auto text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Δεν υπάρχουν παραγγελίες</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((order) => {
          const statusInfo = getStatusInfo(order.status);
          const StatusIcon = statusInfo.icon;

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-md border-2 border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">
                      Παραγγελία #{order.id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold border-2 flex items-center gap-2 ${statusInfo.color}`}
                  >
                    <StatusIcon size={14} />
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <FaUser className="text-amber-600" />
                    <div>
                      <p className="text-xs text-gray-500">Πελάτης</p>
                      <p className="font-semibold">
                        {order.customerInfo.firstName}{" "}
                        {order.customerInfo.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-amber-600" />
                    <div>
                      <p className="text-xs text-gray-500">Τηλέφωνο</p>
                      <p className="font-semibold">
                        {order.customerInfo.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {order.deliveryAddress && (
                  <div className="flex items-start gap-3">
                    <FaMapMarkerAlt className="text-amber-600 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">
                        Διεύθυνση Παράδοσης
                      </p>
                      <p className="font-semibold">
                        {order.deliveryAddress.street},{" "}
                        {order.deliveryAddress.city}
                      </p>
                      {order.deliveryAddress.floor && (
                        <p className="text-sm text-gray-600">
                          Όροφος: {order.deliveryAddress.floor}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Προϊόντα ({order.items.length})
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="border-b border-gray-200 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold">
                            €{item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                        {/* Selected Options / Variations */}
                        {item.selectedOptions &&
                          item.selectedOptions.length > 0 && (
                            <div className="mt-1 ml-4 space-y-1">
                              {item.selectedOptions.map(
                                (option: any, optIndex: number) => (
                                  <div
                                    key={optIndex}
                                    className="text-xs text-gray-600"
                                  >
                                    <span className="font-medium">
                                      {option.groupName}:
                                    </span>{" "}
                                    {option.items && option.items.length > 0 ? (
                                      <span>
                                        {option.items
                                          .map((i: any) => i.name)
                                          .join(", ")}
                                      </span>
                                    ) : (
                                      <span>{option.name || option.value}</span>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        {/* Item Notes */}
                        {item.notes && (
                          <div className="mt-1 ml-4 text-xs text-amber-700 italic">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <FaMoneyBillWave className="text-green-600" />
                    <span className="font-semibold">Σύνολο:</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">
                    €{order.total.toFixed(2)}
                  </span>
                </div>

                {/* Estimated Time */}
                {order.estimatedDeliveryTime && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 flex items-center gap-3">
                    <FaClock className="text-blue-600 text-xl" />
                    <div>
                      <p className="text-sm text-blue-800 font-semibold">
                        Εκτιμώμενος Χρόνος Παράδοσης
                      </p>
                      <p className="text-lg font-bold text-blue-900">
                        {order.estimatedDeliveryTime} λεπτά
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setShowAcceptModal(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
                    >
                      Αποδοχή Παραγγελίας
                    </button>
                  )}
                  {order.status === "accepted" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "preparing")}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Ξεκίνησε Προετοιμασία
                    </button>
                  )}
                  {order.status === "preparing" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "ready")}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all"
                    >
                      Έτοιμη για Παράδοση
                    </button>
                  )}
                  {order.status === "ready" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "delivering")}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
                    >
                      Σε Παράδοση
                    </button>
                  )}
                  {order.status === "delivering" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "completed")}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all"
                    >
                      Ολοκλήρωση Παραγγελίας
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
          onClose={() => {
            setShowAcceptModal(false);
            setSelectedOrderId(null);
          }}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
          orderItems={
            orders
              .find((o) => o.id === selectedOrderId)
              ?.items.map((item) => ({
                id: item.id || item.name,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })) || []
          }
        />
      )}
    </>
  );
}
