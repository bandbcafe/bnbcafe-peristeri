"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  FiDollarSign,
  FiShoppingCart,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";

interface Stats {
  todayRevenue: number;
  newOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

export default function OrderStats() {
  const [stats, setStats] = useState<Stats>({
    todayRevenue: 0,
    newOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get today's start timestamp
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = Timestamp.fromDate(today);

    // Real-time listener for all orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("createdAt", ">=", todayStart)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      let revenue = 0;
      let pending = 0;
      let completed = 0;

      snapshot.docs.forEach((doc) => {
        const order = doc.data();

        // Calculate revenue from completed orders
        if (order.status === "completed") {
          revenue += order.total || 0;
          completed++;
        }

        // Count pending orders
        if (order.status === "pending") {
          pending++;
        }
      });

      setStats({
        todayRevenue: revenue,
        newOrders: snapshot.size,
        pendingOrders: pending,
        completedOrders: completed,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const statCards = [
    {
      title: "Τζίρος Ημέρας",
      value: `€${stats.todayRevenue.toFixed(2)}`,
      icon: FiDollarSign,
      color: "from-green-500 to-emerald-600",
      textColor: "text-green-600",
    },
    {
      title: "Νέες Παραγγελίες",
      value: stats.newOrders.toString(),
      icon: FiShoppingCart,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-600",
    },
    {
      title: "Σε Εξέλιξη",
      value: stats.pendingOrders.toString(),
      icon: FiClock,
      color: "from-blue-500 to-cyan-600",
      textColor: "text-blue-600",
    },
    {
      title: "Ολοκληρωμένες",
      value: stats.completedOrders.toString(),
      icon: FiCheckCircle,
      color: "from-purple-500 to-pink-600",
      textColor: "text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"
          >
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                {stat.title}
              </p>
              <p className={`text-3xl font-bold ${stat.textColor}`}>
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
