"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth, getCurrentUser } from "@/utils/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import OrderDetailsModal from "@/components/customer/OrderDetailsModal";
import {
  FaHistory,
  FaShoppingCart,
  FaCalendarAlt,
  FaEuroSign,
  FaArrowLeft,
  FaSpinner,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTruck,
} from "react-icons/fa";

const statusLabels: any = {
  pending: "Αναμονή Αποδοχής",
  accepted: "Αποδεκτή",
  preparing: "Προετοιμασία",
  ready: "Έτοιμη",
  delivering: "Σε Παράδοση",
  completed: "Ολοκληρώθηκε",
  cancelled: "Ακυρώθηκε",
};

const statusColors: any = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  accepted: "bg-green-100 text-green-800 border-green-300",
  preparing: "bg-blue-100 text-blue-800 border-blue-300",
  ready: "bg-purple-100 text-purple-800 border-purple-300",
  delivering: "bg-[#E8DFD3] text-orange-800 border-orange-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusIcons: any = {
  pending: FaClock,
  accepted: FaCheckCircle,
  preparing: FaShoppingCart,
  ready: FaCheckCircle,
  delivering: FaTruck,
  completed: FaCheckCircle,
  cancelled: FaCheckCircle,
};

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    checkAuthAndLoadOrders();
  }, []);

  const checkAuthAndLoadOrders = () => {
    try {
      const currentUser = requireAuth(router);
      if (!currentUser) {
        return;
      }

      // Load orders from Firestore
      loadOrdersFromFirestore(currentUser.id);
    } catch (error) {
      router.push("/login");
    }
  };

  const loadOrdersFromFirestore = (userId: string) => {
    const userEmail = getCurrentUser()?.email;

    if (!userEmail) {
      setIsLoading(false);
      return;
    }

    // Simple query without composite index - filter client-side
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        // Filter for current user's orders client-side
        const allOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const userOrders = allOrders.filter(
          (order: any) => order.customerInfo?.email === userEmail
        );

        setOrders(userOrders);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading orders:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
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

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== "all") {
      const orderDate = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        const orderDay = new Date(orderDate);
        orderDay.setHours(0, 0, 0, 0);
        if (orderDay.getTime() !== today.getTime()) return false;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (orderDate < weekAgo) return false;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (orderDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Group orders by date
  const groupedOrders = filteredOrders.reduce((groups: any, order) => {
    const orderDate = order.createdAt?.toDate
      ? order.createdAt.toDate()
      : new Date(order.createdAt);
    const dateKey = orderDate.toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(order);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-[#C9AC7A] mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Φόρτωση παραγγελιών...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-[#C9AC7A] hover:text-[#9F7D41] font-semibold transition-colors"
            >
              <FaArrowLeft />
              <span>Επιστροφή</span>
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <FaHistory className="text-[#C9AC7A]" />
            Οι Παραγγελίες μου
          </h1>
          <p className="text-gray-600 text-lg">
            Δείτε το ιστορικό των παραγγελιών σας και την πρόοδό τους
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Φίλτρα</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Κατάσταση
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#C9AC7A] focus:outline-none"
              >
                <option value="all">Όλες</option>
                <option value="pending">Αναμονή Αποδοχής</option>
                <option value="accepted">Αποδεκτή</option>
                <option value="preparing">Προετοιμασία</option>
                <option value="ready">Έτοιμη</option>
                <option value="delivering">Σε Παράδοση</option>
                <option value="completed">Ολοκληρώθηκε</option>
                <option value="cancelled">Ακυρώθηκε</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Περίοδος
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#C9AC7A] focus:outline-none"
              >
                <option value="all">Όλες οι ημερομηνίες</option>
                <option value="today">Σήμερα</option>
                <option value="week">Τελευταία 7 ημέρες</option>
                <option value="month">Τελευταίος μήνας</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Εμφάνιση {filteredOrders.length} από {orders.length} παραγγελίες
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <FaShoppingCart className="text-gray-300 text-8xl mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-600 mb-4">
              {orders.length === 0
                ? "Δεν έχετε κάνει καμία παραγγελία ακόμα"
                : "Δεν βρέθηκαν παραγγελίες με αυτά τα φίλτρα"}
            </h2>
            <p className="text-gray-500 mb-8 text-lg">
              {orders.length === 0
                ? "Ανακαλύψτε το μενού μας και κάντε την πρώτη σας παραγγελία!"
                : "Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης"}
            </p>
            {orders.length === 0 && (
              <Link
                href="/menu"
                className="bg-gradient-to-r from-[#C9AC7A] to-[#9F7D41] hover:from-[#9F7D41] hover:to-[#8B6B38] text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-3"
              >
                <FaShoppingCart />
                Δείτε το Μενού
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedOrders).map(
              ([dateKey, dateOrders]: [string, any]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <FaCalendarAlt className="text-[#C9AC7A] text-xl" />
                    <h2 className="text-2xl font-bold text-gray-800">
                      {dateKey}
                    </h2>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-200 to-transparent"></div>
                  </div>

                  {/* Orders Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {dateOrders.map((order: any) => {
                      const StatusIcon = statusIcons[order.status] || FaClock;

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                        >
                          {/* Header */}
                          <div
                            className={`p-4 border-b-4 ${
                              statusColors[order.status]
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">
                                  {order.customerInfo?.firstName}{" "}
                                  {order.customerInfo?.lastName}
                                </p>
                                <h3 className="text-lg font-bold text-gray-900">
                                  #{order.id.slice(-8).toUpperCase()}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <FaCalendarAlt size={12} />
                                  <span>{formatDate(order.createdAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusIcon
                                  className={
                                    statusColors[order.status].split(" ")[1]
                                  }
                                />
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${
                                    statusColors[order.status]
                                  }`}
                                >
                                  {statusLabels[order.status]}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-4">
                            {/* Items Summary */}
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                Προϊόντα ({order.items.length})
                              </p>
                              <div className="space-y-2">
                                {order.items
                                  .slice(0, 3)
                                  .map((item: any, idx: number) => (
                                    <div key={idx} className="space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 font-medium">
                                          {item.quantity}x {item.name}
                                        </span>
                                        <span className="font-semibold text-gray-800">
                                          €{item.totalPrice.toFixed(2)}
                                        </span>
                                      </div>
                                      {/* Variations */}
                                      {item.selectedOptions &&
                                        item.selectedOptions.length > 0 && (
                                          <div className="ml-4 text-xs text-[#9F7D41]">
                                            {item.selectedOptions.map(
                                              (opt: any, optIdx: number) => (
                                                <div key={optIdx}>
                                                  {opt.groupName}:{" "}
                                                  {opt.name ||
                                                    opt.items
                                                      ?.map((i: any) => i.name)
                                                      .join(", ")}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  ))}
                                {order.items.length > 3 && (
                                  <p className="text-xs text-gray-500 italic">
                                    +{order.items.length - 3} ακόμα προϊόντα
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                              <span className="font-semibold text-gray-700">
                                Σύνολο:
                              </span>
                              <div className="flex items-center gap-1 text-2xl font-bold text-[#C9AC7A]">
                                <FaEuroSign size={16} />
                                {order.total.toFixed(2)}
                              </div>
                            </div>

                            {/* View Details Button */}
                            <button
                              onClick={() => handleViewDetails(order)}
                              className="w-full bg-gradient-to-r from-[#C9AC7A] to-[#B8986A] hover:from-[#B8986A] hover:to-[#9F7D41] text-white py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                              <FaEye />
                              Δείτε Λεπτομέρειες
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  );
}
