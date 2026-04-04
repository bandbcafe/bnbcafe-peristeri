"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import OrderStats from "@/components/orders/OrderStats";
import OrderTabs from "@/components/orders/OrderTabs";
import ActiveOrdersGrid from "@/components/orders/ActiveOrdersGrid";
import CompletedOrdersList from "@/components/orders/CompletedOrdersList";
import { useOrderNotifications } from "@/contexts/OrderNotificationContext";
import { FiVolume2 } from "react-icons/fi";

interface Order {
  id: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryAddress?: any;
  items: any[];
  total: number;
  status: string;
  source: string;
  paymentMethod?: string;
  createdAt: any;
  completedAt?: any;
  estimatedDeliveryTime?: number;
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"website" | "wolt" | "efood">(
    "website"
  );
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { clearNotifications } = useOrderNotifications();

  // Clear notifications when page is viewed
  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  // Real-time listener for all orders
  useEffect(() => {
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders: Order[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      setAllOrders(orders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter orders by source
  const filterOrdersBySource = (source: string) => {
    return allOrders.filter((order) => order.source === source);
  };

  // Get active orders (not completed)
  const getActiveOrders = (source: string) => {
    return filterOrdersBySource(source).filter(
      (order) => order.status !== "completed" && order.status !== "cancelled"
    );
  };

  // Get completed orders (including cancelled)
  const getCompletedOrders = (source: string) => {
    return filterOrdersBySource(source).filter(
      (order) => order.status === "completed" || order.status === "cancelled"
    );
  };

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log("🔄 Updating order status to:", newStatus);

      const response = await fetch(`/api/orders/${orderId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update order status");

      // Stop sound when order is accepted or cancelled (any action taken)
      if (newStatus === "accepted" || newStatus === "cancelled") {
        console.log("🔇 Stopping notification sound - order action taken");
        clearNotifications();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  // Test sound - play once
  const testSound = () => {
    // Create a new audio instance for testing (not looped)
    const testAudio = new Audio("/sounds/ring.mp3");
    testAudio.loop = false; // Play only once
    testAudio.play().catch((error) => {
      console.error("Error playing sound:", error);
      alert("Παρακαλώ επιτρέψτε την αναπαραγωγή ήχου στον browser σας!");
    });
  };

  const activeOrders = getActiveOrders(activeTab);
  const completedOrders = getCompletedOrders(activeTab);

  const tabCounts = {
    website: getActiveOrders("website").length,
    wolt: getActiveOrders("wolt").length,
    efood: getActiveOrders("efood").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Διαχείριση Παραγγελιών
            </h1>
            <p className="text-gray-600">
              Σάββατο 6 Δεκεμβρίου 2025, 15:38 μ.μ.
            </p>
          </div>
          <button
            onClick={testSound}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
          >
            <FiVolume2 className="w-5 h-5" />
            Test Sounds
          </button>
        </div>

        {/* Stats */}
        <OrderStats />

        {/* Tabs */}
        <OrderTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={tabCounts}
        />

        {/* Active Orders */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Ενεργές Παραγγελίες
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <ActiveOrdersGrid
              orders={activeOrders}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>

        {/* Completed Orders */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Ολοκληρωμένες Παραγγελίες
          </h2>
          <CompletedOrdersList orders={completedOrders} />
        </div>
      </div>
    </div>
  );
}
