"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaCashRegister,
  FaClipboardList,
  FaCalendarCheck,
  FaUsers,
  FaBox,
  FaStore,
  FaChartLine,
  FaReceipt,
  FaUtensils,
  FaClock,
  FaArrowRight,
  FaExclamationTriangle,
} from "react-icons/fa";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  todayInvoices: number;
  todayRevenue: number;
  activeReservations: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  series: string;
  total: number;
  timestamp: Date;
  userName: string;
}

interface UpcomingReservation {
  id: string;
  title: string;
  customerName?: string;
  date: string;
  time: string;
  numberOfPeople: number;
  phone: string;
  status: string;
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayInvoices: 0,
    todayRevenue: 0,
    activeReservations: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<
    UpcomingReservation[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get today's start and end timestamps
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = Timestamp.fromDate(today);
      const todayEnd = Timestamp.fromDate(new Date());

      // Load today's invoices
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("timestamp", ">=", todayStart),
        where("timestamp", "<=", todayEnd)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const todayInvoicesData = invoicesSnapshot.docs;
      const todayRevenue = todayInvoicesData.reduce(
        (sum, doc) => sum + (doc.data().total || 0),
        0
      );

      // Load recent invoices (last 5)
      const recentInvoicesQuery = query(
        collection(db, "invoices"),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const recentInvoicesSnapshot = await getDocs(recentInvoicesQuery);
      const recentInvoicesData = recentInvoicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        invoiceNumber: doc.data().invoiceNumber || "N/A",
        series: doc.data().series || "N/A",
        total: doc.data().total || 0,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        userName: doc.data().userName || "Χρήστης",
      }));

      // Load active reservations (today and future)
      const reservationsQuery = query(
        collection(db, "reservations"),
        where("date", ">=", today.toISOString().split("T")[0])
      );
      const reservationsSnapshot = await getDocs(reservationsQuery);
      const activeReservationsData = reservationsSnapshot.docs.filter(
        (doc) =>
          doc.data().status !== "cancelled" && doc.data().status !== "completed"
      );

      // Load upcoming reservations (next 5)
      const upcomingReservationsData = reservationsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          title: doc.data().title || "",
          customerName: doc.data().customerName,
          date: doc.data().date || "",
          time: doc.data().time || "",
          numberOfPeople: doc.data().numberOfPeople || 0,
          phone: doc.data().phone || "",
          status: doc.data().status || "pending",
        }))
        .filter(
          (res) => res.status !== "cancelled" && res.status !== "completed"
        )
        .sort((a, b) => {
          const dateA = new Date(a.date + "T" + a.time).getTime();
          const dateB = new Date(b.date + "T" + b.time).getTime();
          return dateA - dateB;
        })
        .slice(0, 5);

      // Load customers count
      const customersSnapshot = await getDocs(collection(db, "customers"));
      const totalCustomers = customersSnapshot.size;

      // Load products and check stock
      const productsSnapshot = await getDocs(collection(db, "products"));
      const totalProducts = productsSnapshot.size;
      const lowStockProducts = productsSnapshot.docs.filter(
        (doc) =>
          doc.data().trackStock &&
          doc.data().stock <= (doc.data().minStock || 5) &&
          !doc.data().neverOutOfStock
      ).length;

      setStats({
        todayInvoices: todayInvoicesData.length,
        todayRevenue,
        activeReservations: activeReservationsData.length,
        totalCustomers,
        totalProducts,
        lowStockProducts,
      });

      setRecentInvoices(recentInvoicesData);
      setUpcomingReservations(upcomingReservationsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Φόρτωση δεδομένων...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 overflow-y-auto"
      style={{ height: "calc(100vh - 25px)" }}
    >
      <div className="w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              Κεντρικός Πίνακας
            </h1>
            <p className="text-gray-600">
              Καλώς ήρθατε{" "}
              {user && (
                <span className="font-semibold text-amber-600">
                  {user.firstName} {user.lastName}
                </span>
              )}{" "}
              στο POS System
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <FaClock className="text-amber-500" />
            <span className="font-medium">
              {new Date().toLocaleDateString("el-GR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Today's Revenue */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FaChartLine size={24} />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                Σήμερα
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              €{stats.todayRevenue.toFixed(2)}
            </h3>
            <p className="text-green-100">{stats.todayInvoices} παραστατικά</p>
          </div>

          {/* Active Reservations */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FaCalendarCheck size={24} />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                Ενεργές
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {stats.activeReservations}
            </h3>
            <p className="text-blue-100">Κρατήσεις</p>
          </div>

          {/* Total Customers */}
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FaUsers size={24} />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                Σύνολο
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.totalCustomers}</h3>
            <p className="text-purple-100">Πελάτες</p>
          </div>

          {/* Total Products */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FaBox size={24} />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                Κατάλογος
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.totalProducts}</h3>
            <p className="text-amber-100">Προϊόντα</p>
          </div>

          {/* Low Stock Alert */}
          <div
            className={`bg-gradient-to-br rounded-xl shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-shadow ${
              stats.lowStockProducts > 0
                ? "from-red-500 to-rose-600"
                : "from-gray-400 to-gray-500"
            }`}
            onClick={() =>
              stats.lowStockProducts > 0 && router.push("/products")
            }
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                {stats.lowStockProducts > 0 ? (
                  <FaExclamationTriangle size={24} />
                ) : (
                  <FaUtensils size={24} />
                )}
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                {stats.lowStockProducts > 0 ? "Προσοχή" : "OK"}
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {stats.lowStockProducts}
            </h3>
            <p
              className={
                stats.lowStockProducts > 0 ? "text-red-100" : "text-gray-100"
              }
            >
              Χαμηλό απόθεμα
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaCashRegister className="text-amber-500" />
            Γρήγορες Ενέργειες
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push("/pos")}
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg hover:shadow-md transition-all hover:scale-105"
            >
              <div className="p-3 bg-red-500 text-white rounded-lg">
                <FaCashRegister size={24} />
              </div>
              <span className="font-semibold text-gray-800">POS System</span>
            </button>

            <button
              onClick={() => router.push("/reservations")}
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all hover:scale-105"
            >
              <div className="p-3 bg-blue-500 text-white rounded-lg">
                <FaCalendarCheck size={24} />
              </div>
              <span className="font-semibold text-gray-800">Κρατήσεις</span>
            </button>

            <button
              onClick={() => router.push("/products")}
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all hover:scale-105"
            >
              <div className="p-3 bg-purple-500 text-white rounded-lg">
                <FaBox size={24} />
              </div>
              <span className="font-semibold text-gray-800">Προϊόντα</span>
            </button>

            <button
              onClick={() => router.push("/customers")}
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg hover:shadow-md transition-all hover:scale-105"
            >
              <div className="p-3 bg-teal-500 text-white rounded-lg">
                <FaUsers size={24} />
              </div>
              <span className="font-semibold text-gray-800">Πελάτες</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaReceipt className="text-green-500" />
                Πρόσφατα Παραστατικά
              </h2>
              <button
                onClick={() => router.push("/pos")}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                Όλα
                <FaArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {recentInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Δεν υπάρχουν πρόσφατα παραστατικά
                </p>
              ) : (
                recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {invoice.series} {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {invoice.userName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        €{invoice.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {invoice.timestamp.toLocaleTimeString("el-GR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Reservations */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaCalendarCheck className="text-blue-500" />
                Επερχόμενες Κρατήσεις
              </h2>
              <button
                onClick={() => router.push("/reservations")}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                Όλες
                <FaArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingReservations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Δεν υπάρχουν επερχόμενες κρατήσεις
                </p>
              ) : (
                upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-800">
                        {reservation.title}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          reservation.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : reservation.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {reservation.status === "confirmed"
                          ? "Επιβεβαιωμένη"
                          : reservation.status === "pending"
                          ? "Εκκρεμής"
                          : "Καθισμένη"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        📅{" "}
                        {new Date(reservation.date).toLocaleDateString("el-GR")}
                      </div>
                      <div>🕐 {reservation.time}</div>
                      <div>👥 {reservation.numberOfPeople} άτομα</div>
                      <div>📞 {reservation.phone}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
