"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, type CustomerUser } from "@/utils/auth";
import { CustomerAddress } from "@/types/customer";
import {
  collection,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FaCreditCard,
  FaMoneyBillWave,
  FaUniversity,
  FaPaypal,
  FaApple,
  FaShoppingCart,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSignInAlt,
  FaUserPlus,
  FaPlus,
  FaTrash,
  FaHome,
  FaBriefcase,
  FaEdit,
} from "react-icons/fa";
import DeliveryMapChecker from "@/components/DeliveryMapChecker";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

// Simple toast system (no alerts)
const toast = {
  success: (message: string) => {},
  error: (message: string) => {},
};

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    description: string;
    image?: string;
  };
  quantity: number;
  basePrice: number;
  selectedOptions: {
    groupId: string;
    optionId: string;
    name?: string;
    price: number;
  }[];
  notes: string;
  totalPrice: number;
  vatRate?: number; // ΦΠΑ από τον τιμοκατάλογο (π.χ. 0.24 για 24%)
}

interface CustomerInfo {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  selectedAddressId?: string;
  newAddress?: CustomerAddress;
}

interface PaymentSettings {
  enabledMethods: {
    cashOnDelivery: boolean;
    creditCard: boolean;
    iris: boolean;
    paypal: boolean;
    applePay: boolean;
  };
  vivaWallet: {
    enabled: boolean;
    testMode: boolean;
  };
}

// Check if store is currently open based on weekly hours
function isStoreCurrentlyOpen(weeklyHours: any): boolean {
  if (!weeklyHours) return true;
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const hours = weeklyHours[dayKey];
  if (!hours || !hours.isOpen) return false;
  const [startH, startM] = (hours.start || "00:00").split(":").map(Number);
  const [endH, endM] = (hours.end || "23:59").split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM;
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { websiteSettings, isLoaded: settingsLoaded } = useWebsiteSettings();

  // State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(null);
  const [userAddresses, setUserAddresses] = useState<CustomerAddress[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    selectedAddressId: "",
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Delivery settings state
  const [deliverySettings, setDeliverySettings] = useState<{
    radius: number;
    fee: number;
    enableDistanceValidation?: boolean;
  } | null>(null);
  const [storeAddress, setStoreAddress] = useState<string>("");
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(
    null,
  );
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);

  // Awaiting acceptance state (for card/iris orders)
  const [awaitingAcceptance, setAwaitingAcceptance] = useState(false);
  const [awaitingOrderId, setAwaitingOrderId] = useState<string | null>(null);
  const [acceptanceStatus, setAcceptanceStatus] = useState<"waiting" | "accepted" | "rejected" | "payment_failed">("waiting");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string>("");

  // Address management functions
  const addNewAddress = () => {
    const newAddress: CustomerAddress = {
      id: Date.now().toString(),
      label: "Νέα Διεύθυνση",
      street: "",
      city: "",
      postalCode: "",
      country: "Ελλάδα",
      floor: "",
      doorbell: "",
      notes: "",
      isDefault: userAddresses.length === 0,
    };

    setCustomerInfo((prev) => ({
      ...prev,
      newAddress: newAddress,
      selectedAddressId: "new",
    }));
    setShowAddressForm(true);
  };

  // Load delivery settings
  const loadDeliverySettings = async () => {
    try {
      const response = await fetch("/api/delivery/settings");
      if (response.ok) {
        const data = await response.json();
        setDeliverySettings(data.deliverySettings);

        // Construct store address
        const address = `${data.contactInfo.address.street}, ${data.contactInfo.address.city}, ${data.contactInfo.address.postalCode}`;
        setStoreAddress(address);
      }
    } catch (error) {
      console.error("Error loading delivery settings:", error);
    }
  };

  // Handle delivery check result
  const handleDeliveryCheck = (available: boolean, distance?: number) => {
    setDeliveryAvailable(available);
    setDeliveryDistance(distance || null);
  };

  // Get current customer address for map
  const getCurrentCustomerAddress = () => {
    if (customerInfo.selectedAddressId === "new" && customerInfo.newAddress) {
      // New address being created
      const addr = customerInfo.newAddress;
      if (addr.street && addr.city) {
        return `${addr.street}, ${addr.city}, ${addr.postalCode || ""}`;
      }
    } else if (customerInfo.selectedAddressId && userAddresses.length > 0) {
      // Existing saved address
      const selectedAddress = userAddresses.find(
        (addr) => addr.id === customerInfo.selectedAddressId,
      );
      if (selectedAddress) {
        return `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.postalCode}`;
      }
    }
    return "";
  };

  // Load payment settings from context (fast - already cached)
  useEffect(() => {
    if (settingsLoaded && websiteSettings) {
      setPaymentSettings(websiteSettings.paymentSettings || null);
      if (websiteSettings.paymentSettings?.enabledMethods?.cashOnDelivery) {
        setSelectedPaymentMethod("cashOnDelivery");
      } else if (websiteSettings.paymentSettings?.enabledMethods?.creditCard) {
        setSelectedPaymentMethod("creditCard");
      }
    }
  }, [settingsLoaded, websiteSettings]);

  // Store hours check
  const storeOpen = isStoreCurrentlyOpen(websiteSettings?.deliverySettings?.weeklyHours);

  // Φόρτωση δεδομένων
  useEffect(() => {
    checkUserAuthentication();
    loadCartFromStorage();
    loadDeliverySettings();
  }, []);

  // Reset delivery check when address changes
  useEffect(() => {
    setDeliveryAvailable(null);
    setDeliveryDistance(null);
  }, [
    customerInfo.selectedAddressId,
    customerInfo.newAddress?.street,
    customerInfo.newAddress?.city,
  ]);

  const checkUserAuthentication = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);

        // Load full customer data from Firebase
        const customersRef = collection(db, "customers");
        const q = query(customersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const customerDoc = querySnapshot.docs[0];
          const customerData = customerDoc.data();

          // Set customer info
          setCustomerInfo({
            id: user.id,
            firstName: customerData.firstName || "",
            lastName: customerData.lastName || "",
            email: customerData.email || "",
            phone: customerData.phone || "",
            selectedAddressId: "",
          });

          // Set addresses
          if (customerData.addresses && customerData.addresses.length > 0) {
            setUserAddresses(customerData.addresses);
            // Auto-select default address if exists
            const defaultAddress = customerData.addresses.find(
              (addr: CustomerAddress) => addr.isDefault,
            );
            if (defaultAddress) {
              setCustomerInfo((prev) => ({
                ...prev,
                selectedAddressId: defaultAddress.id,
              }));
            }
          } else {
            // No addresses - show address form automatically
            setUserAddresses([]);
            setShowAddressForm(false); // Show button first
          }
        } else {
          // No customer record found - use basic user data
          setCustomerInfo({
            id: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
            selectedAddressId: "",
          });
          setUserAddresses([]);
          setShowAddressForm(false); // Show button first
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // Payment settings now loaded from WebsiteSettingsContext (see useEffect above)

  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem("customerCart");
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      } else {
        // Redirect to menu if cart is empty
        router.push("/menu");
      }
    } catch (error) {
      router.push("/menu");
    }
  };

  // Υπολογισμοί
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartSubtotal = () => {
    // Οι τιμές των προϊόντων είναι ΜΕ ΦΠΑ - υπολογίζουμε το καθαρό ποσό
    return cartItems.reduce((totalSubtotal, item) => {
      // Το vatRate μπορεί να είναι σε δεκαδική μορφή (0.24) ή ποσοστό (24)
      let vatRate = item.vatRate || 24; // Default 24% αν δεν υπάρχει
      // Αν είναι μεγαλύτερο από 1, το μετατρέπουμε σε δεκαδικό
      if (vatRate > 1) {
        vatRate = vatRate / 100;
      }
      // Υπολογισμός καθαρού ποσού από τιμή με ΦΠΑ
      const itemSubtotal = item.totalPrice / (1 + vatRate);
      return totalSubtotal + itemSubtotal;
    }, 0);
  };

  const getCartVAT = () => {
    // Υπολογισμός ΦΠΑ από τη διαφορά μεταξύ συνόλου και καθαρού
    return getCartTotal() - getCartSubtotal();
  };

  const deliveryFee = deliverySettings?.fee ?? 0;
  const finalTotal = getCartSubtotal() + getCartVAT() + deliveryFee;

  // Συνάρτηση για να βρίσκει τα μοναδικά ποσοστά ΦΠΑ στο καλάθι
  const getVATRatesUsed = () => {
    const vatRates = new Set<number>();
    cartItems.forEach((item) => {
      let vatRate = item.vatRate || 24;
      if (vatRate > 1) {
        vatRate = vatRate / 100;
      }
      vatRates.add(vatRate * 100); // Μετατροπή σε ποσοστό για εμφάνιση
    });
    return Array.from(vatRates).sort();
  };

  const saveNewAddress = async () => {
    if (!customerInfo.newAddress || !currentUser) return;

    const address = customerInfo.newAddress;
    if (!address.street.trim() || !address.city.trim()) {
      setErrors({ address: "Παρακαλώ συμπληρώστε τη διεύθυνση και την πόλη" });
      return;
    }

    try {
      // Update user addresses in Firebase
      const customersRef = collection(db, "customers");
      const q = query(customersRef, where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        const updatedAddresses = [...userAddresses, address];

        await updateDoc(doc(db, "customers", customerDoc.id), {
          addresses: updatedAddresses,
          updatedAt: new Date(),
        });

        setUserAddresses(updatedAddresses);
        setCustomerInfo((prev) => ({
          ...prev,
          selectedAddressId: address.id,
          newAddress: undefined,
        }));
        setShowAddressForm(false);
        setErrors({});
      }
    } catch (error) {
      console.error("Error saving address:", error);
      setErrors({ address: "Σφάλμα κατά την αποθήκευση της διεύθυνσης" });
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.firstName.trim()) {
      newErrors.firstName = "Το όνομα είναι υποχρεωτικό";
    }

    if (!customerInfo.lastName.trim()) {
      newErrors.lastName = "Το επώνυμο είναι υποχρεωτικό";
    }

    if (!customerInfo.email.trim()) {
      newErrors.email = "Το email είναι υποχρεωτικό";
    } else if (!/\S+@\S+\.\S+/.test(customerInfo.email)) {
      newErrors.email = "Μη έγκυρο email";
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = "Το τηλέφωνο είναι υποχρεωτικό";
    }

    // Address validation
    if (!customerInfo.selectedAddressId) {
      newErrors.address = "Παρακαλώ επιλέξτε ή προσθέστε μια διεύθυνση";
    } else if (
      customerInfo.selectedAddressId === "new" &&
      customerInfo.newAddress
    ) {
      if (!customerInfo.newAddress.street.trim()) {
        newErrors.address = "Η διεύθυνση είναι υποχρεωτική";
      }
      if (!customerInfo.newAddress.city.trim()) {
        newErrors.city = "Η πόλη είναι υποχρεωτική";
      }
    }

    if (!selectedPaymentMethod) {
      newErrors.paymentMethod = "Επιλέξτε μέθοδο πληρωμής";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Διαχείριση πληρωμής
  const handlePayment = async () => {
    if (!storeOpen) return;

    if (!validateForm()) {
      toast.error("Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία");
      return;
    }

    setProcessing(true);

    try {
      if (selectedPaymentMethod === "cashOnDelivery") {
        // Πληρωμή στον διανομέα - αποθήκευση παραγγελίας
        await saveCashOrder();
      } else if (
        selectedPaymentMethod === "creditCard" ||
        selectedPaymentMethod === "iris"
      ) {
        // Card/Iris: πρώτα αποδοχή, μετά πληρωμή
        await createOrderAwaitingAcceptance();
      } else {
        toast.error("Η επιλεγμένη μέθοδος πληρωμής δεν είναι διαθέσιμη");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Σφάλμα κατά την επεξεργασία της πληρωμής";
      console.error("[Checkout] Payment error:", msg);
      toast.error(msg);
    } finally {
      if (!awaitingAcceptance) {
        setProcessing(false);
      }
    }
  };

  const saveCashOrder = async () => {
    try {
      // Get selected address
      const selectedAddress = userAddresses.find(
        (addr: CustomerAddress) => addr.id === customerInfo.selectedAddressId,
      );

      // Prepare delivery address
      const deliveryAddress = selectedAddress
        ? {
            street: selectedAddress.street,
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
            floor: selectedAddress.floor || "",
            doorbell: selectedAddress.doorbell || "",
            notes: selectedAddress.notes || "",
          }
        : customerInfo.newAddress;

      // Transform cart items to match API format
      const formattedCartItems = cartItems.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.basePrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        vatRate: item.vatRate || 24,
        notes: item.notes || "",
        selectedOptions: item.selectedOptions.map((opt) => ({
          groupName: opt.name || "",
          name: opt.name || "",
          price: opt.price,
        })),
      }));

      // Create order via API
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerInfo,
          cartItems: formattedCartItems,
          paymentMethod: selectedPaymentMethod || "cashOnDelivery",
          subtotal: getCartSubtotal(),
          vat: getCartVAT(),
          deliveryFee,
          total: finalTotal,
          deliveryAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(
          errorData.details ||
            errorData.error ||
            "Σφάλμα δημιουργίας παραγγελίας",
        );
      }

      const { orderId } = await response.json();

      // Καθαρισμός καλαθιού
      localStorage.removeItem("customerCart");
      window.dispatchEvent(new Event("cartUpdated"));

      // Αποθήκευση του orderId στο localStorage για άμεση πρόσβαση
      localStorage.setItem("activeOrderId", orderId);
      localStorage.setItem("newOrderCreated", "true");

      // Redirect αμέσως - το OrderTrackingIcon θα το πιάσει
      router.push("/");
    } catch (error: any) {
      console.error("Error saving order:", error);
      console.error("Error message:", error.message);
      toast.error(
        error.message || "Σφάλμα κατά την αποθήκευση της παραγγελίας",
      );
      throw error;
    }
  };

  const processVivaWalletPayment = async () => {
    try {
      // Prepare delivery address (ίδια λογική με saveCashOrder)
      const selectedAddress = userAddresses.find(
        (addr: CustomerAddress) => addr.id === customerInfo.selectedAddressId,
      );
      const deliveryAddress = selectedAddress
        ? {
            street: selectedAddress.street,
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
            floor: selectedAddress.floor || "",
            doorbell: selectedAddress.doorbell || "",
            notes: selectedAddress.notes || "",
          }
        : customerInfo.newAddress;

      // Transform cart items
      const formattedCartItems = cartItems.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.basePrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        vatRate: item.vatRate || 24,
        notes: item.notes || "",
        selectedOptions: item.selectedOptions.map((opt) => ({
          groupName: opt.name || "",
          name: opt.name || "",
          price: opt.price,
        })),
      }));

      // Δημιουργία payment order + pending order στο Firestore
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalTotal,
          customerInfo,
          paymentMethod: selectedPaymentMethod || "creditCard",
          subtotal: getCartSubtotal(),
          vat: getCartVAT(),
          deliveryFee,
          deliveryAddress,
          cartItems: formattedCartItems,
          orderDetails: {
            description: `Παραγγελία ${cartItems.length} προϊόντων`,
            tags: ["website-order", selectedPaymentMethod],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Σφάλμα δημιουργίας παραγγελίας");
      }

      const { checkoutUrl, orderCode } = await response.json();

      // Backup στο localStorage
      localStorage.setItem(
        "pendingOrder",
        JSON.stringify({
          orderCode,
          customerInfo,
          cartItems: formattedCartItems,
          total: finalTotal,
          subtotal: getCartSubtotal(),
          vat: getCartVAT(),
          deliveryFee,
          deliveryAddress,
          paymentMethod: selectedPaymentMethod,
        }),
      );

      // Redirect στο Viva Wallet
      window.location.href = checkoutUrl;
    } catch (error) {
      throw error;
    }
  };

  // NEW: Create order first, wait for acceptance, then proceed to payment
  const createOrderAwaitingAcceptance = async () => {
    try {
      // Prepare delivery address (same logic as saveCashOrder)
      const selectedAddress = userAddresses.find(
        (addr: CustomerAddress) => addr.id === customerInfo.selectedAddressId,
      );
      const deliveryAddress = selectedAddress
        ? {
            street: selectedAddress.street,
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
            floor: selectedAddress.floor || "",
            doorbell: selectedAddress.doorbell || "",
            notes: selectedAddress.notes || "",
          }
        : customerInfo.newAddress;

      // Transform cart items
      const formattedCartItems = cartItems.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.basePrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        vatRate: item.vatRate || 24,
        notes: item.notes || "",
        selectedOptions: item.selectedOptions.map((opt) => ({
          groupName: opt.name || "",
          name: opt.name || "",
          price: opt.price,
        })),
      }));

      // Create order with paymentStatus "awaiting_acceptance" (NO payment yet)
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerInfo,
          cartItems: formattedCartItems,
          paymentMethod: selectedPaymentMethod,
          paymentStatus: "awaiting_acceptance",
          subtotal: getCartSubtotal(),
          vat: getCartVAT(),
          deliveryFee,
          total: finalTotal,
          deliveryAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Σφάλμα δημιουργίας παραγγελίας");
      }

      const { orderId } = await response.json();

      // Show waiting screen
      setAwaitingOrderId(orderId);
      setAwaitingAcceptance(true);
      setAcceptanceStatus("waiting");
      setProcessing(false);

      // Listen for status changes on this order
      const unsubscribe = onSnapshot(doc(db, "orders", orderId), async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const status = data.status;

        if (status === "accepted") {
          // Order accepted! Proceed to Viva payment
          unsubscribe();
          setAcceptanceStatus("accepted");

          try {
            // Create Viva payment order
            const payResponse = await fetch("/api/payments/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: finalTotal,
                customerInfo,
                paymentMethod: selectedPaymentMethod,
                subtotal: getCartSubtotal(),
                vat: getCartVAT(),
                deliveryFee,
                deliveryAddress,
                cartItems: formattedCartItems,
                existingOrderId: orderId, // Pass existing order ID
                orderDetails: {
                  description: `Παραγγελία ${cartItems.length} προϊόντων`,
                  tags: ["website-order", selectedPaymentMethod],
                },
              }),
            });

            if (!payResponse.ok) {
              const errData = await payResponse.json().catch(() => ({}));
              throw new Error(errData.error || "Σφάλμα δημιουργίας πληρωμής");
            }

            const { checkoutUrl, orderCode } = await payResponse.json();

            // Backup to localStorage
            localStorage.setItem(
              "pendingOrder",
              JSON.stringify({
                orderCode,
                existingOrderId: orderId,
                customerInfo,
                cartItems: formattedCartItems,
                total: finalTotal,
                subtotal: getCartSubtotal(),
                vat: getCartVAT(),
                deliveryFee,
                deliveryAddress,
                paymentMethod: selectedPaymentMethod,
              }),
            );

            // Redirect to Viva Wallet checkout
            window.location.href = checkoutUrl;
          } catch (payError) {
            const errMsg = payError instanceof Error ? payError.message : "Σφάλμα πληρωμής";
            console.error("Error creating payment:", errMsg);
            setPaymentErrorMsg(errMsg);
            setAcceptanceStatus("payment_failed");
          }
        } else if (status === "cancelled") {
          // Order rejected
          unsubscribe();
          setAcceptanceStatus("rejected");
          setRejectionReason(data.cancellationReason || "Η παραγγελία απορρίφθηκε από το κατάστημα");
        }
      });
    } catch (error) {
      console.error("Error creating order for acceptance:", error);
      throw error;
    }
  };

  // Render payment methods
  const renderPaymentMethods = () => {
    if (!paymentSettings) return null;

    const methods = [];

    if (paymentSettings.enabledMethods.cashOnDelivery) {
      methods.push({
        id: "cashOnDelivery",
        name: "Πληρωμή στον Διανομέα",
        icon: <FaMoneyBillWave className="text-green-600" />,
        description: "Πληρώστε με μετρητά κατά την παράδοση",
      });
    }

    if (
      paymentSettings.enabledMethods.creditCard &&
      paymentSettings.vivaWallet.enabled
    ) {
      methods.push({
        id: "creditCard",
        name: "Πληρωμή με Κάρτα",
        icon: <FaCreditCard className="text-blue-600" />,
        description: "Ασφαλής πληρωμή με κάρτα μέσω Viva Wallet",
      });
    }

    // IRIS, PayPal, Apple Pay are included in Viva Smart Checkout automatically
    // No need for separate options

    return methods.map((method) => (
      <div
        key={method.id}
        className={`border rounded-lg p-4 cursor-pointer transition-all ${
          selectedPaymentMethod === method.id
            ? "border-[#8B7355] bg-gray-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => setSelectedPaymentMethod(method.id)}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{method.icon}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">{method.name}</h3>
            <p className="text-sm text-gray-600">{method.description}</p>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedPaymentMethod === method.id}
              onChange={() => setSelectedPaymentMethod(method.id)}
              className="w-4 h-4 text-[#8B7355]"
            />
          </div>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-[#8B7355] mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaShoppingCart className="text-6xl text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Το καλάθι σας είναι άδειο
          </h2>
          <p className="text-gray-600 mb-6">
            Προσθέστε προϊόντα για να συνεχίσετε
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#8B7355] hover:bg-[#A0826D] text-white px-6 py-3 rounded-lg font-semibold"
          >
            Επιστροφή στο Κατάστημα
          </button>
        </div>
      </div>
    );
  }

  // Check if user needs to login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <FaShoppingCart className="mx-auto text-6xl text-[#8B7355] mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Σύνδεση Απαιτείται
            </h1>
            <p className="text-gray-600 mb-6">
              Για να ολοκληρώσετε την παραγγελία σας, παρακαλώ συνδεθείτε ή
              δημιουργήστε έναν λογαριασμό.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-[#8B7355] hover:bg-[#A0826D] text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              <FaSignInAlt />
              Σύνδεση
            </Link>

            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 border border-[#8B7355] text-[#8B7355] hover:bg-gray-50 py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              <FaUserPlus />
              Δημιουργία Λογαριασμού
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for acceptance screen (card/iris orders)
  if (awaitingAcceptance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          {acceptanceStatus === "waiting" && (
            <div className="text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <FaSpinner className="animate-spin text-5xl text-[#C9AC7A] absolute inset-0 m-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Αναμονή Αποδοχής
              </h2>
              <p className="text-gray-600 mb-6">
                Η παραγγελία σας στάλθηκε στο κατάστημα. Παρακαλώ περιμένετε την αποδοχή για να προχωρήσετε στην πληρωμή.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Σημείωση:</strong> Μην κλείνετε αυτή τη σελίδα. Θα ενημερωθείτε αυτόματα μόλις γίνει αποδοχή.
                </p>
              </div>
            </div>
          )}

          {acceptanceStatus === "accepted" && (
            <div className="text-center">
              <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Παραγγελία Αποδεκτή!
              </h2>
              <p className="text-gray-600 mb-4">
                Μεταφορά στη σελίδα πληρωμής...
              </p>
              <FaSpinner className="animate-spin text-2xl text-[#C9AC7A] mx-auto" />
            </div>
          )}

          {acceptanceStatus === "rejected" && (
            <div className="text-center">
              <FaExclamationTriangle className="text-6xl text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Η παραγγελία δεν έγινε αποδεκτή
              </h2>
              <p className="text-gray-600 mb-4">
                {rejectionReason || "Το κατάστημα δεν μπόρεσε να αποδεχτεί την παραγγελία σας αυτή τη στιγμή."}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Δεν έχει γίνει καμία χρέωση.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setAwaitingAcceptance(false);
                    setAcceptanceStatus("waiting");
                    setAwaitingOrderId(null);
                  }}
                  className="w-full bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Δοκιμάστε Ξανά
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full text-gray-600 hover:text-gray-800 underline"
                >
                  Επιστροφή στην Αρχική
                </button>
              </div>
            </div>
          )}

          {acceptanceStatus === "payment_failed" && (
            <div className="text-center">
              <FaExclamationTriangle className="text-6xl text-orange-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Σφάλμα Πληρωμής
              </h2>
              <p className="text-gray-600 mb-4">
                Η παραγγελία εγκρίθηκε αλλά υπήρξε πρόβλημα με τη σελίδα πληρωμής. Παρακαλώ δοκιμάστε ξανά.
              </p>
              {paymentErrorMsg && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
                  {paymentErrorMsg}
                </p>
              )}
              <button
                onClick={() => router.push("/checkout")}
                className="w-full bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Δοκιμάστε Ξανά
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-black text-white py-12 mb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <FaShoppingCart className="mx-auto text-5xl mb-4 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Ολοκλήρωση Παραγγελίας
            </h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Συμπληρώστε τα στοιχεία σας για να ολοκληρώσετε την παραγγελία σας
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Στοιχεία Πελάτη */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Customer Information & Address - Merged */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200 animate-slide-in-left">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="bg-gradient-to-br from-[#8B7355] to-[#A0826D] p-2 sm:p-3 rounded-xl">
                  <FaUser className="text-white text-lg sm:text-xl" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Στοιχεία Πελάτη & Διεύθυνση
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Συμπληρώστε τα στοιχεία σας
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Όνομα *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.firstName}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                      errors.firstName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Όνομα"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Επώνυμο *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.lastName}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                      errors.lastName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Επώνυμο"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="example@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Τηλέφωνο *
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="69xxxxxxxx"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Section - Inside same card */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FaMapMarkerAlt className="text-[#8B7355] text-base" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">
                    Διεύθυνση Παράδοσης
                  </h3>
                </div>

                {userAddresses.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <FaMapMarkerAlt className="mx-auto text-3xl mb-2" />
                    <p className="text-sm mb-3">
                      Δεν έχετε καμία αποθηκευμένη διεύθυνση
                    </p>
                    {!showAddressForm && (
                      <button
                        onClick={addNewAddress}
                        className="bg-[#8B7355] hover:bg-[#A0826D] text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Προσθήκη Διεύθυνσης
                      </button>
                    )}
                  </div>
                )}

                {userAddresses.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {userAddresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          customerInfo.selectedAddressId === address.id
                            ? "border-[#8B7355] bg-gray-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          setCustomerInfo((prev) => ({
                            ...prev,
                            selectedAddressId: address.id,
                          }))
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {address.label === "Σπίτι" && (
                              <FaHome className="text-blue-500" />
                            )}
                            {address.label === "Γραφείο" && (
                              <FaBriefcase className="text-green-500" />
                            )}
                            {!["Σπίτι", "Γραφείο"].includes(address.label) && (
                              <FaMapMarkerAlt className="text-gray-500" />
                            )}
                            <span className="text-sm font-medium">
                              {address.label}
                            </span>
                            {address.isDefault && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                Προεπιλογή
                              </span>
                            )}
                          </div>
                          <input
                            type="radio"
                            name="selectedAddress"
                            checked={
                              customerInfo.selectedAddressId === address.id
                            }
                            onChange={() => {}}
                            className="w-4 h-4 text-[#8B7355]"
                          />
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          <p>{address.street}</p>
                          <p>
                            {address.city} {address.postalCode}
                          </p>
                          {address.floor && <p>Όροφος: {address.floor}</p>}
                          {address.doorbell && (
                            <p>Κουδούνι: {address.doorbell}</p>
                          )}
                          {address.notes && (
                            <p className="text-gray-500 italic">
                              {address.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showAddressForm && customerInfo.newAddress && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">
                      Νέα Διεύθυνση
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Ετικέτα
                        </label>
                        <input
                          type="text"
                          value={customerInfo.newAddress.label}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? { ...prev.newAddress, label: e.target.value }
                                : undefined,
                            }))
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                          placeholder="π.χ. Σπίτι, Γραφείο"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Διεύθυνση *
                        </label>
                        <input
                          type="text"
                          value={customerInfo.newAddress.street}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? { ...prev.newAddress, street: e.target.value }
                                : undefined,
                            }))
                          }
                          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-[#C9AC7A] ${
                            errors.address
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Οδός, αριθμός"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Πόλη *
                        </label>
                        <input
                          type="text"
                          value={customerInfo.newAddress.city}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? { ...prev.newAddress, city: e.target.value }
                                : undefined,
                            }))
                          }
                          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-[#C9AC7A] ${
                            errors.city ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Πόλη"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Τ.Κ.
                        </label>
                        <input
                          type="text"
                          value={customerInfo.newAddress.postalCode}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? {
                                    ...prev.newAddress,
                                    postalCode: e.target.value,
                                  }
                                : undefined,
                            }))
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                          placeholder="Τ.Κ."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Όροφος
                        </label>
                        <input
                          type="text"
                          value={customerInfo.newAddress.floor || ""}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? { ...prev.newAddress, floor: e.target.value }
                                : undefined,
                            }))
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                          placeholder="π.χ. 2ος"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Κουδούνι
                        </label>
                        <input
                          type="text"
                          value={customerInfo.newAddress.doorbell || ""}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? {
                                    ...prev.newAddress,
                                    doorbell: e.target.value,
                                  }
                                : undefined,
                            }))
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                          placeholder="π.χ. Α2, Παπαδόπουλος"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Σημειώσεις
                        </label>
                        <textarea
                          value={customerInfo.newAddress.notes || ""}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({
                              ...prev,
                              newAddress: prev.newAddress
                                ? { ...prev.newAddress, notes: e.target.value }
                                : undefined,
                            }))
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                          placeholder="Επιπλέον οδηγίες παράδοσης..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={saveNewAddress}
                        className="bg-[#8B7355] hover:bg-[#A0826D] text-white px-3 py-1.5 rounded text-sm font-medium"
                      >
                        Αποθήκευση
                      </button>
                      <button
                        onClick={() => {
                          setShowAddressForm(false);
                          setCustomerInfo((prev) => ({
                            ...prev,
                            newAddress: undefined,
                            selectedAddressId:
                              userAddresses.length > 0
                                ? userAddresses[0].id
                                : "",
                          }));
                        }}
                        className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded text-sm font-medium"
                      >
                        Ακύρωση
                      </button>
                    </div>
                  </div>
                )}

                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                )}
              </div>
            </div>

            {/* Delivery Map - only show when distance validation is enabled */}
            {deliverySettings &&
              storeAddress &&
              deliverySettings.enableDistanceValidation !== false && (
                <div
                  className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200 animate-slide-in-left"
                  style={{ animationDelay: "0.15s" }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                    <div className="bg-gradient-to-br from-[#8B7355] to-[#A0826D] p-2 sm:p-3 rounded-xl">
                      <FaMapMarkerAlt className="text-white text-lg sm:text-xl" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                        Έλεγχος Ζώνης Παράδοσης
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Επιβεβαιώστε ότι παραδίδουμε στην περιοχή σας
                      </p>
                    </div>
                  </div>
                  <DeliveryMapChecker
                    storeAddress={storeAddress}
                    deliveryRadius={deliverySettings.radius}
                    onDeliveryCheck={handleDeliveryCheck}
                    customerAddress={getCurrentCustomerAddress()}
                  />

                  {deliveryAvailable === false && (
                    <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 font-medium text-sm sm:text-base">
                        <FaExclamationTriangle />
                        Μη Διαθέσιμη Παράδοση
                      </div>
                      <p className="text-red-700 text-xs sm:text-sm mt-1">
                        Η διεύθυνσή σας βρίσκεται εκτός της ζώνης παράδοσης (
                        {deliveryDistance}km &gt; {deliverySettings.radius}km).
                        Παρακαλώ επιλέξτε διαφορετική διεύθυνση ή επικοινωνήστε
                        μαζί μας.
                      </p>
                    </div>
                  )}

                  {deliveryAvailable === true && (
                    <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 font-medium text-sm sm:text-base">
                        <FaCheckCircle />
                        Διαθέσιμη Παράδοση
                      </div>
                      <p className="text-green-700 text-xs sm:text-sm mt-1">
                        Η διεύθυνσή σας βρίσκεται εντός της ζώνης παράδοσης
                        (απόσταση: {deliveryDistance}km). Κόστος παράδοσης: €
                        {deliverySettings.fee.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div
              className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200 lg:sticky lg:top-4 animate-slide-in-right"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                <div className="bg-gradient-to-br from-[#8B7355] to-[#A0826D] p-2 sm:p-3 rounded-xl">
                  <FaShoppingCart className="text-white text-lg sm:text-xl" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Σύνοψη
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {cartItems.length} προϊόντα
                  </p>
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-medium text-gray-800">
                        {item.product.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Ποσότητα: {item.quantity}
                      </p>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-xs text-gray-500">
                          +
                          {item.selectedOptions
                            .map((opt) => opt.name)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        €{item.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 sm:pt-4 space-y-2 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Υποσύνολο (χωρίς ΦΠΑ):</span>
                  <span className="font-semibold">
                    €{getCartSubtotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    ΦΠΑ ({getVATRatesUsed().join("%, ")}%):
                  </span>
                  <span className="font-semibold">
                    €{getCartVAT().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Κόστος Διανομής:</span>
                  <span className="font-semibold">
                    €{deliveryFee.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Σύνολο (με ΦΠΑ):</span>
                  <span className="text-[#8B7355]">
                    €{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <FaCreditCard className="text-[#8B7355] text-base sm:text-lg" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">
                    Μέθοδος Πληρωμής
                  </h3>
                </div>
                <div className="space-y-2">{renderPaymentMethods()}</div>
                {errors.paymentMethod && (
                  <p className="text-red-500 text-sm mt-2">
                    {errors.paymentMethod}
                  </p>
                )}
              </div>

              {!storeOpen && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <FaExclamationTriangle className="text-red-500 text-xl mx-auto mb-2" />
                  <p className="text-red-700 font-semibold">Το κατάστημα είναι κλειστό</p>
                  <p className="text-red-600 text-sm mt-1">Δεν μπορείτε να ολοκληρώσετε παραγγελία εκτός ωραρίου λειτουργίας.</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing || deliveryAvailable === false || !storeOpen}
                className="w-full mt-4 sm:mt-6 bg-[#8B7355] hover:bg-[#A0826D] disabled:bg-gray-400 text-white py-3 sm:py-4 px-4 rounded-lg text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {processing ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Επεξεργασία...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Ολοκλήρωση Παραγγελίας
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B7355] mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση...</p>
          </div>
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
