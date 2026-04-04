"use client";

import React, { useState } from "react";
import { FiX, FiSave, FiDollarSign } from "react-icons/fi";
import { PriceList } from "@/types/products";
import ActionButton from "./ui/ActionButton";

interface PriceListModalProps {
  priceList?: PriceList;
  onClose: () => void;
  onSave: (priceList: Omit<PriceList, "id" | "createdAt" | "updatedAt">) => void;
}

const PriceListModal: React.FC<PriceListModalProps> = ({ priceList, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: priceList?.name || "",
    description: priceList?.description || "",
    isActive: priceList?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Το όνομα του τιμοκαταλόγου είναι υποχρεωτικό";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FiDollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {priceList ? "Επεξεργασία Τιμοκαταλόγου" : "Νέος Τιμοκατάλογος"}
                </h2>
                <p className="text-green-100 text-sm">
                  Διαχείριση τιμοκαταλόγων προϊόντων
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Όνομα Τιμοκαταλόγου *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                errors.name ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-green-500"
              }`}
              placeholder="π.χ. Τιμές Καλοκαιριού 2024"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Περιγραφή
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors resize-none"
              placeholder="Προαιρετική περιγραφή του τιμοκαταλόγου..."
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Ενεργός τιμοκατάλογος
            </label>
            <span className="text-xs text-slate-500 ml-auto">
              {formData.isActive ? "Διαθέσιμος για χρήση" : "Απενεργοποιημένος"}
            </span>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <ActionButton onClick={onClose} variant="secondary" className="flex-1">
              Ακύρωση
            </ActionButton>
            <ActionButton type="submit" icon={FiSave} variant="success" className="flex-1">
              {priceList ? "Ενημέρωση" : "Αποθήκευση"}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PriceListModal;
