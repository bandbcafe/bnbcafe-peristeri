"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaCashRegister,
  FaClipboardList,
  FaBox,
  FaCalendarAlt,
  FaChartBar,
  FaUtensils,
  FaTruck,
  FaUsers,
  FaBroom,
  FaThermometerHalf,
  FaCog,
  FaBars,
  FaTimes,
  FaGlobe,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaStore,
} from "react-icons/fa";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useOrderNotifications } from "@/contexts/OrderNotificationContext";
import logoFull from "@/assets/images/logowhite.png";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

function LogoutButton({ isCollapsed }: { isCollapsed: boolean }) {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    if (confirm("Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;")) {
      logout();
    }
  };

  if (!user) return null;

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {/* User Avatar */}
        <div
          className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
          title={`${user.firstName || (user as any).name || "User"} ${
            user.lastName || ""
          } (${user.role})`}
        >
          {(user.firstName || (user as any).name || "U").charAt(0)}
          {(user.lastName || "").charAt(0)}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          title="Αποσύνδεση"
        >
          <FaSignOutAlt className="text-sm" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* User Avatar */}
        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {(user.firstName || (user as any).name || "U").charAt(0)}
          {(user.lastName || "").charAt(0)}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {user.firstName || (user as any).name || "User"}{" "}
            {user.lastName || ""}
          </p>
          <p className="text-slate-300 text-xs capitalize">{user.role}</p>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        title="Αποσύνδεση"
      >
        <FaSignOutAlt className="text-sm" />
      </button>
    </div>
  );
}

interface SidebarProps {
  className?: string;
}

interface MenuItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const pathname = usePathname();
  const { newOrdersCount, hasNewOrders } = useOrderNotifications();

  // Listen for logo changes in real-time
  useEffect(() => {
    const logoRef = doc(db, "config", "logo");
    const unsubscribe = onSnapshot(logoRef, (doc) => {
      if (doc.exists() && doc.data().logoBase64) {
        setCustomLogo(doc.data().logoBase64);
      } else {
        setCustomLogo(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      name: "Control Panel",
      icon: <FaHome size={20} />,
      href: "/admin",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "pos",
      name: "POS System",
      icon: <FaCashRegister size={20} />,
      href: "/admin/pos",
      color: "from-red-500 to-red-600",
    },
    {
      id: "orders",
      name: "Παραγγελίες",
      icon: <FaClipboardList size={20} />,
      href: "/admin/orders",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      id: "products",
      name: "Προϊόντα",
      icon: <FaBox size={20} />,
      href: "/admin/products",
      color: "from-purple-500 to-purple-600",
    },

    {
      id: "reservations",
      name: "Κρατήσεις",
      icon: <FaCalendarAlt size={20} />,
      href: "/admin/reservations",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      id: "customers",
      name: "Πελάτες",
      icon: <FaUsers size={20} />,
      href: "/admin/customers",
      color: "from-teal-500 to-teal-600",
    },
    {
      id: "suppliers",
      name: "Προμηθευτές",
      icon: <FaTruck size={20} />,
      href: "/admin/suppliers",
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "cleanings",
      name: "Καθαριότητες",
      icon: <FaBroom size={20} />,
      href: "/admin/cleanings",
      color: "from-green-500 to-green-600",
    },
    {
      id: "fridges",
      name: "Θερμοκρασίες",
      icon: <FaThermometerHalf size={20} />,
      href: "/admin/fridges",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      id: "analytics",
      name: "Στατιστικά",
      icon: <FaChartBar size={20} />,
      href: "/admin/analytics",
      color: "from-pink-500 to-pink-600",
    },
    {
      id: "foodcost",
      name: "Food Cost",
      icon: <FaUtensils size={20} />,
      href: "/admin/FoodCost",
      color: "from-amber-500 to-amber-600",
    },
    {
      id: "website",
      name: "Website",
      icon: <FaGlobe size={20} />,
      href: "/admin/website",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "settings",
      name: "Ρυθμίσεις",
      icon: <FaCog size={20} />,
      href: "/admin/settings",
      color: "from-slate-500 to-slate-600",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle Arrow (visible when closed on mobile) */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden fixed left-1/2 -translate-x-1/2 bottom-0 z-40 px-6 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          title="Άνοιγμα μενού"
        >
          <FaBars size={14} />
          <span className="text-xs font-medium">Μενού</span>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
          text-white flex flex-col transition-all duration-300 ease-in-out
          
          /* Mobile: Bottom drawer */
          fixed lg:relative z-50
          bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl
          ${isMobileOpen ? "translate-y-0" : "translate-y-full"}
          
          /* Desktop: Side panel */
          lg:translate-y-0 lg:h-full lg:rounded-none
          ${isCollapsed ? "lg:w-16" : "lg:w-64"}
          ${className}
        `}
      >
        {/* Mobile Close Button (visible when open) */}
        {isMobileOpen && (
          <div className="lg:hidden flex items-center justify-center py-2 border-b border-white/10">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="w-12 h-1 bg-white/30 rounded-full hover:bg-white/50 transition-colors"
              title="Κλείσιμο μενού"
            />
          </div>
        )}

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/10">
          {/* Logo */}
          <div
            className={`flex flex-col items-center justify-center py-2 gap-2 ${
              isCollapsed ? "w-full" : "flex-1"
            }`}
          >
            {!isCollapsed ? (
              <div className="w-24 h-auto">
                <Image
                  src={customLogo || logoFull}
                  alt="Full Logo"
                  width={110}
                  height={60}
                  className="w-full h-auto object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                W
              </div>
            )}
          </div>

          {/* Toggle Button - Desktop Only */}
          {!isMobileOpen && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
              title={isCollapsed ? "Επέκταση μενού" : "Σύμπτυξη μενού"}
            >
              {isCollapsed ? (
                <FaChevronRight size={14} />
              ) : (
                <FaChevronLeft size={14} />
              )}
            </button>
          )}

          {/* Close Button - Mobile Only */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    group relative flex items-center
                    ${isCollapsed ? "justify-center" : "justify-start"}
                    h-12 ${
                      isCollapsed ? "mx-2" : "px-3"
                    } rounded-xl transition-all duration-200
                    ${
                      isActive(item.href)
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-white/10`
                        : "hover:bg-white/10 text-slate-300 hover:text-white"
                    }
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  {/* Icon Container */}
                  <div
                    className={`
                    flex items-center justify-center w-8 h-8 rounded-lg
                    ${
                      isActive(item.href)
                        ? "bg-white/20"
                        : "bg-white/5 group-hover:bg-white/10"
                    }
                    transition-all duration-200
                  `}
                  >
                    {item.icon}
                  </div>

                  {/* Text - Hidden when collapsed */}
                  {!isCollapsed && (
                    <span className="ml-3 font-medium truncate">
                      {item.name}
                    </span>
                  )}

                  {/* Notification Badge for Orders */}
                  {item.id === "orders" && hasNewOrders && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="relative flex h-6 w-6">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-white text-xs font-bold items-center justify-center shadow-lg">
                          {newOrdersCount}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Active Indicator */}
                  {isActive(item.href) && !isCollapsed && !hasNewOrders && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info Ribbon */}
        <div className="p-4 mt-auto">
          <LogoutButton isCollapsed={isCollapsed} />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
