"use client";

import React, { useState } from "react";
import { FiX, FiSave, FiPackage, FiPlus, FiMinus } from "react-icons/fi";
import { Product } from "@/types/products";
import ActionButton from "./ui/ActionButton";
import { formatQuantityWithUnit } from "@/constants/mydata";

interface StockModalProps {
  product: Product;
  onClose: () => void;
  onSave: (productId: string, newStock: number) => void;
}

const StockModal: React.FC<StockModalProps> = ({ product, onClose, onSave }) => {
  const [stockToAdd, setStockToAdd] = useState<number>(0);
  const [reason, setReason] = useState<string>("");

  const currentStock = product.stock;
  const newTotalStock = currentStock + stockToAdd;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockToAdd !== 0) {
      onSave(product.id, newTotalStock);
      onClose();
    }
  };

  const presetAmounts = [1, 5, 10, 20, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FiPackage className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Διαχείριση Αποθέματος
                </h2>
                <p className="text-blue-100 text-sm">
                  {product.name}
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

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Current Stock Display */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {currentStock}
                </div>
                <div className="text-sm text-slate-600">
                  Τρέχον Απόθεμα
                </div>
              </div>
            </div>

            {/* Stock Adjustment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Προσθήκη/Αφαίρεση Αποθέματος
              </label>
              
              {/* Preset Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {presetAmounts.map((amount) => (
                  <div key={amount} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setStockToAdd(stockToAdd + amount)}
                      className="flex-1 px-2 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <FiPlus className="w-3 h-3" />
                      {amount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockToAdd(stockToAdd - amount)}
                      className="flex-1 px-2 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <FiMinus className="w-3 h-3" />
                      {amount}
                    </button>
                  </div>
                ))}
              </div>

              {/* Manual Input */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-center text-lg font-semibold"
                    placeholder="0"
                  />
                </div>
                <div className="text-2xl font-bold text-slate-400">=</div>
                <div className="flex-1 text-center">
                  <div className={`text-2xl font-bold ${
                    newTotalStock < 0 ? 'text-red-600' : 
                    newTotalStock > currentStock ? 'text-green-600' : 'text-slate-800'
                  }`}>
                    {newTotalStock}
                  </div>
                  <div className="text-xs text-slate-500">Νέο Σύνολο</div>
                </div>
              </div>

              {/* Stock Change Indicator */}
              {stockToAdd !== 0 && (
                <div className={`mt-3 p-3 rounded-lg ${
                  stockToAdd > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`text-sm font-medium ${
                    stockToAdd > 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {stockToAdd > 0 ? 'Προσθήκη' : 'Αφαίρεση'}: {formatQuantityWithUnit(Math.abs(stockToAdd), product.quantityType || 1)}
                  </div>
                  <div className={`text-xs ${
                    stockToAdd > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentStock} → {newTotalStock}
                  </div>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Αιτιολογία (προαιρετικό)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                rows={3}
                placeholder="π.χ. Παραλαβή εμπορεύματος, Διόρθωση απογραφής, Επιστροφή..."
              />
            </div>

            {/* Warning for negative stock */}
            {newTotalStock < 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <FiX className="w-4 h-4" />
                  <strong>Προσοχή!</strong>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  Το απόθεμα θα γίνει αρνητικό. Βεβαιωθείτε ότι αυτό είναι σωστό.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
            <ActionButton onClick={onClose} variant="secondary" className="flex-1">
              Ακύρωση
            </ActionButton>
            <ActionButton 
              type="submit" 
              icon={FiSave} 
              className="flex-1"
              disabled={stockToAdd === 0}
            >
              Ενημέρωση
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockModal;
