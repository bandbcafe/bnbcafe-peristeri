"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  FaBuilding,
  FaUsers,
  FaCog,
  FaShoppingCart,
  FaEnvelope,
  FaInfoCircle,
  FaPhone,
  FaMapMarkerAlt,
  FaIdCard,
  FaUpload,
  FaTrash,
  FaPlus,
  FaUserPlus,
  FaUserShield,
  FaKey,
  FaClock,
  FaPrint,
  FaSave,
  FaGlobe,
  FaPaperPlane,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaSearch,
  FaNetworkWired,
  FaTag,
  FaUser,
  FaLock,
  FaPlug,
  FaCheckCircle,
  FaTimesCircle,
  FaReceipt,
  FaSpinner,
  FaTable,
  FaCashRegister,
  FaTruck,
} from "react-icons/fa";
import WrappBillingBooksManager from "@/components/settings/wrapp-billing-books-manager";
import WrappComprehensiveSettings from "@/components/settings/wrapp-comprehensive-settings";
import WrappPOSDevicesManager from "@/components/settings/wrapp-pos-devices-manager";
import POSTabSettings from "@/components/settings/POSTabSettings";
import PrinterTabSettings from "@/components/settings/PrinterTabSettings";
import SystemTabSettings from "@/components/settings/SystemTabSettings";
import WoltSettings from "@/components/settings/WoltSettings";
import ProductCatalogExportImport from "@/components/settings/ProductCatalogExportImport";
import dynamic from "next/dynamic";

// Dynamic import για το restaurant layout component
const RestaurantLayoutSettings = dynamic(
  () => import("@/components/tables/page"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-2xl" />
      </div>
    ),
  },
);

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  pin: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
};

type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  requireTLS?: boolean;
  ignoreTLS?: boolean;
  rejectUnauthorized?: boolean;
};

type BusinessInfo = {
  storeName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  taxId: string;
  taxOffice: string;
  legalForm: string;
  logoUrl: string;
  logoBase64: string;
  operatingHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
};

type UserManagement = {
  roles: string[];
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireUppercase: boolean;
  passwordExpireIn: number;
  passwordLockAttempts: number;
  passwordRequireChange: boolean;
};

type TechnicalSettings = {
  printerKitchen: string;
  printerBar: string;
  receiptPrinter: string;
  labelPrinter: string;
  backupPrinter: string;
  enableNotifications: boolean;
  notificationSound: string;
  autoBackup: boolean;
  backupInterval: number;
  dataRetention: number;
  logLevel: string;
};

type OnlineOrdering = {
  enableOnlineOrders: boolean;
  orderPlatform: string;
  deliveryZones: string[];
  paymentMethods: string[];
  enableDeliveryTracking: boolean;
  autoAcceptOrders: boolean;
  minimumOrderAmount: number;
  deliveryRadius: number;
  enableOrderNotifications: boolean;
  orderNotificationSound: string;
};

type WrappSettings = {
  apiKey: string;
  email: string;
  wrappUserId: string;
  baseUrl: string;
  enableInvoicing: boolean;
  defaultBillingBookId: string;
  defaultInvoiceType: string;
  defaultPaymentMethod: number;
  defaultClassificationCategory: string;
  defaultClassificationType: string;
  defaultVatRate: number;
  // Φόροι & Τέλη
  municipalTaxRate: number; // Δημοτικό Τέλος (%)
  plasticTax: number; // Φόρος Πλαστικών Μιας Χρήσης (€)
  plasticBagTax: number; // Φόρος Σακούλας (€)
  showPlasticTaxButton: boolean; // Εμφάνιση κουμπιού φόρου πλαστικών
  showPlasticBagTaxButton: boolean; // Εμφάνιση κουμπιού φόρου σακουλών
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("business");
  // Technical settings sub-tabs
  const [technicalSubTab, setTechnicalSubTab] = useState("pos"); // pos, printer, system
  const [onlineOrderingTab, setOnlineOrderingTab] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [vatSearchLoading, setVatSearchLoading] = useState(false);
  const [vatSearchMessage, setVatSearchMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // User Management States
  const [users, setUsers] = useState<User[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    pin: "",
    password: "",
    confirmPassword: "",
    isActive: true,
    permissions: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);

  // Role Management States
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<string[]>([]);
  const [showRestaurantLayoutSettings, setShowRestaurantLayoutSettings] =
    useState(false);

  // Available permissions
  const allPermissions = [
    "create_orders",
    "edit_orders",
    "delete_orders",
    "view_reports",
    "manage_users",
    "manage_settings",
    "manage_inventory",
    "process_payments",
    "view_analytics",
    "export_data",
  ];

  // SMTP Settings
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    fromName: "",
    fromEmail: "",
    requireTLS: false,
    ignoreTLS: false,
    rejectUnauthorized: true,
  });

  // Business Information
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    storeName: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    taxId: "",
    taxOffice: "",
    legalForm: "",
    logoUrl: "",
    logoBase64: "",
    operatingHours: {
      monday: { open: "08:00", close: "22:00", closed: false },
      tuesday: { open: "08:00", close: "22:00", closed: false },
      wednesday: { open: "08:00", close: "22:00", closed: false },
      thursday: { open: "08:00", close: "22:00", closed: false },
      friday: { open: "08:00", close: "22:00", closed: false },
      saturday: { open: "09:00", close: "23:00", closed: false },
      sunday: { open: "10:00", close: "21:00", closed: true },
    },
  });

  // User Management
  const [userManagement, setUserManagement] = useState<UserManagement>({
    roles: [],
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireSpecial: false,
    passwordRequireNumbers: false,
    passwordRequireUppercase: false,
    passwordExpireIn: 90,
    passwordLockAttempts: 3,
    passwordRequireChange: false,
  });

  // Technical Settings
  const [technicalSettings, setTechnicalSettings] = useState<TechnicalSettings>(
    {
      printerKitchen: "",
      printerBar: "",
      receiptPrinter: "",
      labelPrinter: "",
      backupPrinter: "",
      enableNotifications: false,
      notificationSound: "",
      autoBackup: false,
      backupInterval: 24,
      dataRetention: 30,
      logLevel: "info",
    },
  );

  // Online Ordering
  const [onlineOrdering, setOnlineOrdering] = useState<OnlineOrdering>({
    enableOnlineOrders: false,
    orderPlatform: "",
    deliveryZones: [],
    paymentMethods: [],
    enableDeliveryTracking: false,
    autoAcceptOrders: false,
    minimumOrderAmount: 0,
    deliveryRadius: 0,
    enableOrderNotifications: false,
    orderNotificationSound: "",
  });

  // Wrapp API Settings
  const [wrappSettings, setWrappSettings] = useState<WrappSettings>({
    apiKey: "",
    email: "",
    wrappUserId: "",
    baseUrl: "https://staging.wrapp.ai/api/v1",
    enableInvoicing: false,
    defaultBillingBookId: "",
    defaultInvoiceType: "11.1",
    defaultPaymentMethod: 0,
    defaultClassificationCategory: "category1_1",
    defaultClassificationType: "E3_106",
    defaultVatRate: 24,
    municipalTaxRate: 0.5, // Δημοτικό Τέλος 0.5%
    plasticTax: 0, // Φόρος Πλαστικών Μιας Χρήσης (ανά προϊόν)
    plasticBagTax: 0.04, // Φόρος Σακούλας €0.04
    showPlasticTaxButton: true, // Εμφάνιση κουμπιού φόρου πλαστικών
    showPlasticBagTaxButton: true, // Εμφάνιση κουμπιού φόρου σακουλών
  });

  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    error?: string;
    userInfo?: {
      email: string;
      userId: string;
    };
  } | null>(null);

  // Test Wrapp API connection
  const testWrappConnection = async () => {
    if (!wrappSettings.apiKey || !wrappSettings.email) {
      setConnectionStatus({
        success: false,
        error: "Παρακαλώ συμπληρώστε API Key και Email",
      });
      return;
    }

    setLoading(true);
    setConnectionStatus(null);

    try {
      // Use login endpoint to test credentials
      const response = await fetch("/api/wrapp/login", {
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

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          success: true,
          userInfo: {
            email: data.email || wrappSettings.email,
            userId: data.id || wrappSettings.wrappUserId || "N/A",
          },
        });
      } else if (response.status === 401) {
        setConnectionStatus({
          success: false,
          error: "Μη έγκυρο API Key - ελέγξτε τα στοιχεία σας",
        });
      } else if (response.status === 403) {
        setConnectionStatus({
          success: false,
          error: "Δεν έχετε δικαιώματα πρόσβασης - ελέγξτε το API Key",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setConnectionStatus({
          success: false,
          error:
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        error: error.message || "Σφάλμα δικτύου - ελέγξτε τη σύνδεσή σας",
      });
    } finally {
      setLoading(false);
    }
  };

  // Test receipt issuance with Wrapp API
  const testReceiptIssuance = async () => {
    if (!wrappSettings.apiKey || !wrappSettings.email) {
      setConnectionStatus({
        success: false,
        error: "Παρακαλώ συμπληρώστε API Key και Email",
      });
      return;
    }

    setLoading(true);
    setConnectionStatus(null);

    try {
      // First, login to get the access token
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
        const loginError = await loginResponse.json().catch(() => ({}));
        setConnectionStatus({
          success: false,
          error: `Σφάλμα σύνδεσης: ${loginError.error || "Μη έγκυρα στοιχεία"}`,
        });
        return;
      }

      const loginData = await loginResponse.json();
      console.log("Login response data:", loginData);

      // Extract JWT token from Wrapp API response structure
      const accessToken = loginData.data?.attributes?.jwt;

      if (!accessToken) {
        console.log(
          "Available fields in login response:",
          Object.keys(loginData),
        );
        setConnectionStatus({
          success: false,
          error: `Δεν βρέθηκε access token. Διαθέσιμα πεδία: ${Object.keys(
            loginData,
          ).join(", ")}`,
        });
        return;
      }

      console.log("Using access token:", accessToken.substring(0, 20) + "...");

      // First, get available billing books
      const billingBooksResponse = await fetch(
        `/api/wrapp/billing-books?baseUrl=${encodeURIComponent(
          wrappSettings.baseUrl,
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!billingBooksResponse.ok) {
        setConnectionStatus({
          success: false,
          error: "Δεν βρέθηκαν διαθέσιμα βιβλία τιμολόγησης",
        });
        return;
      }

      const billingBooks = await billingBooksResponse.json();
      console.log("Available billing books:", billingBooks);

      if (!billingBooks || billingBooks.length === 0) {
        setConnectionStatus({
          success: false,
          error: "Δεν υπάρχουν διαθέσιμα βιβλία τιμολόγησης",
        });
        return;
      }

      // Find billing book for retail receipt (11.1)
      const retailBook = billingBooks.find(
        (book: any) =>
          book.invoice_type_code === "11.1" && book.name.includes("Λιανικής"),
      );

      if (!retailBook) {
        // Try to find any 11.x book
        const anyRetailBook = billingBooks.find((book: any) =>
          book.invoice_type_code.startsWith("11."),
        );

        if (!anyRetailBook) {
          setConnectionStatus({
            success: false,
            error: `Δεν βρέθηκε βιβλίο για απόδειξη λιανικής (11.1). Διαθέσιμα: ${billingBooks
              .map((b: any) => `${b.name} (${b.invoice_type_code})`)
              .join(", ")}`,
          });
          return;
        }

        console.log("Using retail billing book:", anyRetailBook);
        var selectedBook = anyRetailBook;
      } else {
        console.log("Using exact retail billing book:", retailBook);
        var selectedBook = retailBook;
      }

      // Create test receipt data according to Wrapp API documentation
      const testReceiptData = {
        invoice_type_code: "11.1", // Απόδειξη Λιανικής Πώλησης
        billing_book_id: selectedBook.id,
        payment_method_type: wrappSettings.defaultPaymentMethod,
        payment_details: "Test payment details",
        net_total_amount: 10.0,
        vat_total_amount: 2.4,
        total_amount: 12.4,
        payable_total_amount: 12.4,
        notes: "Δοκιμαστική απόδειξη από το σύστημα",

        // Customer info (counterpart)
        counterpart: {
          name: "Test Customer",
          country_code: "GR",
          vat: "999999999",
          city: businessInfo.city || "Athens",
          street: businessInfo.address || "Test Street",
          number: "1",
          postal_code: businessInfo.postalCode || "12345",
          email: "test@example.com",
        },

        // Invoice lines
        invoice_lines: [
          {
            line_number: 1,
            name: "Test Product",
            description: "Δοκιμαστικό προϊόν",
            quantity: 1,
            quantity_type: 1, // Τεμάχια
            unit_price: 10.0,
            net_total_price: 10.0,
            vat_rate: 24,
            vat_total: 2.4,
            subtotal: 12.4,
            classification_category:
              wrappSettings.defaultClassificationCategory,
            classification_type: wrappSettings.defaultClassificationType,
          },
        ],
      };

      // Now create the invoice using the access token
      const response = await fetch("/api/wrapp/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(testReceiptData),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          success: true,
          userInfo: {
            email: `✅ Δοκιμαστική απόδειξη εκδόθηκε επιτυχώς!`,
            userId: `UID: ${
              data.uid || data.invoiceUid || "N/A"
            } | Σειρά: TEST | Αξία: €12.40`,
          },
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setConnectionStatus({
          success: false,
          error: `Σφάλμα έκδοσης απόδειξης: ${
            errorData.message || `HTTP ${response.status}`
          }`,
        });
      }
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        error: error.message || "Σφάλμα δικτύου κατά την έκδοση απόδειξης",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);

      try {
        const settingsDoc = await getDoc(doc(db, "config", "settings"));
        const smtpDoc = await getDoc(doc(db, "config", "smtp"));
        const logoDoc = await getDoc(doc(db, "config", "logo"));
        const rolesDoc = await getDoc(doc(db, "config", "roles"));
        const wrappDoc = await getDoc(doc(db, "config", "wrapp"));

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();

          // Load business info with proper fallback
          if (data.businessInfo) {
            setBusinessInfo((prev) => ({
              ...prev,
              ...data.businessInfo,
              // Ensure operating hours exist, use defaults if not
              operatingHours:
                data.businessInfo.operatingHours || prev.operatingHours,
            }));
          }

          // Load user management settings
          if (data.userManagement) {
            setUserManagement((prev) => ({
              ...prev,
              ...data.userManagement,
            }));
          }

          // Load technical settings
          if (data.technicalSettings) {
            setTechnicalSettings((prev) => ({
              ...prev,
              ...data.technicalSettings,
            }));
          }

          // Load online ordering settings
          if (data.onlineOrdering) {
            setOnlineOrdering((prev) => ({
              ...prev,
              ...data.onlineOrdering,
            }));
          }
        }

        // Load SMTP settings
        if (smtpDoc.exists()) {
          const smtpData = smtpDoc.data();
          setSmtpSettings((prev) => ({
            ...prev,
            ...smtpData,
          }));
        }

        // Load logo
        if (logoDoc.exists()) {
          const logoData = logoDoc.data();
          setBusinessInfo((prev) => ({
            ...prev,
            logoBase64: logoData.logoBase64 || "",
            logoUrl: logoData.logoUrl || "",
          }));
        }

        // Load roles
        if (rolesDoc.exists()) {
          const rolesData = rolesDoc.data();
          setAvailableRoles(rolesData.roles || []);
        } else {
          // Initialize with default roles if none exist
          const defaultRoles = ["admin", "manager", "employee"];
          setAvailableRoles(defaultRoles);
          await setDoc(doc(db, "config", "roles"), { roles: defaultRoles });
        }

        // Load Wrapp settings
        if (wrappDoc.exists()) {
          const wrappData = wrappDoc.data();
          setWrappSettings((prev) => ({
            ...prev,
            ...wrappData,
          }));
        }

        // Load discovered printers
        await loadDiscoveredPrinters();
      } catch (e) {
        setMessage("Σφάλμα φόρτωσης ρυθμίσεων");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Load users from Firestore
  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);
      const usersData: User[] = [];

      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data(),
        } as User);
      });

      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
      setMessage("Σφάλμα φόρτωσης χρηστών");
    }
  };

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Role Management Functions
  const createRole = async () => {
    if (!newRoleName.trim()) {
      setMessage("Παρακαλώ εισάγετε όνομα ρόλου");
      return;
    }

    if (availableRoles.includes(newRoleName)) {
      setMessage("Ο ρόλος υπάρχει ήδη");
      return;
    }

    try {
      setLoading(true);
      const updatedRoles = [...availableRoles, newRoleName];

      // Save to Firestore
      await setDoc(doc(db, "config", "roles"), {
        roles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });

      // Save role permissions if any selected
      if (rolePermissions.length > 0) {
        await setDoc(
          doc(db, "config", "rolePermissions"),
          {
            [newRoleName]: rolePermissions,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }

      setAvailableRoles(updatedRoles);
      setNewRoleName("");
      setRolePermissions([]);
      setShowRoleForm(false);
      setMessage("Ο ρόλος δημιουργήθηκε επιτυχώς");
    } catch (error) {
      console.error("Error creating role:", error);
      setMessage(
        `Σφάλμα δημιουργίας ρόλου: ${
          error instanceof Error ? error.message : "Άγνωστο σφάλμα"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleName: string) => {
    try {
      const rolesRef = doc(db, "config", "roles");
      const rolesDoc = await getDoc(rolesRef);

      if (rolesDoc.exists()) {
        const currentRoles = rolesDoc.data().roles || [];
        const updatedRoles = currentRoles.filter(
          (role: string) => role !== roleName,
        );

        await updateDoc(rolesRef, { roles: updatedRoles });
        setAvailableRoles(updatedRoles);

        // Also delete role permissions
        const permissionsRef = doc(db, "config", "rolePermissions");
        const permissionsDoc = await getDoc(permissionsRef);

        if (permissionsDoc.exists()) {
          const currentPermissions = permissionsDoc.data();
          delete currentPermissions[roleName];
          await setDoc(permissionsRef, currentPermissions);
        }
      }
    } catch (error) {
      setMessage("Σφάλμα κατά τη διαγραφή του ρόλου");
    }
  };

  // Network Printer Discovery - Browser-Safe Version
  const scanNetworkPrinters = async () => {
    setScanningPrinters(true);
    setDiscoveredPrinters([]);

    try {
      const discovered: string[] = [];

      // Method 1: Try to detect local network info first
      const networkInfo = await getNetworkInfo();

      // Method 2: Use a more targeted approach - only scan likely printer IPs
      await scanLikelyPrinterIPs(discovered, networkInfo);

      // Method 3: Add manual entry option if no printers found
      if (discovered.length === 0) {
        discovered.push("Manual Entry - Add printer IP manually");
      }

      // Remove duplicates and sort
      const uniquePrinters = [...new Set(discovered)].sort();
      setDiscoveredPrinters(uniquePrinters);

      // Only save to Firestore if we found real printers (not manual entry)
      const realPrinters = uniquePrinters.filter(
        (printer) => !printer.includes("Manual Entry"),
      );
      if (realPrinters.length > 0) {
        try {
          const printersRef = doc(db, "config", "discoveredPrinters");
          await setDoc(printersRef, {
            printers: realPrinters,
            lastScan: new Date().toISOString(),
            scanMethod: "browser_safe_scan",
          });
        } catch (firestoreError) {
          // Ignore Firestore errors - don't let them break the scan
          console.warn("Could not save to Firestore:", firestoreError);
        }
      }

      // Provide user feedback
      if (
        uniquePrinters.length === 1 &&
        uniquePrinters[0].includes("Manual Entry")
      ) {
        setMessage(
          "Δεν βρέθηκαν εκτυπωτές αυτόματα. Μπορείτε να προσθέσετε χειροκίνητα.",
        );
      } else if (realPrinters.length > 0) {
        setMessage(`Βρέθηκαν ${realPrinters.length} εκτυπωτές`);
      } else {
        setMessage("Δεν βρέθηκαν εκτυπωτές στο δίκτυο");
      }
    } catch (error) {
      setMessage("Σφάλμα κατά την ανίχνευση εκτυπωτών");
    } finally {
      setScanningPrinters(false);
    }
  };

  // Get network information safely
  const getNetworkInfo = async () => {
    try {
      // Try to get local IP using WebRTC (browser-safe method)
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");

      return new Promise((resolve) => {
        pc.createOffer().then((offer) => pc.setLocalDescription(offer));

        pc.onicecandidate = (ice) => {
          if (ice && ice.candidate && ice.candidate.candidate) {
            const candidate = ice.candidate.candidate;
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch) {
              const localIP = ipMatch[1];
              const networkBase = localIP.substring(
                0,
                localIP.lastIndexOf("."),
              );
              resolve({ localIP, networkBase });
              pc.close();
              return;
            }
          }
        };

        // Fallback after 2 seconds
        setTimeout(() => {
          resolve({ localIP: "192.168.1.1", networkBase: "192.168.1" });
          pc.close();
        }, 2000);
      });
    } catch (error) {
      return { localIP: "192.168.1.1", networkBase: "192.168.1" };
    }
  };

  // Scan only likely printer IPs to reduce console spam
  const scanLikelyPrinterIPs = async (
    discovered: string[],
    networkInfo: any,
  ) => {
    const { networkBase } = networkInfo;

    // Common printer IP endings
    const commonPrinterIPs = [
      `${networkBase}.100`,
      `${networkBase}.101`,
      `${networkBase}.102`,
      `${networkBase}.200`,
      `${networkBase}.201`,
      `${networkBase}.202`,
      "192.168.1.100",
      "192.168.1.101",
      "192.168.0.100",
      "192.168.0.101",
    ];

    // Remove duplicates
    const uniqueIPs = [...new Set(commonPrinterIPs)];

    // Test each IP with minimal console spam
    const promises = uniqueIPs.map((ip) => testPrinterQuietly(ip, discovered));
    await Promise.all(promises);
  };

  // Test printer connection quietly (minimal console errors)
  const testPrinterQuietly = async (ip: string, discovered: string[]) => {
    try {
      // Method 1: Try HTTP first (less invasive)
      const httpResult = await testHttpQuietly(ip);
      if (httpResult) {
        discovered.push(`${httpResult} (${ip})`);
        return;
      }

      // Method 2: Try WebSocket only if HTTP failed (with error suppression)
      const wsResult = await testWebSocketQuietly(ip);
      if (wsResult) {
        discovered.push(`${wsResult} (${ip})`);
      }
    } catch (error) {
      // Suppress errors to avoid console spam
    }
  };

  // Test HTTP connection with minimal errors
  const testHttpQuietly = async (ip: string): Promise<string | null> => {
    const endpoints = ["/status", "/printer", "/main.html"];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

        const response = await fetch(`http://${ip}${endpoint}`, {
          method: "HEAD",
          mode: "no-cors",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If we get here, something responded
        if (endpoint.includes("status")) return "Network_Printer";
        if (endpoint.includes("printer")) return "Printer_Device";
        return "HTTP_Printer";
      } catch (error) {
        // Continue to next endpoint
      }
    }

    return null;
  };

  // Test print functionality
  const testPrint = async (printerIP: string, printerName: string) => {
    try {
      // Create test print content
      const testContent = `
=== TEST PRINT ===
Printer: ${printerName}
IP: ${printerIP}
Date: ${new Date().toLocaleDateString("el-GR")}
Time: ${new Date().toLocaleTimeString("el-GR")}
Status: OK
==================
      `.trim();

      // Method 1: Try WebSocket ESC/POS commands
      const wsSuccess = await sendTestPrintWebSocket(printerIP, testContent);
      if (wsSuccess) {
        setMessage(`Test print στάλθηκε στον ${printerName}`);
        return;
      }

      // Method 2: Try HTTP print (if supported)
      const httpSuccess = await sendTestPrintHTTP(printerIP, testContent);
      if (httpSuccess) {
        setMessage(`Test print στάλθηκε στον ${printerName}`);
        return;
      }

      // Method 3: Show manual instructions
      setMessage(
        `Δεν μπόρεσε να στείλει test print. Ελέγξτε αν ο εκτυπωτής ${printerIP} είναι ενεργός.`,
      );
    } catch (error) {
      setMessage(`Σφάλμα test print για ${printerName}`);
    }
  };

  // Send test print via WebSocket (ESC/POS)
  const sendTestPrintWebSocket = async (
    ip: string,
    content: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      try {
        const ws = new WebSocket(`ws://${ip}:9100`);

        ws.onopen = () => {
          clearTimeout(timeout);

          // ESC/POS commands for test print
          const escPos = new Uint8Array([
            0x1b,
            0x40, // Initialize printer
            ...Array.from(new TextEncoder().encode(content)),
            0x0a,
            0x0a,
            0x0a, // Line feeds
            0x1d,
            0x56,
            0x42,
            0x00, // Cut paper (if supported)
          ]);

          ws.send(escPos);
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 1000);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  };

  // Send test print via HTTP (if printer supports it)
  const sendTestPrintHTTP = async (
    ip: string,
    content: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`http://${ip}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: content,
        signal: AbortSignal.timeout(3000),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Helper function to check if string is IP address
  const isIPAddress = (str: string) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipRegex.test(str.trim());
  };

  // Test WebSocket with error suppression
  const testWebSocketQuietly = async (ip: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1000); // 1 second timeout

      try {
        const ws = new WebSocket(`ws://${ip}:9100`);

        // Suppress error logging
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve("ESC_POS_Printer");
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          resolve(null);
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  };

  // mDNS/Bonjour service discovery - only real hostnames
  const scanMdnsPrinters = async (discovered: string[]) => {
    try {
      const commonPrinterHosts = [
        "printer.local",
        "hp-printer.local",
        "epson.local",
        "brother.local",
        "canon.local",
        "label.local",
      ];

      const hostPromises = commonPrinterHosts.map((host) =>
        testRealHostnameConnection(host, discovered),
      );

      await Promise.all(hostPromises);
    } catch (error) {
      // mDNS not available in most browsers
    }
  };

  // Test hostname resolution - only add if actually responds
  const testRealHostnameConnection = async (
    hostname: string,
    discovered: string[],
  ) => {
    try {
      const response = await fetch(`http://${hostname}`, {
        method: "HEAD", // Use HEAD to avoid downloading content
        mode: "no-cors",
        signal: AbortSignal.timeout(3000),
      });

      // Only add if we get a successful response
      const printerName = extractNameFromHostname(hostname);
      discovered.push(`${printerName} (${hostname})`);
    } catch (error) {
      // Host not found or not responding - don't add fake entries
    }
  };

  // Extract printer name from hostname
  const extractNameFromHostname = (hostname: string) => {
    const hostnameMap: { [key: string]: string } = {
      "printer.local": "Network_Printer",
      "hp-printer.local": "HP_Printer",
      "epson.local": "Epson_Printer",
      "brother.local": "Brother_Printer",
      "canon.local": "Canon_Printer",
      "label.local": "Label_Printer",
      "star.local": "Star_Printer",
      "citizen.local": "Citizen_Printer",
    };

    return hostnameMap[hostname] || hostname.replace(".local", "_Printer");
  };

  // Get printer name from HTTP interface - simplified version
  const getPrinterNameFromHttp = async (ip: string): Promise<string | null> => {
    try {
      // Try common printer endpoints
      const endpoints = ["/status", "/printer", "/main.html"];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://${ip}${endpoint}`, {
            method: "HEAD",
            mode: "no-cors",
            signal: AbortSignal.timeout(1000),
          });

          // If endpoint responds, try to identify by URL pattern
          if (endpoint.includes("hp")) return "HP_Printer";
          if (endpoint.includes("epson")) return "Epson_Printer";

          return "Network_Printer";
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  // Get local network ranges
  const getLocalNetworkRanges = () => {
    // Common private network ranges
    return [
      { base: "192.168.1", start: 1, end: 254 },
      { base: "192.168.0", start: 1, end: 254 },
      { base: "10.0.0", start: 1, end: 254 },
      { base: "172.16.0", start: 1, end: 254 },
    ];
  };

  // Load previously discovered printers
  const loadDiscoveredPrinters = async () => {
    try {
      const printersRef = doc(db, "config", "discoveredPrinters");
      const printersDoc = await getDoc(printersRef);

      if (printersDoc.exists()) {
        const data = printersDoc.data();
        setDiscoveredPrinters(data.printers || []);
      }
    } catch (error) {
      // Error loading discovered printers
    }
  };

  // Reset user form
  const resetUserForm = () => {
    setUserForm({
      email: "",
      firstName: "",
      lastName: "",
      role: availableRoles.length > 0 ? availableRoles[0] : "employee",
      pin: "",
      password: "",
      confirmPassword: "",
      isActive: true,
      permissions: [],
    });
    setEditingUser(null);
    setShowUserForm(false);
    setShowPassword(false);
  };

  // Create or update user
  const handleSaveUser = async () => {
    try {
      setLoading(true);

      // Validation
      if (!userForm.email || !userForm.firstName || !userForm.lastName) {
        setMessage("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία");
        return;
      }

      if (
        !editingUser &&
        (!userForm.password || userForm.password !== userForm.confirmPassword)
      ) {
        setMessage("Οι κωδικοί δεν ταιριάζουν");
        return;
      }

      if (userForm.pin && userForm.pin.length !== 4) {
        setMessage("Το PIN πρέπει να είναι 4 ψηφία");
        return;
      }

      if (editingUser) {
        // Update existing user
        const userRef = doc(db, "users", editingUser.id);

        // Filter out undefined values to avoid Firestore errors
        const updateData: any = {
          updatedAt: new Date().toISOString(),
        };

        if (userForm.email) updateData.email = userForm.email;
        if (userForm.firstName) updateData.firstName = userForm.firstName;
        if (userForm.lastName !== undefined)
          updateData.lastName = userForm.lastName;
        if (userForm.role) updateData.role = userForm.role;
        if (userForm.pin !== undefined) updateData.pin = userForm.pin;
        if (userForm.isActive !== undefined)
          updateData.isActive = userForm.isActive;
        if (userForm.permissions) updateData.permissions = userForm.permissions;

        await updateDoc(userRef, updateData);
        setMessage("Ο χρήστης ενημερώθηκε επιτυχώς");
      } else {
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userForm.email,
          userForm.password,
        );

        // Create user profile in Firestore
        const userRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userRef, {
          email: userForm.email,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          role: userForm.role,
          pin: userForm.pin,
          isActive: userForm.isActive,
          permissions: userForm.permissions,
          createdAt: new Date().toISOString(),
        });
        setMessage("Ο χρήστης δημιουργήθηκε επιτυχώς");
      }

      resetUserForm();
      loadUsers(); // Reload users list
    } catch (error) {
      console.error("Error saving user:", error);
      setMessage(
        `Σφάλμα: ${error instanceof Error ? error.message : "Άγνωστο σφάλμα"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userData: any) => {
    // Check if user is auth-only (cannot be deleted)
    if (userData.authOnly || userData.canDelete === false) {
      setMessage(
        "Αυτός ο χρήστης δεν μπορεί να διαγραφεί (Firebase Authentication user)",
      );
      return;
    }

    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον χρήστη;")) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, "users", userId));
      setMessage("Ο χρήστης διαγράφηκε επιτυχώς");
      loadUsers(); // Reload users list
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage(
        `Σφάλμα διαγραφής: ${
          error instanceof Error ? error.message : "Άγνωστο σφάλμα"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Edit user
  const handleEditUser = (user: User) => {
    setUserForm({
      email: user.email || "",
      firstName: user.firstName || (user as any).name || "",
      lastName: user.lastName || "",
      role: user.role || "user",
      pin: user.pin || "",
      password: "",
      confirmPassword: "",
      isActive: user.isActive !== undefined ? user.isActive : true,
      permissions: user.permissions || [],
    });
    setEditingUser(user);
    setShowUserForm(true);
  };

  const saveAllSettings = async () => {
    setLoading(true);
    setMessage("");
    try {
      // Save SMTP settings
      const smtpRef = doc(db, "config", "smtp");
      await setDoc(smtpRef, smtpSettings, { merge: true });

      // Save Wrapp settings to config (for global settings)
      const wrappRef = doc(db, "config", "wrapp");
      await setDoc(wrappRef, wrappSettings, { merge: true });

      // Save Wrapp user settings (for credentials and user-specific settings)
      const userRef = doc(db, "users", "current_user");
      await setDoc(
        userRef,
        {
          userSettings: {
            wrapp: {
              email: wrappSettings.email,
              api_key: wrappSettings.apiKey,
              default_payment_method_type: wrappSettings.defaultPaymentMethod,
              default_invoice_type_code: wrappSettings.defaultInvoiceType,
              default_vat_rate: wrappSettings.defaultVatRate,
              default_classification_category:
                wrappSettings.defaultClassificationCategory,
              default_classification_type:
                wrappSettings.defaultClassificationType,
              email_locale: "el",
              generate_pdf: true,
              draft: false,
            },
          },
        },
        { merge: true },
      );

      // Save other settings
      const settingsRef = doc(db, "config", "settings");
      await setDoc(settingsRef, {
        businessInfo,
        userManagement,
        technicalSettings,
        onlineOrdering,
        updatedAt: new Date().toISOString(),
      });

      // Save logo separately if it exists
      if (businessInfo.logoBase64) {
        const logoRef = doc(db, "config", "logo");
        await setDoc(logoRef, {
          logoBase64: businessInfo.logoBase64,
          logoUrl: businessInfo.logoUrl,
          updatedAt: new Date().toISOString(),
        });
      }

      setMessage("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!");
    } catch (e) {
      console.error(e);
      setMessage(
        `Σφάλμα: ${e instanceof Error ? e.message : "Άγνωστο σφάλμα"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setBusinessInfo({
          ...businessInfo,
          logoBase64: base64String,
          logoUrl: base64String,
        });
        const logoRef = doc(db, "config", "logo");
        await setDoc(logoRef, {
          logoBase64: base64String,
          logoUrl: base64String,
          updatedAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteLogo = async () => {
    try {
      const logoRef = doc(db, "config", "logo");
      await deleteDoc(logoRef);

      setBusinessInfo({ ...businessInfo, logoBase64: "", logoUrl: "" });
    } catch (error) {
      console.error("Error deleting logo:", error);
    }
  };

  // VAT Search functionality
  const handleVatSearch = async () => {
    if (!businessInfo.taxId || businessInfo.taxId.length < 9) {
      setVatSearchMessage({
        type: "error",
        text: "Παρακαλώ εισάγετε έγκυρο ΑΦΜ (τουλάχιστον 9 ψηφία)",
      });
      return;
    }

    setVatSearchLoading(true);
    setVatSearchMessage(null);

    try {
      // Check if WRAPP credentials are available in state
      if (!wrappSettings.email || !wrappSettings.apiKey) {
        setVatSearchMessage({
          type: "error",
          text: "Παρακαλώ ρυθμίστε πρώτα τα διαπιστευτήρια WRAPP στις ρυθμίσεις",
        });
        setVatSearchLoading(false);
        return;
      }

      // Login to get JWT
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
        throw new Error("Αποτυχία σύνδεσης με WRAPP API");
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        throw new Error("Δεν ελήφθη JWT token");
      }

      // Search VAT (add required country_code parameter)
      const vatResponse = await fetch(
        `/api/wrapp/vat-search?vat=${
          businessInfo.taxId
        }&country_code=EL&baseUrl=${encodeURIComponent(wrappSettings.baseUrl)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
      );

      if (!vatResponse.ok) {
        throw new Error("Αποτυχία αναζήτησης ΑΦΜ");
      }

      const vatData = await vatResponse.json();
      console.log("VAT search result:", vatData);

      // Update business info with found data
      if (vatData && vatData.name) {
        // Combine address and street_number for complete address
        const fullAddress =
          vatData.address && vatData.street_number
            ? `${vatData.address} ${vatData.street_number}`
            : vatData.address;

        setBusinessInfo((prev) => ({
          ...prev,
          storeName: vatData.name || prev.storeName,
          address: fullAddress,
          city: vatData.city || prev.city,
          postalCode: vatData.postal_code || prev.postalCode,
          // Note: tax_office is not provided by WRAPP VAT search API
        }));

        setVatSearchMessage({
          type: "success",
          text: "Τα στοιχεία επιχείρησης συμπληρώθηκαν επιτυχώς!",
        });
      } else {
        setVatSearchMessage({
          type: "error",
          text: "Δεν βρέθηκαν στοιχεία για το συγκεκριμένο ΑΦΜ",
        });
      }
    } catch (error: any) {
      console.error("VAT search error:", error);
      setVatSearchMessage({
        type: "error",
        text: error.message || "Σφάλμα κατά την αναζήτηση ΑΦΜ",
      });
    } finally {
      setVatSearchLoading(false);

      // Clear message after 5 seconds
      setTimeout(() => {
        setVatSearchMessage(null);
      }, 5000);
    }
  };

  const tabs = [
    { id: "business", label: "Πληροφορίες Επιχείρησης", icon: FaBuilding },
    { id: "users", label: "Διαχείριση Χρηστών", icon: FaUsers },
    {
      id: "products",
      label: "Εισαγωγή/Εξαγωγή Προϊόντων",
      icon: FaShoppingCart,
    },
    { id: "technical", label: "Τεχνικές Ρυθμίσεις", icon: FaCog },
    { id: "online", label: "Online Ordering", icon: FaGlobe },
    { id: "wrapp", label: "Wrapp API (ΑΑΔΕ)", icon: FaNetworkWired },
    { id: "smtp", label: "SMTP Ρυθμίσεις", icon: FaEnvelope },
  ];

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Όνομα Καταστήματος
          </label>
          <input
            type="text"
            value={businessInfo.storeName}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, storeName: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Όνομα επιχείρησης"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Διεύθυνση
          </label>
          <input
            type="text"
            value={businessInfo.address}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, address: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Διεύθυνση"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Πόλη
          </label>
          <input
            type="text"
            value={businessInfo.city}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, city: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ταχυδρομικός Κώδικας
          </label>
          <input
            type="text"
            value={businessInfo.postalCode}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, postalCode: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Ταχυδρομικός Κώδικας"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Τηλέφωνο
          </label>
          <input
            type="tel"
            value={businessInfo.phone}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, phone: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={businessInfo.email}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, email: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ΑΦΜ
          </label>
          <div className="relative">
            <input
              type="text"
              value={businessInfo.taxId}
              onChange={(e) =>
                setBusinessInfo({ ...businessInfo, taxId: e.target.value })
              }
              onBlur={handleVatSearch}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Εισάγετε ΑΦΜ για αυτόματη συμπλήρωση"
            />
            <button
              type="button"
              onClick={handleVatSearch}
              disabled={vatSearchLoading || !businessInfo.taxId}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-amber-600 hover:text-amber-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Αναζήτηση στοιχείων επιχείρησης"
            >
              {vatSearchLoading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSearch />
              )}
            </button>
          </div>
          {vatSearchMessage && (
            <div
              className={`mt-2 p-2 rounded text-sm ${
                vatSearchMessage.type === "success"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {vatSearchMessage.text}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Δ.Ο.Υ
          </label>
          <input
            type="text"
            value={businessInfo.taxOffice}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, taxOffice: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Νομική Μορφή
          </label>
          <select
            value={businessInfo.legalForm}
            onChange={(e) =>
              setBusinessInfo({ ...businessInfo, legalForm: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="ΑΕ">ΑΕ</option>
            <option value="ΕΕ">ΕΕ</option>
            <option value="ΙΚ">ΙΚ</option>
            <option value="ΟΕ">ΟΕ</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FaUpload className="text-amber-500" />
            Logo
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={businessInfo.logoUrl}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, logoUrl: e.target.value })
                }
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="URL logo ή ανέβασμα αρχείου"
              />
              <label className="px-4 py-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors cursor-pointer">
                <FaUpload />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {businessInfo.logoBase64 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <img
                  src={businessInfo.logoBase64}
                  alt="Logo preview"
                  className="w-16 h-16 object-contain rounded border border-amber-200"
                />
                <div className="flex-1">
                  <p className="text-sm text-amber-700 font-medium">
                    Logo uploaded successfully
                  </p>
                  <p className="text-xs text-amber-600">
                    Click the upload button to change
                  </p>
                </div>
                <button
                  onClick={deleteLogo}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete logo"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaClock className="text-amber-500" />
          Ώρες Λειτουργίας
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(businessInfo.operatingHours).map(([day, hours]) => (
            <div key={day} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-gray-700 capitalize">
                  {day === "monday"
                    ? "Δευτέρα"
                    : day === "tuesday"
                      ? "Τρίτη"
                      : day === "wednesday"
                        ? "Τετάρτη"
                        : day === "thursday"
                          ? "Πέμπτη"
                          : day === "friday"
                            ? "Παρασκευή"
                            : day === "saturday"
                              ? "Σάββατο"
                              : "Κυριακή"}
                </label>
                <input
                  type="checkbox"
                  checked={hours.closed}
                  onChange={(e) =>
                    setBusinessInfo({
                      ...businessInfo,
                      operatingHours: {
                        ...businessInfo.operatingHours,
                        [day]: { ...hours, closed: e.target.checked },
                      },
                    })
                  }
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-500">Κλειστό</span>
              </div>
              {!hours.closed && (
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) =>
                      setBusinessInfo({
                        ...businessInfo,
                        operatingHours: {
                          ...businessInfo.operatingHours,
                          [day]: { ...hours, open: e.target.value },
                        },
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <span className="self-center">-</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) =>
                      setBusinessInfo({
                        ...businessInfo,
                        operatingHours: {
                          ...businessInfo.operatingHours,
                          [day]: { ...hours, close: e.target.value },
                        },
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      {/* Header with Add User Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaUsers className="text-amber-500" />
          Διαχείριση Χρηστών ({users.length} χρήστες)
        </h3>
        <button
          onClick={() => setShowUserForm(true)}
          className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
        >
          <FaUserPlus size={16} />
          Νέος Χρήστης
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Χρήστης
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ρόλος
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Κατάσταση
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ημ/νία Δημιουργίας
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-amber-800">
                            {(user.firstName || "").charAt(0)}
                            {(user.lastName || "").charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName || ""} {user.lastName || ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-red-100 text-red-800"
                          : user.role === "manager"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.pin ? "••••" : "Δεν έχει οριστεί"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.isActive ? "Ενεργός" : "Ανενεργός"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("el-GR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-amber-600 hover:text-amber-900 p-1 rounded"
                        title="Επεξεργασία"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user)}
                        className={`p-1 rounded ${
                          (user as any).authOnly ||
                          (user as any).canDelete === false
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:text-red-900"
                        }`}
                        title={
                          (user as any).authOnly ||
                          (user as any).canDelete === false
                            ? "Δεν μπορεί να διαγραφεί (Firebase Auth user)"
                            : "Διαγραφή"
                        }
                        disabled={
                          (user as any).authOnly ||
                          (user as any).canDelete === false
                        }
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Δεν υπάρχουν χρήστες
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Ξεκινήστε δημιουργώντας τον πρώτο χρήστη.
            </p>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUser ? "Επεξεργασία Χρήστη" : "Νέος Χρήστης"}
                </h3>
                <button
                  onClick={resetUserForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Όνομα *
                  </label>
                  <input
                    type="text"
                    value={userForm.firstName || ""}
                    onChange={(e) =>
                      setUserForm({ ...userForm, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Όνομα"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Επώνυμο *
                  </label>
                  <input
                    type="text"
                    value={userForm.lastName || ""}
                    onChange={(e) =>
                      setUserForm({ ...userForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Επώνυμο"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={userForm.email || ""}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="email@example.com"
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ρόλος
                  </label>
                  <select
                    value={userForm.role || "user"}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN (4 ψηφία)
                  </label>
                  <input
                    type="text"
                    value={userForm.pin || ""}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        pin: e.target.value.slice(0, 4),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={userForm.isActive}
                      onChange={(e) =>
                        setUserForm({ ...userForm, isActive: e.target.checked })
                      }
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    Ενεργός Χρήστης
                  </label>
                </div>

                {!editingUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Κωδικός *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={userForm.password}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                          placeholder="Κωδικός"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <FaEyeSlash size={16} />
                          ) : (
                            <FaEye size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Επιβεβαίωση Κωδικού *
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={userForm.confirmPassword}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Επιβεβαίωση κωδικού"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={resetUserForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {loading
                    ? "Αποθήκευση..."
                    : editingUser
                      ? "Ενημέρωση"
                      : "Δημιουργία"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles Management */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FaUserShield className="text-amber-500" />
            Ρόλοι Συστήματος ({availableRoles.length} ρόλοι)
          </h3>
          <button
            onClick={() => setShowRoleForm(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <FaPlus size={14} />
            Νέος Ρόλος
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {availableRoles.map((role) => (
            <div key={role} className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 capitalize">
                  {role}
                </span>
                <button
                  onClick={() => deleteRole(role)}
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                  title="Διαγραφή ρόλου"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {availableRoles.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FaUserShield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Δεν υπάρχουν ρόλοι
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Δημιουργήστε τον πρώτο ρόλο για το σύστημα.
            </p>
          </div>
        )}
      </div>

      {/* Role Form Modal */}
      {showRoleForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Δημιουργία Νέου Ρόλου
                </h3>
                <button
                  onClick={() => {
                    setShowRoleForm(false);
                    setNewRoleName("");
                    setRolePermissions([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Όνομα Ρόλου *
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="π.χ. Cashier, Cook, Supervisor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Δικαιώματα Ρόλου
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {allPermissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={rolePermissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRolePermissions([
                                ...rolePermissions,
                                permission,
                              ]);
                            } else {
                              setRolePermissions(
                                rolePermissions.filter((p) => p !== permission),
                              );
                            }
                          }}
                          className="rounded text-green-500 focus:ring-green-500"
                        />
                        <span className="capitalize">
                          {permission.replace(/_/g, " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRoleForm(false);
                    setNewRoleName("");
                    setRolePermissions([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={createRole}
                  disabled={loading || !newRoleName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Δημιουργία..." : "Δημιουργία Ρόλου"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnicalSettings = () => {
    // Technical sub-tabs
    const technicalTabs = [
      { id: "pos", label: "Ρυθμίσεις POS", icon: FaCashRegister },
      { id: "printer", label: "Ρυθμίσεις Εκτυπωτή", icon: FaPrint },
      { id: "system", label: "Ρυθμίσεις Συστήματος", icon: FaCog },
    ];

    return (
      <div className="space-y-6">
        {/* Technical Sub-tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Technical Tabs">
            {technicalTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTechnicalSubTab(tab.id)}
                className={`${
                  technicalSubTab === tab.id
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Technical Sub-tab Content */}
        <div className="mt-6">
          {technicalSubTab === "pos" && (
            <POSTabSettings
              technicalSettings={technicalSettings}
              setTechnicalSettings={setTechnicalSettings}
              onOpenRestaurantLayout={() =>
                setShowRestaurantLayoutSettings(true)
              }
            />
          )}
          {technicalSubTab === "printer" && (
            <PrinterTabSettings
              technicalSettings={technicalSettings}
              setTechnicalSettings={setTechnicalSettings}
              scanningPrinters={scanningPrinters}
              discoveredPrinters={discoveredPrinters}
              onScanPrinters={scanNetworkPrinters}
              onTestPrint={testPrint}
            />
          )}
          {technicalSubTab === "system" && (
            <SystemTabSettings
              technicalSettings={technicalSettings}
              setTechnicalSettings={setTechnicalSettings}
            />
          )}
        </div>
      </div>
    );
  };

  const renderOnlineOrdering = () => {
    const onlineOrderingTabs = [
      { id: "general", label: "Γενικές Ρυθμίσεις", icon: FaShoppingCart },
      { id: "wolt", label: "Wolt", icon: FaTruck },
    ];

    const renderGeneralOnlineSettings = () => (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlineOrdering.enableOnlineOrders}
            onChange={(e) =>
              setOnlineOrdering({
                ...onlineOrdering,
                enableOnlineOrders: e.target.checked,
              })
            }
            className="rounded text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Ενεργοποίηση online παραγγελιών
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform Παραγγελιών
          </label>
          <input
            type="text"
            value={onlineOrdering.orderPlatform}
            onChange={(e) =>
              setOnlineOrdering({
                ...onlineOrdering,
                orderPlatform: e.target.value,
              })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g., e-food, Wolt, Deliveras"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ελάχιστο ποσό παραγγελίας (€)
          </label>
          <input
            type="number"
            value={onlineOrdering.minimumOrderAmount}
            onChange={(e) =>
              setOnlineOrdering({
                ...onlineOrdering,
                minimumOrderAmount: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ακτίνα παράδοσης (χλμ)
          </label>
          <input
            type="number"
            value={onlineOrdering.deliveryRadius}
            onChange={(e) =>
              setOnlineOrdering({
                ...onlineOrdering,
                deliveryRadius: parseInt(e.target.value) || 10,
              })
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            min="1"
            max="50"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlineOrdering.enableDeliveryTracking}
            onChange={(e) =>
              setOnlineOrdering({
                ...onlineOrdering,
                enableDeliveryTracking: e.target.checked,
              })
            }
            className="rounded text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Ενεργοποίηση tracking παράδοσης
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlineOrdering.autoAcceptOrders}
            onChange={(e) =>
              setOnlineOrdering({
                ...onlineOrdering,
                autoAcceptOrders: e.target.checked,
              })
            }
            className="rounded text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Αυτόματη αποδοχή παραγγελιών
          </span>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaShoppingCart className="text-amber-500" />
            Online Ordering Settings
          </h3>

          {/* Sub-tabs Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {onlineOrderingTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setOnlineOrderingTab(id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    onlineOrderingTab === id
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Sub-tab Content */}
          {onlineOrderingTab === "general" && renderGeneralOnlineSettings()}
          {onlineOrderingTab === "wolt" && <WoltSettings />}
        </div>
      </div>
    );
  };

  const renderSmtpSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaEnvelope className="text-amber-500" />
          SMTP Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              value={smtpSettings.host}
              onChange={(e) =>
                setSmtpSettings({ ...smtpSettings, host: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="number"
              value={smtpSettings.port}
              onChange={(e) =>
                setSmtpSettings({
                  ...smtpSettings,
                  port: parseInt(e.target.value) || 587,
                })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="587"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={smtpSettings.user}
              onChange={(e) =>
                setSmtpSettings({ ...smtpSettings, user: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="your-email@gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={smtpSettings.pass}
              onChange={(e) =>
                setSmtpSettings({ ...smtpSettings, pass: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Your app password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={smtpSettings.fromName}
              onChange={(e) =>
                setSmtpSettings({ ...smtpSettings, fromName: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Your Business Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Email
            </label>
            <input
              type="email"
              value={smtpSettings.fromEmail}
              onChange={(e) =>
                setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="noreply@yourbusiness.com"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smtpSettings.secure}
              onChange={(e) =>
                setSmtpSettings({ ...smtpSettings, secure: e.target.checked })
              }
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Use SSL/TLS (secure connection)
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smtpSettings.requireTLS}
              onChange={(e) =>
                setSmtpSettings({
                  ...smtpSettings,
                  requireTLS: e.target.checked,
                })
              }
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Require TLS
            </span>
          </label>
        </div>

        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-700 mb-4">
            Test Email Configuration
          </h4>
          <div className="flex gap-2">
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Enter test email address"
            />
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const response = await fetch("/api/send-email", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      to: testTo,
                      subject: "Test Email from Order System",
                      message:
                        "This is a test email from your order system SMTP configuration.",
                    }),
                  });

                  if (response.ok) {
                    setMessage("Test email sent successfully!");
                  } else {
                    const errorData = await response.json();
                    setMessage(
                      `Failed to send test email: ${
                        errorData.error || "Unknown error"
                      }`,
                    );
                  }
                } catch (error) {
                  setMessage("Error sending test email");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <FaPaperPlane className="mr-2" />
              Send Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWrappSettings = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaNetworkWired className="text-blue-600" />
          <h3 className="font-semibold text-blue-800">Wrapp API Integration</h3>
        </div>
        <p className="text-blue-700 text-sm">
          Ρυθμίσεις για τη σύνδεση με το Wrapp API για την έκδοση παραστατικών
          στην ΑΑΔΕ.
        </p>
      </div>

      {/* API Connection Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaKey className="text-amber-600" />
          Στοιχεία Σύνδεσης
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key *
            </label>
            <input
              type="password"
              value={wrappSettings.apiKey}
              onChange={(e) =>
                setWrappSettings({ ...wrappSettings, apiKey: e.target.value })
              }
              placeholder="Εισάγετε το API key από το Wrapp"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Λογαριασμού *
            </label>
            <input
              type="email"
              value={wrappSettings.email}
              onChange={(e) =>
                setWrappSettings({ ...wrappSettings, email: e.target.value })
              }
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wrapp User ID
            </label>
            <input
              type="text"
              value={wrappSettings.wrappUserId}
              onChange={(e) =>
                setWrappSettings({
                  ...wrappSettings,
                  wrappUserId: e.target.value,
                })
              }
              placeholder="Προαιρετικό - αν έχετε User ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="url"
              value={wrappSettings.baseUrl}
              onChange={(e) =>
                setWrappSettings({ ...wrappSettings, baseUrl: e.target.value })
              }
              placeholder="https://wrapp.ai/api/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Connection Test Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={testWrappConnection}
            disabled={loading || !wrappSettings.apiKey || !wrappSettings.email}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Δοκιμή...
              </>
            ) : (
              <>
                <FaPlug />
                Δοκιμή Σύνδεσης
              </>
            )}
          </button>

          <button
            onClick={testReceiptIssuance}
            disabled={loading || !wrappSettings.apiKey || !wrappSettings.email}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Δοκιμή...
              </>
            ) : (
              <>
                <FaReceipt />
                Δοκιμή Έκδοσης Απόδειξης
              </>
            )}
          </button>
        </div>

        {/* Connection Status */}
        {connectionStatus && (
          <div
            className={`mt-4 p-4 rounded-lg border ${
              connectionStatus.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {connectionStatus.success ? (
                <FaCheckCircle className="text-green-600" />
              ) : (
                <FaTimesCircle className="text-red-600" />
              )}
              <span
                className={`font-medium ${
                  connectionStatus.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {connectionStatus.success
                  ? "Σύνδεση Επιτυχής"
                  : "Σφάλμα Σύνδεσης"}
              </span>
            </div>

            {connectionStatus.success && connectionStatus.userInfo && (
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <strong>Email:</strong> {connectionStatus.userInfo.email}
                </p>
                <p>
                  <strong>User ID:</strong> {connectionStatus.userInfo.userId}
                </p>
              </div>
            )}

            {!connectionStatus.success && connectionStatus.error && (
              <p className="text-sm text-red-700">{connectionStatus.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Φόροι & Τέλη Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaReceipt className="text-green-600" />
          Φόροι & Τέλη
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Ρυθμίστε τους φόρους και τέλη που θα προστίθενται αυτόματα στις
          αποδείξεις.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Δημοτικό Τέλος */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Δημοτικό Τέλος (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wrappSettings.municipalTaxRate}
                onChange={(e) =>
                  setWrappSettings({
                    ...wrappSettings,
                    municipalTaxRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-gray-600">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Τέλος επί ακαθαρίστων εσόδων (Ν.5143/2024). Προεπιλογή: 0.5%
            </p>
          </div>

          {/* Φόρος Πλαστικών Μιας Χρήσης */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Φόρος Πλαστικών (€)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={wrappSettings.plasticTax}
                onChange={(e) =>
                  setWrappSettings({
                    ...wrappSettings,
                    plasticTax: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Φόρος πλαστικών μιας χρήσης (ποτήρια, καπάκια, κλπ)
            </p>
          </div>

          {/* Φόρος Σακούλας */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Φόρος Σακούλας (€)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={wrappSettings.plasticBagTax}
                onChange={(e) =>
                  setWrappSettings({
                    ...wrappSettings,
                    plasticBagTax: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Φόρος σακούλας. Προεπιλογή: €0.04
            </p>
          </div>
        </div>

        {/* Εμφάνιση Κουμπιών στο POS */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900 mb-3">
            Εμφάνιση Κουμπιών στο POS
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wrappSettings.showPlasticTaxButton}
                onChange={(e) =>
                  setWrappSettings({
                    ...wrappSettings,
                    showPlasticTaxButton: e.target.checked,
                  })
                }
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-amber-800">
                Εμφάνιση κουμπιού "Φόρος Πλαστικών"
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wrappSettings.showPlasticBagTaxButton}
                onChange={(e) =>
                  setWrappSettings({
                    ...wrappSettings,
                    showPlasticBagTaxButton: e.target.checked,
                  })
                }
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-amber-800">
                Εμφάνιση κουμπιού "Φόρος Σακούλας"
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FaInfoCircle className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Πληροφορίες:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>
                  Το δημοτικό τέλος θα προστίθεται αυτόματα ως ξεχωριστό line
                  item στις αποδείξεις
                </li>
                <li>
                  Ο φόρος πλαστικών θα ρυθμίζεται ανά προϊόν (για προϊόντα με
                  πλαστικά μιας χρήσης)
                </li>
                <li>Ο φόρος σακούλας θα προστίθεται ανά τεμάχιο</li>
                <li>
                  Όλοι οι φόροι θα εμφανίζονται ξεχωριστά στην απόδειξη για
                  λογιστική διαφάνεια
                </li>
                <li>
                  Τα κουμπιά θα εμφανίζονται στο POS μόνο αν είναι
                  ενεργοποιημένα και έχουν ποσό {">"} 0
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive WRAPP Settings */}
      <WrappComprehensiveSettings
        credentials={{
          email: wrappSettings.email,
          apiKey: wrappSettings.apiKey,
          baseUrl: wrappSettings.baseUrl,
        }}
      />

      {/* POS Devices Manager */}
      <WrappPOSDevicesManager
        credentials={{
          email: wrappSettings.email,
          apiKey: wrappSettings.apiKey,
          baseUrl: wrappSettings.baseUrl,
        }}
      />
    </div>
  );

  return (
    <div className="bg-gray-50 py-8 overflow-y-auto h-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FaCog className="text-4xl" />
              Ρυθμίσεις Συστήματος
            </h1>
            <p className="text-amber-100 mt-2">
              Διαχειριστείτε τις ρυθμίσεις του συστήματος παραγγελιών
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === "business" && renderBusinessInfo()}
            {activeTab === "users" && renderUserManagement()}
            {activeTab === "products" && <ProductCatalogExportImport />}
            {activeTab === "technical" && renderTechnicalSettings()}
            {activeTab === "online" && renderOnlineOrdering()}
            {activeTab === "wrapp" && renderWrappSettings()}
            {activeTab === "smtp" && renderSmtpSettings()}
          </div>

          {/* Save Button */}
          <div className="bg-gray-50 px-8 py-6 flex items-center justify-between">
            <div className="flex-1">
              {message && (
                <div
                  className={`px-4 py-2 rounded-lg text-sm ${
                    message.includes("επιτυχώς") ||
                    message.includes("successfully")
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
            <button
              onClick={saveAllSettings}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <FaSave />
              Αποθήκευση Όλων των Ρυθμίσεων
            </button>
          </div>
        </div>
      </div>

      {/* Restaurant Layout Settings Modal */}
      {showRestaurantLayoutSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaTable className="text-blue-600" />
                Διαμόρφωση Σάλας Εστιατορίου
              </h2>
              <button
                onClick={() => setShowRestaurantLayoutSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RestaurantLayoutSettings />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
