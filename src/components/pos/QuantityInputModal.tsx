"use client";

import React, { useState, useEffect } from 'react';
import { FaWeight, FaTint, FaTimes } from 'react-icons/fa';

interface QuantityInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  productName: string;
  quantityType: number; // 1 = Τεμάχια, 2 = Κιλά, 3 = Λίτρα
  pricePerUnit: number; // Τιμή ανά μονάδα (€/κιλό ή €/λίτρο)
}

const QuantityInputModal: React.FC<QuantityInputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName,
  quantityType,
  pricePerUnit
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Reset quantity when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setError('');
    }
  }, [isOpen]);

  // Get unit label based on quantity type (use small units for weight/volume)
  const getUnitLabel = () => {
    switch (quantityType) {
      case 2:
        return 'γραμμάρια'; // Use grams instead of kg
      case 3:
        return 'ml'; // Use ml instead of liters
      default:
        return 'τεμάχια';
    }
  };

  // Get display unit for price (kg/L)
  const getPriceUnitLabel = () => {
    switch (quantityType) {
      case 2:
        return 'κιλό';
      case 3:
        return 'λίτρο';
      default:
        return 'τεμάχιο';
    }
  };

  // Convert input (grams/ml) to kg/L for price calculation
  const getKgOrLiters = (): number => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return 0;
    if (quantityType === 2 || quantityType === 3) {
      return qty / 1000; // Convert g/ml to kg/L
    }
    return qty;
  };

  // Get icon based on quantity type
  const getIcon = () => {
    switch (quantityType) {
      case 2:
        return <FaWeight className="text-amber-600" />;
      case 3:
        return <FaTint className="text-blue-600" />;
      default:
        return null;
    }
  };

  // Calculate total price (convert grams/ml to kg/L first)
  const calculateTotal = (): number => {
    const kgOrLiters = getKgOrLiters();
    if (kgOrLiters <= 0) return 0;
    return kgOrLiters * pricePerUnit;
  };

  // Handle confirm
  const handleConfirm = () => {
    const qty = parseFloat(quantity);
    
    // Validation
    if (!quantity || quantity.trim() === '') {
      setError('Παρακαλώ εισάγετε ποσότητα');
      return;
    }
    
    if (isNaN(qty) || qty <= 0) {
      setError('Η ποσότητα πρέπει να είναι μεγαλύτερη από 0');
      return;
    }
    
    if (qty > 999999) {
      setError('Η ποσότητα είναι πολύ μεγάλη');
      return;
    }
    
    // Convert grams/ml to kg/L before confirming
    const finalQuantity = getKgOrLiters();
    
    // Confirm and close
    onConfirm(finalQuantity);
    onClose();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Quick quantity buttons (in grams/ml for weight/volume)
  const quickQuantities = quantityType === 2 
    ? [100, 250, 500, 1000, 2000] // Γραμμάρια
    : quantityType === 3
    ? [100, 250, 500, 1000, 2000] // ml
    : [1, 2, 3, 5, 10]; // Τεμάχια

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Εισαγωγή Ποσότητας
              </h2>
              <p className="text-sm text-gray-600 mt-1">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Price per unit */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Τιμή ανά {getPriceUnitLabel()}:</span>{' '}
              €{pricePerUnit.toFixed(2)}
            </p>
          </div>

          {/* Quantity input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Πόσα {getUnitLabel()};
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="999999"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                className={`w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={quantityType === 2 ? 'π.χ. 500 γραμμάρια' : quantityType === 3 ? 'π.χ. 1000 ml' : 'π.χ. 2'}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                {getUnitLabel()}
              </span>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Quick quantity buttons */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Γρήγορη επιλογή:</p>
            <div className="grid grid-cols-5 gap-2">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  onClick={() => setQuantity(qty.toString())}
                  className="px-3 py-2 bg-gray-100 hover:bg-amber-100 border border-gray-300 hover:border-amber-400 rounded-lg text-sm font-medium transition-colors"
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>

          {/* Total price preview */}
          {quantity && !isNaN(parseFloat(quantity)) && parseFloat(quantity) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-lg font-bold text-green-800">
                Σύνολο: €{calculateTotal().toFixed(2)}
              </p>
              {/* Show conversion for weight/volume products */}
              {(quantityType === 2 || quantityType === 3) && (
                <>
                  <p className="text-sm text-green-700">
                    {quantity} {getUnitLabel()} = {getKgOrLiters().toFixed(3)} {getPriceUnitLabel()}
                  </p>
                  <p className="text-sm text-green-700">
                    {getKgOrLiters().toFixed(3)} {getPriceUnitLabel()} × €{pricePerUnit.toFixed(2)}/{getPriceUnitLabel()} = €{calculateTotal().toFixed(2)}
                  </p>
                </>
              )}
              {/* Show simple calculation for pieces */}
              {quantityType === 1 && (
                <p className="text-sm text-green-700">
                  {quantity} {getUnitLabel()} × €{pricePerUnit.toFixed(2)} = €{calculateTotal().toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Ακύρωση
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors"
          >
            Προσθήκη στο Καλάθι
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantityInputModal;
