"use client";

import React, { useState, useEffect } from "react";
import {
  FaChartLine,
  FaShoppingCart,
  FaEuroSign,
  FaUsers,
  FaClock,
  FaCoffee,
  FaUtensils,
  FaArrowUp,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaEnvelope,
  FaChair,
  FaCreditCard,
  FaTachometerAlt,
  FaChartBar,
  FaChartPie,
  FaArrowDown,
} from "react-icons/fa";
import { formatDM } from "@/lib/date";

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    uniqueCustomers: number;
    totalCustomers: number;
  };
  products: {
    total: number;
    active: number;
    topSelling: any[];
  };
  categories: any[];
  reservations: {
    total: number;
    confirmed: number;
    pending: number;
    totalGuests: number;
  };
  messages: {
    total: number;
    new: number;
    replied: number;
  };
  charts: {
    daily: any[];
    hourly: any[];
    payments: any[];
  };
  recentOrders: any[];
}

const AnalyticsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/analytics/overview?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchAnalytics();
  };

  const StatCard = ({
    icon,
    title,
    value,
    subtitle,
    color,
    trend,
    trendDown,
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
    trend?: string;
    trendDown?: boolean;
  }) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 bg-gradient-to-br ${color} rounded-xl shadow-lg`}
          >
            {icon}
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 ${
              trendDown
                ? "text-red-600 bg-red-50"
                : "text-green-600 bg-green-50"
            } px-2 py-1 rounded-lg`}
          >
            {trendDown ? <FaArrowDown size={12} /> : <FaArrowUp size={12} />}
            <span className="text-xs font-semibold">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", name: "Επισκόπηση", icon: <FaTachometerAlt /> },
    { id: "orders", name: "Παραγγελίες", icon: <FaShoppingCart /> },
    { id: "products", name: "Προϊόντα", icon: <FaCoffee /> },
    { id: "customers", name: "Πελάτες", icon: <FaUsers /> },
    { id: "reservations", name: "Κρατήσεις", icon: <FaChair /> },
    { id: "charts", name: "Γραφήματα", icon: <FaChartBar /> },
  ];

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Φόρτωση στατιστικών...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <FaChartLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Στατιστικά & Αναλύσεις
                </h1>
                <p className="text-slate-600 mt-1 text-sm">
                  Πλήρης ανάλυση απόδοσης του POS συστήματος
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaDownload size={16} />
                )}
                <span>Ανανέωση</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaFilter className="text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Φίλτρα Χρονικής Περιόδου
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex gap-2">
              {["today", "week", "month", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedPeriod === period
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {period === "today" && "Σήμερα"}
                  {period === "week" && "Εβδομάδα"}
                  {period === "month" && "Μήνας"}
                  {period === "year" && "Έτος"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Από"
              />
            </div>

            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Έως"
              />
            </div>

            <button
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all duration-200"
            >
              {isLoading ? "Φόρτωση..." : "Εφαρμογή"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {data && (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    icon={<FaEuroSign className="w-5 h-5 text-white" />}
                    title="Συνολικός Τζίρος"
                    value={`€${data.overview.totalRevenue.toFixed(2)}`}
                    subtitle="Όλες οι παραγγελίες"
                    color="from-emerald-500 to-green-600"
                  />

                  <StatCard
                    icon={<FaShoppingCart className="w-5 h-5 text-white" />}
                    title="Συνολικές Παραγγελίες"
                    value={data.overview.totalOrders}
                    subtitle={`${data.overview.completedOrders} ολοκληρωμένες`}
                    color="from-blue-500 to-cyan-600"
                  />

                  <StatCard
                    icon={<FaUsers className="w-5 h-5 text-white" />}
                    title="Μοναδικοί Πελάτες"
                    value={data.overview.uniqueCustomers}
                    subtitle={`${data.overview.totalCustomers} συνολικά`}
                    color="from-purple-500 to-pink-600"
                  />

                  <StatCard
                    icon={<FaChartLine className="w-5 h-5 text-white" />}
                    title="Μέσο Τιμολόγιο"
                    value={`€${data.overview.averageOrderValue.toFixed(2)}`}
                    subtitle="Ανά παραγγελία"
                    color="from-orange-500 to-red-600"
                  />
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    icon={<FaChair className="w-5 h-5 text-white" />}
                    title="Κρατήσεις"
                    value={data.reservations.total}
                    subtitle={`${data.reservations.confirmed} επιβεβαιωμένες`}
                    color="from-indigo-500 to-purple-600"
                  />

                  <StatCard
                    icon={<FaEnvelope className="w-5 h-5 text-white" />}
                    title="Μηνύματα"
                    value={data.messages.total}
                    subtitle={`${data.messages.new} νέα`}
                    color="from-pink-500 to-rose-600"
                  />

                  <StatCard
                    icon={<FaCoffee className="w-5 h-5 text-white" />}
                    title="Ενεργά Προϊόντα"
                    value={data.products.active}
                    subtitle={`${data.products.total} συνολικά`}
                    color="from-amber-500 to-orange-600"
                  />
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                {/* Order Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    icon={<FaCheckCircle className="w-5 h-5 text-white" />}
                    title="Ολοκληρωμένες"
                    value={data.overview.completedOrders}
                    subtitle="Παραγγελίες"
                    color="from-green-500 to-emerald-600"
                  />

                  <StatCard
                    icon={<FaHourglassHalf className="w-5 h-5 text-white" />}
                    title="Σε Εκκρεμότητα"
                    value={data.overview.pendingOrders}
                    subtitle="Παραγγελίες"
                    color="from-yellow-500 to-amber-600"
                  />

                  <StatCard
                    icon={<FaTimesCircle className="w-5 h-5 text-white" />}
                    title="Ακυρωμένες"
                    value={data.overview.cancelledOrders}
                    subtitle="Παραγγελίες"
                    color="from-red-500 to-rose-600"
                  />
                </div>

                {/* Recent Orders */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaClock className="text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-800">
                      Πρόσφατες Παραγγελίες
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-medium text-slate-700">
                            ID
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">
                            Πελάτης
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">
                            Σύνολο
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">
                            Ημερομηνία
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">
                            Κατάσταση
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentOrders.map((order: any) => (
                          <tr
                            key={order.id}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-mono text-sm text-slate-600">
                              #{order.id.slice(-8).toUpperCase()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {order.customerInfo?.firstName?.charAt(0) ||
                                    "U"}
                                </div>
                                <span className="font-medium text-slate-800">
                                  {order.customerInfo?.firstName}{" "}
                                  {order.customerInfo?.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-emerald-600">
                              €{order.total?.toFixed(2) || "0.00"}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {order.createdAt?.toDate
                                ? formatDM(order.createdAt.toDate())
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs rounded-lg font-medium ${
                                  order.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : order.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : order.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {order.status === "completed"
                                  ? "Ολοκληρώθηκε"
                                  : order.status === "pending"
                                  ? "Εκκρεμεί"
                                  : order.status === "cancelled"
                                  ? "Ακυρώθηκε"
                                  : order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaCoffee className="text-amber-600" />
                    <h2 className="text-lg font-semibold text-slate-800">
                      Top Προϊόντα
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {data.products.topSelling.map(
                      (product: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {product.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {product.category}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-800">
                              {product.quantity} πωλήσεις
                            </p>
                            <p className="text-sm text-emerald-600">
                              €{product.revenue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaUtensils className="text-purple-600" />
                    <h2 className="text-lg font-semibold text-slate-800">
                      Κατηγορίες Προϊόντων
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {data.categories.map((category: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                index === 0
                                  ? "bg-purple-500"
                                  : index === 1
                                  ? "bg-blue-500"
                                  : index === 2
                                  ? "bg-emerald-500"
                                  : "bg-orange-500"
                              }`}
                            />
                            <span className="font-medium text-slate-700">
                              {category.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">
                              {category.orders} παραγγελίες
                            </span>
                            <span className="font-semibold text-slate-800">
                              €{category.revenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              index === 0
                                ? "bg-purple-500"
                                : index === 1
                                ? "bg-blue-500"
                                : index === 2
                                ? "bg-emerald-500"
                                : "bg-orange-500"
                            }`}
                            style={{ width: `${category.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === "customers" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                  icon={<FaUsers className="w-5 h-5 text-white" />}
                  title="Συνολικοί Πελάτες"
                  value={data.overview.totalCustomers}
                  subtitle="Εγγεγραμμένοι"
                  color="from-blue-500 to-cyan-600"
                />

                <StatCard
                  icon={<FaShoppingCart className="w-5 h-5 text-white" />}
                  title="Ενεργοί Πελάτες"
                  value={data.overview.uniqueCustomers}
                  subtitle="Με παραγγελίες"
                  color="from-purple-500 to-pink-600"
                />
              </div>
            )}

            {/* Reservations Tab */}
            {activeTab === "reservations" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    icon={<FaChair className="w-5 h-5 text-white" />}
                    title="Συνολικές Κρατήσεις"
                    value={data.reservations.total}
                    subtitle="Όλες οι κρατήσεις"
                    color="from-indigo-500 to-purple-600"
                  />

                  <StatCard
                    icon={<FaCheckCircle className="w-5 h-5 text-white" />}
                    title="Επιβεβαιωμένες"
                    value={data.reservations.confirmed}
                    subtitle="Κρατήσεις"
                    color="from-green-500 to-emerald-600"
                  />

                  <StatCard
                    icon={<FaUsers className="w-5 h-5 text-white" />}
                    title="Σύνολο Ατόμων"
                    value={data.reservations.totalGuests}
                    subtitle="Καλεσμένοι"
                    color="from-amber-500 to-orange-600"
                  />
                </div>
              </div>
            )}

            {/* Charts Tab */}
            {activeTab === "charts" && (
              <div className="space-y-6">
                {/* Daily Revenue Chart */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaChartBar className="text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-800">
                      Ημερήσιος Τζίρος
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {data.charts.daily.map((day: any, index: number) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-24">
                          {formatDM(day.date)}
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-8 relative">
                          <div
                            className="h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-end pr-3 text-white text-sm font-semibold"
                            style={{
                              width: `${Math.min(
                                (day.revenue /
                                  Math.max(
                                    ...data.charts.daily.map(
                                      (d: any) => d.revenue
                                    )
                                  )) *
                                  100,
                                100
                              )}%`,
                            }}
                          >
                            €{day.revenue.toFixed(2)}
                          </div>
                        </div>
                        <span className="text-sm text-slate-600 w-16">
                          {day.count} παρ.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaClock className="text-purple-600" />
                    <h2 className="text-lg font-semibold text-slate-800">
                      Κατανομή Ανά Ώρα
                    </h2>
                  </div>

                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {data.charts.hourly.map((hour: any) => (
                      <div key={hour.hour} className="text-center">
                        <div className="bg-slate-100 rounded-lg p-2 h-20 flex flex-col justify-end">
                          <div
                            className="bg-gradient-to-t from-purple-500 to-pink-600 rounded"
                            style={{
                              height: `${
                                (hour.count /
                                  Math.max(
                                    ...data.charts.hourly.map(
                                      (h: any) => h.count
                                    )
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {hour.hour}:00
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          {hour.count}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FaCreditCard className="text-emerald-600" />
                    <h2 className="text-lg font-semibold text-slate-800">
                      Μέθοδοι Πληρωμής
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {data.charts.payments.map((payment: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700 capitalize">
                            {payment.method}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">
                              {payment.count} παραγγελίες
                            </span>
                            <span className="font-semibold text-slate-800">
                              {payment.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                            style={{ width: `${payment.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
