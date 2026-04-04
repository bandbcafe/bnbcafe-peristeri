"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  FiX,
  FiUser,
  FiPhone,
  FiClock,
  FiPackage,
  FiCreditCard,
  FiCheckCircle,
} from "react-icons/fi";
import { FaMapMarkerAlt, FaMoneyBillWave } from "react-icons/fa";

interface CompletedOrderDetailsModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface OrderData {
  id: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    floor?: string;
    doorbell?: string;
    notes?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
    selectedOptions?: Array<{
      groupName: string;
      items?: Array<{ name: string }>;
      name?: string;
      value?: string;
    }>;
    notes?: string;
  }>;
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: string;
  status: string;
  source: string;
  createdAt: any;
  completedAt?: any;
  estimatedDeliveryTime?: number;
}

export default function CompletedOrderDetailsModal({
  orderId,
  isOpen,
  onClose,
}: CompletedOrderDetailsModalProps) {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        setOrderData({ id: orderSnap.id, ...orderSnap.data() } as OrderData);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case "cashOnDelivery":
      case "cash_on_delivery":
      case "cash":
        return {
          label: "Μετρητά",
          icon: FaMoneyBillWave,
          color: "text-green-600 bg-green-50",
        };
      case "creditCard":
      case "credit_card":
        return {
          label: "Πιστωτική Κάρτα",
          icon: FiCreditCard,
          color: "text-blue-600 bg-blue-50",
        };
      case "iris":
        return {
          label: "Iris Payments",
          icon: FiCreditCard,
          color: "text-purple-600 bg-purple-50",
        };
      case "paypal":
        return {
          label: "PayPal",
          icon: FiCreditCard,
          color: "text-blue-500 bg-blue-50",
        };
      case "applePay":
        return {
          label: "Apple Pay",
          icon: FiCreditCard,
          color: "text-gray-800 bg-gray-50",
        };
      default:
        return {
          label: "Μετρητά",
          icon: FaMoneyBillWave,
          color: "text-green-600 bg-green-50",
        };
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "website":
        return "Website";
      case "wolt":
        return "Wolt";
      case "efood":
        return "e-food";
      default:
        return source;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση λεπτομερειών...</p>
          </div>
        ) : orderData ? (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FiCheckCircle className="text-3xl" />
                    <h2 className="text-2xl font-bold">
                      Ολοκληρωμένη Παραγγελία
                    </h2>
                  </div>
                  <p className="text-green-100 font-mono text-lg">
                    #{orderData.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Customer & Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FiUser className="text-green-600" />
                    Στοιχεία Πελάτη
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Όνομα:</span>
                      <p className="font-semibold text-gray-800">
                        {orderData.customerInfo.firstName}{" "}
                        {orderData.customerInfo.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-800">
                        {orderData.customerInfo.email}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Τηλέφωνο:</span>
                      <p className="font-medium text-gray-800">
                        {orderData.customerInfo.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FiClock className="text-green-600" />
                    Πληροφορίες Παραγγελίας
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Δημιουργήθηκε:</span>
                      <p className="font-medium text-gray-800">
                        {formatDate(orderData.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Ολοκληρώθηκε:</span>
                      <p className="font-medium text-gray-800">
                        {formatDate(
                          orderData.completedAt || orderData.createdAt
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Πηγή:</span>
                      <p className="font-medium text-gray-800">
                        {getSourceLabel(orderData.source)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {orderData.deliveryAddress && (
                <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-amber-600" />
                    Διεύθυνση Παράδοσης
                  </h3>
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-gray-800">
                      {orderData.deliveryAddress.street}
                    </p>
                    <p className="text-gray-700">
                      {orderData.deliveryAddress.city},{" "}
                      {orderData.deliveryAddress.postalCode}
                    </p>
                    {orderData.deliveryAddress.floor && (
                      <p className="text-gray-600">
                        Όροφος: {orderData.deliveryAddress.floor}
                      </p>
                    )}
                    {orderData.deliveryAddress.doorbell && (
                      <p className="text-gray-600">
                        Κουδούνι: {orderData.deliveryAddress.doorbell}
                      </p>
                    )}
                    {orderData.deliveryAddress.notes && (
                      <p className="text-gray-600 italic">
                        Σημειώσεις: {orderData.deliveryAddress.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              {orderData.paymentMethod && (
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FiCreditCard className="text-blue-600" />
                    Τρόπος Πληρωμής
                  </h3>
                  {(() => {
                    const paymentInfo = getPaymentMethodLabel(
                      orderData.paymentMethod
                    );
                    const PaymentIcon = paymentInfo.icon;
                    return (
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${paymentInfo.color}`}
                      >
                        <PaymentIcon className="text-xl" />
                        <span className="font-semibold text-lg">
                          {paymentInfo.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white rounded-xl border-2 border-gray-200">
                <div className="bg-gray-100 px-4 py-3 rounded-t-xl border-b-2 border-gray-200">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <FiPackage className="text-green-600" />
                    Προϊόντα Παραγγελίας ({orderData.items.length})
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {orderData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-green-600 text-white px-2 py-1 rounded-lg text-sm font-bold">
                              {item.quantity}x
                            </span>
                            <h4 className="font-bold text-gray-800 text-lg">
                              {item.name}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            €{item.price.toFixed(2)} / τεμάχιο
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            €{item.totalPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Selected Options */}
                      {item.selectedOptions &&
                        item.selectedOptions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                              Επιλογές:
                            </p>
                            <div className="space-y-1">
                              {item.selectedOptions.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="text-sm text-gray-700 ml-2"
                                >
                                  <span className="font-medium text-amber-700">
                                    {opt.groupName}:
                                  </span>{" "}
                                  {opt.items?.map((i) => i.name).join(", ") ||
                                    opt.name ||
                                    opt.value}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Notes */}
                      {item.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <p className="text-xs font-semibold text-gray-600 mb-1">
                            Σημειώσεις:
                          </p>
                          <p className="text-sm text-gray-700 italic">
                            {item.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">
                  Σύνοψη Παραγγελίας
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Υποσύνολο:</span>
                    <span className="font-semibold">
                      €{orderData.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>ΦΠΑ:</span>
                    <span className="font-semibold">
                      €{orderData.vat.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Κόστος Παράδοσης:</span>
                    <span className="font-semibold">
                      €{orderData.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-3 border-t-2 border-green-300 flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-800">
                      Σύνολο:
                    </span>
                    <span className="text-3xl font-bold text-green-600">
                      €{orderData.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 px-6 py-4 rounded-b-2xl border-t-2 border-gray-200">
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Κλείσιμο
              </button>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600">
              Δεν βρέθηκαν λεπτομέρειες παραγγελίας
            </p>
            <button
              onClick={onClose}
              className="mt-4 text-green-600 hover:text-green-700 font-semibold"
            >
              Κλείσιμο
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
