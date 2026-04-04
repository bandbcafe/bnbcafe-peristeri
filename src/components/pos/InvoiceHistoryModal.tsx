"use client";

import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaHistory,
  FaMoneyBillWave,
  FaCreditCard,
  FaPrint,
  FaEye,
  FaCalendarAlt,
  FaFilter,
} from "react-icons/fa";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRecipes } from "@/hooks/useProducts";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  series: string;
  total: number;
  paymentMethod: "cash" | "card";
  timestamp: Date;
  cart: any[];
  businessInfo: any;
  invoiceData: any;
  userId: string;
  userName: string;
  recipes?: any[];
}

interface InvoiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterPeriod = "today" | "3days" | "3weeks";

const InvoiceHistoryModal: React.FC<InvoiceHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { recipes: currentRecipes } = useRecipes();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(
    null
  );
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("today");
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  // Load invoices from Firestore - GLOBAL (all users)
  const loadInvoices = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const invoicesRef = collection(db, "invoices");
      // Load ALL invoices from ALL users (global view) - ordered by timestamp descending
      const q = query(invoicesRef, orderBy("timestamp", "desc"));

      const querySnapshot = await getDocs(q);
      const invoiceList: InvoiceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Filter out ΔΠΕ (order notes) - only show ΕΑΛΠ (receipts from tables) and regular POS receipts
        if (data.series === "ΔΠΕ") {
          return; // Skip ΔΠΕ - these are temporary order notes that get converted to ΕΑΛΠ
        }

        invoiceList.push({
          id: doc.id,
          invoiceNumber: data.invoiceNumber || "N/A",
          series: data.series || "N/A",
          total: data.total || 0,
          paymentMethod: data.paymentMethod || "cash",
          timestamp: data.timestamp?.toDate() || new Date(),
          cart: data.cart || [],
          businessInfo: data.businessInfo || {},
          invoiceData: data.invoiceData || {},
          userId: data.userId || "",
          userName: data.userName || "Άγνωστος Χρήστης",
          recipes: data.recipes || [],
        });
      });

      // Sort by timestamp descending (newest first) on client side
      invoiceList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setInvoices(invoiceList);
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices by period
  const filterInvoicesByPeriod = (period: FilterPeriod) => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "3days":
        startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case "3weeks":
        startDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = invoices.filter(
      (invoice) => invoice.timestamp >= startDate
    );
    setFilteredInvoices(filtered);
  };

  // Handle print invoice
  const handlePrintInvoice = (invoice: InvoiceRecord) => {
    // Store data globally for print template
    (window as any).cartDataForPrint = invoice.cart;
    (window as any).paymentMethodForPrint = invoice.paymentMethod;
    (window as any).businessInfoForPrint = invoice.businessInfo;
    (window as any).currentUserForPrint = invoice.userName;
    (window as any).recipesDataForPrint = invoice.recipes || [];

    // Trigger print
    const printFunction = (window as any).printReceiptFunction;
    if (printFunction) {
      printFunction({
        invoiceData: invoice.invoiceData,
        cart: invoice.cart,
        paymentMethod: invoice.paymentMethod,
        businessInfo: invoice.businessInfo,
        currentUser: invoice.userName,
        recipes: invoice.recipes || [],
      });
    } else {
      alert("Η λειτουργία εκτύπωσης δεν είναι διαθέσιμη");
    }
  };

  // Handle view invoice details
  const handleViewInvoice = (invoice: InvoiceRecord) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetail(true);
  };

  useEffect(() => {
    if (isOpen) {
      loadInvoices();
    }
  }, [isOpen, user]);

  useEffect(() => {
    filterInvoicesByPeriod(filterPeriod);
  }, [invoices, filterPeriod]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FaHistory className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Ιστορικό Παραστατικών (Όλοι οι Χρήστες)
                </h2>
                <p className="text-blue-100 text-sm">
                  Προβολή και επανεκτύπωση παραστατικών από όλους τους χρήστες
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <FaFilter className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Φίλτρα:</span>
            <div className="flex gap-2">
              {[
                { key: "today", label: "Σήμερα" },
                { key: "3days", label: "3 Τελευταίες Μέρες" },
                { key: "3weeks", label: "3 Τελευταίες Εβδομάδες" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterPeriod(filter.key as FilterPeriod)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterPeriod === filter.key
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-300"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="ml-auto text-sm text-gray-600">
              <FaCalendarAlt className="inline mr-1" />
              {filteredInvoices.length} παραστατικά
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Φόρτωση παραστατικών...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FaHistory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Δεν βρέθηκαν παραστατικά για την επιλεγμένη περίοδο
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              invoice.paymentMethod === "cash"
                                ? "bg-green-100 text-green-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {invoice.paymentMethod === "cash" ? (
                              <FaMoneyBillWave className="w-5 h-5" />
                            ) : (
                              <FaCreditCard className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {invoice.series}-{invoice.invoiceNumber}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                invoice.paymentMethod === "cash"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {invoice.paymentMethod === "cash"
                                ? "Μετρητά"
                                : "Κάρτα"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {invoice.timestamp.toLocaleDateString("el-GR")} -{" "}
                            {invoice.timestamp.toLocaleTimeString("el-GR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            <span className="ml-2 text-gray-500">
                              • {invoice.userName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900">
                            €{invoice.total.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {invoice.cart.length} προϊόντα
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            title="Προβολή"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(invoice)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                            title="Επανεκτύπωση"
                          >
                            <FaPrint className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {showInvoiceDetail && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="bg-gray-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  Προβολή Παραστατικού: {selectedInvoice.series}-
                  {selectedInvoice.invoiceNumber}
                </h3>
                <button
                  onClick={() => setShowInvoiceDetail(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {/* Invoice details would go here - similar to receipt template */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Αριθμός:
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedInvoice.series}-{selectedInvoice.invoiceNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Ημερομηνία:
                    </label>
                    <p>
                      {selectedInvoice.timestamp.toLocaleDateString("el-GR")}{" "}
                      {selectedInvoice.timestamp.toLocaleTimeString("el-GR")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Τρόπος Πληρωμής:
                    </label>
                    <p>
                      {selectedInvoice.paymentMethod === "cash"
                        ? "Μετρητά"
                        : "Κάρτα"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Σύνολο:
                    </label>
                    <p className="text-lg font-bold text-green-600">
                      €{selectedInvoice.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Προϊόντα:
                  </label>
                  <div className="mt-2 space-y-3">
                    {selectedInvoice.cart.map((item, index) => (
                      <div
                        key={index}
                        className="py-3 border-b border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.product?.name ||
                                  item.name ||
                                  "Άγνωστο Προϊόν"}
                              </span>
                              <span className="text-gray-600">
                                x{item.quantity || 1}
                              </span>
                            </div>

                            {/* Recipe Options - Using same logic as print template */}
                            {item.selectedRecipes &&
                              item.selectedRecipes.length > 0 && (
                                <div className="mt-2 ml-4">
                                  {item.selectedRecipes.map(
                                    (selectedRecipe: any, index: number) => {
                                      // Find the recipe to get group and option names (same as print template)
                                      const recipesData =
                                        selectedInvoice.recipes ||
                                        (window as any).recipesDataForPrint ||
                                        currentRecipes ||
                                        [];
                                      const recipe = recipesData.find(
                                        (r: any) =>
                                          r.id === selectedRecipe.recipeId
                                      );

                                      if (!recipe) return null;

                                      const optionsDisplay = Object.entries(
                                        selectedRecipe.selectedOptions || {}
                                      )
                                        .map(
                                          ([groupId, optionIds]: [
                                            string,
                                            any
                                          ]) => {
                                            const group = recipe.groups?.find(
                                              (g: any) => g.id === groupId
                                            );
                                            if (!group || !group.name)
                                              return "";

                                            const optionNames = (
                                              Array.isArray(optionIds)
                                                ? optionIds
                                                : [optionIds]
                                            )
                                              .map((optionId: string) => {
                                                const option =
                                                  group.options?.find(
                                                    (o: any) =>
                                                      o.id === optionId
                                                  );
                                                if (!option || !option.name)
                                                  return "";

                                                // Add price if it exists and is greater than 0
                                                const priceText =
                                                  option.price &&
                                                  option.price > 0
                                                    ? ` (+€${option.price.toFixed(
                                                        2
                                                      )})`
                                                    : "";
                                                return `${option.name}${priceText}`;
                                              })
                                              .filter(Boolean);

                                            return optionNames.length > 0
                                              ? `${
                                                  group.name
                                                }: ${optionNames.join(", ")}`
                                              : "";
                                          }
                                        )
                                        .filter(Boolean);

                                      return optionsDisplay.length > 0 ? (
                                        <div
                                          key={index}
                                          className="text-sm text-gray-600"
                                        >
                                          {optionsDisplay.join(" | ")}
                                        </div>
                                      ) : null;
                                    }
                                  )}
                                </div>
                              )}

                            {/* Base Price and Extra Costs */}
                            <div className="mt-1 text-xs text-gray-500">
                              Βασική τιμή: €
                              {(item.basePrice || item.price || 0).toFixed(2)}
                              {item.extraCost && item.extraCost > 0 && (
                                <span>
                                  {" "}
                                  + Extra: €{item.extraCost.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              €{(item.totalPrice || item.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowInvoiceDetail(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Κλείσιμο
                </button>
                <button
                  onClick={() => {
                    handlePrintInvoice(selectedInvoice);
                    setShowInvoiceDetail(false);
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <FaPrint className="w-4 h-4" />
                  Επανεκτύπωση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistoryModal;
