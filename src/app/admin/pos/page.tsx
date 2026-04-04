"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FaSearch,
  FaPlus,
  FaMinus,
  FaTrash,
  FaReceipt,
  FaTimes,
  FaShoppingCart,
  FaTag,
  FaCalculator,
  FaKeyboard,
  FaBarcode,
  FaUser,
  FaCreditCard,
  FaMoneyBillWave,
  FaCheck,
  FaSpinner,
  FaHistory,
  FaTable,
  FaTh,
  FaList,
  FaPercent,
  FaBars,
} from "react-icons/fa";
import {
  useProducts,
  useCategories,
  useRecipes,
  usePriceLists,
} from "@/hooks/useProducts";
import { usePOS } from "@/hooks/usePOS";
import { useAuth } from "@/contexts/AuthContext";
import { CartItem, PaymentMethod, CustomerInfo } from "@/types/pos";
import { Product, ProductCategory, Recipe, PriceList } from "@/types/products";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { wrappLogin } from "@/lib/wrapp";
import {
  getQuantityUnit,
  formatPricePerUnit,
  formatQuantityWithUnit,
} from "@/constants/mydata";
import Image from "next/image";
import ReceiptPrintTemplate from "@/components/pos/ReceiptPrintTemplate";
import OrderNotePrintTemplate from "@/components/pos/OrderNotePrintTemplate";
import PaymentModal from "@/components/pos/PaymentModal";
import InvoiceHistoryModal from "@/components/pos/InvoiceHistoryModal";
import CallerIdWidget from "@/components/pos/CallerIdWidget";
import RestaurantFloorModal from "@/components/pos/RestaurantFloorModal";
import QuantityInputModal from "@/components/pos/QuantityInputModal";
import Link from "next/link";

const POSSystem: React.FC = () => {
  // Auth hook
  const { user } = useAuth();

  // Data hooks
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { recipes, loading: recipesLoading } = useRecipes();
  const { priceLists, loading: priceListsLoading } = usePriceLists();

  // Get first category ID for default selection
  const getFirstCategoryId = () => {
    if (categories.length === 0) return null;
    const sortedCategories = [...categories]
      .filter((category) =>
        products.some((product) => product.category.id === category.id)
      )
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return sortedCategories.length > 0 ? sortedCategories[0].id : null;
  };

  // POS hook
  const {
    cart,
    isProcessing,
    lastInvoiceData,
    addToCart,
    updateCartItem,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    calculateTotals,
    processPayment,
    loadCartFromStorage,
    saveCartToStorage,
  } = usePOS();

  // Business info for receipt - loaded from Firestore
  const [businessInfo, setBusinessInfo] = useState({
    storeName: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    vatNumber: "",
  });

  // State management
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRecipes, setShowRecipes] = useState(false);
  const [selectedRecipeOptions, setSelectedRecipeOptions] = useState<{
    [groupId: string]: string[];
  }>({});
  const [isEditingCartItem, setIsEditingCartItem] = useState(false);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(
    null
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceHistoryModal, setShowInvoiceHistoryModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [wrappSettings, setWrappSettings] = useState<any>(null);
  const [selectedBillingBook, setSelectedBillingBook] = useState<string>("");
  const [billingBooks, setBillingBooks] = useState<any[]>([]);
  const [loadingBillingBooks, setLoadingBillingBooks] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showRestaurantFloor, setShowRestaurantFloor] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [previousPriceList, setPreviousPriceList] = useState<string>("");
  const [previousBillingBook, setPreviousBillingBook] = useState<string>("");
  const [showTableOrderModal, setShowTableOrderModal] = useState(false);
  const [isCreatingOrderNote, setIsCreatingOrderNote] = useState(false);
  const [wrappSettingsLoaded, setWrappSettingsLoaded] = useState(false);

  // Quantity input modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalProduct, setQuantityModalProduct] =
    useState<Product | null>(null);

  // Mobile cart drawer state
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Product layout view state
  const [productView, setProductView] = useState<"grid" | "list">("grid");
  const [productViewLoaded, setProductViewLoaded] = useState(false);

  // Custom price modal state
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [customVatRate, setCustomVatRate] = useState(24);

  // Sidebar toggle state
  const [hideSidebar, setHideSidebar] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);

  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    type: "percentage" | "fixed";
    value: number;
    amount: number;
  } | null>(null);

  // Handle creating order note for table
  const closeTableInWrapp = async (tableId: string) => {
    try {
      const wrappSettings = JSON.parse(
        localStorage.getItem("wrapp_settings") || "{}"
      );

      // Login to get JWT
      const loginResponse = await fetch("/api/wrapp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: wrappSettings.email,
          api_key: wrappSettings.apiKey,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (!loginResponse.ok) return false;

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Close table
      const response = await fetch(
        `/api/wrapp/catering-tables/${tableId}/close`,
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

      return response.ok;
    } catch (error) {
      console.error("❌ Error closing table:", error);
      return false;
    }
  };

  const handleCreateOrderNote = async () => {
    if (!selectedTable || cart.length === 0) {
      console.error(
        "❌ Δεν υπάρχουν προϊόντα για δημιουργία δελτίου παραγγελίας"
      );
      return;
    }

    if (!wrappSettingsLoaded) {
      console.error("❌ Οι ρυθμίσεις WRAPP δεν έχουν φορτωθεί ακόμα");
      return;
    }

    if (!wrappSettings) {
      console.error("❌ Δεν βρέθηκαν ρυθμίσεις WRAPP");
      return;
    }

    if (!wrappSettings.email) {
      console.error("❌ Δεν βρέθηκε email WRAPP");
      return;
    }

    if (!wrappSettings.apiKey) {
      console.error("❌ Δεν βρέθηκε API Key WRAPP");
      return;
    }

    if (!wrappSettings.baseUrl) {
      console.error("❌ Δεν βρέθηκε Base URL WRAPP");
      return;
    }

    if (!selectedTable.wrappId) {
      console.error("❌ Το τραπέζι δεν έχει συνδεθεί με το WRAPP");
      return;
    }

    // Find order note billing book (8.6 - Δελτίο Παραγγελίας Εστίασης)
    const orderNoteBillingBook = billingBooks.find(
      (book) => book.invoice_type_code === "8.6"
    );

    if (!orderNoteBillingBook) {
      console.error(
        "❌ Δεν βρέθηκε βιβλίο έκδοσης για Δελτίο Παραγγελίας Εστίασης (8.6)"
      );
      return;
    }

    setIsCreatingOrderNote(true);

    try {
      // Get JWT token first (same as invoice creation)

      const loginResponse = await fetch("/api/wrapp/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: wrappSettings.email,
          api_key: wrappSettings.apiKey,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error("❌ Login API error:", loginResponse.status, errorText);
        throw new Error(
          `Αποτυχία σύνδεσης με WRAPP: ${loginResponse.status} - ${errorText}`
        );
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Check if table has existing order notes
      try {
        const checkResponse = await fetch(
          `/api/wrapp/table-orders?tableId=${
            selectedTable.wrappId
          }&baseUrl=${encodeURIComponent(wrappSettings.baseUrl)}`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        if (checkResponse.ok) {
          const existingOrders = await checkResponse.json();

          if (existingOrders && existingOrders.length > 0) {
            const hasOpenOrderNote = existingOrders.some(
              (order: any) =>
                order.invoice_type_code === "8.6" && order.status !== "closed"
            );

            if (hasOpenOrderNote) {
              const openOrderNote = existingOrders.find(
                (order: any) =>
                  order.invoice_type_code === "8.6" && order.status !== "closed"
              );

              const action = confirm(
                `Το τραπέζι "${selectedTable.name}" έχει ήδη ανοιχτό δελτίο παραγγελίας (${openOrderNote.series}${openOrderNote.number}).\n\n` +
                  `Επιλέξτε ενέργεια:\n\n` +
                  `• ΝΑΙ: Κλείσιμο υπάρχοντος δελτίου και δημιουργία νέου\n` +
                  `• ΟΧΙ: Ακύρωση`
              );

              if (!action) {
                setIsCreatingOrderNote(false);
                return;
              }

              // Close existing table and continue with new order note
              const closed = await closeTableInWrapp(selectedTable.wrappId);

              if (!closed) {
                alert(
                  "Αποτυχία κλεισίματος του υπάρχοντος δελτίου. Παρακαλώ δοκιμάστε ξανά."
                );
                setIsCreatingOrderNote(false);
                return;
              }
            }
          }
        }
      } catch (error) {
        // Continue anyway - maybe the check failed but we can still try to create
      }

      // Check table status first

      const statusResponse = await fetch(
        `/api/wrapp/catering-tables/${selectedTable.wrappId}/show`,
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

      if (!statusResponse.ok) {
        throw new Error("Αποτυχία ελέγχου κατάστασης τραπεζιού");
      }

      const tableStatus = await statusResponse.json();

      let result = tableStatus;

      // Only try to open if table is available
      if (tableStatus.status === "available") {
        const response = await fetch("/api/wrapp/catering-tables/open-table", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            id: selectedTable.wrappId,
            baseUrl: wrappSettings.baseUrl,
          }),
        });

        result = await response.json();

        if (!response.ok || result.status?.includes("Errors")) {
          const errorMessage = result.errors
            ? result.errors
                .map((err: any) => err.message || err.title)
                .join(", ")
            : result.error || "Αποτυχία ανοίγματος τραπεζιού";
          throw new Error(errorMessage);
        }
      } else if (tableStatus.status === "open") {
      } else {
        throw new Error(
          `Το τραπέζι έχει κατάσταση "${tableStatus.status}" και δεν μπορεί να δεχτεί παραγγελίες`
        );
      }

      // Use the currently selected billing book from POS
      if (!selectedBillingBook) {
        throw new Error("Παρακαλώ επιλέξτε βιβλίο έκδοσης από την μπάρα πάνω");
      }

      // Now create an Order Note (Δελτίο Παραγγελίας Εστίασης) with the cart items

      // Clean product names by removing invalid characters
      const cleanProductName = (name: string) => {
        return (
          name
            .replace(/[<>\/,\[\]]/g, "") // Remove invalid characters
            .trim() // Remove leading/trailing spaces
            .substring(0, 100) || // Limit length
          "Προϊόν"
        ); // Fallback if empty
      };

      // Calculate discount ratio if discount is applied
      const originalTotals = calculateTotals();
      const discountRatio =
        appliedDiscount && appliedDiscount.amount
          ? (originalTotals.total - appliedDiscount.amount) /
            originalTotals.total
          : 1;

      if (appliedDiscount) {
      }

      // Calculate invoice lines with discount applied
      const invoiceLines = cart.map((item, index) => {
        // Use the same calculation logic as working invoices
        const vatRate = item.vatRate || 24; // VAT rate as percentage (e.g., 24 for 24%)
        const vatRateDecimal = vatRate / 100; // Convert to decimal for calculations (e.g., 24 -> 0.24)

        // Apply discount proportionally to this line item
        const originalGrossAmount = Math.round(item.totalPrice * 100) / 100;
        const grossAmount =
          Math.round(originalGrossAmount * discountRatio * 100) / 100; // Apply discount
        const netAmount =
          Math.round((grossAmount / (1 + vatRateDecimal)) * 100) / 100; // Round to 2 decimals
        const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100; // Round to 2 decimals
        const unitNetPrice =
          Math.round(
            ((item.unitPrice * discountRatio) / (1 + vatRateDecimal)) * 100
          ) / 100; // Apply discount to unit price

        // Convert quantity to grams/ml for WRAPP API (type 2=kg->g, type 3=L->ml)
        const quantityType = item.product.quantityType || 1;
        const apiQuantity =
          quantityType === 2 || quantityType === 3
            ? Math.round(item.quantity * 1000) // Convert kg/L to g/ml
            : item.quantity;

        return {
          line_number: index + 1,
          name: cleanProductName(item.product.name), // Clean name field
          description: cleanProductName(item.product.name), // Clean description field
          quantity: apiQuantity, // Send as grams/ml for weight/volume products
          quantity_type: quantityType,
          unit_price: unitNetPrice, // Net unit price (same as working invoices)
          net_total_price: netAmount, // Use net_total_price instead of net_value
          vat_rate: vatRate, // VAT rate as percentage
          vat_total: vatAmount, // Use vat_total instead of vat_amount
          subtotal: grossAmount, // Gross amount
          // Remove invalid classifications for Order Notes
          rec_type: 1, // Standard product line (not 6)
        };
      });

      // Calculate totals from invoice lines to ensure consistency
      const calculatedNetTotal =
        Math.round(
          invoiceLines.reduce((sum, line) => sum + line.net_total_price, 0) *
            100
        ) / 100;
      const calculatedVatTotal =
        Math.round(
          invoiceLines.reduce((sum, line) => sum + line.vat_total, 0) * 100
        ) / 100;
      const calculatedGrossTotal =
        Math.round(
          invoiceLines.reduce((sum, line) => sum + line.subtotal, 0) * 100
        ) / 100;

      const orderNotePayload = {
        invoice_type_code: "8.6", // Δελτίο Παραγγελίας Εστίασης
        billing_book_id: selectedBillingBook, // Required billing book
        payment_method_type: 1, // Credit - for order notes (payment deferred to final receipt)
        // Add totals to match invoice lines
        net_total_amount: calculatedNetTotal,
        vat_total_amount: calculatedVatTotal,
        total_amount: calculatedGrossTotal,
        payable_total_amount: calculatedGrossTotal,
        customer: {
          name: `Τραπέζι ${selectedTable.name}`,
          vat_number: "",
          address: "",
          city: "",
          postal_code: "",
          country_code: "EL",
        },
        invoice_lines: invoiceLines,
        catering_table_id: selectedTable.wrappId, // Link to the table
        baseUrl: wrappSettings.baseUrl,
      };

      const orderNoteResponse = await fetch("/api/wrapp/order-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(orderNotePayload),
      });

      const orderNoteResult = await orderNoteResponse.json();

      if (!orderNoteResponse.ok || orderNoteResult.status?.includes("Errors")) {
        const errorMessage = orderNoteResult.errors
          ? orderNoteResult.errors
              .map((err: any) => err.message || err.title)
              .join(", ")
          : orderNoteResult.error || "Αποτυχία δημιουργίας δελτίου παραγγελίας";
        throw new Error(errorMessage);
      }

      // Store data for printing Order Note
      const orderNoteForPrint = {
        ...orderNoteResult,
        // Ensure we have the myDATA fields for QR code
        my_data_mark:
          orderNoteResult.my_data_mark ||
          orderNoteResult.data?.attributes?.mydata_mark,
        my_data_qr_url:
          orderNoteResult.my_data_qr_url ||
          orderNoteResult.data?.attributes?.my_data_qr_url,
        // Add order note specific fields
        series: orderNoteResult.series || "ΔΠΕ",
        num: orderNoteResult.num || orderNoteResult.data?.attributes?.num,
        invoice_type: "Δελτίο Παραγγελίας Εστίασης",
      };

      // Store print data globally for the print template
      const printDataForGlobal = {
        invoiceData: orderNoteForPrint,
        cart: [...cart],
        paymentMethod: "credit", // Order notes are always credit (deferred payment)
        businessInfo: businessInfo,
        currentUser: user
          ? `${user.firstName} ${user.lastName}`
          : "Χρήστης POS",
        isOrderNote: true, // Flag to indicate this is an order note
      };

      (window as any).printData = printDataForGlobal;

      // Save order note data to Firestore for later retrieval
      // IMPORTANT: Must complete BEFORE triggering print event
      try {
        const { db } = await import("@/lib/firebase");
        const { collection, doc, setDoc } = await import("firebase/firestore");

        const firestoreData = {
          orderNoteId: orderNoteResult.id,
          tableId: selectedTable.id,
          tableName: selectedTable.name,
          cart: [...cart],
          businessInfo: businessInfo,
          paymentMethod: "credit",
          total: calculatedGrossTotal,
          netTotal: calculatedNetTotal,
          vatTotal: calculatedVatTotal,
          createdAt: new Date(),
          createdBy: user
            ? `${user.firstName} ${user.lastName}`
            : "Χρήστης POS",
          wrappOrderNoteId: orderNoteResult.id,
          series: orderNoteResult.series || "ΔΠΕ",
          num: orderNoteResult.num,
          billingBookId: selectedBillingBook, // Store the billing book used for this order note
          appliedDiscount: appliedDiscount, // Add discount data to order note
        };

        await setDoc(
          doc(db, "order_notes_data", orderNoteResult.id),
          firestoreData
        );

        // Also save to invoices collection for history
        try {
          // Debug: Check user object before creating invoice record

          const invoiceRecord = {
            invoiceNumber: orderNoteResult.num || "N/A",
            series: orderNoteResult.series || "ΔΠΕ",
            total: calculatedGrossTotal,
            paymentMethod: "credit",
            timestamp: new Date(),
            cart: [...cart],
            businessInfo: { ...businessInfo },
            invoiceData: { ...orderNoteResult },
            userId: user?.id || "default",
            userName: user
              ? `${user.firstName} ${user.lastName}`
              : "Χρήστης POS",
            recipes: [...recipes],
            isOrderNote: true,
            tableId: selectedTable.id,
            tableName: selectedTable.name,
            appliedDiscount: appliedDiscount, // Add discount data to order note record
          };

          // Debug: Log the complete orderNoteResult to find correct invoice number field

          await setDoc(
            doc(
              db,
              "invoices",
              `${Date.now()}_${orderNoteResult.num || Math.random()}`
            ),
            invoiceRecord
          );
          console.log("✅ Order note saved to invoice history");
        } catch (historyError) {
          console.error("⚠️ Error saving order note to history:", historyError);
          // Don't fail the main operation
        }

        // Add small delay to ensure Firestore write completes
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("✅ Firestore write confirmed, ready to print");
      } catch (firestoreError) {
        console.error(
          "⚠️ Failed to save order note data to Firestore:",
          firestoreError
        );
        // Continue anyway - window.printData should still work
      }

      // Trigger Order Note print automatically (AFTER Firestore save completes)
      try {
        console.log("🖨️ Triggering order note print...");

        // Call print function directly with data (like receipt printing)
        const printFunction = (window as any).printOrderNoteFunction;
        if (printFunction) {
          console.log("✅ Calling printOrderNoteFunction with data");
          printFunction({
            invoiceData: orderNoteForPrint,
            cart: [...cart],
            paymentMethod: "credit",
            businessInfo: businessInfo,
            currentUser: user
              ? `${user.firstName} ${user.lastName}`
              : "Χρήστης POS",
            isOrderNote: true,
            appliedDiscount: appliedDiscount, // Add discount data for order note printing
          });
        } else {
          console.warn(
            "⚠️ printOrderNoteFunction not available yet, trying event..."
          );
          // Fallback to event if function not ready
          const printEvent = new CustomEvent("triggerOrderNotePrint");
          window.dispatchEvent(printEvent);
        }
      } catch (printError) {
        console.error("❌ Order Note print error:", printError);
        // Don't show error to user as the main operation succeeded
      }

      // Clear cart after print trigger (so window.printData is still available)
      clearCart();
      setAppliedDiscount(null); // Reset discount after order note creation

      // Close modal
      setShowTableOrderModal(false);

      // Clear selected table to reset POS to initial state
      console.log("🔄 Clearing selected table to reset POS...");
      setSelectedTable(null);

      // Restore previous price list and billing book after order note
      console.log("🔄 Restoring previous price list and billing book...");
      if (previousPriceList && previousPriceList !== selectedPriceList) {
        console.log("✅ Restoring price list:", previousPriceList);
        setSelectedPriceList(previousPriceList);
      }
      if (previousBillingBook && previousBillingBook !== selectedBillingBook) {
        console.log("✅ Restoring billing book:", previousBillingBook);
        setSelectedBillingBook(previousBillingBook);
      }

      // Clear previous values
      setPreviousPriceList("");
      setPreviousBillingBook("");

      // Force refresh the POS DOM to show updated cart state
      console.log("🔄 Refreshing POS DOM after order note creation...");

      // Small delay to ensure UI updates and cart clears visually
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Success - no alert needed, user will see it in the table modal
      console.log(
        `✅ Δελτίο Παραγγελίας ${orderNoteResult.series}-${orderNoteResult.num} δημιουργήθηκε επιτυχώς!`
      );
    } catch (error) {
      console.error("❌ Order note creation error:", error);
      alert(
        `Σφάλμα δημιουργίας δελτίου παραγγελίας: ${
          error instanceof Error ? error.message : "Άγνωστο σφάλμα"
        }`
      );
    } finally {
      setIsCreatingOrderNote(false);
    }
  };

  // Function to open table when first product is added
  const openTableIfNeeded = async (tableId: string) => {
    if (
      selectedTable &&
      selectedTable.id === tableId &&
      selectedTable.status === "available"
    ) {
      try {
        await updateDoc(doc(db, "tables", tableId), {
          status: "open",
          updatedAt: new Date(),
        });

        // Update local state
        setSelectedTable((prev: any) =>
          prev
            ? {
                ...prev,
                status: "open",
                updatedAt: new Date(),
              }
            : null
        );
      } catch (error) {
        console.error("Error opening table:", error);
      }
    }
  };

  // Load business info from Firestore
  const loadBusinessInfo = async () => {
    try {
      // Try to load from the settings path where it's actually saved
      const settingsDoc = await getDoc(doc(db, "config", "settings"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const businessData = data.businessInfo;
        if (businessData) {
          setBusinessInfo({
            storeName: businessData.storeName || "",
            address: businessData.address || "",
            city: businessData.city || "",
            postalCode: businessData.postalCode || "",
            phone: businessData.phone || "",
            email: businessData.email || "",
            vatNumber: businessData.taxId || "",
          });
          return;
        }
      }

      // Fallback: try old path for backward compatibility
      const businessDoc = await getDoc(doc(db, "settings", "business"));
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        setBusinessInfo({
          storeName: data.companyName || "",
          address: data.address || "",
          city: data.city || "",
          postalCode: data.postalCode || "",
          phone: data.phone || "",
          email: data.email || "",
          vatNumber: data.vatNumber || "",
        });
        return;
      }

      // Set default business info if none found
      setBusinessInfo({
        storeName: "ΠΑΣΤΡΑΣ ΙΩΑΝΝΗΣ ΣΠΥΡΙΔΩΝ",
        address: "ΙΑΣΩΝΟΣ 12",
        city: "ΓΛΥΦΑΔΑ",
        postalCode: "16561",
        phone: "210-1234567",
        email: "info@pastras.gr",
        vatNumber: "129639261",
      });
    } catch (error) {
      console.error("Error loading business info:", error);
    }
  };

  // Load user's default billing book from Firestore
  const loadUserDefaultBillingBook = async () => {
    try {
      const userDoc = await getDoc(
        doc(db, "users", "default", "settings", "pos")
      );
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (
          data.defaultBillingBookId &&
          billingBooks.find((bb) => bb.id === data.defaultBillingBookId)
        ) {
          setSelectedBillingBook(data.defaultBillingBookId);
          return;
        }
      }
    } catch (error) {
      console.error("Error loading default billing book:", error);
    }

    // Fallback to first available billing book
    if (billingBooks.length > 0) {
      setSelectedBillingBook(billingBooks[0].id);
    }
  };

  // Load user's default price list from Firestore
  const loadUserDefaultPriceList = async () => {
    try {
      console.log("🔍 Loading default price list from Firestore...");
      const userDoc = await getDoc(
        doc(db, "users", "default", "settings", "pos")
      );
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log("📄 Found settings document:", data);
        if (
          data.defaultPriceListId &&
          priceLists.find((pl) => pl.id === data.defaultPriceListId)
        ) {
          console.log(
            "✅ Setting default price list:",
            data.defaultPriceListId
          );
          setSelectedPriceList(data.defaultPriceListId);
          return;
        }
      } else {
        console.log("⚠️ No settings document found");
      }
    } catch (error) {
      console.error("❌ Error loading default price list:", error);
    }

    // Fallback to system default
    console.log("📋 Using fallback price list");
    if (priceLists.length > 0) {
      const defaultPriceList =
        priceLists.find((pl) => pl.isActive) || priceLists[0];
      console.log("✅ Fallback price list:", defaultPriceList.id);
      setSelectedPriceList(defaultPriceList.id);
    }
  };

  // Set default price list
  useEffect(() => {
    if (priceLists.length > 0 && !selectedPriceList) {
      loadUserDefaultPriceList();
    }
  }, [priceLists, selectedPriceList]);

  // Set default billing book AFTER billing books are loaded
  useEffect(() => {
    if (billingBooks.length > 0 && !selectedBillingBook) {
      loadUserDefaultBillingBook();
    }
  }, [billingBooks, selectedBillingBook]);

  // Set first category as default when data loads
  useEffect(() => {
    if (
      categories.length > 0 &&
      products.length > 0 &&
      selectedCategory === null
    ) {
      const sortedCategories = [...categories]
        .filter((category) =>
          products.some((product) => product.category.id === category.id)
        )
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      if (sortedCategories.length > 0) {
        setSelectedCategory(sortedCategories[0].id);
      }
    }
  }, [categories, products, selectedCategory]);

  // Filter products based on category and search
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.status === "active");

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category.id === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort products by displayOrder and category displayOrder
    filtered = filtered.sort((a, b) => {
      // First sort by category displayOrder
      const categoryOrderA = a.category.displayOrder || 0;
      const categoryOrderB = b.category.displayOrder || 0;
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      // Then sort by product displayOrder within the same category
      const productOrderA = a.displayOrder || 0;
      const productOrderB = b.displayOrder || 0;
      if (productOrderA !== productOrderB) {
        return productOrderA - productOrderB;
      }

      // Finally sort by name as fallback
      return a.name.localeCompare(b.name, "el");
    });

    // Log VAT rates for debugging (only when products change)
    if (products.length > 0 && selectedPriceList) {
    }

    return filtered;
  }, [products, selectedCategory, searchTerm, selectedPriceList]);

  // Group products by category when no category is selected
  const groupedProducts = React.useMemo(() => {
    if (!selectedCategory) {
      return categories
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .reduce((acc, category) => {
          const categoryProducts = filteredProducts.filter(
            (product) => product.category.id === category.id
          );
          if (categoryProducts.length > 0) {
            acc[category.id] = {
              category,
              products: categoryProducts,
            };
          }
          return acc;
        }, {} as Record<string, { category: ProductCategory; products: Product[] }>);
    }
    return null;
  }, [filteredProducts, selectedCategory, categories]);

  // Load billing books from WRAPP API (same as WrappComprehensiveSettings)
  const loadBillingBooks = async () => {
    if (!wrappSettings) {
      setBillingBooks([]);
      return;
    }

    if (
      !wrappSettings.email ||
      !wrappSettings.apiKey ||
      !wrappSettings.baseUrl
    ) {
      setBillingBooks([]);
      return;
    }

    setLoadingBillingBooks(true);

    try {
      // 1. Login to get JWT (same as WrappComprehensiveSettings)
      const loginResult = await wrappLogin(
        wrappSettings.email,
        wrappSettings.apiKey,
        wrappSettings.baseUrl
      );

      const jwt = loginResult.data?.attributes?.jwt;
      if (!jwt) {
        throw new Error("No JWT token received from login");
      }

      localStorage.setItem("wrapp_jwt", jwt);

      // 2. Load billing books (same as WrappComprehensiveSettings)

      const booksResponse = await fetch(
        `/api/wrapp/billing-books?baseUrl=${encodeURIComponent(
          wrappSettings.baseUrl
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (booksResponse.ok) {
        const booksData = await booksResponse.json();

        setBillingBooks(booksData);
        // Note: Default billing book will be loaded via useEffect when billingBooks state updates
      } else {
        console.error(
          "❌ [POS] Failed to load billing books:",
          booksResponse.status,
          booksResponse.statusText
        );
        const errorText = await booksResponse.text();
        console.error("❌ [POS] Error details:", errorText);
        setBillingBooks([]);
      }
    } catch (error) {
      console.error("❌ [POS] Error loading billing books:", error);
      setBillingBooks([]);
    } finally {
      setLoadingBillingBooks(false);
    }
  };

  // Fallback function to load all billing books directly from WRAPP API
  const loadAllBillingBooksFromAPI = async () => {
    if (
      !wrappSettings ||
      !wrappSettings.email ||
      !wrappSettings.apiKey ||
      !wrappSettings.baseUrl
    ) {
      return;
    }

    setLoadingBillingBooks(true);
    try {
      // First get JWT token
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
        throw new Error("Failed to login to WRAPP API");
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        throw new Error("No JWT token received");
      }

      // Get billing books
      const booksResponse = await fetch(
        `/api/wrapp/billing-books?baseUrl=${encodeURIComponent(
          wrappSettings.baseUrl
        )}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      if (!booksResponse.ok) {
        throw new Error("Failed to fetch billing books");
      }

      const booksData = await booksResponse.json();
      setBillingBooks(booksData.data || []);
      // Note: Default billing book will be loaded via useEffect when billingBooks state updates
    } catch (error) {
      console.error("Error loading billing books from WRAPP API:", error);
      setBillingBooks([]);
    } finally {
      setLoadingBillingBooks(false);
    }
  };

  useEffect(() => {
    if (!isInitialLoad && cart.length >= 0) {
      saveCartToStorage();
    }
  }, [cart, isInitialLoad, saveCartToStorage]);

  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  // Load product view preference from Firestore on mount
  useEffect(() => {
    const loadProductView = async () => {
      if (!user?.id) return;

      try {
        const userSettingsDoc = await getDoc(
          doc(db, "users", user.id, "settings", "pos")
        );

        if (userSettingsDoc.exists()) {
          const data = userSettingsDoc.data();
          if (data.productView === "grid" || data.productView === "list") {
            setProductView(data.productView);
          }
        }
      } catch (error) {
        console.error("Error loading product view preference:", error);
      } finally {
        setProductViewLoaded(true);
      }
    };

    loadProductView();
  }, [user?.id]);

  // Save product view preference to Firestore whenever it changes (only after initial load)
  useEffect(() => {
    const saveProductView = async () => {
      if (!user?.id || !productViewLoaded) return;

      try {
        await setDoc(
          doc(db, "users", user.id, "settings", "pos"),
          { productView },
          { merge: true }
        );
        console.log("✅ Product view saved:", productView);
      } catch (error) {
        console.error("Error saving product view preference:", error);
      }
    };

    saveProductView();
  }, [productView, user?.id, productViewLoaded]);

  // Load WRAPP settings on component mount
  useEffect(() => {
    const loadWrappSettings = async () => {
      try {
        // Load WRAPP settings from Firebase config (same as settings page)
        const wrappDoc = await getDoc(doc(db, "config", "wrapp"));

        if (wrappDoc.exists()) {
          const wrappData = wrappDoc.data();
          setWrappSettings(wrappData);
          setWrappSettingsLoaded(true);
        } else {
          setWrappSettings(null);
          setWrappSettingsLoaded(true); // Mark as loaded even if empty
        }
      } catch (error) {
        console.error("❌ [POS] Error loading WRAPP settings:", error);
      }
    };

    loadCartFromStorage();

    loadBusinessInfo();

    loadWrappSettings();
  }, []);

  // Load billing books when wrappSettings is available
  useEffect(() => {
    if (wrappSettings) {
      loadBillingBooks();
    } else {
    }
  }, [wrappSettings]);

  // Load sidebar preference from Firestore on mount
  useEffect(() => {
    const loadSidebarPreference = async () => {
      if (!user?.id) return;

      try {
        const userDoc = await getDoc(
          doc(db, "users", user.id, "settings", "pos")
        );
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (typeof data.hideSidebar === "boolean") {
            setHideSidebar(data.hideSidebar);
          }
        }
      } catch (error) {
        console.error("Error loading sidebar preference:", error);
      } finally {
        setSidebarPreferenceLoaded(true);
      }
    };

    loadSidebarPreference();
  }, [user?.id]);

  // Save sidebar preference to Firestore whenever it changes (only after initial load)
  useEffect(() => {
    const saveSidebarPreference = async () => {
      if (!user?.id || !sidebarPreferenceLoaded) return;

      try {
        await updateDoc(doc(db, "users", user.id, "settings", "pos"), {
          hideSidebar: hideSidebar,
        });
      } catch (error) {
        console.error("Error saving sidebar preference:", error);
      }
    };

    saveSidebarPreference();
  }, [hideSidebar, user?.id, sidebarPreferenceLoaded]);

  // Get product price for selected price list
  const getProductPrice = (product: Product, priceListId: string): number => {
    const priceEntry = product.priceListPrices.find(
      (p) => p.priceListId === priceListId
    );
    return priceEntry?.price || 0;
  };

  // Get product VAT rate for selected price list
  const getProductVatRate = (product: Product, priceListId: string): number => {
    const priceEntry = product.priceListPrices.find(
      (p) => p.priceListId === priceListId
    );

    let vatRate = priceEntry?.vatRate || 24; // Default to 24% if not found

    return vatRate; // Keep as percentage (24, not 0.24)
  };

  // Helper function to get default recipe options for a product
  const getDefaultRecipeOptions = (
    product: Product
  ): { [groupId: string]: string[] } => {
    const defaultOptions: { [groupId: string]: string[] } = {};

    if (product.recipeIds) {
      product.recipeIds.forEach((recipeId) => {
        const recipe = recipes.find((r) => r.id === recipeId);
        if (recipe) {
          recipe.groups.forEach((group) => {
            group.options.forEach((option) => {
              if (option.isDefault) {
                if (!defaultOptions[group.id]) {
                  defaultOptions[group.id] = [];
                }
                defaultOptions[group.id].push(option.id);
              }
            });
          });
        }
      });
    }

    return defaultOptions;
  };

  // Add product to cart (wrapper function)
  const handleAddToCart = async (
    product: Product,
    recipeSelections?: { [groupId: string]: string[] }
  ) => {
    if (!selectedPriceList) return;

    const basePrice = getProductPrice(product, selectedPriceList);

    // Calculate additional cost from recipe selections
    let additionalCost = 0;
    const selectedRecipes: CartItem["selectedRecipes"] = [];

    if (recipeSelections && product.recipeIds) {
      product.recipeIds.forEach((recipeId) => {
        const recipe = recipes.find((r) => r.id === recipeId);
        if (recipe) {
          let recipeCost = 0;
          const recipeOptions: { [groupId: string]: string[] } = {};

          recipe.groups.forEach((group) => {
            const selectedOptions = recipeSelections[group.id] || [];
            if (selectedOptions.length > 0) {
              recipeOptions[group.id] = selectedOptions;
              selectedOptions.forEach((optionId) => {
                const option = group.options.find((o) => o.id === optionId);
                if (option) {
                  recipeCost += option.price;
                }
              });
            }
          });

          if (Object.keys(recipeOptions).length > 0) {
            selectedRecipes.push({
              recipeId,
              selectedOptions: recipeOptions,
              additionalCost: recipeCost,
            });
            additionalCost += recipeCost;
          }
        }
      });
    }

    const unitPrice = basePrice + additionalCost;
    const vatRate = getProductVatRate(product, selectedPriceList);

    // Create unique ID based on product, price list, and recipe selections
    const recipeHash =
      selectedRecipes.length > 0
        ? selectedRecipes
            .map(
              (r) =>
                `${r.recipeId}-${Object.entries(r.selectedOptions)
                  .map(([gId, opts]) => `${gId}:${opts.join(",")}`)
                  .join("|")}`
            )
            .join("_")
        : "no-recipe";

    const newItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
      },
      quantity: 1,
      selectedPriceListId: selectedPriceList,
      selectedRecipes: selectedRecipes.length > 0 ? selectedRecipes : undefined,
      unitPrice,
      totalPrice: unitPrice,
      vatRate,
    };

    addToCart(newItem);

    // Open table if this is the first product added to a selected table
    if (selectedTable && cart.length === 0) {
      await openTableIfNeeded(selectedTable.id);
    }
  };

  // Handle adding product with recipes
  const handleAddProductWithRecipes = async (product: Product) => {
    if (!selectedPriceList) return;

    // Check if product requires quantity input (Κιλά/Λίτρα)
    if (product.quantityType && product.quantityType !== 1) {
      // Show quantity input modal for products sold by weight/volume
      setQuantityModalProduct(product);
      setShowQuantityModal(true);
      return;
    }

    // Show recipes if product has any
    if (product.recipeIds && product.recipeIds.length > 0) {
      setSelectedProduct(product);
      setIsEditingCartItem(false); // Set add mode

      // Initialize with default options using helper function
      const defaultOptions = getDefaultRecipeOptions(product);
      setSelectedRecipeOptions(defaultOptions);
      setShowRecipes(true);
    } else {
      // No recipes, add directly
      await handleAddToCart(product);
    }
  };

  // Handle quantity confirmation for weight/volume products
  const handleQuantityConfirm = async (quantity: number) => {
    if (!quantityModalProduct || !selectedPriceList) return;

    const basePrice = getProductPrice(quantityModalProduct, selectedPriceList);
    const vatRate = getProductVatRate(quantityModalProduct, selectedPriceList);
    const unitPrice = basePrice;
    const totalPrice = basePrice * quantity;

    const newItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: {
        id: quantityModalProduct.id,
        name: quantityModalProduct.name,
        sku: quantityModalProduct.sku,
        barcode: quantityModalProduct.barcode,
        quantityType: quantityModalProduct.quantityType,
      },
      quantity: quantity, // This will be the kg/liters amount
      selectedPriceListId: selectedPriceList,
      unitPrice,
      totalPrice,
      vatRate,
    };

    addToCart(newItem);

    // Open table if this is the first product added to a selected table
    if (selectedTable && cart.length === 0) {
      await openTableIfNeeded(selectedTable.id);
    }

    // Reset modal state
    setQuantityModalProduct(null);
  };

  // Confirm recipe selections and add to cart
  const confirmRecipeSelections = async () => {
    if (selectedProduct) {
      // Only look for existing item if we're in edit mode
      let existingCartItem = null;
      if (isEditingCartItem && editingCartItemId) {
        existingCartItem = cart.find((item) => item.id === editingCartItemId);
      }

      if (existingCartItem && isEditingCartItem) {
        // Update existing item with new recipe selections
        const basePrice = getProductPrice(selectedProduct, selectedPriceList);
        let additionalCost = 0;
        const selectedRecipes: CartItem["selectedRecipes"] = [];

        if (selectedProduct.recipeIds) {
          selectedProduct.recipeIds.forEach((recipeId) => {
            const recipe = recipes.find((r) => r.id === recipeId);
            if (recipe) {
              let recipeCost = 0;
              const recipeOptions: { [groupId: string]: string[] } = {};

              recipe.groups.forEach((group) => {
                const selectedOptions = selectedRecipeOptions[group.id] || [];
                if (selectedOptions.length > 0) {
                  recipeOptions[group.id] = selectedOptions;
                  selectedOptions.forEach((optionId) => {
                    const option = group.options.find((o) => o.id === optionId);
                    if (option) {
                      recipeCost += option.price;
                    }
                  });
                }
              });

              if (Object.keys(recipeOptions).length > 0) {
                selectedRecipes.push({
                  recipeId,
                  selectedOptions: recipeOptions,
                  additionalCost: recipeCost,
                });
                additionalCost += recipeCost;
              }
            }
          });
        }

        const newUnitPrice = basePrice + additionalCost;
        const newVatRate = getProductVatRate(
          selectedProduct,
          selectedPriceList
        );

        // Update existing item in place (preserves position)
        const updatedItem: CartItem = {
          ...existingCartItem,
          selectedRecipes:
            selectedRecipes.length > 0 ? selectedRecipes : undefined,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * existingCartItem.quantity,
          vatRate: newVatRate,
        };

        updateCartItem(updatedItem);
      } else {
        // Add new item
        await handleAddToCart(selectedProduct, selectedRecipeOptions);
      }

      setShowRecipes(false);
      setSelectedRecipeOptions({});
      setSelectedProduct(null);
      setIsEditingCartItem(false); // Reset edit mode
      setEditingCartItemId(null); // Clear editing item ID
    }
  };

  // Handle adding plastic tax
  const handleAddPlasticTax = () => {
    if (!wrappSettings?.plasticTax || wrappSettings.plasticTax <= 0) return;

    const taxItem: CartItem = {
      id: `plastic-tax-${Date.now()}`,
      product: {
        id: "plastic-tax",
        name: "Φόρος Πλαστικών",
        sku: "999.999.998", // Κωδικός άρθρου για φόρο πλαστικών μιας χρήσης
      },
      quantity: 1,
      selectedPriceListId: selectedPriceList,
      unitPrice: wrappSettings.plasticTax,
      totalPrice: wrappSettings.plasticTax,
      vatRate: 24, // ΦΠΑ 24% σύμφωνα με λογίστρια
    };

    addToCart(taxItem);
  };

  // Handle adding plastic bag tax
  const handleAddPlasticBagTax = () => {
    if (!wrappSettings?.plasticBagTax || wrappSettings.plasticBagTax <= 0)
      return;

    const taxItem: CartItem = {
      id: `plastic-bag-tax-${Date.now()}`,
      product: {
        id: "plastic-bag-tax",
        name: "Φόρος Σακούλας",
        sku: "999.999.999", // Κωδικός άρθρου για φόρο πλαστικής σακούλας
      },
      quantity: 1,
      selectedPriceListId: selectedPriceList,
      unitPrice: wrappSettings.plasticBagTax,
      totalPrice: wrappSettings.plasticBagTax,
      vatRate: 24, // ΦΠΑ 24% σύμφωνα με λογίστρια
    };

    addToCart(taxItem);
  };

  // Handle adding custom price item
  const handleAddCustomPrice = () => {
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      alert("Παρακαλώ εισάγετε έγκυρη τιμή");
      return;
    }

    const customItem: CartItem = {
      id: `custom-${Date.now()}`,
      product: {
        id: "custom-price",
        name: "Ελεύθερη Τιμή",
        sku: "CUSTOM",
      },
      quantity: 1,
      selectedPriceListId: selectedPriceList,
      unitPrice: price,
      totalPrice: price,
      vatRate: customVatRate,
    };

    addToCart(customItem);
    setShowCustomPriceModal(false);
    setCustomPrice("");
    setCustomVatRate(24);
  };

  // Handle applying discount
  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      alert("Παρακαλώ εισάγετε έγκυρη τιμή έκπτωσης");
      return;
    }

    const totals = calculateTotals();
    let discountAmount = 0;

    if (discountType === "percentage") {
      if (value > 100) {
        alert("Η ποσοστιαία έκπτωση δεν μπορεί να υπερβαίνει το 100%");
        return;
      }
      discountAmount = (totals.total * value) / 100;
    } else {
      if (value > totals.total) {
        alert("Η έκπτωση δεν μπορεί να υπερβαίνει το σύνολο");
        return;
      }
      discountAmount = value;
    }

    setAppliedDiscount({
      type: discountType,
      value: value,
      amount: discountAmount,
    });

    setShowDiscountModal(false);
    setDiscountValue("");
  };

  // Remove discount
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
  };

  // Calculate totals using the hook with discount applied
  const cartTotals = useMemo(() => {
    const baseTotals = calculateTotals();

    if (!appliedDiscount) {
      return baseTotals;
    }

    const discountAmount = appliedDiscount.amount;
    const finalTotal = Math.max(0, baseTotals.total - discountAmount);

    // Proportionally reduce subtotal and VAT to maintain the same ratio
    const discountRatio = finalTotal / baseTotals.total;
    const finalSubtotal = baseTotals.subtotal * discountRatio;
    const finalVatAmount = baseTotals.vatAmount * discountRatio;

    return {
      subtotal: finalSubtotal,
      vatAmount: finalVatAmount,
      total: finalTotal,
      discount: discountAmount,
    } as {
      subtotal: number;
      vatAmount: number;
      total: number;
      discount?: number;
    };
  }, [calculateTotals, appliedDiscount]);

  // Group VAT amounts by rate for display
  const vatBreakdown = useMemo(() => {
    const vatGroups: { [rate: string]: number } = {};

    cart.forEach((item) => {
      const vatRate = item.vatRate; // Now as percentage (24)
      const vatPercentage = Math.round(vatRate);
      const vatRateDecimal = vatRate / 100; // Convert to decimal for calculations
      const itemVatAmount =
        item.totalPrice - item.totalPrice / (1 + vatRateDecimal);

      if (!vatGroups[vatPercentage]) {
        vatGroups[vatPercentage] = 0;
      }
      vatGroups[vatPercentage] += itemVatAmount;
    });

    const breakdown = Object.entries(vatGroups)
      .map(([rate, amount]) => ({
        rate: parseInt(rate),
        amount,
      }))
      .sort((a, b) => a.rate - b.rate);

    return breakdown;
  }, [cart]);

  // Handle checkout button click - opens payment modal or table order modal
  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (
      !wrappSettings ||
      !wrappSettings.email ||
      !wrappSettings.apiKey ||
      !wrappSettings.baseUrl
    ) {
      alert("Παρακαλώ ρυθμίστε πρώτα τα διαπιστευτήρια WRAPP στις ρυθμίσεις");
      return;
    }
    if (!selectedBillingBook) {
      alert("Παρακαλώ επιλέξτε βιβλίο έκδοσης");
      return;
    }

    // If we have a selected table, show table order modal instead of payment modal
    if (selectedTable) {
      setShowTableOrderModal(true);
    } else {
      // Normal checkout for non-table orders
      setShowPaymentModal(true);
    }
  };

  // Handle payment processing
  const handleProcessPayment = async (
    selectedPaymentMethod?: PaymentMethod
  ) => {
    const finalPaymentMethod = selectedPaymentMethod || paymentMethod;
    if (cart.length === 0) return;
    if (
      !wrappSettings ||
      !wrappSettings.email ||
      !wrappSettings.apiKey ||
      !wrappSettings.baseUrl
    ) {
      alert("Παρακαλώ ρυθμίστε πρώτα τα διαπιστευτήρια WRAPP στις ρυθμίσεις");
      return;
    }
    if (!selectedBillingBook) {
      alert("Παρακαλώ επιλέξτε βιβλίο έκδοσης");
      return;
    }

    try {
      // Store data globally before processPayment for the print function
      const cartDataForPrint = [...cart];
      const currentUser = user
        ? `${user.firstName} ${user.lastName}`
        : "Χρήστης POS";
      (window as any).cartDataForPrint = cartDataForPrint;
      (window as any).paymentMethodForPrint = finalPaymentMethod;
      (window as any).businessInfoForPrint = businessInfo;
      (window as any).currentUserForPrint = currentUser;
      (window as any).recipesDataForPrint = recipes;
      (window as any).appliedDiscountForPrint = appliedDiscount; // Add discount data for printing

      const result = await processPayment(
        finalPaymentMethod,
        customerInfo,
        selectedBillingBook,
        wrappSettings,
        businessInfo,
        selectedPriceList, // Pass selected price list for MyDATA classifications
        cartTotals // Pass final totals with discount applied
      );

      // Update the billing book number for real-time display
      if (result && result.num && selectedBillingBook) {
        setBillingBooks((prevBooks) =>
          prevBooks.map((book) =>
            book.id === selectedBillingBook
              ? { ...book, number: result.num + 1 } // Next number will be current + 1
              : book
          )
        );
      }

      // Save invoice to Firestore for history
      try {
        const invoiceRecord = {
          invoiceNumber: result.num || "N/A",
          series: result.series || "N/A",
          total: cartTotals.total,
          paymentMethod: finalPaymentMethod,
          timestamp: new Date(),
          cart: [...cart],
          businessInfo: { ...businessInfo },
          invoiceData: { ...result },
          userId: user?.id || "default",
          userName: user ? `${user.firstName} ${user.lastName}` : "Χρήστης POS",
          recipes: [...recipes], // Add recipes data for proper display in history
          appliedDiscount: appliedDiscount, // Add discount data to invoice record
        };

        await setDoc(
          doc(db, "invoices", `${Date.now()}_${result.num || Math.random()}`),
          invoiceRecord
        );
      } catch (historyError) {
        console.error("Error saving invoice to history:", historyError);
        // Don't show error to user as the main operation succeeded
      }

      // Reset customer info and close payment modal
      setCustomerInfo({ name: "", phone: "", email: "" });
      setShowPaymentModal(false);

      // Reset discount after a delay to allow print function to access it
      setTimeout(() => {
        setAppliedDiscount(null);
      }, 200); // Wait longer than the print function delay (100ms)
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Άγνωστο σφάλμα";
      alert(`Σφάλμα κατά την έκδοση της απόδειξης: ${errorMessage}`);
      setShowPaymentModal(false);
    }
  };

  if (productsLoading || categoriesLoading || priceListsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-amber-500" />
        <span className="ml-2 text-lg">Φόρτωση POS System...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-3 sm:px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
            <FaShoppingCart className="mr-2 md:mr-3 text-amber-500" size={20} />
            <span className="hidden sm:inline">POS System</span>
            <span className="sm:hidden">POS</span>
          </h1>

          {/* Price List & Billing Book Selectors & History Button */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:gap-6 w-full lg:w-auto">
            <div className="flex items-center space-x-2 flex-1 lg:flex-initial">
              <label className="text-xs md:text-sm font-medium text-gray-700 hidden md:inline">
                Τιμοκατάλογος:
              </label>
              <select
                value={selectedPriceList}
                onChange={(e) => {
                  const newPriceListId = e.target.value;
                  console.log(
                    "📋 Changing price list temporarily to:",
                    newPriceListId
                  );
                  setSelectedPriceList(newPriceListId);
                  // DO NOT save to settings - this is a temporary change for this session only
                  // Default price list should only be changed from Settings page
                }}
                className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full lg:w-auto"
              >
                {priceLists.map((priceList) => (
                  <option key={priceList.id} value={priceList.id}>
                    {priceList.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Book Selector - Hidden (auto-managed in background) */}

            {/* Restaurant Floor Button */}
            <button
              onClick={() => setShowRestaurantFloor(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <FaTable size={14} />
              <span className="hidden sm:inline">Σάλα Εστιατορίου</span>
              <span className="sm:hidden">Τραπέζια</span>
            </button>

            {/* Invoice History Button */}
            <button
              onClick={() => setShowInvoiceHistoryModal(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <FaHistory size={14} />
              <span className="hidden sm:inline">Ιστορικό Παραστατικών</span>
              <span className="sm:hidden">Ιστορικό</span>
            </button>

            {/* Sidebar Toggle Button - Icon Only */}
            <button
              onClick={async () => {
                const newValue = !hideSidebar;
                setHideSidebar(newValue);
                // Save to Firestore and trigger layout update
                if (user?.id) {
                  try {
                    await updateDoc(
                      doc(db, "users", user.id, "settings", "pos"),
                      {
                        hideSidebar: newValue,
                      }
                    );
                    // Trigger a re-render by dispatching a custom event
                    window.dispatchEvent(
                      new CustomEvent("sidebarToggle", {
                        detail: { hideSidebar: newValue },
                      })
                    );
                  } catch (error) {
                    console.error("Error updating sidebar:", error);
                  }
                }
              }}
              className={`p-2 rounded-lg transition-all ${
                hideSidebar
                  ? "bg-gray-500 hover:bg-gray-600 text-white"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
              title={hideSidebar ? "Εμφάνιση Μενού" : "Απόκρυψη Μενού"}
            >
              {hideSidebar ? <FaBars size={16} /> : <FaTimes size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Side - Cart (Hidden on mobile, shown as drawer) */}
        <div className="hidden lg:flex lg:w-1/4 xl:w-1/5 bg-white border-r border-gray-200 flex-col h-full">
          {/* Selected Table Section */}
          {selectedTable && (
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded border-2 border-white shadow-sm"
                    style={{
                      backgroundColor: selectedTable.color || "#3B82F6",
                    }}
                  />
                  <div>
                    <div className="font-semibold text-blue-800 flex items-center space-x-2">
                      <FaTable size={14} />
                      <span>{selectedTable.name}</span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {selectedTable.seats} θέσεις •{" "}
                      {selectedTable.section || "Κύρια σάλα"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    console.log(
                      " Deselecting table, restoring default settings..."
                    );

                    // Restore previous price list when deselecting table
                    if (
                      previousPriceList &&
                      previousPriceList !== selectedPriceList
                    ) {
                      console.log(
                        " Restoring previous price list:",
                        previousPriceList
                      );
                      setSelectedPriceList(previousPriceList);
                    } else {
                      // If no previous price list, load the default from settings
                      console.log(
                        " Loading default price list from settings..."
                      );
                      await loadUserDefaultPriceList();
                    }

                    // Restore previous billing book when deselecting table
                    if (
                      previousBillingBook &&
                      previousBillingBook !== selectedBillingBook
                    ) {
                      console.log(
                        " Restoring previous billing book:",
                        previousBillingBook
                      );
                      setSelectedBillingBook(previousBillingBook);
                    }

                    setSelectedTable(null);
                    setPreviousPriceList("");
                    setPreviousBillingBook("");
                  }}
                  className="p-2 hover:bg-blue-200 rounded-lg text-blue-600 transition-colors"
                  title="Αποεπιλογή τραπεζιού"
                >
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-blue-600">
                  Status:{" "}
                  <span
                    className={`font-medium px-2 py-1 rounded-full text-white text-xs ${
                      selectedTable.status === "available"
                        ? "bg-green-500"
                        : selectedTable.status === "open"
                        ? "bg-blue-500"
                        : selectedTable.status === "closed"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {selectedTable.status === "available"
                      ? "Διαθέσιμο"
                      : selectedTable.status === "open"
                      ? "Ανοιχτό"
                      : selectedTable.status === "closed"
                      ? "Κλειστό"
                      : "Άγνωστο"}
                  </span>
                </div>
                {selectedTable.total && selectedTable.total > 0 && (
                  <div className="text-xs text-blue-800 font-semibold">
                    Σύνολο: €{selectedTable.total.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Καλάθι Αγορών
              </h2>
              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm font-medium">
                {cart.length} προϊόντα
              </span>
            </div>
          </div>

          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <FaShoppingCart className="mx-auto text-4xl mb-2 opacity-50" />
                <p>Το καλάθι είναι άδειο</p>
                <p className="text-sm">Προσθέστε προϊόντα για να ξεκινήσετε</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3
                        className="font-medium text-gray-800 text-sm cursor-pointer hover:text-amber-600 transition-colors"
                        onClick={() => {
                          // Find the full product to edit recipes
                          const fullProduct = products.find(
                            (p) => p.id === item.product.id
                          );
                          if (
                            fullProduct &&
                            fullProduct.recipeIds &&
                            fullProduct.recipeIds.length > 0
                          ) {
                            setSelectedProduct(fullProduct);
                            setIsEditingCartItem(true); // Set edit mode
                            setEditingCartItemId(item.id); // Remember which item we're editing
                            // Pre-populate with existing selections
                            if (
                              item.selectedRecipes &&
                              item.selectedRecipes.length > 0
                            ) {
                              const existingSelections: {
                                [groupId: string]: string[];
                              } = {};
                              item.selectedRecipes.forEach((recipe) => {
                                Object.entries(recipe.selectedOptions).forEach(
                                  ([groupId, optionIds]) => {
                                    existingSelections[groupId] = optionIds;
                                  }
                                );
                              });
                              setSelectedRecipeOptions(existingSelections);
                            }
                            setShowRecipes(true);
                          }
                        }}
                      >
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        SKU: {item.product.sku}
                      </p>

                      {/* Show recipe selections */}
                      {item.selectedRecipes &&
                        item.selectedRecipes.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {item.selectedRecipes.map(
                              (selectedRecipe, index) => {
                                const recipe = recipes.find(
                                  (r) => r.id === selectedRecipe.recipeId
                                );
                                if (!recipe) return null;

                                return (
                                  <div
                                    key={index}
                                    className="text-xs text-blue-600"
                                  >
                                    {Object.entries(
                                      selectedRecipe.selectedOptions
                                    ).map(([groupId, optionIds]) => {
                                      const group = recipe.groups.find(
                                        (g) => g.id === groupId
                                      );
                                      if (!group) return null;

                                      const optionNames = optionIds
                                        .map((optionId) => {
                                          const option = group.options.find(
                                            (o) => o.id === optionId
                                          );
                                          return option ? option.name : "";
                                        })
                                        .filter(Boolean);

                                      return optionNames.length > 0 ? (
                                        <span key={groupId} className="block">
                                          {group.name}: {optionNames.join(", ")}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}

                      <p className="text-xs text-amber-600 font-medium">
                        {formatPricePerUnit(
                          item.unitPrice,
                          item.product.quantityType || 1
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          updateCartItemQuantity(item.id, item.quantity - 1)
                        }
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                      >
                        <FaMinus size={8} />
                      </button>
                      <span className="w-8 text-center font-medium text-sm">
                        {formatQuantityWithUnit(
                          item.quantity,
                          item.product.quantityType || 1
                        )}
                      </span>
                      <button
                        onClick={() =>
                          updateCartItemQuantity(item.id, item.quantity + 1)
                        }
                        className="w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white"
                      >
                        <FaPlus size={8} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800 text-sm">
                        €{item.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer - Totals & Actions - Sticky Bottom */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-3 space-y-3 bg-white flex-shrink-0">
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Υποσύνολο:</span>
                  <span>€{cartTotals.subtotal.toFixed(2)}</span>
                </div>

                {/* VAT Breakdown by Rate */}
                {vatBreakdown.map((vat) => (
                  <div key={vat.rate} className="flex justify-between text-sm">
                    <span>ΦΠΑ ({vat.rate}%):</span>
                    <span>€{vat.amount.toFixed(2)}</span>
                  </div>
                ))}

                {/* Discount Display */}
                {appliedDiscount && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>
                      Έκπτωση (
                      {appliedDiscount.type === "percentage"
                        ? `${appliedDiscount.value}%`
                        : "€" + appliedDiscount.value}
                      ):
                    </span>
                    <span>-€{appliedDiscount.amount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Σύνολο:</span>
                  <span className="text-amber-600">
                    €{cartTotals.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    clearCart();
                    setAppliedDiscount(null); // Reset discount when clearing cart
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 px-4 rounded-lg text-base font-medium flex items-center justify-center"
                >
                  <FaTimes className="mr-2" size={14} />
                  Ακύρωση
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white py-4 px-4 rounded-lg text-base font-medium flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" size={14} />
                      Επεξεργασία...
                    </>
                  ) : (
                    <>
                      <FaReceipt className="mr-2" size={14} />
                      Έκδοση
                    </>
                  )}
                </button>
              </div>
              {/* Discount Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <FaPercent size={12} />
                  Έκπτωση
                </button>
                {appliedDiscount && (
                  <button
                    onClick={handleRemoveDiscount}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                    title="Αφαίρεση έκπτωσης"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Products */}
        <div className="flex-1 lg:w-3/4 xl:w-4/5 flex flex-col h-full overflow-hidden">
          {/* Search Bar */}
          <div className="p-2 md:p-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Αναζήτηση προϊόντων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="p-2 md:p-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div
              className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing"
              onWheel={(e) => {
                e.preventDefault();
                const container = e.currentTarget;
                container.scrollLeft += e.deltaY;
              }}
              onMouseDown={(e) => {
                const container = e.currentTarget;
                const startX = e.pageX - container.offsetLeft;
                const scrollLeft = container.scrollLeft;
                let isDragging = false;

                const handleMouseMove = (e: MouseEvent) => {
                  if (!isDragging) {
                    const distance = Math.abs(
                      e.pageX - container.offsetLeft - startX
                    );
                    if (distance > 5) {
                      // Start dragging after 5px movement
                      isDragging = true;
                      container.style.cursor = "grabbing";
                    }
                  }
                  if (isDragging) {
                    e.preventDefault();
                    const x = e.pageX - container.offsetLeft;
                    const walk = (x - startX) * 2;
                    container.scrollLeft = scrollLeft - walk;
                  }
                };

                const handleMouseUp = (e: MouseEvent) => {
                  container.style.cursor = "grab";
                  document.removeEventListener("mousemove", handleMouseMove);
                  document.removeEventListener("mouseup", handleMouseUp);

                  // Prevent click if we were dragging
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                };

                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
              }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg whitespace-nowrap font-medium ${
                  selectedCategory === null
                    ? "bg-amber-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Όλες
              </button>
              {categories
                .filter((category) =>
                  products.some(
                    (product) => product.category.id === category.id
                  )
                )
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                      selectedCategory === category.id
                        ? "text-white shadow-md"
                        : "bg-white text-gray-700 hover:shadow-sm"
                    }`}
                    style={{
                      backgroundColor:
                        selectedCategory === category.id
                          ? category.color || "#F59E0B"
                          : undefined,
                      borderWidth: "2px",
                      borderStyle: "solid",
                      borderColor: category.color || "#E5E7EB",
                    }}
                  >
                    <FaTag className="text-xs" />
                    {category.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="p-2 md:p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
                {/* Custom Price Button */}
                <button
                  onClick={() => setShowCustomPriceModal(true)}
                  className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg whitespace-nowrap font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md flex items-center gap-1 md:gap-2"
                >
                  <FaCalculator size={14} />
                  <span className="hidden sm:inline">Ελεύθερη Τιμή</span>
                  <span className="sm:hidden">Τιμή</span>
                </button>

                {/* Plastic Tax Button */}
                {wrappSettings?.showPlasticTaxButton &&
                  wrappSettings?.plasticTax > 0 && (
                    <button
                      onClick={handleAddPlasticTax}
                      className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg whitespace-nowrap font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md flex items-center gap-1 md:gap-2"
                    >
                      <FaPlus size={14} />
                      <span className="hidden sm:inline">
                        Φόρος Πλαστικών (€{wrappSettings.plasticTax.toFixed(2)})
                      </span>
                      <span className="sm:hidden">Πλαστικά</span>
                    </button>
                  )}

                {/* Plastic Bag Tax Button */}
                {wrappSettings?.showPlasticBagTaxButton &&
                  wrappSettings?.plasticBagTax > 0 && (
                    <button
                      onClick={handleAddPlasticBagTax}
                      className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg whitespace-nowrap font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md flex items-center gap-1 md:gap-2"
                    >
                      <FaPlus size={14} />
                      <span className="hidden sm:inline">
                        Φόρος Σακούλας (€
                        {wrappSettings.plasticBagTax.toFixed(2)})
                      </span>
                      <span className="sm:hidden">Σακούλα</span>
                    </button>
                  )}
              </div>

              {/* View Toggle Button */}
              <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setProductView("grid")}
                  className={`p-2 rounded transition-colors ${
                    productView === "grid"
                      ? "bg-amber-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Προβολή με εικόνες"
                >
                  <FaTh size={16} />
                </button>
                <button
                  onClick={() => setProductView("list")}
                  className={`p-2 rounded transition-colors ${
                    productView === "list"
                      ? "bg-amber-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Προβολή λίστας"
                >
                  <FaList size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Products Display */}
          <div className="flex-1 p-2 md:p-4 overflow-y-auto pb-20 lg:pb-4">
            {/* Grid View */}
            {productView === "grid" && (
              <div>
                {!selectedCategory && groupedProducts ? (
                  // Display grouped by category
                  Object.values(groupedProducts).map(
                    ({ category, products: categoryProducts }) => (
                      <div key={category.id} className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                          {category.name}
                          <span className="text-sm text-gray-500">
                            ({categoryProducts.length})
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 md:gap-4">
                          {categoryProducts.map((product) => {
                            const price = getProductPrice(
                              product,
                              selectedPriceList
                            );
                            const isOutOfStock =
                              product.trackStock &&
                              product.stock <= 0 &&
                              !product.neverOutOfStock;

                            return (
                              <div
                                key={product.id}
                                className={`bg-white rounded-lg border-2 border-gray-200 hover:border-amber-300 active:scale-95 transition-all cursor-pointer ${
                                  isOutOfStock ? "opacity-50" : ""
                                }`}
                                onClick={() =>
                                  !isOutOfStock &&
                                  handleAddProductWithRecipes(product)
                                }
                              >
                                {/* Same product content as below */}
                                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                  {product.image ? (
                                    <Image
                                      src={product.image}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <FaTag className="text-gray-400 text-2xl" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 flex flex-col h-full">
                                  <h3 className="font-medium text-gray-800 text-xs md:text-sm mb-1 line-clamp-2">
                                    {product.name}
                                  </h3>
                                  <p className="text-[10px] md:text-xs text-gray-600 mb-1 md:mb-2 truncate">
                                    SKU: {product.sku}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-amber-600">
                                      €{price.toFixed(2)}
                                    </span>
                                    {product.trackStock && (
                                      <span className="text-xs text-gray-500">
                                        Απόθεμα: {product.stock}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isOutOfStock && (
                                  <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center">
                                    <span className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                      ΕΞΑΝΤΛΗΜΕΝΟ
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )
                ) : (
                  // Display flat list when category is selected
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 md:gap-4">
                    {filteredProducts.map((product) => {
                      const price = getProductPrice(product, selectedPriceList);
                      const isOutOfStock =
                        product.trackStock &&
                        product.stock <= 0 &&
                        !product.neverOutOfStock;

                      return (
                        <div
                          key={product.id}
                          className={`bg-white rounded-lg border-2 border-gray-200 hover:border-amber-300 active:scale-95 transition-all cursor-pointer ${
                            isOutOfStock ? "opacity-50" : ""
                          }`}
                          onClick={() =>
                            !isOutOfStock &&
                            handleAddProductWithRecipes(product)
                          }
                        >
                          <div className="aspect-square relative overflow-hidden rounded-t-lg">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <FaTag className="text-gray-400 text-xl md:text-2xl" />
                              </div>
                            )}
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                                  ΕΞΑΝΤΛΗΜΕΝΟ
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-2 md:p-3">
                            <h3 className="font-medium text-gray-800 text-xs md:text-sm mb-1 line-clamp-2">
                              {product.name}
                            </h3>
                            <p className="text-[10px] md:text-xs text-gray-600 mb-1 md:mb-2 truncate">
                              SKU: {product.sku}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-amber-600">
                                €{price.toFixed(2)}
                              </span>
                              {product.trackStock && (
                                <span className="text-xs text-gray-500">
                                  Απόθεμα: {product.stock}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* List View - Compact Card View (No Images) */}
            {productView === "list" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 md:gap-3">
                {filteredProducts.map((product) => {
                  const price = getProductPrice(product, selectedPriceList);
                  const isOutOfStock =
                    product.trackStock &&
                    product.stock <= 0 &&
                    !product.neverOutOfStock;

                  return (
                    <div
                      key={product.id}
                      className={`relative bg-white rounded-lg border-2 hover:shadow-md active:scale-95 transition-all cursor-pointer overflow-hidden ${
                        isOutOfStock ? "opacity-50" : ""
                      }`}
                      style={{
                        borderColor: product.category?.color || "#E5E7EB",
                      }}
                      onClick={() =>
                        !isOutOfStock && handleAddProductWithRecipes(product)
                      }
                    >
                      {/* Content */}
                      <div className="p-3 flex flex-col h-full">
                        {/* Product Name - DOMINANT */}
                        <h3 className="font-bold text-gray-900 text-base md:text-lg leading-tight mb-2 flex-1 line-clamp-3">
                          {product.name}
                        </h3>

                        {/* SKU - Small */}
                        <p className="text-[10px] text-gray-400 mb-2 truncate">
                          {product.sku}
                        </p>

                        {/* Bottom Section */}
                        <div className="space-y-1.5">
                          {/* Price - Compact */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Τιμή:</span>
                            <span className="text-lg font-bold text-amber-600">
                              €{price.toFixed(2)}
                            </span>
                          </div>

                          {/* Stock - Inline */}
                          {product.trackStock && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Απόθεμα:</span>
                              <span
                                className={`font-semibold ${
                                  product.stock > 10
                                    ? "text-green-600"
                                    : product.stock > 0
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {product.stock}
                              </span>
                            </div>
                          )}

                          {/* Category Badge */}
                          {product.category && (
                            <div className="pt-1.5 border-t border-gray-100">
                              <div
                                className="text-xs font-medium px-2 py-1 rounded-full text-center truncate"
                                style={{
                                  backgroundColor:
                                    product.category.color || "#6B7280",
                                  color: "#FFFFFF",
                                }}
                              >
                                {product.category.name}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Out of Stock Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                            ΕΞΑΝΤΛΗΜΕΝΟ
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <FaTag className="mx-auto text-4xl mb-2 opacity-50" />
                <p>Δεν βρέθηκαν προϊόντα</p>
                <p className="text-sm">
                  Δοκιμάστε διαφορετικά κριτήρια αναζήτησης
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipe Modal */}
      {showRecipes && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Επιλογές για {selectedProduct.name}
              </h3>
              <button
                onClick={() => {
                  setShowRecipes(false);
                  // Reset to default options instead of clearing
                  if (selectedProduct) {
                    const defaultOptions =
                      getDefaultRecipeOptions(selectedProduct);
                    setSelectedRecipeOptions(defaultOptions);
                  }
                  setIsEditingCartItem(false);
                  setEditingCartItemId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-6">
              {selectedProduct.recipeIds?.map((recipeId) => {
                const recipe = recipes.find((r) => r.id === recipeId);
                if (!recipe) return null;

                return (
                  <div key={recipe.id} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-amber-600">
                      {recipe.name}
                    </h4>
                    {recipe.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {recipe.description}
                      </p>
                    )}

                    {/* Recipe Groups */}
                    <div className="space-y-4">
                      {recipe.groups
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((group) => (
                          <div key={group.id} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-gray-800">
                                {group.name}
                              </h5>
                              {group.required && (
                                <span className="text-red-500 text-xs">*</span>
                              )}
                            </div>

                            {group.description && (
                              <p className="text-xs text-gray-500">
                                {group.description}
                              </p>
                            )}

                            {/* Options based on type */}
                            <div className="space-y-2">
                              {group.type === "radio" && (
                                <div className="space-y-1">
                                  {group.options.map((option) => (
                                    <label
                                      key={option.id}
                                      className="flex items-center space-x-2 cursor-pointer"
                                    >
                                      <input
                                        type="radio"
                                        name={group.id}
                                        value={option.id}
                                        checked={
                                          selectedRecipeOptions[
                                            group.id
                                          ]?.[0] === option.id
                                        }
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedRecipeOptions(
                                              (prev) => ({
                                                ...prev,
                                                [group.id]: [option.id],
                                              })
                                            );
                                          }
                                        }}
                                        className="text-amber-500 focus:ring-amber-500"
                                      />
                                      <span className="text-sm">
                                        {option.name}
                                      </span>
                                      {option.price > 0 && (
                                        <span className="text-xs text-amber-600 font-medium">
                                          +€{option.price.toFixed(2)}
                                        </span>
                                      )}
                                    </label>
                                  ))}
                                </div>
                              )}

                              {group.type === "checkbox" && (
                                <div className="space-y-1">
                                  {group.options.map((option) => (
                                    <label
                                      key={option.id}
                                      className="flex items-center space-x-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          selectedRecipeOptions[
                                            group.id
                                          ]?.includes(option.id) || false
                                        }
                                        onChange={(e) => {
                                          const currentSelections =
                                            selectedRecipeOptions[group.id] ||
                                            [];
                                          if (e.target.checked) {
                                            // Check max selections limit
                                            if (
                                              !group.maxSelections ||
                                              currentSelections.length <
                                                group.maxSelections
                                            ) {
                                              setSelectedRecipeOptions(
                                                (prev) => ({
                                                  ...prev,
                                                  [group.id]: [
                                                    ...currentSelections,
                                                    option.id,
                                                  ],
                                                })
                                              );
                                            }
                                          } else {
                                            setSelectedRecipeOptions(
                                              (prev) => ({
                                                ...prev,
                                                [group.id]:
                                                  currentSelections.filter(
                                                    (id) => id !== option.id
                                                  ),
                                              })
                                            );
                                          }
                                        }}
                                        className="text-amber-500 focus:ring-amber-500"
                                      />
                                      <span className="text-sm">
                                        {option.name}
                                      </span>
                                      {option.price > 0 && (
                                        <span className="text-xs text-amber-600 font-medium">
                                          +€{option.price.toFixed(2)}
                                        </span>
                                      )}
                                    </label>
                                  ))}
                                  {group.maxSelections && (
                                    <p className="text-xs text-gray-500">
                                      Μέγιστες επιλογές: {group.maxSelections}
                                    </p>
                                  )}
                                </div>
                              )}

                              {group.type === "dropdown" && (
                                <select
                                  value={
                                    selectedRecipeOptions[group.id]?.[0] || ""
                                  }
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setSelectedRecipeOptions((prev) => ({
                                        ...prev,
                                        [group.id]: [e.target.value],
                                      }));
                                    } else {
                                      setSelectedRecipeOptions((prev) => ({
                                        ...prev,
                                        [group.id]: [],
                                      }));
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                >
                                  <option value="">Επιλέξτε...</option>
                                  {group.options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name}
                                      {option.price > 0 &&
                                        ` (+€${option.price.toFixed(2)})`}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowRecipes(false);
                  // Reset to default options instead of clearing
                  if (selectedProduct) {
                    const defaultOptions =
                      getDefaultRecipeOptions(selectedProduct);
                    setSelectedRecipeOptions(defaultOptions);
                  }
                  setIsEditingCartItem(false);
                  setEditingCartItemId(null);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
              >
                Ακύρωση
              </button>
              <button
                onClick={confirmRecipeSelections}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-lg"
              >
                Επιβεβαίωση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Receipt Print Template */}
      <ReceiptPrintTemplate
        invoiceData={lastInvoiceData}
        paymentMethod={paymentMethod}
        cart={cart}
        businessInfo={businessInfo}
      />

      {/* Hidden Order Note Print Template */}
      <OrderNotePrintTemplate
        invoiceData={lastInvoiceData}
        cart={cart}
        businessInfo={businessInfo}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleProcessPayment}
        total={cartTotals.total}
        isProcessing={isProcessing}
      />

      {/* Invoice History Modal */}
      <InvoiceHistoryModal
        isOpen={showInvoiceHistoryModal}
        onClose={() => setShowInvoiceHistoryModal(false)}
      />

      {/* Restaurant Floor Modal */}
      <RestaurantFloorModal
        isOpen={showRestaurantFloor}
        onClose={() => setShowRestaurantFloor(false)}
        onTableSelect={(table, floorPriceListId) => {
          console.log("🍽️ Table selected:", table.name);
          console.log("📋 Floor price list ID:", floorPriceListId);
          console.log("📋 Current price list:", selectedPriceList);

          // Store current price list and billing book before switching
          setPreviousPriceList(selectedPriceList);
          setPreviousBillingBook(selectedBillingBook);
          console.log("💾 Saved previous price list:", selectedPriceList);
          console.log("💾 Saved previous billing book:", selectedBillingBook);

          // Switch to floor's price list if available
          if (floorPriceListId && floorPriceListId !== selectedPriceList) {
            console.log("🎯 Switching to floor price list:", floorPriceListId);
            setSelectedPriceList(floorPriceListId);
          } else if (!floorPriceListId) {
            console.log(
              "ℹ️ No floor price list specified, keeping current:",
              selectedPriceList
            );
          } else if (floorPriceListId === selectedPriceList) {
            console.log("✅ Already using floor price list:", floorPriceListId);
          }

          setSelectedTable(table);
          setShowRestaurantFloor(false);

          // Auto-switch to Order Note billing book when table is selected
          const orderNoteBillingBook = billingBooks.find(
            (book) => book.invoice_type_code === "8.6"
          );

          if (
            orderNoteBillingBook &&
            selectedBillingBook !== orderNoteBillingBook.id
          ) {
            console.log(
              "📄 Switching to Order Note billing book:",
              orderNoteBillingBook.id
            );
            setSelectedBillingBook(orderNoteBillingBook.id);
          } else if (!orderNoteBillingBook) {
            console.log("⚠️ No Order Note billing book (8.6) found");
          } else {
            console.log("✅ Already using Order Note billing book");
          }
        }}
      />

      {/* Table Order Modal */}
      {showTableOrderModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Παραγγελία Τραπεζιού</h2>
                  <p className="text-blue-100 text-sm">
                    {selectedTable.name} • {selectedTable.seats} άτομα
                  </p>
                </div>
                <button
                  onClick={() => setShowTableOrderModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Order Items */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Προϊόντα Παραγγελίας
                </h3>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {item.product.name}
                      </div>
                      {item.selectedRecipes &&
                        item.selectedRecipes.length > 0 && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.selectedRecipes.map(
                              (selectedRecipe: any, idx: number) => {
                                // Find the recipe to get group and option names
                                const recipe = recipes.find(
                                  (r: any) => r.id === selectedRecipe.recipeId
                                );

                                if (!recipe) return null;

                                const optionsDisplay = Object.entries(
                                  selectedRecipe.selectedOptions || {}
                                )
                                  .map(
                                    ([groupId, optionIds]: [string, any]) => {
                                      const group = recipe.groups.find(
                                        (g: any) => g.id === groupId
                                      );
                                      if (!group) return "";

                                      const optionNames = (
                                        Array.isArray(optionIds)
                                          ? optionIds
                                          : [optionIds]
                                      )
                                        .map((optionId: string) => {
                                          const option = group.options.find(
                                            (o: any) => o.id === optionId
                                          );
                                          if (!option) return "";

                                          // Add price if it exists and is greater than 0
                                          const priceText =
                                            option.price && option.price > 0
                                              ? ` (+€${option.price.toFixed(
                                                  2
                                                )})`
                                              : "";
                                          return `${option.name}${priceText}`;
                                        })
                                        .filter(Boolean);

                                      return optionNames.length > 0
                                        ? `${group.name}: ${optionNames.join(
                                            ", "
                                          )}`
                                        : "";
                                    }
                                  )
                                  .filter(Boolean)
                                  .join(" | ");

                                return optionsDisplay ? (
                                  <div
                                    key={idx}
                                    className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1"
                                  >
                                    {optionsDisplay}
                                  </div>
                                ) : null;
                              }
                            )}
                          </div>
                        )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">x{item.quantity}</div>
                      <div className="text-sm text-gray-600">
                        €
                        {(
                          item.totalPrice *
                          (appliedDiscount
                            ? cartTotals.total / calculateTotals().total
                            : 1)
                        ).toFixed(2)}
                      </div>
                      {appliedDiscount && (
                        <div className="text-xs text-red-600">
                          Με έκπτωση{" "}
                          {appliedDiscount.type === "percentage"
                            ? `${appliedDiscount.value}%`
                            : `€${appliedDiscount.value}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Υποσύνολο:</span>
                    <span>€{cartTotals.subtotal.toFixed(2)}</span>
                  </div>
                  {vatBreakdown.map((vat) => (
                    <div
                      key={vat.rate}
                      className="flex justify-between text-sm"
                    >
                      <span>ΦΠΑ ({vat.rate}%):</span>
                      <span>
                        €
                        {(
                          vat.amount *
                          (appliedDiscount
                            ? cartTotals.total / calculateTotals().total
                            : 1)
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {appliedDiscount && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>
                        Έκπτωση (
                        {appliedDiscount.type === "percentage"
                          ? `${appliedDiscount.value}%`
                          : `€${appliedDiscount.value}`}
                        ):
                      </span>
                      <span>-€{appliedDiscount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Σύνολο:</span>
                    <span>€{cartTotals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowTableOrderModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Επιστροφή
                </button>
                <button
                  onClick={handleCreateOrderNote}
                  disabled={isCreatingOrderNote || !wrappSettingsLoaded}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors font-medium flex items-center justify-center"
                >
                  {!wrappSettingsLoaded ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Φόρτωση ρυθμίσεων...
                    </>
                  ) : isCreatingOrderNote ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Δημιουργία...
                    </>
                  ) : (
                    "Δημιουργία Δελτίου Παραγγελίας"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Price Modal */}
      {showCustomPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaCalculator />
                  Ελεύθερη Τιμή
                </h3>
                <button
                  onClick={() => {
                    setShowCustomPriceModal(false);
                    setCustomPrice("");
                    setCustomVatRate(24);
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Display */}
              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <div className="text-right">
                  <div className="text-4xl font-bold text-white mb-2">
                    €{customPrice || "0.00"}
                  </div>
                  {customPrice && parseFloat(customPrice) > 0 && (
                    <div className="text-sm text-gray-400">
                      ΦΠΑ {customVatRate}%: €
                      {(
                        parseFloat(customPrice) -
                        parseFloat(customPrice) / (1 + customVatRate / 100)
                      ).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* VAT Rate Selection */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setCustomVatRate(13)}
                  className={`px-4 py-3 rounded-xl font-bold text-lg transition-all ${
                    customVatRate === 13
                      ? "bg-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  ΦΠΑ 13%
                </button>
                <button
                  onClick={() => setCustomVatRate(24)}
                  className={`px-4 py-3 rounded-xl font-bold text-lg transition-all ${
                    customVatRate === 24
                      ? "bg-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  ΦΠΑ 24%
                </button>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() =>
                      setCustomPrice((prev) => prev + num.toString())
                    }
                    className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 text-2xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    {num}
                  </button>
                ))}

                {/* Bottom Row */}
                <button
                  onClick={() => setCustomPrice((prev) => prev + ".")}
                  disabled={customPrice.includes(".")}
                  className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 text-2xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  .
                </button>
                <button
                  onClick={() => setCustomPrice((prev) => prev + "0")}
                  className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 text-2xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  onClick={() => setCustomPrice((prev) => prev.slice(0, -1))}
                  className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  ⌫
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCustomPriceModal(false);
                    setCustomPrice("");
                    setCustomVatRate(24);
                  }}
                  className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold text-lg transition-all active:scale-95"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleAddCustomPrice}
                  disabled={!customPrice || parseFloat(customPrice) <= 0}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Προσθήκη
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaPercent />
                  Έκπτωση
                </h3>
                <button
                  onClick={() => {
                    setShowDiscountModal(false);
                    setDiscountValue("");
                    setDiscountType("percentage");
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Discount Type Selection */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setDiscountType("percentage")}
                  className={`px-4 py-3 rounded-xl font-bold text-lg transition-all ${
                    discountType === "percentage"
                      ? "bg-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Ποσοστό %
                </button>
                <button
                  onClick={() => setDiscountType("fixed")}
                  className={`px-4 py-3 rounded-xl font-bold text-lg transition-all ${
                    discountType === "fixed"
                      ? "bg-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Σταθερό €
                </button>
              </div>

              {/* Display */}
              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <div className="text-right">
                  <div className="text-4xl font-bold text-white mb-2">
                    {discountType === "percentage"
                      ? `${discountValue || "0"}%`
                      : `€${discountValue || "0.00"}`}
                  </div>
                  {discountValue && parseFloat(discountValue) > 0 && (
                    <div className="text-sm text-gray-400">
                      {discountType === "percentage"
                        ? `Έκπτωση: €${(
                            (calculateTotals().total *
                              parseFloat(discountValue)) /
                            100
                          ).toFixed(2)}`
                        : `Έκπτωση: €${parseFloat(discountValue).toFixed(2)}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() =>
                      setDiscountValue((prev) => prev + num.toString())
                    }
                    className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 text-2xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    {num}
                  </button>
                ))}

                {/* Bottom Row */}
                <button
                  onClick={() => setDiscountValue((prev) => prev + ".")}
                  disabled={
                    discountValue.includes(".") || discountType === "percentage"
                  }
                  className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 text-2xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  .
                </button>
                <button
                  onClick={() => setDiscountValue((prev) => prev + "0")}
                  className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 text-2xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  onClick={() => setDiscountValue((prev) => prev.slice(0, -1))}
                  className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xl font-bold py-6 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  ⌫
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDiscountModal(false);
                    setDiscountValue("");
                    setDiscountType("percentage");
                  }}
                  className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold text-lg transition-all active:scale-95"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleApplyDiscount}
                  disabled={!discountValue || parseFloat(discountValue) <= 0}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Εφαρμογή
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Mobile/Tablet Only) */}
      <button
        onClick={() => setShowMobileCart(true)}
        className="lg:hidden fixed bottom-4 left-4 bg-amber-500 hover:bg-amber-600 text-white rounded-full p-4 shadow-lg z-40 flex items-center gap-2"
      >
        <FaShoppingCart size={24} />
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {cart.length}
          </span>
        )}
      </button>

      {/* Mobile Cart Drawer */}
      {showMobileCart && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMobileCart(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaShoppingCart className="text-amber-500" />
                Καλάθι Αγορών
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm font-medium">
                  {cart.length}
                </span>
              </h2>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaShoppingCart className="mx-auto text-4xl mb-2 text-gray-300" />
                  <p>Το καλάθι είναι άδειο</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800 text-sm flex-1">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.id,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                        >
                          <FaMinus size={10} />
                        </button>
                        <span className="font-medium text-sm w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateCartItemQuantity(item.id, item.quantity + 1)
                          }
                          className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                        >
                          <FaPlus size={10} />
                        </button>
                      </div>
                      <span className="font-bold text-amber-600">
                        €{item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Υποσύνολο:</span>
                    <span className="font-medium">
                      €{cartTotals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ΦΠΑ:</span>
                    <span className="font-medium">
                      €{cartTotals.vatAmount.toFixed(2)}
                    </span>
                  </div>
                  {/* Discount Display */}
                  {appliedDiscount && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>
                        Έκπτωση (
                        {appliedDiscount.type === "percentage"
                          ? `${appliedDiscount.value}%`
                          : "€" + appliedDiscount.value}
                        ):
                      </span>
                      <span>-€{appliedDiscount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Σύνολο:</span>
                    <span className="text-amber-600">
                      €{cartTotals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Discount Button */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaPercent size={12} />
                    Έκπτωση
                  </button>
                  {appliedDiscount && (
                    <button
                      onClick={handleRemoveDiscount}
                      className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                      title="Αφαίρεση έκπτωσης"
                    >
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      clearCart();
                      setAppliedDiscount(null); // Reset discount when clearing cart
                      setShowMobileCart(false);
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <FaTrash size={14} />
                    Καθαρισμός
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileCart(false);
                      handleCheckout();
                    }}
                    disabled={isProcessing}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <FaSpinner className="animate-spin" size={14} />
                        Επεξεργασία...
                      </>
                    ) : (
                      <>
                        <FaReceipt size={14} />
                        Έκδοση
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Caller ID Widget */}
      <CallerIdWidget />

      {/* Quantity Input Modal */}
      {quantityModalProduct && (
        <QuantityInputModal
          isOpen={showQuantityModal}
          onClose={() => {
            setShowQuantityModal(false);
            setQuantityModalProduct(null);
          }}
          onConfirm={handleQuantityConfirm}
          productName={quantityModalProduct.name}
          quantityType={quantityModalProduct.quantityType}
          pricePerUnit={getProductPrice(
            quantityModalProduct,
            selectedPriceList
          )}
        />
      )}
    </div>
  );
};

export default POSSystem;
