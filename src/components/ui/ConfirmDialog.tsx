"use client";

import React from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import ActionButton from "./ActionButton";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Επιβεβαίωση",
  cancelText = "Ακύρωση",
  variant = "danger",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                variant === "danger" ? "bg-red-100" :
                variant === "warning" ? "bg-amber-100" : "bg-blue-100"
              }`}>
                <FiAlertTriangle className={`w-5 h-5 ${
                  variant === "danger" ? "text-red-600" :
                  variant === "warning" ? "text-amber-600" : "text-blue-600"
                }`} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 mb-6">{message}</p>
          
          <div className="flex gap-3">
            <ActionButton
              onClick={onClose}
              variant="secondary"
              disabled={loading}
              className="flex-1"
            >
              {cancelText}
            </ActionButton>
            <ActionButton
              onClick={onConfirm}
              variant={variant}
              loading={loading}
              className="flex-1"
            >
              {confirmText}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
