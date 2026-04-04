"use client";

import { useEffect } from "react";
import {
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <FaCheck className="text-green-500" />;
      case "error":
        return <FaTimes className="text-red-500" />;
      case "warning":
        return <FaExclamationTriangle className="text-yellow-500" />;
      case "info":
        return <FaInfoCircle className="text-blue-500" />;
      default:
        return <FaCheck className="text-green-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-green-50 border-green-200";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "warning":
        return "text-yellow-800";
      case "info":
        return "text-blue-800";
      default:
        return "text-green-800";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideInDown">
      <div
        className={`${getBgColor()} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className={`flex-1 ${getTextColor()} font-medium`}>
            {message}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
