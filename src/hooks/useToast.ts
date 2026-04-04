"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "warning" | "info" = "success") => {
    const id = Date.now().toString();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => showToast(message, "success"), [showToast]);
  const error = useCallback((message: string) => showToast(message, "error"), [showToast]);
  const warning = useCallback((message: string) => showToast(message, "warning"), [showToast]);
  const info = useCallback((message: string) => showToast(message, "info"), [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};
