"use client";

import { FiGlobe, FiTruck } from "react-icons/fi";
import { MdDeliveryDining } from "react-icons/md";

interface OrderTabsProps {
  activeTab: "website" | "wolt" | "efood";
  onTabChange: (tab: "website" | "wolt" | "efood") => void;
  counts: {
    website: number;
    wolt: number;
    efood: number;
  };
}

export default function OrderTabs({
  activeTab,
  onTabChange,
  counts,
}: OrderTabsProps) {
  const tabs = [
    {
      id: "website" as const,
      label: "Εισερχόμενες Website",
      icon: FiGlobe,
      color: "amber",
      count: counts.website,
    },
    {
      id: "wolt" as const,
      label: "Εισερχόμενες Wolt",
      icon: FiTruck,
      color: "cyan",
      count: counts.wolt,
    },
    {
      id: "efood" as const,
      label: "Εισερχόμενες Efood",
      icon: MdDeliveryDining,
      color: "red",
      count: counts.efood,
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 border border-gray-100">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-[200px] flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
