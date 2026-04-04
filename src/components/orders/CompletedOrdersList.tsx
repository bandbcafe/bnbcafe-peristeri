"use client";

import { useState } from "react";
import {
  FiCheckCircle,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiEye,
  FiCalendar,
  FiX,
} from "react-icons/fi";
import { FaMoneyBillWave } from "react-icons/fa";
import CompletedOrderDetailsModal from "./CompletedOrderDetailsModal";

interface Order {
  id: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  items: Array<{
    name: string;
    quantity: number;
  }>;
  total: number;
  status: string;
  paymentMethod?: string;
  createdAt: any;
  completedAt?: any;
  cancellationReason?: string;
}

interface CompletedOrdersListProps {
  orders: Order[];
}

export default function CompletedOrdersList({
  orders,
}: CompletedOrdersListProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [customDate, setCustomDate] = useState<string>("");

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDetailsModal(true);
  };

  // Filter orders by date
  const filterOrdersByDate = () => {
    const now = new Date();

    return orders.filter((order) => {
      if (!order.createdAt) return false;

      const orderDate = order.createdAt.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt);

      switch (dateFilter) {
        case "today":
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          return orderDate >= todayStart;

        case "yesterday":
          const yesterdayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          const yesterdayEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          return orderDate >= yesterdayStart && orderDate < yesterdayEnd;

        case "week":
          const weekStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 7
          );
          return orderDate >= weekStart;

        case "month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return orderDate >= monthStart;

        case "custom":
          if (!customDate) return true;
          const selectedDate = new Date(customDate);
          const selectedStart = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate()
          );
          const selectedEnd = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate() + 1
          );
          return orderDate >= selectedStart && orderDate < selectedEnd;

        default:
          return true;
      }
    });
  };

  const filteredOrders = filterOrdersByDate();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("el-GR", {
      day: "2-digit",
      month: "2-digit",
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

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
        <FiCheckCircle className="mx-auto text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">
          Δεν υπάρχουν ολοκληρωμένες παραγγελίες
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Date Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <FiCalendar className="text-gray-600 text-xl" />
          <span className="text-sm font-semibold text-gray-700">
            Φίλτρο Ημερομηνίας:
          </span>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "today", label: "Σήμερα" },
              { value: "yesterday", label: "Χθες" },
              { value: "week", label: "Τελευταία 7 ημέρες" },
              { value: "month", label: "Τρέχων μήνας" },
              { value: "custom", label: "Συγκεκριμένη ημέρα" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setDateFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateFilter === filter.value
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
              {customDate && (
                <button
                  onClick={() => {
                    setCustomDate("");
                    setDateFilter("today");
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Καθαρισμός"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>
          )}

          <div className="ml-auto text-sm text-gray-600">
            <span className="font-semibold">{filteredOrders.length}</span>{" "}
            παραγγελίες
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Πελάτης
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Τηλέφωνο
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Πληρωμή
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Προϊόντα
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Σύνολο
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Ολοκληρώθηκε
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order, index) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-gray-700">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FiUser className="text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {order.customerInfo.firstName}{" "}
                        {order.customerInfo.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-gray-400" />
                      <span className="text-gray-700">
                        {order.customerInfo.phone}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.paymentMethod ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const paymentInfo = getPaymentMethodLabel(
                            order.paymentMethod
                          );
                          const PaymentIcon = paymentInfo.icon;
                          return (
                            <>
                              <PaymentIcon className={paymentInfo.color} />
                              <span
                                className={`font-medium ${paymentInfo.color}`}
                              >
                                {paymentInfo.label}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-600">
                        {order.items.length} προϊόντα
                      </span>
                      {order.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          <FiX size={12} />
                          Ακυρώθηκε
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-bold text-lg ${
                        order.status === "cancelled"
                          ? "text-red-600 line-through"
                          : "text-green-600"
                      }`}
                    >
                      €{order.total.toFixed(2)}
                    </span>
                    {order.status === "cancelled" &&
                      order.cancellationReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {order.cancellationReason}
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {formatDate(order.completedAt || order.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                        title="Προβολή Λεπτομερειών"
                      >
                        <FiEye size={18} />
                        <span className="hidden lg:inline">Προβολή</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Details Modal */}
        {selectedOrderId && (
          <CompletedOrderDetailsModal
            orderId={selectedOrderId}
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedOrderId(null);
            }}
          />
        )}
      </div>
    </>
  );
}
