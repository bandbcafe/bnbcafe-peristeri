"use client";

import { useState, useEffect } from "react";
import {
  FaGlobe,
  FaImage,
  FaEdit,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaBullhorn,
  FaPlus,
  FaSave,
  FaTrash,
  FaEye,
  FaTimes,
  FaCreditCard,
  FaUsers,
  FaCalendarAlt,
  FaComments,
  FaEnvelopeOpen,
  FaReply,
  FaCheck,
  FaUtensils,
  FaStar,
  FaArrowUp,
  FaArrowDown,
  FaTools,
} from "react-icons/fa";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import PriceListSelector from "@/components/PriceListSelector";
import { compressAndConvertImage } from "@/utils/imageUtils";
import { convertToFavicon, validateFaviconFile } from "@/utils/faviconUtils";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";

// Utility function to calculate distance using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Note: Geocoding functionality removed - use Google Maps API in DeliveryMapChecker component

// Note: Delivery availability checking moved to DeliveryMapChecker component with Google Maps API

interface WebsiteSettings {
  favicon?: string; // Base64 favicon image
  googleAnalyticsId?: string; // Google Analytics Measurement ID (G-XXXXXXXXXX)
  heroSection: {
    backgroundImages: string[]; // Changed to array for multiple images
    logo?: string; // Base64 WebP logo image
    overlayOpacity?: number; // 0-100, overlay darkness over background images
    title: string;
    subtitle: string;
  };
  featuresSection?: {
    badge: string;
    title: string;
    description: string;
    features: {
      title: string;
      description: string;
    }[];
  };
  featuredProductsSection?: {
    badge: string;
    title: string;
    description: string;
    productIds: string[]; // Array of 4 product IDs
  };
  businessMeetingsSection?: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    ctaButtonText: string;
    ctaButtonLink: string;
    rightSideTitle: string;
    features: {
      title: string;
      description: string;
    }[];
    bottomCards: {
      title: string;
      description: string;
    }[];
  };
  contactInfo: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  deliverySettings: {
    weeklyHours: {
      monday: { isOpen: boolean; start: string; end: string };
      tuesday: { isOpen: boolean; start: string; end: string };
      wednesday: { isOpen: boolean; start: string; end: string };
      thursday: { isOpen: boolean; start: string; end: string };
      friday: { isOpen: boolean; start: string; end: string };
      saturday: { isOpen: boolean; start: string; end: string };
      sunday: { isOpen: boolean; start: string; end: string };
    };
    radius: number; // in km
    fee: number;
    enableDistanceValidation: boolean; // Enable/disable Google Maps distance check
  };
  customerSettings: {
    selectedPriceListId: string;
  };
  paymentSettings: {
    enabledMethods: {
      cashOnDelivery: boolean;
      creditCard: boolean;
      iris: boolean;
      paypal: boolean;
      applePay: boolean;
    };
    vivaWallet: {
      enabled: boolean;
      merchantId: string;
      apiKey: string;
      clientId: string;
      clientSecret: string;
      sourceCode: string;
      testMode: boolean;
      successUrl: string;
      failureUrl: string;
    };
  };
  reservationSettings?: {
    enabled: boolean;
    maxGuests: number;
    advanceBookingDays: number;
    cancellationHours: number;
    depositRequired: boolean;
    depositAmount: number;
    tableHoldMinutes: number;
    requirePhone: boolean;
    requireEmail: boolean;
    autoConfirm: boolean;
  };
  maintenanceMode?: {
    enabled: boolean;
    title: string;
    message: string;
    backgroundImage?: string;
    showLogo: boolean;
    showContactInfo: boolean;
    estimatedEndTime?: string;
  };
}

interface Popup {
  id?: string;
  title: string;
  content: string;
  image: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: Date;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export default function WebsitePage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<WebsiteSettings>({
    heroSection: {
      backgroundImages: [], // Initialize as empty array
      title: "Καλώς ήρθατε στο κατάστημά μας",
      subtitle:
        "Απολαύστε αυθεντικές γεύσεις με φρέσκα υλικά και παραδοσιακές συνταγές",
    },
    contactInfo: {
      phone: "",
      email: "",
      address: {
        street: "",
        city: "",
        postalCode: "",
      },
    },
    deliverySettings: {
      weeklyHours: {
        monday: { isOpen: true, start: "12:00", end: "23:00" },
        tuesday: { isOpen: true, start: "12:00", end: "23:00" },
        wednesday: { isOpen: true, start: "12:00", end: "23:00" },
        thursday: { isOpen: true, start: "12:00", end: "23:00" },
        friday: { isOpen: true, start: "12:00", end: "23:00" },
        saturday: { isOpen: true, start: "12:00", end: "23:00" },
        sunday: { isOpen: true, start: "12:00", end: "23:00" },
      },
      radius: 5,
      fee: 2.5,
      enableDistanceValidation: true, // Default enabled
    },
    customerSettings: {
      selectedPriceListId: "",
    },
    paymentSettings: {
      enabledMethods: {
        cashOnDelivery: true,
        creditCard: false,
        iris: false,
        paypal: false,
        applePay: false,
      },
      vivaWallet: {
        enabled: false,
        merchantId: "",
        apiKey: "",
        clientId: "",
        clientSecret: "",
        sourceCode: "",
        testMode: true,
        successUrl: "",
        failureUrl: "",
      },
    },
    reservationSettings: {
      enabled: true,
      maxGuests: 12,
      advanceBookingDays: 30,
      cancellationHours: 2,
      depositRequired: false,
      depositAmount: 0,
      tableHoldMinutes: 15,
      requirePhone: true,
      requireEmail: false,
      autoConfirm: false,
    },
  });

  const [popups, setPopups] = useState<Popup[]>([]);
  const [showPopupForm, setShowPopupForm] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("hero");
  const { toasts, success, error, removeToast } = useToast();

  // Messages state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null,
  );
  const [messageFilter, setMessageFilter] = useState<
    "all" | "new" | "read" | "replied"
  >("all");

  // Products state for featured products selection
  const [products, setProducts] = useState<any[]>([]);

  const [newPopup, setNewPopup] = useState<Popup>({
    title: "",
    content: "",
    image: "",
    isActive: true,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    createdAt: new Date(),
  });

  // Note: Delivery testing state removed - functionality moved to DeliveryMapChecker component

  useEffect(() => {
    loadWebsiteSettings();
    loadPopups();
    loadProducts();
    if (activeTab === "messages") {
      loadMessages();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "messages") {
      loadMessages();
    }
  }, [messageFilter]);

  const loadWebsiteSettings = async () => {
    try {
      const docRef = doc(db, "website_settings", "main");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Migration: Convert old backgroundImage to backgroundImages array
        if (
          data.heroSection &&
          data.heroSection.backgroundImage &&
          !data.heroSection.backgroundImages
        ) {
          data.heroSection.backgroundImages = data.heroSection.backgroundImage
            ? [data.heroSection.backgroundImage]
            : [];
          delete data.heroSection.backgroundImage;
        }

        // Ensure backgroundImages exists as array
        if (data.heroSection && !data.heroSection.backgroundImages) {
          data.heroSection.backgroundImages = [];
        }

        // Migration: Convert old delivery hours to weekly hours
        if (
          data.deliverySettings &&
          data.deliverySettings.hours &&
          !data.deliverySettings.weeklyHours
        ) {
          const oldHours = data.deliverySettings.hours;
          data.deliverySettings.weeklyHours = {
            monday: { isOpen: true, start: oldHours.start, end: oldHours.end },
            tuesday: { isOpen: true, start: oldHours.start, end: oldHours.end },
            wednesday: {
              isOpen: true,
              start: oldHours.start,
              end: oldHours.end,
            },
            thursday: {
              isOpen: true,
              start: oldHours.start,
              end: oldHours.end,
            },
            friday: { isOpen: true, start: oldHours.start, end: oldHours.end },
            saturday: {
              isOpen: true,
              start: oldHours.start,
              end: oldHours.end,
            },
            sunday: { isOpen: true, start: oldHours.start, end: oldHours.end },
          };
          delete data.deliverySettings.hours;
        }

        // Ensure weeklyHours exists
        if (data.deliverySettings && !data.deliverySettings.weeklyHours) {
          data.deliverySettings.weeklyHours = {
            monday: { isOpen: true, start: "12:00", end: "23:00" },
            tuesday: { isOpen: true, start: "12:00", end: "23:00" },
            wednesday: { isOpen: true, start: "12:00", end: "23:00" },
            thursday: { isOpen: true, start: "12:00", end: "23:00" },
            friday: { isOpen: true, start: "12:00", end: "23:00" },
            saturday: { isOpen: true, start: "12:00", end: "23:00" },
            sunday: { isOpen: true, start: "12:00", end: "23:00" },
          };
        }

        // Ensure paymentSettings exists
        if (!data.paymentSettings) {
          data.paymentSettings = {
            enabledMethods: {
              cashOnDelivery: true,
              creditCard: false,
              iris: false,
              paypal: false,
              applePay: false,
            },
            vivaWallet: {
              enabled: false,
              merchantId: "",
              apiKey: "",
              clientId: "",
              clientSecret: "",
              sourceCode: "",
              testMode: true,
              successUrl: "",
              failureUrl: "",
            },
          };
        }

        // Ensure customerSettings exists
        if (!data.customerSettings) {
          data.customerSettings = {
            selectedPriceListId: "",
          };
        }

        setSettings(data as WebsiteSettings);
      }
    } catch (error) {
      console.error("Error loading website settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadPopups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "website_popups"));
      const popupsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Popup[];
      setPopups(popupsData);
    } catch (error) {
      console.error("Error loading popups:", error);
    }
  };

  // Helper function to remove undefined values from an object
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined);

    const cleaned: any = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    });
    return cleaned;
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "website_settings", "main");

      // Clean settings to remove undefined values
      const cleanedSettings = removeUndefined({
        ...settings,
        updatedAt: new Date(),
      });

      await setDoc(docRef, cleanedSettings);
      success("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!");
    } catch (err) {
      console.error("Error saving settings:", err);
      error("Σφάλμα κατά την αποθήκευση");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: "hero" | "popup") => {
    try {
      const compressedImage = await compressAndConvertImage(file);

      if (type === "hero") {
        setSettings((prev) => ({
          ...prev,
          heroSection: {
            ...prev.heroSection,
            backgroundImages: [
              ...(prev.heroSection.backgroundImages || []),
              compressedImage,
            ],
          },
        }));
      } else {
        setNewPopup((prev) => ({
          ...prev,
          image: compressedImage,
        }));
      }
    } catch (err) {
      console.error("Error processing image:", err);
      error("Σφάλμα κατά την επεξεργασία της εικόνας");
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      // Use smaller dimensions for logo (max 400x400)
      const compressedLogo = await compressAndConvertImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        format: "webp",
      });

      setSettings((prev) => ({
        ...prev,
        heroSection: {
          ...prev.heroSection,
          logo: compressedLogo,
        },
      }));

      success("Το logo ανέβηκε επιτυχώς!");
    } catch (err) {
      console.error("Error processing logo:", err);
      error("Σφάλμα κατά την επεξεργασία του logo");
    }
  };

  const handleFaviconUpload = async (file: File) => {
    try {
      // Validate file
      const validation = validateFaviconFile(file);
      if (!validation.valid) {
        error(validation.error || "Μη έγκυρο αρχείο");
        return;
      }

      // Convert to favicon format (32x32 PNG)
      const faviconBase64 = await convertToFavicon(file, {
        sizes: [32],
        format: "png",
        quality: 0.95,
      });

      setSettings((prev) => ({
        ...prev,
        favicon: faviconBase64,
      }));

      success("Το favicon ανέβηκε επιτυχώς!");
    } catch (err) {
      console.error("Error processing favicon:", err);
      error("Σφάλμα κατά την επεξεργασία του favicon");
    }
  };

  const removeHeroImage = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      heroSection: {
        ...prev.heroSection,
        backgroundImages: (prev.heroSection.backgroundImages || []).filter(
          (_, i) => i !== index,
        ),
      },
    }));
  };

  const moveHeroImage = (index: number, direction: "up" | "down") => {
    setSettings((prev) => {
      const images = [...(prev.heroSection.backgroundImages || [])];
      const newIndex = direction === "up" ? index - 1 : index + 1;

      // Check bounds
      if (newIndex < 0 || newIndex >= images.length) return prev;

      // Swap images
      [images[index], images[newIndex]] = [images[newIndex], images[index]];

      return {
        ...prev,
        heroSection: {
          ...prev.heroSection,
          backgroundImages: images,
        },
      };
    });
  };

  // Helper function to convert 24h to 12h format with Greek AM/PM
  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "μμ" : "πμ";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to show 24h format explanation
  const formatTime24hExplanation = (time24: string) => {
    if (!time24) return "";
    return `24ωρη: ${time24}`;
  };

  const savePopup = async () => {
    try {
      if (editingPopup?.id) {
        // Update existing popup
        const docRef = doc(db, "website_popups", editingPopup.id);
        await updateDoc(docRef, {
          ...newPopup,
          updatedAt: new Date(),
        });
      } else {
        // Create new popup
        await addDoc(collection(db, "website_popups"), {
          ...newPopup,
          createdAt: new Date(),
        });
      }

      setShowPopupForm(false);
      setEditingPopup(null);
      setNewPopup({
        title: "",
        content: "",
        image: "",
        isActive: true,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        createdAt: new Date(),
      });
      loadPopups();
      success("Το popup αποθηκεύτηκε επιτυχώς!");
    } catch (err) {
      console.error("Error saving popup:", err);
      error("Σφάλμα κατά την αποθήκευση του popup");
    }
  };

  const deletePopup = async (popupId: string) => {
    if (confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το popup;")) {
      try {
        await deleteDoc(doc(db, "website_popups", popupId));
        loadPopups();
        success("Το popup διαγράφηκε επιτυχώς!");
      } catch (err) {
        console.error("Error deleting popup:", err);
        error("Σφάλμα κατά τη διαγραφή");
      }
    }
  };

  const editPopup = (popup: Popup) => {
    setEditingPopup(popup);
    setNewPopup(popup);
    setShowPopupForm(true);
  };

  // Messages functions
  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      console.log("Loading messages with filter:", messageFilter);
      const response = await fetch(
        `/api/contact/messages?status=${messageFilter}&limit=100`,
      );
      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data);
        setMessages(data.messages || []);
      } else {
        console.error("API Error:", response.status, response.statusText);
        const errorData = await response.json();
        console.error("Error details:", errorData);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      error("Σφάλμα κατά τη φόρτωση των μηνυμάτων");
    } finally {
      setMessagesLoading(false);
    }
  };

  const updateMessageStatus = async (
    messageId: string,
    status: "new" | "read" | "replied",
  ) => {
    try {
      const response = await fetch("/api/contact/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId, status }),
      });

      if (response.ok) {
        // Update local state
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg)),
        );
        if (selectedMessage?.id === messageId) {
          setSelectedMessage((prev) => (prev ? { ...prev, status } : null));
        }
        success("Η κατάσταση του μηνύματος ενημερώθηκε");
      }
    } catch (err) {
      console.error("Error updating message status:", err);
      error("Σφάλμα κατά την ενημέρωση της κατάστασης");
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-red-100 text-red-800 border-red-200";
      case "read":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "replied":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <FaEnvelopeOpen className="w-3 h-3" />;
      case "read":
        return <FaCheck className="w-3 h-3" />;
      case "replied":
        return <FaReply className="w-3 h-3" />;
      default:
        return <FaComments className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Νέο";
      case "read":
        return "Αναγνώστηκε";
      case "replied":
        return "Απαντήθηκε";
      default:
        return "Άγνωστο";
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch("/api/contact/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        // Remove message from local state
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        // Close modal if this message was selected
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
        success("Το μήνυμα διαγράφηκε επιτυχώς");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      error("Σφάλμα κατά τη διαγραφή του μηνύματος");
    }
  };

  // Note: Delivery testing functionality removed - use DeliveryMapChecker component instead

  const tabs = [
    { id: "hero", name: "Design", icon: <FaImage /> },
    { id: "popups", name: "Popups", icon: <FaBullhorn /> },
    { id: "contact", name: "Επικοινωνία", icon: <FaPhone /> },
    { id: "delivery", name: "Delivery", icon: <FaClock /> },
    { id: "customer", name: "Τιμοκατάλογος", icon: <FaUsers /> },
    { id: "payments", name: "Πληρωμές", icon: <FaCreditCard /> },
    { id: "reservations", name: "Κρατήσεις", icon: <FaCalendarAlt /> },
    { id: "messages", name: "Μηνύματα", icon: <FaComments /> },
    { id: "maintenance", name: "Maintenance", icon: <FaTools /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "hero":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaImage className="text-[#C9AC7A]" />
              Design
            </h2>

            <div className="space-y-6">
              {/* Logo & Favicon Upload Section - 2 Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Logo Upload Section */}
                <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaImage className="text-[#C9AC7A]" />
                    Logo Επιχείρησης
                  </h3>

                  {/* Current Logo Display */}
                  {settings.heroSection.logo ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <img
                            src={settings.heroSection.logo}
                            alt="Business Logo"
                            className="h-20 w-auto object-contain bg-white rounded-lg border-2 border-[#C9AC7A] p-2"
                          />
                          <button
                            onClick={() => {
                              setSettings((prev) => ({
                                ...prev,
                                heroSection: {
                                  ...prev.heroSection,
                                  logo: undefined,
                                },
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Διαγραφή Logo"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-medium">
                            Τρέχον Logo
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Αυτό το logo εμφανίζεται στο header του customer
                            site
                          </p>
                        </div>
                      </div>

                      {/* Replace Logo Button */}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                          className="hidden"
                          id="logo-replace"
                        />
                        <label
                          htmlFor="logo-replace"
                          className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                        >
                          <FaEdit />
                          Αλλαγή Logo
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-[#C9AC7A] rounded-lg p-6 bg-white">
                      <div className="text-center">
                        <FaImage className="mx-auto text-[#C9AC7A] text-4xl mb-3" />
                        <p className="text-gray-700 font-medium mb-1">
                          Προσθέστε το Logo σας
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Το logo θα εμφανίζεται στο header του customer site
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-medium"
                        >
                          <FaPlus />
                          Ανέβασμα Logo
                        </label>
                        <p className="text-xs text-gray-400 mt-3">
                          Συνιστώμενο: PNG με διαφανές φόντο, μέγιστο 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Favicon Upload Section */}
                <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaGlobe className="text-[#C9AC7A]" />
                    Favicon Site
                  </h3>

                  {/* Current Favicon Display */}
                  {settings.favicon ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <img
                            src={settings.favicon}
                            alt="Site Favicon"
                            className="h-16 w-16 object-contain bg-white rounded-lg border-2 border-[#C9AC7A] p-2"
                          />
                          <button
                            onClick={() => {
                              setSettings((prev) => ({
                                ...prev,
                                favicon: undefined,
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Διαγραφή Favicon"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-medium">
                            Τρέχον Favicon
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Αυτό το favicon εμφανίζεται στην καρτέλα του browser
                            (μόνο στην κεντρική σελίδα, όχι στο admin)
                          </p>
                        </div>
                      </div>

                      {/* Replace Favicon Button */}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFaviconUpload(file);
                          }}
                          className="hidden"
                          id="favicon-replace"
                        />
                        <label
                          htmlFor="favicon-replace"
                          className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                        >
                          <FaEdit />
                          Αλλαγή Favicon
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-[#C9AC7A] rounded-lg p-6 bg-white">
                      <div className="text-center">
                        <FaGlobe className="mx-auto text-[#C9AC7A] text-4xl mb-3" />
                        <p className="text-gray-700 font-medium mb-1">
                          Προσθέστε το Favicon σας
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Το favicon θα εμφανίζεται στην καρτέλα του browser
                          (μόνο στην κεντρική σελίδα)
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFaviconUpload(file);
                          }}
                          className="hidden"
                          id="favicon-upload"
                        />
                        <label
                          htmlFor="favicon-upload"
                          className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-medium"
                        >
                          <FaPlus />
                          Ανέβασμα Favicon
                        </label>
                        <p className="text-xs text-gray-400 mt-3">
                          Το favicon θα μετατραπεί αυτόματα σε 32x32px PNG
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Google Analytics Section */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FaGlobe className="text-[#C9AC7A]" />
                  Google Analytics
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Analytics Measurement ID
                    </label>
                    <input
                      type="text"
                      value={settings.googleAnalyticsId || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          googleAnalyticsId: e.target.value,
                        }))
                      }
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Εισάγετε το Google Analytics Measurement ID (π.χ.
                      G-7Z74S0786Z). Το Google Analytics θα ενεργοποιηθεί μόνο
                      στην κεντρική σελίδα, όχι στο admin.
                    </p>
                  </div>

                  {settings.googleAnalyticsId && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <FaCheck />
                        <span className="text-sm font-medium">
                          Google Analytics Ενεργό
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Το Google Analytics tracking είναι ενεργοποιημένο για
                        την κεντρική σελίδα με ID: {settings.googleAnalyticsId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Background Images Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Background Images{" "}
                    {settings.heroSection.backgroundImages?.length > 1 &&
                      "(Carousel)"}
                  </label>
                  <span className="text-xs text-gray-500">
                    {settings.heroSection.backgroundImages?.length || 0} εικόνες
                  </span>
                </div>

                {/* Existing Images Grid */}
                {settings.heroSection.backgroundImages?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {settings.heroSection.backgroundImages?.map(
                      (image, index) => (
                        <div
                          key={index}
                          className="relative group transition-all duration-200 "
                        >
                          <img
                            src={image}
                            alt={`Hero Background ${index + 1}`}
                            className="w-full h-34 object-cover rounded-lg border-2 border-gray-300 group-hover:border-[#C9AC7A]"
                          />

                          {/* Delete Button */}
                          <button
                            onClick={() => removeHeroImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Διαγραφή"
                          >
                            <FaTimes size={10} />
                          </button>

                          {/* Reorder Buttons */}
                          <div className="absolute top-1 left-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {index > 0 && (
                              <button
                                onClick={() => moveHeroImage(index, "up")}
                                className="bg-[#C9AC7A] text-white p-1 rounded hover:bg-[#9F7D41] transition-colors"
                                title="Μετακίνηση πάνω"
                              >
                                <FaArrowUp size={10} />
                              </button>
                            )}
                            {index <
                              (settings.heroSection.backgroundImages?.length ||
                                0) -
                                1 && (
                              <button
                                onClick={() => moveHeroImage(index, "down")}
                                className="bg-[#C9AC7A] text-white p-1 rounded hover:bg-[#9F7D41] transition-colors"
                                title="Μετακίνηση κάτω"
                              >
                                <FaArrowDown size={10} />
                              </button>
                            )}
                          </div>

                          {/* Image Number */}
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* Add New Image */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <FaImage className="mx-auto text-gray-400 text-3xl mb-2" />
                    <p className="text-gray-500 mb-2">
                      {(settings.heroSection.backgroundImages?.length || 0) ===
                      0
                        ? "Προσθέστε εικόνες για το Hero Section"
                        : "Προσθέστε άλλη εικόνα"}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "hero");
                      }}
                      className="hidden"
                      id="hero-image"
                    />
                    <label
                      htmlFor="hero-image"
                      className="bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                    >
                      <FaPlus className="inline mr-2" />
                      Προσθήκη Εικόνας
                    </label>
                  </div>
                </div>

                {/* Carousel Info */}
                {settings.heroSection.backgroundImages?.length > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <FaEye />
                      <span className="text-sm font-medium">Carousel Mode</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Οι εικόνες θα εμφανίζονται ως carousel στο customer site.
                      Χρησιμοποιήστε τα βέλη (↑↓) για να αλλάξετε τη σειρά
                      εμφάνισης.
                    </p>
                  </div>
                )}
              </div>

              {/* Overlay Opacity Control */}
              {settings.heroSection.backgroundImages?.length > 0 && (
                <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <FaImage className="text-[#C9AC7A]" />
                      Σκούρο Overlay (Σκίαση Φωτογραφιών)
                    </label>
                    <span className="text-sm font-bold text-[#9F7D41] bg-white px-3 py-1 rounded-full">
                      {settings.heroSection.overlayOpacity || 40}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Slider */}
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={settings.heroSection.overlayOpacity || 40}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          heroSection: {
                            ...prev.heroSection,
                            overlayOpacity: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C9AC7A]"
                      style={{
                        background: `linear-gradient(to right, #C9AC7A 0%, #C9AC7A ${
                          settings.heroSection.overlayOpacity || 40
                        }%, #e5e7eb ${
                          settings.heroSection.overlayOpacity || 40
                        }%, #e5e7eb 100%)`,
                      }}
                    />

                    {/* Visual Preview */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="space-y-1">
                        <div className="h-12 bg-white rounded border-2 border-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">Φωτεινό</span>
                        </div>
                        <span className="text-gray-500">0%</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-12 bg-gray-300 rounded border-2 border-[#C9AC7A] flex items-center justify-center">
                          <span className="text-gray-600">Μέτριο</span>
                        </div>
                        <span className="text-[#C9AC7A] font-semibold">
                          40%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-12 bg-gray-700 rounded border-2 border-gray-400 flex items-center justify-center">
                          <span className="text-white text-xs">Σκούρο</span>
                        </div>
                        <span className="text-gray-500">80%</span>
                      </div>
                    </div>

                    {/* Info Text */}
                    <div className="bg-white rounded-lg p-2 border border-[#D9C9B0]">
                      <p className="text-xs text-gray-600">
                        💡 <strong>Συμβουλή:</strong> Αυξήστε το overlay για
                        καλύτερη αναγνωσιμότητα του κειμένου πάνω από τις
                        φωτογραφίες. Συνιστώμενο: 30-50%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Τίτλος
                </label>
                <input
                  type="text"
                  value={settings.heroSection.title}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      heroSection: {
                        ...prev.heroSection,
                        title: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Υπότιτλος
                </label>
                <textarea
                  value={settings.heroSection.subtitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      heroSection: {
                        ...prev.heroSection,
                        subtitle: e.target.value,
                      },
                    }))
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                />
              </div>

              {/* Features Section Editor */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FaUtensils className="text-[#C9AC7A]" />
                  Features Section (Ο Ιδανικός Χώρος)
                </h3>

                {/* Badge, Title, Description in Grid */}
                <div className="grid grid-cols-1   gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Badge
                    </label>
                    <input
                      type="text"
                      value={
                        settings.featuresSection?.badge || "Η Εμπειρία μας"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          featuresSection: {
                            badge: e.target.value,
                            title:
                              prev.featuresSection?.title ||
                              "Ο Ιδανικός Χώρος για Brunch & Coffee",
                            description:
                              prev.featuresSection?.description ||
                              "Απολαύστε τον πρωινό σας καφέ, ένα ξεχωριστό brunch ή ένα γρήγορο snack σε έναν χώρο που συνδυάζει άνεση, γεύση και στυλ",
                            features: prev.featuresSection?.features || [
                              {
                                title: "Φρέσκα Υλικά",
                                description:
                                  "Επιλεγμένα προϊόντα κάθε μέρα για το πρωινό και το brunch σας",
                              },
                              {
                                title: "Ανοιχτά Όλη Μέρα",
                                description:
                                  "Από το πρωινό καφέ μέχρι το απογευματινό snack, είμαστε εδώ για εσάς",
                              },
                              {
                                title: "Healthy Choices",
                                description:
                                  "Vegan, vegetarian και gluten-free επιλογές για κάθε διατροφή",
                              },
                              {
                                title: "Cozy Atmosphere",
                                description:
                                  "Χώρος σχεδιασμένος για να απολαύσετε τον καφέ σας με άνεση",
                              },
                            ],
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τίτλος
                    </label>
                    <input
                      type="text"
                      value={
                        settings.featuresSection?.title ||
                        "Ο Ιδανικός Χώρος για Brunch & Coffee"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          featuresSection: {
                            badge:
                              prev.featuresSection?.badge || "Η Εμπειρία μας",
                            title: e.target.value,
                            description:
                              prev.featuresSection?.description ||
                              "Απολαύστε τον πρωινό σας καφέ, ένα ξεχωριστό brunch ή ένα γρήγορο snack σε έναν χώρο που συνδυάζει άνεση, γεύση και στυλ",
                            features: prev.featuresSection?.features || [
                              {
                                title: "Φρέσκα Υλικά",
                                description:
                                  "Επιλεγμένα προϊόντα κάθε μέρα για το πρωινό και το brunch σας",
                              },
                              {
                                title: "Ανοιχτά Όλη Μέρα",
                                description:
                                  "Από το πρωινό καφέ μέχρι το απογευματινό snack, είμαστε εδώ για εσάς",
                              },
                              {
                                title: "Healthy Choices",
                                description:
                                  "Vegan, vegetarian και gluten-free επιλογές για κάθε διατροφή",
                              },
                              {
                                title: "Cozy Atmosphere",
                                description:
                                  "Χώρος σχεδιασμένος για να απολαύσετε τον καφέ σας με άνεση",
                              },
                            ],
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Περιγραφή
                    </label>
                    <textarea
                      value={
                        settings.featuresSection?.description ||
                        "Απολαύστε τον πρωινό σας καφέ, ένα ξεχωριστό brunch ή ένα γρήγορο snack σε έναν χώρο που συνδυάζει άνεση, γεύση και στυλ"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          featuresSection: {
                            badge:
                              prev.featuresSection?.badge || "Η Εμπειρία μας",
                            title:
                              prev.featuresSection?.title ||
                              "Ο Ιδανικός Χώρος για Brunch & Coffee",
                            description: e.target.value,
                            features: prev.featuresSection?.features || [
                              {
                                title: "Φρέσκα Υλικά",
                                description:
                                  "Επιλεγμένα προϊόντα κάθε μέρα για το πρωινό και το brunch σας",
                              },
                              {
                                title: "Ανοιχτά Όλη Μέρα",
                                description:
                                  "Από το πρωινό καφέ μέχρι το απογευματινό snack, είμαστε εδώ για εσάς",
                              },
                              {
                                title: "Healthy Choices",
                                description:
                                  "Vegan, vegetarian και gluten-free επιλογές για κάθε διατροφή",
                              },
                              {
                                title: "Cozy Atmosphere",
                                description:
                                  "Χώρος σχεδιασμένος για να απολαύσετε τον καφέ σας με άνεση",
                              },
                            ],
                          },
                        }))
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Features Cards */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Χαρακτηριστικά (4 κάρτες)
                    </label>
                    <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {[0, 1, 2, 3].map((index) => {
                        const defaultFeatures = [
                          {
                            title: "Φρέσκα Υλικά",
                            description:
                              "Επιλεγμένα προϊόντα κάθε μέρα για το πρωινό και το brunch σας",
                          },
                          {
                            title: "Ανοιχτά Όλη Μέρα",
                            description:
                              "Από το πρωινό καφέ μέχρι το απογευματινό snack, είμαστε εδώ για εσάς",
                          },
                          {
                            title: "Healthy Choices",
                            description:
                              "Vegan, vegetarian και gluten-free επιλογές για κάθε διατροφή",
                          },
                          {
                            title: "Cozy Atmosphere",
                            description:
                              "Χώρος σχεδιασμένος για να απολαύσετε τον καφέ σας με άνεση",
                          },
                        ];
                        return (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-3 border border-[#D9C9B0]"
                          >
                            <p className="text-xs font-semibold text-[#9F7D41] mb-2">
                              Κάρτα {index + 1}
                            </p>
                            <input
                              type="text"
                              placeholder="Τίτλος"
                              value={
                                settings.featuresSection?.features?.[index]
                                  ?.title || defaultFeatures[index].title
                              }
                              onChange={(e) => {
                                const features =
                                  settings.featuresSection?.features ||
                                  defaultFeatures;
                                const newFeatures = [...features];
                                newFeatures[index] = {
                                  ...newFeatures[index],
                                  title: e.target.value,
                                };
                                setSettings((prev) => ({
                                  ...prev,
                                  featuresSection: {
                                    badge:
                                      prev.featuresSection?.badge ||
                                      "Η Εμπειρία μας",
                                    title:
                                      prev.featuresSection?.title ||
                                      "Ο Ιδανικός Χώρος για Brunch & Coffee",
                                    description:
                                      prev.featuresSection?.description ||
                                      "Απολαύστε τον πρωινό σας καφέ, ένα ξεχωριστό brunch ή ένα γρήγορο snack σε έναν χώρο που συνδυάζει άνεση, γεύση και στυλ",
                                    features: newFeatures,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent mb-2"
                            />
                            <textarea
                              placeholder="Περιγραφή"
                              value={
                                settings.featuresSection?.features?.[index]
                                  ?.description ||
                                defaultFeatures[index].description
                              }
                              onChange={(e) => {
                                const features =
                                  settings.featuresSection?.features ||
                                  defaultFeatures;
                                const newFeatures = [...features];
                                newFeatures[index] = {
                                  ...newFeatures[index],
                                  description: e.target.value,
                                };
                                setSettings((prev) => ({
                                  ...prev,
                                  featuresSection: {
                                    badge:
                                      prev.featuresSection?.badge ||
                                      "Η Εμπειρία μας",
                                    title:
                                      prev.featuresSection?.title ||
                                      "Ο Ιδανικός Χώρος για Brunch & Coffee",
                                    description:
                                      prev.featuresSection?.description ||
                                      "Απολαύστε τον πρωινό σας καφέ, ένα ξεχωριστό brunch ή ένα γρήγορο snack σε έναν χώρο που συνδυάζει άνεση, γεύση και στυλ",
                                    features: newFeatures,
                                  },
                                }));
                              }}
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured Products Section Editor */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaStar className="text-[#C9AC7A]" />
                  Featured Products Section (Signature Brunch & Coffee)
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Badge (π.χ. "Τα Αγαπημένα μας")
                    </label>
                    <input
                      type="text"
                      value={
                        settings.featuredProductsSection?.badge ||
                        "Τα Αγαπημένα μας"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          featuredProductsSection: {
                            badge: e.target.value,
                            title:
                              prev.featuredProductsSection?.title ||
                              "Signature Brunch & Coffee",
                            description:
                              prev.featuredProductsSection?.description ||
                              "Ανακαλύψτε τις πιο δημοφιλείς επιλογές μας για ένα τέλειο πρωινό ή brunch",
                            productIds:
                              prev.featuredProductsSection?.productIds || [],
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τίτλος
                    </label>
                    <input
                      type="text"
                      value={
                        settings.featuredProductsSection?.title ||
                        "Signature Brunch & Coffee"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          featuredProductsSection: {
                            badge:
                              prev.featuredProductsSection?.badge ||
                              "Τα Αγαπημένα μας",
                            title: e.target.value,
                            description:
                              prev.featuredProductsSection?.description ||
                              "Ανακαλύψτε τις πιο δημοφιλείς επιλογές μας για ένα τέλειο πρωινό ή brunch",
                            productIds:
                              prev.featuredProductsSection?.productIds || [],
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Περιγραφή
                    </label>
                    <textarea
                      value={
                        settings.featuredProductsSection?.description ||
                        "Ανακαλύψτε τις πιο δημοφιλείς επιλογές μας για ένα τέλειο πρωινό ή brunch"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          featuredProductsSection: {
                            badge:
                              prev.featuredProductsSection?.badge ||
                              "Τα Αγαπημένα μας",
                            title:
                              prev.featuredProductsSection?.title ||
                              "Signature Brunch & Coffee",
                            description: e.target.value,
                            productIds:
                              prev.featuredProductsSection?.productIds || [],
                          },
                        }))
                      }
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Product Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Επιλογή Προϊόντων (4 προϊόντα)
                    </label>
                    <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {[0, 1, 2, 3].map((index) => {
                        const selectedProductId =
                          settings.featuredProductsSection?.productIds?.[index];
                        const selectedProduct = products.find(
                          (p) => p.id === selectedProductId,
                        );

                        return (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-3 border border-[#D9C9B0]"
                          >
                            <p className="text-xs font-semibold text-[#9F7D41] mb-2">
                              Προϊόν {index + 1}
                            </p>
                            <select
                              value={selectedProductId || ""}
                              onChange={(e) => {
                                const productIds = [
                                  ...(settings.featuredProductsSection
                                    ?.productIds || []),
                                ];
                                productIds[index] = e.target.value;
                                setSettings((prev) => ({
                                  ...prev,
                                  featuredProductsSection: {
                                    badge:
                                      prev.featuredProductsSection?.badge ||
                                      "Τα Αγαπημένα μας",
                                    title:
                                      prev.featuredProductsSection?.title ||
                                      "Signature Brunch & Coffee",
                                    description:
                                      prev.featuredProductsSection
                                        ?.description ||
                                      "Ανακαλύψτε τις πιο δημοφιλείς επιλογές μας για ένα τέλειο πρωινό ή brunch",
                                    productIds: productIds,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                            >
                              <option value="">-- Επιλέξτε Προϊόν --</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                            {selectedProduct && (
                              <p className="text-xs text-gray-500 mt-1">
                                {selectedProduct.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Meetings Section Editor */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaCalendarAlt className="text-[#C9AC7A]" />
                  Business Meetings Section (Κλείστε Τραπέζι)
                </h3>

                <div className="space-y-4">
                  {/* Badge */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Badge
                    </label>
                    <input
                      type="text"
                      value={
                        settings.businessMeetingsSection?.badge ||
                        "Κλείστε Τραπέζι Online"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          businessMeetingsSection: {
                            badge: e.target.value,
                            title:
                              prev.businessMeetingsSection?.title ||
                              "Ο Ιδανικός Χώρος",
                            subtitle:
                              prev.businessMeetingsSection?.subtitle ||
                              "για Business Meetings",
                            description:
                              prev.businessMeetingsSection?.description ||
                              "Κλείστε τραπέζι για την επόμενη επαγγελματική σας συνάντηση. Ήσυχος χώρος, δωρεάν WiFi και εξαιρετικός καφές για παραγωγικά meetings.",
                            ctaButtonText:
                              prev.businessMeetingsSection?.ctaButtonText ||
                              "Κλείστε Τραπέζι Τώρα",
                            ctaButtonLink:
                              prev.businessMeetingsSection?.ctaButtonLink ||
                              "/reservations",
                            rightSideTitle:
                              prev.businessMeetingsSection?.rightSideTitle ||
                              "Γιατί να μας Επιλέξετε;",
                            features:
                              prev.businessMeetingsSection?.features || [],
                            bottomCards:
                              prev.businessMeetingsSection?.bottomCards || [],
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Title */}
                  <div className=" grid grid-cols-1 md:grid-cols-2 gap-3 ">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 my-4">
                        Τίτλος (1η γραμμή)
                      </label>
                      <input
                        type="text"
                        value={
                          settings.businessMeetingsSection?.title ||
                          "Ο Ιδανικός Χώρος"
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            businessMeetingsSection: {
                              ...prev.businessMeetingsSection!,
                              title: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 my-4 ">
                        Υπότιτλος (2η γραμμή - με gradient)
                      </label>
                      <input
                        type="text"
                        value={
                          settings.businessMeetingsSection?.subtitle ||
                          "για Business Meetings"
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            businessMeetingsSection: {
                              ...prev.businessMeetingsSection!,
                              subtitle: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Περιγραφή
                    </label>
                    <textarea
                      value={
                        settings.businessMeetingsSection?.description ||
                        "Κλείστε τραπέζι για την επόμενη επαγγελματική σας συνάντηση. Ήσυχος χώρος, δωρεάν WiFi και εξαιρετικός καφές για παραγωγικά meetings."
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          businessMeetingsSection: {
                            ...prev.businessMeetingsSection!,
                            description: e.target.value,
                          },
                        }))
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* CTA Button */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Κείμενο Κουμπιού
                      </label>
                      <input
                        type="text"
                        value={
                          settings.businessMeetingsSection?.ctaButtonText ||
                          "Κλείστε Τραπέζι Τώρα"
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            businessMeetingsSection: {
                              ...prev.businessMeetingsSection!,
                              ctaButtonText: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link Κουμπιού
                      </label>
                      <input
                        type="text"
                        value={
                          settings.businessMeetingsSection?.ctaButtonLink ||
                          "/reservations"
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            businessMeetingsSection: {
                              ...prev.businessMeetingsSection!,
                              ctaButtonLink: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Right Side Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τίτλος Δεξιάς Πλευράς
                    </label>
                    <input
                      type="text"
                      value={
                        settings.businessMeetingsSection?.rightSideTitle ||
                        "Γιατί να μας Επιλέξετε;"
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          businessMeetingsSection: {
                            ...prev.businessMeetingsSection!,
                            rightSideTitle: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Features (4 items) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Χαρακτηριστικά Δεξιάς Πλευράς (4 κάρτες)
                    </label>
                    <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {[0, 1, 2, 3].map((index) => {
                        const defaultFeatures = [
                          {
                            title: "Ιδιωτικός Χώρος",
                            description:
                              "Ήσυχα τραπέζια μακριά από το θόρυβο, ιδανικά για συζητήσεις.",
                          },
                          {
                            title: "Ευέλικτο Ωράριο",
                            description:
                              "Από πρωινά meetings μέχρι απογευματινές συναντήσεις.",
                          },
                          {
                            title: "Premium Catering",
                            description:
                              "Coffee breaks και snacks για την ομάδα σας.",
                          },
                          {
                            title: "Επαγγελματική Εξυπηρέτηση",
                            description:
                              "Άμεση επιβεβαίωση και dedicated service για την ομάδα σας.",
                          },
                        ];

                        return (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-3 border border-[#D9C9B0]"
                          >
                            <p className="text-xs font-semibold text-[#9F7D41] mb-2">
                              Χαρακτηριστικό {index + 1}
                            </p>
                            <input
                              placeholder="Τίτλος"
                              value={
                                settings.businessMeetingsSection?.features?.[
                                  index
                                ]?.title || defaultFeatures[index].title
                              }
                              onChange={(e) => {
                                const features =
                                  settings.businessMeetingsSection?.features ||
                                  defaultFeatures;
                                const newFeatures = [...features];
                                newFeatures[index] = {
                                  ...newFeatures[index],
                                  title: e.target.value,
                                };
                                setSettings((prev) => ({
                                  ...prev,
                                  businessMeetingsSection: {
                                    ...prev.businessMeetingsSection!,
                                    features: newFeatures,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent mb-2"
                            />
                            <textarea
                              placeholder="Περιγραφή"
                              value={
                                settings.businessMeetingsSection?.features?.[
                                  index
                                ]?.description ||
                                defaultFeatures[index].description
                              }
                              onChange={(e) => {
                                const features =
                                  settings.businessMeetingsSection?.features ||
                                  defaultFeatures;
                                const newFeatures = [...features];
                                newFeatures[index] = {
                                  ...newFeatures[index],
                                  description: e.target.value,
                                };
                                setSettings((prev) => ({
                                  ...prev,
                                  businessMeetingsSection: {
                                    ...prev.businessMeetingsSection!,
                                    features: newFeatures,
                                  },
                                }));
                              }}
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Cards (3 items) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Κάρτες Κάτω (3 κάρτες)
                    </label>
                    <div className="space-y-3 grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {[0, 1, 2].map((index) => {
                        const defaultCards = [
                          {
                            title: "Κεντρική Τοποθεσία",
                            description:
                              "Βρισκόμαστε στην καρδιά της πόλης με εύκολη πρόσβαση",
                          },
                          {
                            title: "Δωρεάν WiFi",
                            description:
                              "Απολαύστε γρήγορο internet σε όλο το χώρο μας",
                          },
                          {
                            title: "Δωρεάν Parking",
                            description:
                              "Διαθέσιμοι χώροι στάθμευσης για τους πελάτες μας",
                          },
                        ];

                        return (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-3 border border-[#D9C9B0]"
                          >
                            <p className="text-xs font-semibold text-[#9F7D41] mb-2">
                              Κάρτα {index + 1}
                            </p>
                            <input
                              placeholder="Τίτλος"
                              value={
                                settings.businessMeetingsSection?.bottomCards?.[
                                  index
                                ]?.title || defaultCards[index].title
                              }
                              onChange={(e) => {
                                const cards =
                                  settings.businessMeetingsSection
                                    ?.bottomCards || defaultCards;
                                const newCards = [...cards];
                                newCards[index] = {
                                  ...newCards[index],
                                  title: e.target.value,
                                };
                                setSettings((prev) => ({
                                  ...prev,
                                  businessMeetingsSection: {
                                    ...prev.businessMeetingsSection!,
                                    bottomCards: newCards,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent mb-2"
                            />
                            <textarea
                              placeholder="Περιγραφή"
                              value={
                                settings.businessMeetingsSection?.bottomCards?.[
                                  index
                                ]?.description ||
                                defaultCards[index].description
                              }
                              onChange={(e) => {
                                const cards =
                                  settings.businessMeetingsSection
                                    ?.bottomCards || defaultCards;
                                const newCards = [...cards];
                                newCards[index] = {
                                  ...newCards[index],
                                  description: e.target.value,
                                };
                                setSettings((prev) => ({
                                  ...prev,
                                  businessMeetingsSection: {
                                    ...prev.businessMeetingsSection!,
                                    bottomCards: newCards,
                                  },
                                }));
                              }}
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FaSave />
                {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
              </button>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaPhone className="text-[#C9AC7A]" />
              Στοιχεία Επικοινωνίας
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Τηλέφωνο
                </label>
                <input
                  type="text"
                  value={settings.contactInfo.phone}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        phone: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.contactInfo.email}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        email: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Διεύθυνση
                </label>
                <input
                  type="text"
                  placeholder="Οδός"
                  value={settings.contactInfo.address.street}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      contactInfo: {
                        ...prev.contactInfo,
                        address: {
                          ...prev.contactInfo.address,
                          street: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Πόλη"
                    value={settings.contactInfo.address.city}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          address: {
                            ...prev.contactInfo.address,
                            city: e.target.value,
                          },
                        },
                      }))
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Τ.Κ."
                    value={settings.contactInfo.address.postalCode}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          address: {
                            ...prev.contactInfo.address,
                            postalCode: e.target.value,
                          },
                        },
                      }))
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FaSave />
                {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
              </button>
            </div>
          </div>
        );

      case "delivery":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaClock className="text-[#C9AC7A]" />
              Ρυθμίσεις Delivery
            </h2>

            <div className="space-y-6">
              {/* Weekly Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Εβδομαδιαίο Πρόγραμμα Delivery
                </label>
                <div className="space-y-3">
                  {(
                    [
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ] as const
                  ).map((day) => {
                    const hours = settings.deliverySettings.weeklyHours[day];
                    const dayNames = {
                      monday: "Δευτέρα",
                      tuesday: "Τρίτη",
                      wednesday: "Τετάρτη",
                      thursday: "Πέμπτη",
                      friday: "Παρασκευή",
                      saturday: "Σάββατο",
                      sunday: "Κυριακή",
                    };

                    return (
                      <div
                        key={day}
                        className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="w-20 text-sm font-medium text-gray-700">
                          {dayNames[day as keyof typeof dayNames]}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hours.isOpen}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                deliverySettings: {
                                  ...prev.deliverySettings,
                                  weeklyHours: {
                                    ...prev.deliverySettings.weeklyHours,
                                    [day]: {
                                      ...hours,
                                      isOpen: e.target.checked,
                                    },
                                  },
                                },
                              }))
                            }
                            className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                          />
                          <span className="text-sm text-gray-600">Ανοιχτά</span>
                        </div>

                        {hours.isOpen && (
                          <div className="flex flex-col gap-2 ml-4">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">
                                  Άνοιγμα
                                </label>
                                <input
                                  type="time"
                                  value={hours.start}
                                  onChange={(e) =>
                                    setSettings((prev) => ({
                                      ...prev,
                                      deliverySettings: {
                                        ...prev.deliverySettings,
                                        weeklyHours: {
                                          ...prev.deliverySettings.weeklyHours,
                                          [day]: {
                                            ...hours,
                                            start: e.target.value,
                                          },
                                        },
                                      },
                                    }))
                                  }
                                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                                />
                                <span className="text-xs text-gray-400 mt-1">
                                  {formatTime24hExplanation(hours.start)}
                                </span>
                              </div>

                              <span className="text-gray-500 mt-4">-</span>

                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">
                                  Κλείσιμο
                                </label>
                                <input
                                  type="time"
                                  value={hours.end}
                                  onChange={(e) =>
                                    setSettings((prev) => ({
                                      ...prev,
                                      deliverySettings: {
                                        ...prev.deliverySettings,
                                        weeklyHours: {
                                          ...prev.deliverySettings.weeklyHours,
                                          [day]: {
                                            ...hours,
                                            end: e.target.value,
                                          },
                                        },
                                      },
                                    }))
                                  }
                                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                                />
                                <span className="text-xs text-gray-400 mt-1">
                                  {formatTime24hExplanation(hours.end)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {!hours.isOpen && (
                          <div className="ml-4 text-sm text-red-500 font-medium">
                            Κλειστά
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ακτίνα Διανομής (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.5"
                    value={settings.deliverySettings.radius}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        deliverySettings: {
                          ...prev.deliverySettings,
                          radius: parseFloat(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Κόστος Delivery (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={settings.deliverySettings.fee}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        deliverySettings: {
                          ...prev.deliverySettings,
                          fee: parseFloat(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Distance Validation Toggle */}
              <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[#C9AC7A]" />
                      Έλεγχος Απόστασης με Google Maps
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ενεργοποίηση/Απενεργοποίηση του αυτόματου ελέγχου
                      απόστασης παράδοσης
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.deliverySettings.enableDistanceValidation ??
                        true
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          deliverySettings: {
                            ...prev.deliverySettings,
                            enableDistanceValidation: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D9C9B0] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#C9AC7A]"></div>
                  </label>
                </div>
              </div>

              {/* Note: Delivery testing moved to checkout page with DeliveryMapChecker component */}
              <div className="bg-gradient-to-r from-[#F5F0E8] to-[#F2EBE0] rounded-lg p-6 border border-[#D9C9B0]">
                <h3 className="text-lg font-semibold text-[#8B6B38] mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#C9AC7A]" />
                  Πληροφορίες Παράδοσης
                </h3>
                <p className="text-sm text-[#9F7D41] mb-4">
                  {settings.deliverySettings.enableDistanceValidation
                    ? "Ο έλεγχος διαθεσιμότητας παράδοσης γίνεται αυτόματα στη σελίδα checkout με το Google Maps API για μέγιστη ακρίβεια."
                    : "Ο έλεγχος απόστασης είναι απενεργοποιημένος. Οι πελάτες μπορούν να παραγγείλουν χωρίς περιορισμό απόστασης."}
                </p>
                <div className="bg-white rounded-lg p-4 border border-[#D9C9B0]">
                  <p className="text-sm text-gray-600">
                    <strong>Ακτίνα παράδοσης:</strong>{" "}
                    {settings.deliverySettings.radius}km από το κατάστημα
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Κατάσταση:</strong>{" "}
                    <span
                      className={
                        settings.deliverySettings.enableDistanceValidation
                          ? "text-green-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {settings.deliverySettings.enableDistanceValidation
                        ? "Ενεργό"
                        : "Ανενεργό"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FaSave />
                {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
              </button>
            </div>
          </div>
        );

      case "popups":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaBullhorn className="text-[#C9AC7A]" />
                Popups & Ανακοινώσεις
              </h2>
              <button
                onClick={() => setShowPopupForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaPlus />
                Νέο Popup
              </button>
            </div>

            <div className="space-y-3">
              {popups.map((popup) => (
                <div
                  key={popup.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{popup.title}</h3>
                      <p className="text-sm text-gray-600 truncate">
                        {popup.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Από: {popup.startDate}</span>
                        <span>Έως: {popup.endDate}</span>
                        <span
                          className={`px-2 py-1 rounded-full ${
                            popup.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {popup.isActive ? "Ενεργό" : "Ανενεργό"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editPopup(popup)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => deletePopup(popup.id!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {popups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FaBullhorn className="mx-auto text-4xl mb-2" />
                  <p>Δεν υπάρχουν popups</p>
                </div>
              )}
            </div>
          </div>
        );

      case "customer":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaUsers className="text-[#C9AC7A]" />
              Ρυθμίσεις Τιμοκαταλόγου
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Τιμοκατάλογος για Πελάτες
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Επιλέξτε ποιον τιμοκατάλογο θα βλέπουν οι πελάτες στην
                  ιστοσελίδα παραγγελιών
                </p>
                <PriceListSelector
                  selectedPriceListId={
                    settings.customerSettings?.selectedPriceListId || ""
                  }
                  onPriceListChange={(priceListId: string) => {
                    setSettings((prev) => ({
                      ...prev,
                      customerSettings: {
                        ...prev.customerSettings,
                        selectedPriceListId: priceListId,
                      },
                    }));
                  }}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FaSave />
                {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
              </button>
            </div>
          </div>
        );

      case "payments":
        // Ensure paymentSettings exists to prevent errors
        if (!settings.paymentSettings) {
          return (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9AC7A] mx-auto mb-2"></div>
                  <p className="text-slate-500">
                    Φόρτωση ρυθμίσεων πληρωμών...
                  </p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaCreditCard className="text-[#C9AC7A]" />
              Ρυθμίσεις Πληρωμών
            </h2>

            <div className="space-y-6">
              {/* Payment Methods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Διαθέσιμες Μέθοδοι Πληρωμής
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="cashOnDelivery"
                      checked={
                        settings.paymentSettings?.enabledMethods
                          ?.cashOnDelivery || false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentSettings: {
                            ...prev.paymentSettings,
                            enabledMethods: {
                              ...prev.paymentSettings.enabledMethods,
                              cashOnDelivery: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                    />
                    <label
                      htmlFor="cashOnDelivery"
                      className="text-sm font-medium text-gray-700"
                    >
                      💵 Πληρωμή στον Διανομέα (Μετρητά)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="creditCard"
                      checked={
                        settings.paymentSettings?.enabledMethods?.creditCard ||
                        false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentSettings: {
                            ...prev.paymentSettings,
                            enabledMethods: {
                              ...prev.paymentSettings.enabledMethods,
                              creditCard: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                    />
                    <label
                      htmlFor="creditCard"
                      className="text-sm font-medium text-gray-700"
                    >
                      💳 Πληρωμή με Κάρτα (Viva Wallet)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="iris"
                      checked={
                        settings.paymentSettings?.enabledMethods?.iris || false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentSettings: {
                            ...prev.paymentSettings,
                            enabledMethods: {
                              ...prev.paymentSettings.enabledMethods,
                              iris: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                    />
                    <label
                      htmlFor="iris"
                      className="text-sm font-medium text-gray-700"
                    >
                      🏦 Πληρωμή με IRIS (Viva Wallet)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="paypal"
                      checked={
                        settings.paymentSettings?.enabledMethods?.paypal ||
                        false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentSettings: {
                            ...prev.paymentSettings,
                            enabledMethods: {
                              ...prev.paymentSettings.enabledMethods,
                              paypal: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                    />
                    <label
                      htmlFor="paypal"
                      className="text-sm font-medium text-gray-700"
                    >
                      🟦 PayPal
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="applePay"
                      checked={
                        settings.paymentSettings?.enabledMethods?.applePay ||
                        false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentSettings: {
                            ...prev.paymentSettings,
                            enabledMethods: {
                              ...prev.paymentSettings.enabledMethods,
                              applePay: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                    />
                    <label
                      htmlFor="applePay"
                      className="text-sm font-medium text-gray-700"
                    >
                      🍎 Apple Pay
                    </label>
                  </div>
                </div>
              </div>

              {/* Viva Wallet Configuration */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Ρυθμίσεις Viva Wallet
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="vivaEnabled"
                      checked={
                        settings.paymentSettings?.vivaWallet?.enabled || false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentSettings: {
                            ...prev.paymentSettings,
                            vivaWallet: {
                              ...prev.paymentSettings.vivaWallet,
                              enabled: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                    />
                    <label
                      htmlFor="vivaEnabled"
                      className="text-sm font-medium text-gray-700"
                    >
                      Ενεργοποίηση Viva Wallet
                    </label>
                  </div>
                </div>

                {settings.paymentSettings?.vivaWallet?.enabled && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Merchant ID
                        </label>
                        <input
                          type="text"
                          value={
                            settings.paymentSettings?.vivaWallet?.merchantId ||
                            ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  merchantId: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="π.χ. 12345678-1234-1234-1234-123456789012"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Source Code
                        </label>
                        <input
                          type="text"
                          value={
                            settings.paymentSettings?.vivaWallet?.sourceCode ||
                            ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  sourceCode: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="π.χ. 1234"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={
                            settings.paymentSettings?.vivaWallet?.clientId || ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  clientId: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="Client ID από το Viva Wallet"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Secret
                        </label>
                        <input
                          type="password"
                          value={
                            settings.paymentSettings?.vivaWallet
                              ?.clientSecret || ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  clientSecret: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="Client Secret από το Viva Wallet"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={
                            settings.paymentSettings?.vivaWallet?.apiKey || ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  apiKey: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="API Key από το Viva Wallet"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Success URL
                        </label>
                        <input
                          type="url"
                          value={
                            settings.paymentSettings?.vivaWallet?.successUrl ||
                            ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  successUrl: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="https://yourdomain.com/payment-return"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Failure URL
                        </label>
                        <input
                          type="url"
                          value={
                            settings.paymentSettings?.vivaWallet?.failureUrl ||
                            ""
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  failureUrl: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                          placeholder="https://yourdomain.com/payment-return"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="testMode"
                          checked={
                            settings.paymentSettings?.vivaWallet?.testMode ||
                            false
                          }
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              paymentSettings: {
                                ...prev.paymentSettings,
                                vivaWallet: {
                                  ...prev.paymentSettings.vivaWallet,
                                  testMode: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="w-4 h-4 text-[#C9AC7A] bg-gray-100 border-gray-300 rounded focus:ring-[#C9AC7A]"
                        />
                        <label
                          htmlFor="testMode"
                          className="text-sm font-medium text-gray-700"
                        >
                          Test Mode (Sandbox)
                        </label>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <FaGlobe />
                        <span className="text-sm font-medium">
                          Οδηγίες Ρύθμισης
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Για να ρυθμίσετε το Viva Wallet, χρειάζεστε έναν
                        λογαριασμό merchant. Τα στοιχεία μπορείτε να τα βρείτε
                        στο Viva Wallet Dashboard → Settings → API Access. Το
                        Test Mode χρησιμοποιεί το sandbox environment για
                        δοκιμές.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FaSave />
                {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
              </button>
            </div>
          </div>
        );

      case "reservations":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaCalendarAlt className="text-[#C9AC7A]" />
              Ρυθμίσεις Κρατήσεων
            </h2>

            <div className="space-y-6">
              {/* Enable Reservations */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Ενεργοποίηση Κρατήσεων
                  </h3>
                  <p className="text-sm text-gray-600">
                    Επιτρέπει στους πελάτες να κάνουν κρατήσεις online
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.reservationSettings?.enabled || false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reservationSettings: {
                          ...settings.reservationSettings!,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D9C9B0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9AC7A]"></div>
                </label>
              </div>

              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Μέγιστος αριθμός ατόμων
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.reservationSettings?.maxGuests || 12}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reservationSettings: {
                          ...settings.reservationSettings!,
                          maxGuests: parseInt(e.target.value) || 12,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9AC7A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ημέρες προκράτησης (μέγιστο)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={
                      settings.reservationSettings?.advanceBookingDays || 30
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reservationSettings: {
                          ...settings.reservationSettings!,
                          advanceBookingDays: parseInt(e.target.value) || 30,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9AC7A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ώρες ακύρωσης (ελάχιστο)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="48"
                    value={settings.reservationSettings?.cancellationHours || 2}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reservationSettings: {
                          ...settings.reservationSettings!,
                          cancellationHours: parseInt(e.target.value) || 2,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9AC7A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Λεπτά διατήρησης τραπεζιού
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.reservationSettings?.tableHoldMinutes || 15}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reservationSettings: {
                          ...settings.reservationSettings!,
                          tableHoldMinutes: parseInt(e.target.value) || 15,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9AC7A]"
                  />
                </div>
              </div>

              {/* Deposit Settings */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Προκαταβολή
                </h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Απαίτηση προκαταβολής
                    </h4>
                    <p className="text-sm text-gray-600">
                      Για κρατήσεις άνω των 8 ατόμων
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.reservationSettings?.depositRequired || false
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          reservationSettings: {
                            ...settings.reservationSettings!,
                            depositRequired: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D9C9B0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9AC7A]"></div>
                  </label>
                </div>

                {settings.reservationSettings?.depositRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ποσό προκαταβολής (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.reservationSettings?.depositAmount || 0}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          reservationSettings: {
                            ...settings.reservationSettings!,
                            depositAmount: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9AC7A]"
                    />
                  </div>
                )}
              </div>

              {/* Requirements */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Απαιτήσεις
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        Υποχρεωτικό τηλέφωνο
                      </h4>
                      <p className="text-sm text-gray-600">
                        Απαιτεί τηλέφωνο για κρατήσεις
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          settings.reservationSettings?.requirePhone || true
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            reservationSettings: {
                              ...settings.reservationSettings!,
                              requirePhone: e.target.checked,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D9C9B0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9AC7A]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        Υποχρεωτικό email
                      </h4>
                      <p className="text-sm text-gray-600">
                        Απαιτεί email για κρατήσεις
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          settings.reservationSettings?.requireEmail || false
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            reservationSettings: {
                              ...settings.reservationSettings!,
                              requireEmail: e.target.checked,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D9C9B0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9AC7A]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        Αυτόματη επιβεβαίωση
                      </h4>
                      <p className="text-sm text-gray-600">
                        Επιβεβαιώνει αυτόματα τις κρατήσεις
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          settings.reservationSettings?.autoConfirm || false
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            reservationSettings: {
                              ...settings.reservationSettings!,
                              autoConfirm: e.target.checked,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D9C9B0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9AC7A]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <FaCalendarAlt className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Πληροφορίες Κρατήσεων
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          Οι κρατήσεις εμφανίζονται στη σελίδα διαχείρισης
                          κρατήσεων
                        </li>
                        <li>
                          Αυτόματη αποστολή email επιβεβαίωσης στους πελάτες
                        </li>
                        <li>Δυνατότητα επεξεργασίας και ακύρωσης κρατήσεων</li>
                        <li>Στατιστικά και αναφορές κρατήσεων</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FaSave />
                {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
              </button>
            </div>
          </div>
        );

      case "messages":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FaComments className="text-[#C9AC7A]" />
                Μηνύματα Επικοινωνίας
              </h2>

              {/* Filter Buttons */}
              <div className="flex gap-2">
                {(["all", "new", "read", "replied"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setMessageFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      messageFilter === filter
                        ? "bg-[#C9AC7A] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter === "all" ? "Όλα" : getStatusText(filter)}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages List */}
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9AC7A] mx-auto mb-4"></div>
                  <p className="text-gray-600">Φόρτωση μηνυμάτων...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <FaComments className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Δεν υπάρχουν μηνύματα
                </h3>
                <p className="text-gray-600">
                  Τα μηνύματα από τη φόρμα επικοινωνίας θα εμφανίζονται εδώ
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      message.status === "new"
                        ? "border-red-200 bg-red-50/30"
                        : "border-gray-200"
                    }`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-800">
                            {message.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                              message.status,
                            )}`}
                          >
                            {getStatusIcon(message.status)}
                            {getStatusText(message.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Θέμα:</span>{" "}
                          {message.subject}
                        </div>

                        <p className="text-gray-700 line-clamp-2 mb-2">
                          {message.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📧 {message.email}</span>
                          {message.phone && <span>📱 {message.phone}</span>}
                          <span>🕒 {formatMessageDate(message.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMessageStatus(message.id, "read");
                          }}
                          className="p-2 text-gray-400 hover:text-[#C9AC7A] transition-colors"
                          title="Σημείωση ως αναγνωσμένο"
                        >
                          <FaCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `mailto:${message.email}?subject=Re: ${message.subject}`,
                              "_blank",
                            );
                            updateMessageStatus(message.id, "replied");
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Απάντηση"
                        >
                          <FaReply className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το μήνυμα;",
                              )
                            ) {
                              deleteMessage(message.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Διαγραφή μηνύματος"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "maintenance":
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaTools className="text-[#C9AC7A]" />
              Maintenance Mode
            </h2>

            <div className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-6 border-2 border-[#D9C9B0]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FaTools className="text-[#C9AC7A]" />
                      Κατάσταση Maintenance
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ενεργοποιήστε το maintenance mode για να εμφανίσετε μήνυμα
                      συντήρησης στους επισκέπτες
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSettings((prev) => ({
                        ...prev,
                        maintenanceMode: {
                          enabled: !prev.maintenanceMode?.enabled,
                          title:
                            prev.maintenanceMode?.title ||
                            "Είμαστε σε Συντήρηση",
                          message:
                            prev.maintenanceMode?.message ||
                            "Η ιστοσελίδα μας βρίσκεται προσωρινά σε συντήρηση. Θα επιστρέψουμε σύντομα!",
                          backgroundImage:
                            prev.maintenanceMode?.backgroundImage,
                          showLogo: prev.maintenanceMode?.showLogo ?? true,
                          showContactInfo:
                            prev.maintenanceMode?.showContactInfo ?? true,
                          estimatedEndTime:
                            prev.maintenanceMode?.estimatedEndTime,
                        },
                      }));
                    }}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                      settings.maintenanceMode?.enabled
                        ? "bg-red-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                        settings.maintenanceMode?.enabled
                          ? "translate-x-8"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {settings.maintenanceMode?.enabled && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold flex items-center gap-2">
                      <FaTools />
                      Το Maintenance Mode είναι ΕΝΕΡΓΟ - Οι επισκέπτες βλέπουν
                      τη σελίδα συντήρησης
                    </p>
                  </div>
                )}
              </div>

              {/* Maintenance Settings */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-6 border-2 border-[#D9C9B0]">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Ρυθμίσεις Σελίδας Συντήρησης
                </h3>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τίτλος
                    </label>
                    <input
                      type="text"
                      value={settings.maintenanceMode?.title || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          maintenanceMode: {
                            ...prev.maintenanceMode!,
                            title: e.target.value,
                          },
                        }))
                      }
                      placeholder="Είμαστε σε Συντήρηση"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Μήνυμα
                    </label>
                    <textarea
                      value={settings.maintenanceMode?.message || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          maintenanceMode: {
                            ...prev.maintenanceMode!,
                            message: e.target.value,
                          },
                        }))
                      }
                      placeholder="Η ιστοσελίδα μας βρίσκεται προσωρινά σε συντήρηση..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Estimated End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Εκτιμώμενη Ώρα Επαναλειτουργίας (προαιρετικό)
                    </label>
                    <input
                      type="datetime-local"
                      value={settings.maintenanceMode?.estimatedEndTime || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          maintenanceMode: {
                            ...prev.maintenanceMode!,
                            estimatedEndTime: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                    />
                  </div>

                  {/* Background Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Image
                    </label>

                    {settings.maintenanceMode?.backgroundImage ? (
                      <div className="space-y-3">
                        <div className="relative group">
                          <img
                            src={settings.maintenanceMode.backgroundImage}
                            alt="Maintenance Background"
                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                          />
                          <button
                            onClick={() =>
                              setSettings((prev) => ({
                                ...prev,
                                maintenanceMode: {
                                  ...prev.maintenanceMode!,
                                  backgroundImage: undefined,
                                },
                              }))
                            }
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedBase64 =
                                  await compressAndConvertImage(file);
                                setSettings((prev) => ({
                                  ...prev,
                                  maintenanceMode: {
                                    ...prev.maintenanceMode!,
                                    backgroundImage: compressedBase64,
                                  },
                                }));
                                success("Background image ενημερώθηκε!");
                              } catch (err) {
                                error(
                                  "Σφάλμα κατά την επεξεργασία της εικόνας.",
                                );
                              }
                            }
                          }}
                          className="hidden"
                          id="maintenance-bg-replace"
                        />
                        <label
                          htmlFor="maintenance-bg-replace"
                          className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                        >
                          <FaEdit />
                          Αλλαγή Background
                        </label>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-[#C9AC7A] rounded-lg p-6 bg-white">
                        <div className="text-center">
                          <FaImage className="mx-auto text-[#C9AC7A] text-4xl mb-3" />
                          <p className="text-gray-700 font-medium mb-4">
                            Προσθέστε Background Image
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressedBase64 =
                                    await compressAndConvertImage(file);
                                  setSettings((prev) => ({
                                    ...prev,
                                    maintenanceMode: {
                                      ...prev.maintenanceMode!,
                                      backgroundImage: compressedBase64,
                                    },
                                  }));
                                  success("Background image προστέθηκε!");
                                } catch (err) {
                                  error(
                                    "Σφάλμα κατά την επεξεργασία της εικόνας.",
                                  );
                                }
                              }
                            }}
                            className="hidden"
                            id="maintenance-bg-upload"
                          />
                          <label
                            htmlFor="maintenance-bg-upload"
                            className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                          >
                            <FaPlus />
                            Επιλογή Εικόνας
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Display Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        id="showLogo"
                        checked={settings.maintenanceMode?.showLogo ?? true}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            maintenanceMode: {
                              ...prev.maintenanceMode!,
                              showLogo: e.target.checked,
                            },
                          }))
                        }
                        className="w-5 h-5 text-[#C9AC7A] border-gray-300 rounded focus:ring-[#C9AC7A]"
                      />
                      <label
                        htmlFor="showLogo"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Εμφάνιση Logo
                      </label>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        id="showContactInfo"
                        checked={
                          settings.maintenanceMode?.showContactInfo ?? true
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            maintenanceMode: {
                              ...prev.maintenanceMode!,
                              showContactInfo: e.target.checked,
                            },
                          }))
                        }
                        className="w-5 h-5 text-[#C9AC7A] border-gray-300 rounded focus:ring-[#C9AC7A]"
                      />
                      <label
                        htmlFor="showContactInfo"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Εμφάνιση Στοιχείων Επικοινωνίας
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Button */}
              <div className="bg-gradient-to-br from-[#F5F0E8] to-[#F2EBE0] rounded-xl p-4 border-2 border-[#D9C9B0]">
                <a
                  href="/maintenance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  <FaEye />
                  Προεπισκόπηση Σελίδας Maintenance
                </a>
              </div>

              {/* Save Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-[#C9AC7A] hover:bg-[#9F7D41] disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                >
                  <FaSave />
                  {saving ? "Αποθηκεύεται..." : "Αποθήκευση Ρυθμίσεων"}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9AC7A]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Απαιτείται Σύνδεση
          </h2>
          <p className="text-gray-600">
            Πρέπει να είστε συνδεδεμένος για να διαχειριστείτε τις ρυθμίσεις του
            website.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#F2EBE0] to-[#F0E8DC]">
      <div className="w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Διαχείριση Website
            </h1>
            <p className="text-slate-600">
              Ρυθμίσεις και περιεχόμενο της ιστοσελίδας πελατών
            </p>
          </div>

          {/* Preview Site Button */}
          <button
            onClick={() => {
              const baseUrl =
                typeof window !== "undefined"
                  ? window.location.origin
                  : "http://localhost:3000";
              window.open(`${baseUrl}`, "_blank");
            }}
            className="bg-gradient-to-r from-[#C9AC7A] to-[#9F7D41] hover:from-[#B8986A] hover:to-[#9F7D41] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <FaEye className="text-sm" />
            <span className="hidden sm:inline">Προεπισκόπηση Site</span>
            <span className="sm:hidden">Site</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white/50 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#C9AC7A] to-[#9F7D41] text-white shadow-lg"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-800"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Message Detail Modal - Outside main container */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Μήνυμα από {selectedMessage.name}
                </h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Όνομα
                    </label>
                    <p className="text-gray-900">{selectedMessage.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {selectedMessage.email}
                    </a>
                  </div>

                  {selectedMessage.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Τηλέφωνο
                      </label>
                      <a
                        href={`tel:${selectedMessage.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {selectedMessage.phone}
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Θέμα
                    </label>
                    <p className="text-gray-900">{selectedMessage.subject}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ημερομηνία
                    </label>
                    <p className="text-gray-900">
                      {formatMessageDate(selectedMessage.createdAt)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Κατάσταση
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${getStatusColor(
                        selectedMessage.status,
                      )}`}
                    >
                      {getStatusIcon(selectedMessage.status)}
                      {getStatusText(selectedMessage.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Μήνυμα
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      window.open(
                        `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`,
                        "_blank",
                      );
                      updateMessageStatus(selectedMessage.id, "replied");
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <FaReply />
                    Απάντηση
                  </button>

                  <button
                    onClick={() =>
                      updateMessageStatus(selectedMessage.id, "read")
                    }
                    className="bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <FaCheck />
                    Σημείωση ως Αναγνωσμένο
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
