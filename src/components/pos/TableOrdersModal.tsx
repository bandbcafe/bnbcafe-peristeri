"use client";

import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  FaTimes,
  FaCheck,
  FaEuroSign,
  FaCreditCard,
  FaMoneyBillWave,
  FaSpinner,
  FaPlus,
  FaExclamationTriangle,
  FaFileInvoice,
  FaCheckCircle,
  FaClock,
  FaReceipt,
} from "react-icons/fa";
import {
  getOrderNoteSeries,
  getRetailReceiptSeries,
} from "@/lib/billing-books";
import ReceiptFromOrderNoteTemplate from "@/components/pos/ReceiptFromOrderNoteTemplate";

interface TableOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: any;
  orders: any[];
  onPayment: (
    selectedItems: any[],
    paymentMethod: string,
    paymentDetails?: any
  ) => void;
  onAddProducts?: () => void;
  onReopenTable?: () => Promise<void>;
  onTableUpdate?: () => Promise<void>;
  loading?: boolean;
}

export default function TableOrdersModal({
  isOpen,
  onClose,
  table,
  orders,
  onPayment,
  onAddProducts,
  onReopenTable,
  onTableUpdate,
  loading = false,
}: TableOrdersModalProps) {
  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: boolean;
  }>({});
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNoteSeries, setOrderNoteSeries] = useState("ΔΠΕ");
  const [receiptSeries, setReceiptSeries] = useState("ΕΑΛΠ");
  const [orderDiscounts, setOrderDiscounts] = useState<{
    [orderId: string]: any;
  }>({});

  // Load dynamic series names from billing books
  const loadSeriesNames = async () => {
    try {
      const [orderSeries, receiptSeriesValue] = await Promise.all([
        getOrderNoteSeries(),
        getRetailReceiptSeries(),
      ]);
      setOrderNoteSeries(orderSeries);
      setReceiptSeries(receiptSeriesValue);
      console.log("✅ Series names loaded:", {
        orderSeries,
        receiptSeriesValue,
      });
    } catch (error) {
      console.error("❌ Error loading series names:", error);
      // Keep defaults if loading fails
    }
  };

  // Load discounts for order notes from Firestore
  const loadOrderDiscounts = async () => {
    try {
      const { db } = await import("@/lib/firebase");
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );

      // Search for order notes with discounts for this table
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("tableId", "==", table?.id),
        where("isOrderNote", "==", true)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);
      const discounts: { [orderId: string]: any } = {};

      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.appliedDiscount && data.invoiceData?.id) {
          discounts[data.invoiceData.id] = data.appliedDiscount;
        }
      });

      setOrderDiscounts(discounts);
      console.log("📋 Loaded order discounts:", discounts);
    } catch (error) {
      console.error("⚠️ Error loading order discounts:", error);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedItems({});
      setPaymentMethod("cash");
      loadSeriesNames();
      loadOrderDiscounts(); // Load discounts when modal opens

      // Sync with WRAPP only once when modal opens
      if (table?.wrappId) {
        debugWrappTableShow(table.wrappId);
      }
    }
  }, [isOpen, table?.wrappId]); // Only re-run when modal opens or table changes

  // Debug function to call WRAPP SHOW endpoint
  const debugWrappTableShow = async (wrappId: string) => {
    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        return;
      }

      // Login to WRAPP
      const loginResponse = await fetch("/api/wrapp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: wrappSettings.email,
          api_key: wrappSettings.apiKey,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (!loginResponse.ok) {
        return;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Call SHOW endpoint
      const showResponse = await fetch(
        `/api/wrapp/catering-tables/${wrappId}/show`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            baseUrl: wrappSettings.baseUrl,
          }),
        }
      );

      if (showResponse.ok) {
        const tableData = await showResponse.json();
        // WRAPP Table Data received

        // Update Firestore with fresh WRAPP data
        const { db } = await import("@/lib/firebase");
        const { doc, updateDoc } = await import("firebase/firestore");

        await updateDoc(doc(db, "tables", table.id), {
          status: tableData.status,
          total: parseFloat(tableData.total || "0"),
          invoices: tableData.invoices || [],
          updatedAt: new Date(),
        });

        // Now fetch each invoice to see its details
        if (tableData.invoices && tableData.invoices.length > 0) {
          for (const invoiceId of tableData.invoices) {
            try {
              const invoiceResponse = await fetch(
                `/api/wrapp/invoices/${invoiceId}?baseUrl=${encodeURIComponent(
                  wrappSettings.baseUrl
                )}`,
                {
                  headers: {
                    Authorization: `Bearer ${jwt}`,
                  },
                }
              );

              if (invoiceResponse.ok) {
                const invoiceData = await invoiceResponse.json();

                // Check if this invoice is correlated with another
                if (
                  invoiceData.correlated_invoices &&
                  invoiceData.correlated_invoices.length > 0
                ) {
                  // Invoice has correlations
                }

                // Check if this invoice is cancelled
                if (invoiceData.cancelled_by_mark) {
                  // Invoice is cancelled
                }
              } else {
                // Failed to fetch invoice
              }
            } catch (error) {
              // Error fetching invoice
            }
          }
        }
      }
    } catch (error) {
      // Error calling WRAPP SHOW
    }
  };

  if (!isOpen) return null;

  // If table is closed OR available, show only reopen button - SAME LOGIC as left sidebar
  if (table?.status === "closed" || table?.status === "available") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>

          <div className="text-center space-y-4">
            <FaCheck className="mx-auto text-6xl text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800">
              {table?.status === "closed"
                ? "Τραπέζι Κλειστό"
                : "Τραπέζι Διαθέσιμο"}
            </h3>
            <p className="text-gray-600">
              Πατήστε "Άνοιγμα Τραπεζιού" για να ξεκινήσετε νέα παραγγελία.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={async () => {
                  if (onReopenTable) {
                    try {
                      await onReopenTable();
                      // After reopening, go directly to POS menu like "Προσθήκη Προϊόντων"
                      if (onAddProducts) {
                        onAddProducts();
                      }
                    } catch (error) {
                      console.error("Reopen table error:", error);
                      alert("Σφάλμα κατά το άνοιγμα του τραπεζιού");
                    }
                  }
                }}
                disabled={!onReopenTable}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlus />
                Άνοιγμα Τραπεζιού
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Flatten all line items from all orders
  const allLineItems = orders.flatMap(
    (order) =>
      order.invoice_lines?.map((item: any) => ({
        ...item,
        orderId: order.id,
        orderSeries: order.series,
        orderNum: order.num,
        orderDate: order.created_at,
      })) || []
  );

  // Calculate totals for selected items
  const selectedLineItems = allLineItems.filter(
    (item) => selectedItems[`${item.orderId}-${item.line_number}`]
  );

  // Calculate totals with discount applied based on order total vs line items total difference
  const calculateTotalsWithDiscount = () => {
    let total = 0;
    let net = 0;
    let vat = 0;

    // Group items by order to apply discount per order
    const itemsByOrder = selectedLineItems.reduce(
      (acc: { [orderId: string]: any[] }, item: any) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      },
      {} as { [orderId: string]: any[] }
    );

    Object.entries(itemsByOrder).forEach(
      ([orderId, items]: [string, any[]]) => {
        const order = orders.find((o: any) => o.id === orderId);
        if (!order) return;

        // Calculate line items total for this order
        const lineItemsTotal = items.reduce(
          (sum: number, item: any) => sum + (item.subtotal || 0),
          0
        );
        const orderTotal = order.total_amount || 0;

        // If there's a difference, it means there's a discount
        const discountRatio = orderTotal > 0 ? orderTotal / lineItemsTotal : 1;

        console.log(
          `📊 Order ${orderId}: Line items total: €${lineItemsTotal.toFixed(
            2
          )}, Order total: €${orderTotal.toFixed(
            2
          )}, Ratio: ${discountRatio.toFixed(4)}`
        );

        // Apply discount ratio to each item in this order
        items.forEach((item: any) => {
          const itemSubtotal = (item.subtotal || 0) * discountRatio;
          const itemNet = (item.net_total_price || 0) * discountRatio;
          const itemVat = (item.vat_total || 0) * discountRatio;

          total += itemSubtotal;
          net += itemNet;
          vat += itemVat;
        });
      }
    );

    return { total, net, vat };
  };

  const {
    total: selectedTotal,
    net: selectedNet,
    vat: selectedVat,
  } = calculateTotalsWithDiscount();

  // Filter order notes and receipts based on dynamic series names
  const orderNotes = orders.filter((order) => order.series === orderNoteSeries);
  const receipts = orders.filter((order) => order.series === receiptSeries);

  // Create correlation map to identify converted order notes
  const convertedOrderNoteIds = new Set<string>();
  receipts.forEach((receipt) => {
    if (
      receipt.correlated_invoices &&
      Array.isArray(receipt.correlated_invoices)
    ) {
      receipt.correlated_invoices.forEach((mark: string) => {
        const correlatedOrder = orderNotes.find((o) => o.my_data_mark === mark);
        if (correlatedOrder) {
          convertedOrderNoteIds.add(correlatedOrder.id);
        }
      });
    }
  });

  // Filter to show only: valid order notes (not converted) + all receipts
  const displayedOrders = orders.filter((order) => {
    // Show all receipts
    if (order.series === receiptSeries) return true;

    // For order notes, only show if NOT converted to receipt
    if (order.series === orderNoteSeries) {
      return !convertedOrderNoteIds.has(order.id) && !order.cancelled_by_mark;
    }

    return false;
  });

  // Calculate total: receipts + valid order notes only (exclude converted order notes)
  const totalAmount = orders.reduce((sum, order) => {
    // If it's a receipt, add it
    if (order.series === receiptSeries) {
      return sum + (order.total_amount || 0);
    }

    // If it's an order note, check if it's been converted to a receipt
    if (order.series === orderNoteSeries) {
      const isConverted = receipts.some((receipt) => {
        const hasCorrelation =
          receipt.correlated_invoices &&
          Array.isArray(receipt.correlated_invoices) &&
          receipt.correlated_invoices.includes(order.my_data_mark);

        const sameAmount =
          Math.abs((receipt.total_amount || 0) - (order.total_amount || 0)) <
          0.01;
        const receiptCreatedAfter = receipt.num > order.num;
        const fallbackCorrelation = sameAmount && receiptCreatedAfter;

        return hasCorrelation || fallbackCorrelation;
      });

      // Only add if NOT converted
      if (!isConverted) {
        return sum + (order.total_amount || 0);
      }
    }

    return sum;
  }, 0);

  // Check which order notes are valid (not cancelled AND not correlated with receipts)
  const validOrderNotes = orderNotes.filter((order) => {
    // CORRECT LOGIC: Check if this order note's MARK exists in any receipt's correlated_invoices array
    const isCorrelatedWithReceipt = receipts.some((receipt) => {
      // Primary check: Does the receipt's correlated_invoices array contain this order note's MARK?
      const hasCorrelation =
        receipt.correlated_invoices &&
        Array.isArray(receipt.correlated_invoices) &&
        receipt.correlated_invoices.includes(order.my_data_mark);

      // Fallback check: Same amount and created after (for receipts without correlated_invoices)
      const sameAmount =
        Math.abs((receipt.total_amount || 0) - (order.total_amount || 0)) <
        0.01;
      const receiptCreatedAfter = receipt.num > order.num;
      const fallbackCorrelation = sameAmount && receiptCreatedAfter;

      return hasCorrelation || fallbackCorrelation;
    });

    // ENHANCED: Also check if this order note ID exists in Firestore receipts
    // This handles cases where WRAPP doesn't return correlated_invoices properly
    const isConvertedInFirestore = receipts.some((receipt) => {
      return (
        receipt.correlated_invoices &&
        Array.isArray(receipt.correlated_invoices) &&
        receipt.correlated_invoices.includes(order.my_data_mark)
      );
    });

    return (
      !order.cancelled_by_mark &&
      !isCorrelatedWithReceipt &&
      !isConvertedInFirestore &&
      (order.total_amount > 0 ||
        (order.invoice_lines && order.invoice_lines.length > 0))
    );
  });

  // Check which receipts are valid (not cancelled)
  const validReceipts = receipts.filter(
    (order) =>
      !order.cancelled_by_mark &&
      (order.total_amount > 0 ||
        (order.invoice_lines && order.invoice_lines.length > 0))
  );

  // Create correlation map for UI display
  const correlationMap = new Map<string, string>();
  receipts.forEach((receipt) => {
    if (
      receipt.correlated_invoices &&
      Array.isArray(receipt.correlated_invoices)
    ) {
      receipt.correlated_invoices.forEach((mark: string) => {
        const correlatedOrder = orderNotes.find((o) => o.my_data_mark === mark);
        if (correlatedOrder) {
          correlationMap.set(
            correlatedOrder.id,
            `${receiptSeries}-${receipt.num}`
          );
        }
      });
    }
  });

  // Check if there are any valid receipts
  const hasReceipts = validReceipts.length > 0;

  // ENHANCED Λογική κλεισίματος:
  // 1. Όλα τα ΔΠΕ πρέπει να είναι είτε ακυρωμένα είτε μετατραπεί σε ΕΑΛΠ
  // 2. Πρέπει να υπάρχει τουλάχιστον ένα έγκυρο ΕΑΛΠ
  const totalOrderNotes = orderNotes.length;
  const convertedOrderNotes = orderNotes.filter((order) => {
    const isCorrelatedWithReceipt = receipts.some((receipt) => {
      return (
        receipt.correlated_invoices &&
        Array.isArray(receipt.correlated_invoices) &&
        receipt.correlated_invoices.includes(order.my_data_mark)
      );
    });
    return isCorrelatedWithReceipt || order.cancelled_by_mark;
  }).length;

  const canCloseTable =
    totalOrderNotes > 0 &&
    convertedOrderNotes === totalOrderNotes &&
    validReceipts.length > 0;

  const handleItemToggle = (orderId: string, lineNumber: number) => {
    const key = `${orderId}-${lineNumber}`;
    setSelectedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = allLineItems.every(
      (item) => selectedItems[`${item.orderId}-${item.line_number}`]
    );

    if (allSelected) {
      // Deselect all
      setSelectedItems({});
    } else {
      // Select all
      const newSelection: { [key: string]: boolean } = {};
      allLineItems.forEach((item) => {
        newSelection[`${item.orderId}-${item.line_number}`] = true;
      });
      setSelectedItems(newSelection);
    }
  };

  const handlePayment = async () => {
    if (selectedLineItems.length === 0) {
      alert("Παρακαλώ επιλέξτε τουλάχιστον ένα προϊόν για πληρωμή");
      return;
    }

    setIsProcessing(true);
    try {
      const paymentDetails = undefined;

      // Call onPayment which converts order notes to receipt and get receipt data
      const receiptResult = await onPayment(
        selectedLineItems,
        paymentMethod,
        paymentDetails
      );

      // After successful conversion, print the receipt using template
      console.log("🖨️ Printing receipt after successful conversion...");
      console.log("📋 Receipt data for printing:", receiptResult);

      // Create and mount the print template component
      const printDiv = document.createElement("div");
      document.body.appendChild(printDiv);

      // Use React to render the print template
      const root = createRoot(printDiv);

      root.render(
        <ReceiptFromOrderNoteTemplate
          receiptData={(receiptResult as any)?.receipt}
          cartData={(receiptResult as any)?.cart_data || []}
          paymentMethod={paymentMethod}
          paymentDetails={paymentDetails}
          table={table}
        />
      );

      // Clean up after printing
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printDiv);
      }, 2000);

      onClose();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Σφάλμα κατά την πληρωμή");
    } finally {
      setIsProcessing(false);
    }
  };

  const allSelected =
    allLineItems.length > 0 &&
    allLineItems.every(
      (item) => selectedItems[`${item.orderId}-${item.line_number}`]
    );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Παραγγελίες Τραπεζιού {table?.name}
              </h2>
              <p className="text-blue-100 text-sm">
                {
                  displayedOrders.filter((o) => o.series === orderNoteSeries)
                    .length
                }{" "}
                {orderNoteSeries} •{" "}
                {
                  displayedOrders.filter((o) => o.series === receiptSeries)
                    .length
                }{" "}
                {receiptSeries}• Σύνολο: €{totalAmount.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(90vh-140px)]">
          {/* Orders List */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <FaSpinner className="animate-spin mx-auto text-4xl mb-4" />
                <p>Φόρτωση παραγγελιών...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                {/* Empty table - show action buttons based on status */}
                {table?.status === "closed" ? (
                  <div className="space-y-4">
                    <FaCheck className="mx-auto text-6xl text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800">
                      Τραπέζι Κλειστό
                    </h3>
                    <p className="text-gray-600">
                      Το τραπέζι έχει κλείσει και είναι έτοιμο για νέα χρήση
                    </p>
                    <div className="flex gap-3 justify-center mt-6">
                      <button
                        onClick={async () => {
                          if (onReopenTable) {
                            setIsProcessing(true);
                            try {
                              await onReopenTable();
                            } finally {
                              setIsProcessing(false);
                            }
                          }
                        }}
                        disabled={isProcessing || !onReopenTable}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Άνοιγμα...
                          </>
                        ) : (
                          <>
                            <FaPlus />
                            Άνοιγμα Τραπεζιού
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FaEuroSign className="mx-auto text-6xl text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800">
                      Κενό Τραπέζι
                    </h3>
                    <p className="text-gray-600">Δεν υπάρχουν παραγγελίες</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Select All Button */}
                <div className="flex items-center justify-between border-b pb-4">
                  <button
                    onClick={handleSelectAll}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      allSelected
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    <FaCheck />
                    <span>
                      {allSelected ? "Αποεπιλογή Όλων" : "Επιλογή Όλων"}
                    </span>
                  </button>

                  <div className="text-sm text-gray-600">
                    Επιλεγμένα: {selectedLineItems.length} από{" "}
                    {allLineItems.length} προϊόντα
                  </div>
                </div>

                {/* Compact Status Summary */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <FaFileInvoice className="text-amber-500" size={14} />
                      <span className="font-semibold text-amber-700">
                        {
                          displayedOrders.filter(
                            (o) => o.series === orderNoteSeries
                          ).length
                        }
                      </span>
                      <span className="text-gray-600 text-xs">
                        {orderNoteSeries}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-slate-300"></div>
                    <div className="flex items-center gap-1.5">
                      <FaReceipt className="text-green-500" size={14} />
                      <span className="font-semibold text-green-700">
                        {
                          displayedOrders.filter(
                            (o) => o.series === receiptSeries
                          ).length
                        }
                      </span>
                      <span className="text-gray-600 text-xs">
                        {receiptSeries}
                      </span>
                    </div>
                  </div>
                  {canCloseTable ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                      <FaCheckCircle size={12} />
                      <span className="font-medium">Έτοιμο για κλείσιμο</span>
                    </div>
                  ) : validOrderNotes.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                      <FaExclamationTriangle size={12} />
                      <span className="font-medium">
                        Μετατρέψτε {orderNoteSeries} σε {receiptSeries}
                      </span>
                    </div>
                  ) : null}
                </div>
                {/* Orders - Show only non-converted order notes and receipts */}
                {displayedOrders.map((order) => {
                  const isReceipt = order.series === receiptSeries;

                  // Check for various timestamp field names
                  const timestampFields = {
                    created_at: order.created_at,
                    timestamp: order.timestamp,
                    createdAt: order.createdAt,
                    date: order.date,
                    datetime: order.datetime,
                    issued_at: order.issued_at,
                    issuedAt: order.issuedAt,
                    invoice_date: order.invoice_date,
                    invoiceDate: order.invoiceDate,
                  };

                  // Check which order note this receipt closes
                  const correlatedOrderNotes =
                    isReceipt && order.correlated_invoices
                      ? order.correlated_invoices
                          .map((mark: string) => {
                            const orderNote = orderNotes.find(
                              (o) => o.my_data_mark === mark
                            );
                            return orderNote
                              ? `${orderNoteSeries}-${orderNote.num}`
                              : null;
                          })
                          .filter(Boolean)
                      : [];

                  const isClosingOrderNote = correlatedOrderNotes.length > 0;

                  return (
                    <div
                      key={order.id}
                      className={`border-2 rounded-xl overflow-hidden transition-all ${
                        isReceipt
                          ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"
                          : "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50"
                      }`}
                    >
                      {/* Header with emphasis on document type */}
                      <div
                        className={`px-4 py-3 border-b-2 ${
                          isReceipt
                            ? "bg-green-100 border-green-200"
                            : "bg-amber-100 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Left side - Icon */}
                          {isReceipt ? (
                            <FaReceipt
                              className="text-green-600 flex-shrink-0"
                              size={18}
                            />
                          ) : (
                            <FaFileInvoice
                              className="text-amber-600 flex-shrink-0"
                              size={18}
                            />
                          )}

                          {/* Center - Time, Date, Series, and Badges */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Time */}
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <FaClock size={10} />
                              <span className="font-medium">
                                {(() => {
                                  console.log(
                                    `🕐 DEBUG: Order ${order.series}-${order.num} timestamp fields:`,
                                    {
                                      created_at: order.created_at,
                                      timestamp: order.timestamp,
                                      hasTimestamp: !!(
                                        order.created_at || order.timestamp
                                      ),
                                    }
                                  );
                                  return order.created_at || order.timestamp
                                    ? new Date(
                                        order.created_at || order.timestamp
                                      ).toLocaleString("el-GR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "--:--";
                                })()}
                              </span>
                            </div>

                            {/* Date */}
                            <span className="text-xs text-gray-600">
                              {order.created_at || order.timestamp
                                ? new Date(
                                    order.created_at || order.timestamp
                                  ).toLocaleDateString("el-GR")
                                : "---"}
                            </span>

                            <span className="text-gray-400">•</span>

                            {/* Series-Number */}
                            <span className="font-bold text-sm text-gray-800">
                              {isReceipt ? "Απόδειξη" : "Δελτίο Παραγγελίας"}
                            </span>

                            {/* Closing badge */}
                            {isClosingOrderNote && (
                              <span className="text-xs bg-white text-green-700 px-2 py-0.5 rounded-full border border-green-300 inline-flex items-center gap-1">
                                <FaCheckCircle size={10} />
                                Κλείνει: {correlatedOrderNotes.join(", ")}
                              </span>
                            )}

                            {/* Product count */}
                            <span className="text-xs text-gray-500 ml-auto">
                              {(order.invoice_lines || []).length} προϊόντα
                            </span>
                          </div>

                          {/* Right side - Total */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-xl text-gray-800">
                              €{(order.total_amount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {/* MARK - Discrete */}
                        {order.my_data_mark && (
                          <div
                            className={`mt-2 pt-2 border-t border-opacity-30 ${
                              isReceipt
                                ? "border-green-300"
                                : "border-amber-300"
                            }`}
                          >
                            <p className="text-[10px] text-gray-500 font-mono">
                              MARK: {order.my_data_mark}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Line Items - Prominent Product Display */}
                      <div className="p-4 space-y-2">
                        {order.invoice_lines?.map((item: any) => {
                          const itemKey = `${order.id}-${item.line_number}`;
                          const isSelected = selectedItems[itemKey];
                          const isSelectable = !isReceipt; // Only order notes are selectable

                          return (
                            <div
                              key={itemKey}
                              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                isReceipt
                                  ? "bg-white border border-green-100"
                                  : isSelected
                                  ? "bg-white border-2 border-amber-400 shadow-sm"
                                  : "bg-white border border-amber-100 hover:border-amber-300 cursor-pointer"
                              }`}
                              onClick={() =>
                                isSelectable &&
                                handleItemToggle(order.id, item.line_number)
                              }
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                {isSelectable && (
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      isSelected
                                        ? "bg-amber-500 border-amber-500 text-white"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    {isSelected && <FaCheck size={12} />}
                                  </div>
                                )}

                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-base">
                                    {item.name}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-0.5">
                                    Ποσ: {item.quantity} • ΦΠΑ: {item.vat_rate}%
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                {(() => {
                                  // Calculate discount based on order total vs line items total difference
                                  const originalSubtotal = item.subtotal || 0;
                                  const originalNetPrice =
                                    item.net_total_price || 0;

                                  // Calculate line items total for this order
                                  const orderLineItems =
                                    order.invoice_lines || [];
                                  const lineItemsTotal = orderLineItems.reduce(
                                    (sum: number, lineItem: any) =>
                                      sum + (lineItem.subtotal || 0),
                                    0
                                  );
                                  const orderTotal = order.total_amount || 0;

                                  // Calculate discount ratio from the difference
                                  const discountRatio =
                                    orderTotal > 0 && lineItemsTotal > 0
                                      ? orderTotal / lineItemsTotal
                                      : 1;

                                  const adjustedSubtotal =
                                    originalSubtotal * discountRatio;
                                  const adjustedNetPrice =
                                    originalNetPrice * discountRatio;

                                  // Check if there's a discount applied
                                  const hasDiscount =
                                    Math.abs(discountRatio - 1) > 0.01;
                                  const discount = orderDiscounts[order.id];

                                  return (
                                    <>
                                      <div className="font-bold text-lg text-gray-900">
                                        €{adjustedSubtotal.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Καθαρό: €{adjustedNetPrice.toFixed(2)}
                                      </div>
                                      {(hasDiscount || discount) && (
                                        <div className="text-xs text-red-600">
                                          {discount
                                            ? `Με έκπτωση ${
                                                discount.type === "percentage"
                                                  ? `${discount.value}%`
                                                  : `€${discount.value}`
                                              }`
                                            : `Με έκπτωση ${(
                                                (1 - discountRatio) *
                                                100
                                              ).toFixed(0)}%`}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons - Only show when no items selected for payment */}
          {selectedLineItems.length === 0 && (
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Προσθήκη Προϊόντων - Only show if table is NOT closed */}
                {onAddProducts && table?.status !== "closed" && (
                  <button
                    onClick={onAddProducts}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <FaPlus />
                    Προσθήκη Προϊόντων
                  </button>
                )}

                {/* Δημιουργία Απόδειξης - Only show if table is NOT closed */}
                {table?.status !== "closed" && (
                  <button
                    onClick={() =>
                      selectedLineItems.length > 0 && handlePayment()
                    }
                    disabled={
                      validOrderNotes.length === 0 ||
                      selectedLineItems.length === 0 ||
                      isProcessing
                    }
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      validOrderNotes.length === 0 ||
                      selectedLineItems.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                    title={
                      validOrderNotes.length === 0
                        ? "Δεν υπάρχουν έγκυρα δελτία παραγγελίας για μετατροπή"
                        : "Μετατροπή επιλεγμένων προϊόντων σε απόδειξη"
                    }
                  >
                    <FaCheck />
                    Δημιουργία Απόδειξης
                    {selectedLineItems.length > 0 &&
                      ` (${selectedLineItems.length})`}
                  </button>
                )}

                {/* Κλείσιμο Τραπεζιού - Only show if table is NOT closed */}
                {table?.status !== "closed" && (
                  <button
                    onClick={async () => {
                      if (!table?.wrappId) {
                        alert("❌ Δεν βρέθηκε WRAPP ID για το τραπέζι");
                        return;
                      }

                      setIsProcessing(true);
                      try {
                        const { getWrappConfig } = await import(
                          "@/lib/firebase"
                        );
                        const wrappSettings = await getWrappConfig();

                        if (
                          !wrappSettings?.email ||
                          !wrappSettings?.apiKey ||
                          !wrappSettings?.baseUrl
                        ) {
                          throw new Error("WRAPP δεν είναι διαμορφωμένο");
                        }

                        // Login to WRAPP
                        const loginResponse = await fetch("/api/wrapp/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email: wrappSettings.email,
                            api_key: wrappSettings.apiKey,
                            baseUrl: wrappSettings.baseUrl,
                          }),
                        });

                        if (!loginResponse.ok) {
                          throw new Error("Αποτυχία σύνδεσης στο WRAPP");
                        }

                        const loginData = await loginResponse.json();
                        const jwt = loginData.data.attributes.jwt;

                        // Close table via WRAPP API
                        const closeResponse = await fetch(
                          `/api/wrapp/catering-tables/${table.wrappId}/close`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${jwt}`,
                            },
                            body: JSON.stringify({
                              baseUrl: wrappSettings.baseUrl,
                            }),
                          }
                        );

                        if (!closeResponse.ok) {
                          const errorData = await closeResponse.json();
                          throw new Error(
                            errorData.details ||
                              errorData.error ||
                              "Αποτυχία κλεισίματος"
                          );
                        }

                        // Get the updated table data from WRAPP (STEP 3 response)
                        const wrappTableData = await closeResponse.json();
                        // WRAPP Close Response received

                        console.log(
                          "✅ Table close completed, using close response data"
                        );

                        // Calculate total receipt amount (only receipts, not order notes)
                        const receiptTotal = orders
                          .filter((order) => order.type === "receipt")
                          .reduce(
                            (sum, order) => sum + (order.total_amount || 0),
                            0
                          );

                        // If there are receipts, add to history
                        if (receiptTotal > 0) {
                          const { db } = await import("@/lib/firebase");
                          const { collection, addDoc } = await import(
                            "firebase/firestore"
                          );

                          await addDoc(collection(db, "receipts_history"), {
                            tableId: table.id,
                            tableName: table.name,
                            amount: receiptTotal,
                            closedAt: new Date(),
                            wrappId: table.wrappId,
                            receipts: orders.filter(
                              (order) => order.type === "receipt"
                            ),
                          });

                          console.log(
                            `💰 Added receipt to history: €${receiptTotal.toFixed(
                              2
                            )}`
                          );
                        }

                        // Check if table was automatically recreated by API route
                        if (wrappTableData.recreated) {
                          // Table was automatically recreated by API route
                          console.log(
                            "✅ Table recreated, closing modal - sync will happen on modal close"
                          );
                          onClose();
                        } else {
                          // Update Firestore with close response data
                          const { db } = await import("@/lib/firebase");
                          const { doc, updateDoc } = await import(
                            "firebase/firestore"
                          );

                          await updateDoc(doc(db, "tables", table.id), {
                            status: wrappTableData.status || "available",
                            total: parseFloat(wrappTableData.total || "0"),
                            invoices: wrappTableData.invoices || [],
                            updatedAt: new Date(),
                          });

                          console.log(
                            `🧹 Table ${table.name} updated with WRAPP close data:`,
                            {
                              status: wrappTableData.status,
                              total: wrappTableData.total,
                              invoices: wrappTableData.invoices?.length || 0,
                            }
                          );

                          console.log(
                            "✅ Table closed, closing modal - sync will happen on modal close"
                          );
                          onClose();
                        }
                      } catch (error) {
                        alert(
                          `❌ Σφάλμα: ${
                            error instanceof Error
                              ? error.message
                              : "Άγνωστο σφάλμα"
                          }`
                        );
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Κλείσιμο...
                      </>
                    ) : (
                      <>
                        <FaTimes />
                        Κλείσιμο Τραπεζιού
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment Section */}
          {selectedLineItems.length > 0 && (
            <div className="border-t bg-gray-50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Method */}
                <div>
                  <h3 className="font-semibold mb-4 text-lg">
                    Τρόπος Πληρωμής
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Cash Button */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
                        paymentMethod === "cash"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-300 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50"
                      }`}
                    >
                      <FaMoneyBillWave className="text-4xl mb-2" />
                      <span className="font-semibold text-lg">Μετρητά</span>
                    </button>

                    {/* Card Button */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
                        paymentMethod === "card"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <FaCreditCard className="text-4xl mb-2" />
                      <span className="font-semibold text-lg">Κάρτα</span>
                    </button>
                  </div>
                </div>

                {/* Payment Summary */}
                <div>
                  <h3 className="font-semibold mb-3">Σύνοψη Πληρωμής</h3>
                  <div className="bg-white rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Επιλεγμένα Προϊόντα:</span>
                      <span>{selectedLineItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Καθαρή Αξία:</span>
                      <span>€{selectedNet.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ΦΠΑ:</span>
                      <span>€{selectedVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Σύνολο:</span>
                      <span>€{selectedTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {/* Payment Row */}
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ακύρωση
                      </button>

                      <button
                        onClick={handlePayment}
                        disabled={
                          isProcessing || selectedLineItems.length === 0
                        }
                        className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <>
                            <FaSpinner className="animate-spin w-4 h-4" />
                            Επεξεργασία...
                          </>
                        ) : (
                          <>
                            <FaCheck className="w-4 h-4" />
                            Πληρωμή €{selectedTotal.toFixed(2)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
