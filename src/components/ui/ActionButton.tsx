"use client";

import React from "react";
import { IconType } from "react-icons";

interface ActionButtonProps {
  onClick?: () => void;
  icon?: IconType;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  icon: Icon,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500 shadow-md hover:shadow-lg",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500",
    success: "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 focus:ring-emerald-500 shadow-md hover:shadow-lg",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 shadow-md hover:shadow-lg",
    warning: "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 focus:ring-amber-500 shadow-md hover:shadow-lg",
  };
  
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      {children}
    </button>
  );
};

export default ActionButton;
