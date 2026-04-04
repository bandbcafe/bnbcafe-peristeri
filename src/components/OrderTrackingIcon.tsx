"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
} from "firebase/firestore";
import { FaShoppingBag, FaTruck, FaCheckCircle } from "react-icons/fa";
import OrderTrackingModal from "./OrderTrackingModal";
import { getCurrentUser } from "@/utils/auth";

export default function OrderTrackingIcon() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIcon, setShowIcon] = useState(false);

  // Check for new order on mount
  useEffect(() => {
    const newOrderCreated = localStorage.getItem("newOrderCreated");
    if (newOrderCreated === "true") {
      localStorage.removeItem("newOrderCreated");
      // Delay to ensure component is mounted
      setTimeout(() => {
        setIsModalOpen(true);
      }, 1000);
    }
  }, []);

  // Listen to active orders in real-time
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Query all orders and filter client-side (same as orders page)
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Get all orders
        const allOrders = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            status: data.status,
            customerInfo: data.customerInfo,
            createdAt: data.createdAt?.toDate() || new Date(),
            ...data,
          };
        });

        // Filter for current user's orders (by email, same as orders page)
        const userOrders = allOrders.filter(
          (order: any) => order.customerInfo?.email === currentUser.email
        );

        // Filter for active orders (exclude orders awaiting payment acceptance)
        const activeOrders = userOrders.filter((order: any) => {
          // Skip orders that are awaiting store acceptance before payment
          if (order.paymentStatus === "awaiting_acceptance") return false;
          return [
            "pending",
            "accepted",
            "preparing",
            "ready",
            "delivering",
          ].includes(order.status);
        });

        if (activeOrders.length > 0) {
          // Sort by createdAt descending (most recent first)
          activeOrders.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );

          const mostRecentOrder = activeOrders[0];
          const newOrderId = mostRecentOrder.id;

          // Update order info
          setOrderId(newOrderId);
          setOrderStatus(mostRecentOrder.status);
          setShowIcon(true);

          // Store in localStorage for persistence
          localStorage.setItem("activeOrderId", newOrderId);

          // Auto-open modal for new orders
          const isNewOrder = newOrderId !== orderId;

          if (isNewOrder) {
            setTimeout(() => {
              setIsModalOpen(true);
            }, 500);
          }
        } else {
          // No active orders
          setShowIcon(false);
          setOrderId(null);
          setIsModalOpen(false);
          localStorage.removeItem("activeOrderId");
        }
      },
      (error) => {
        console.error("Error listening to orders:", error);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    // Real-time listener for order status
    const orderRef = doc(db, "orders", orderId);
    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setOrderStatus(data.status);

          // Hide icon and clear localStorage when order is completed
          if (data.status === "completed") {
            setTimeout(() => {
              setShowIcon(false);
              setOrderId(null);
              setIsModalOpen(false);
              localStorage.removeItem("activeOrderId");
            }, 5000);
          }
        } else {
          // Order doesn't exist - hide icon
          setShowIcon(false);
          setOrderId(null);
          setIsModalOpen(false);
          localStorage.removeItem("activeOrderId");
        }
      },
      (error) => {
        console.error("Error listening to order:", error);
        // On error, hide icon
        setShowIcon(false);
        setOrderId(null);
        setIsModalOpen(false);
        localStorage.removeItem("activeOrderId");
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // Show modal even if icon is not visible yet (for new orders)
  const shouldShowModal = isModalOpen && orderId;

  if (!showIcon && !shouldShowModal) return null;

  const getStatusIcon = () => {
    switch (orderStatus) {
      case "pending":
      case "accepted":
        return <FaShoppingBag className="text-white text-xl" />;
      case "preparing":
      case "ready":
      case "delivering":
        return <FaTruck className="text-white text-xl" />;
      case "completed":
        return <FaCheckCircle className="text-white text-xl" />;
      default:
        return <FaShoppingBag className="text-white text-xl" />;
    }
  };

  const getStatusColor = () => {
    switch (orderStatus) {
      case "pending":
        return "from-yellow-500 to-[#C9AC7A]";
      case "accepted":
      case "preparing":
        return "from-blue-500 to-blue-600";
      case "ready":
      case "delivering":
        return "from-[#C9AC7A] to-[#9F7D41]";
      case "completed":
        return "from-green-500 to-green-600";
      default:
        return "from-[#C9AC7A] to-[#9F7D41]";
    }
  };

  const getStatusText = () => {
    switch (orderStatus) {
      case "pending":
        return "Αναμονή";
      case "accepted":
        return "Αποδεκτή";
      case "preparing":
        return "Προετοιμασία";
      case "ready":
        return "Έτοιμη";
      case "delivering":
        return "Παράδοση";
      case "completed":
        return "Ολοκληρώθηκε";
      default:
        return "Παραγγελία";
    }
  };

  return (
    <>
      {/* Floating Icon */}
      {showIcon && (
        <div className="fixed bottom-6 right-6 z-40 animate-slideInRight">
          <button
            onClick={() => setIsModalOpen(true)}
            className={`relative group bg-gradient-to-br ${getStatusColor()} text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 p-4 flex items-center gap-3`}
          >
            {/* Pulsing Ring Animation */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${getStatusColor()} opacity-75 animate-ping`}
            ></div>

            {/* Icon */}
            <div className="relative z-10">{getStatusIcon()}</div>

            {/* Status Text - Hidden on mobile, shown on hover/desktop */}
            <span className="relative z-10 font-semibold text-sm hidden sm:inline-block whitespace-nowrap">
              {getStatusText()}
            </span>

            {/* Notification Badge */}
            {(orderStatus === "accepted" || orderStatus === "delivering") && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </button>

          {/* Tooltip for mobile */}
          <div className="sm:hidden absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {getStatusText()}
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {orderId && (
        <OrderTrackingModal
          orderId={orderId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
