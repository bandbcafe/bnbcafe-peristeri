"use client";

import React, { useState } from 'react';
import { FaTimes, FaMoneyBillWave, FaCreditCard, FaReceipt, FaSpinner } from 'react-icons/fa';
import { PaymentMethod } from '@/types/pos';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => Promise<void>;
  total: number;
  isProcessing?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  total,
  isProcessing = false
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');

  const handleConfirm = async () => {
    await onConfirm(selectedPaymentMethod);
    // Note: onClose is called from the parent component after successful payment
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FaReceipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Επιλογή Πληρωμής
                </h2>
                <p className="text-amber-100 text-sm">
                  Σύνολο: €{total.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white disabled:opacity-50"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Τρόπος Πληρωμής:
            </h3>
            
            <div className="space-y-3">
              {/* Cash Option */}
              <button
                onClick={() => setSelectedPaymentMethod('cash')}
                disabled={isProcessing}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                  selectedPaymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedPaymentMethod === 'cash' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  <FaMoneyBillWave className={`w-6 h-6 ${
                    selectedPaymentMethod === 'cash' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">Μετρητά</div>
                  <div className="text-sm opacity-75">Πληρωμή με μετρητά</div>
                </div>
                {selectedPaymentMethod === 'cash' && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>

              {/* Card Option */}
              <button
                onClick={() => setSelectedPaymentMethod('card')}
                disabled={isProcessing}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                  selectedPaymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedPaymentMethod === 'card' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <FaCreditCard className={`w-6 h-6 ${
                    selectedPaymentMethod === 'card' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">Κάρτα</div>
                  <div className="text-sm opacity-75">Πληρωμή με κάρτα</div>
                </div>
                {selectedPaymentMethod === 'card' && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ακύρωση
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin w-4 h-4" />
                  Επεξεργασία...
                </>
              ) : (
                <>
                  <FaReceipt className="w-4 h-4" />
                  Έκδοση Απόδειξης
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
