"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FaTruck,
  FaKey,
  FaCog,
  FaStore,
  FaClock,
  FaUtensils,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSync,
  FaToggleOn,
  FaToggleOff,
  FaGlobe,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaShoppingCart,
  FaBell,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSave,
  FaEye,
  FaEyeSlash,
  FaDownload,
} from "react-icons/fa";

// Types based on Wolt API documentation
type WoltCredentials = {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  venueId: string;
  environment: "production" | "test";
  baseUrl: string;
};

type WoltVenueConfig = {
  externalVenueId: string;
  isOnline: boolean;
  isOpen: boolean;
  prepTimeSeconds: number;
  preOrderPrepTimeSeconds: number;
  maxAcceptancePrepTimeSeconds: number;
  enableOrderApi: boolean;
  enableMenuApi: boolean;
  enableTimeSlotsApi: boolean;
};

type WoltMenuSettings = {
  currency: string;
  primaryLanguage: string;
  autoSyncMenu: boolean;
  syncInterval: number; // minutes
  enableInventorySync: boolean;
  enablePriceSync: boolean;
  enableWoltToPosSync: boolean;
  defaultVatPercentage: number;
};

type WoltOrderSettings = {
  autoAcceptOrders: boolean;
  orderNotificationSound: boolean;
  enableOrderTracking: boolean;
  enableSelfDelivery: boolean;
  defaultDeliveryTime: number; // minutes
  enablePreOrders: boolean;
  enableRefunds: boolean;
  enableItemReplacements: boolean;
};

type WoltTimeSlot = {
  start: string;
  end: string;
  capacity: {
    type: "NUMBER_OF_ORDERS";
    maximum: number;
  };
};

type WoltTimeSlotConfig = {
  enableTimeSlots: boolean;
  deliveryLeadTime: number; // seconds
  schedule: {
    monday: WoltTimeSlot[];
    tuesday: WoltTimeSlot[];
    wednesday: WoltTimeSlot[];
    thursday: WoltTimeSlot[];
    friday: WoltTimeSlot[];
    saturday: WoltTimeSlot[];
    sunday: WoltTimeSlot[];
  };
};

type WoltDeliveryArea = {
  lat: number;
  lng: number;
};

type WoltOpeningHours = {
  openingDay: string;
  openingTime: string;
  closingDay: string;
  closingTime: string;
};

type WoltVenueInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: WoltOpeningHours[];
  deliveryArea: WoltDeliveryArea[];
  specialHours: Array<{
    openingDate: string;
    openingTime: string;
    closingDate: string;
    closingTime: string;
  }>;
};

type WoltSettings = {
  credentials: WoltCredentials;
  venueConfig: WoltVenueConfig;
  menuSettings: WoltMenuSettings;
  orderSettings: WoltOrderSettings;
  timeSlotConfig: WoltTimeSlotConfig;
  venueInfo: WoltVenueInfo;
  webhookUrl: string;
  enableWebhooks: boolean;
  lastSync: string;
  connectionStatus: "connected" | "disconnected" | "error" | "testing";
};

const WoltSettings: React.FC = () => {
  const [settings, setSettings] = useState<WoltSettings>({
    credentials: {
      apiKey: "",
      clientId: "",
      clientSecret: "",
      venueId: "",
      environment: "test",
      baseUrl: "https://pos-integration-service.development.dev.woltapi.com",
    },
    venueConfig: {
      externalVenueId: "",
      isOnline: false,
      isOpen: false,
      prepTimeSeconds: 900,
      preOrderPrepTimeSeconds: 900,
      maxAcceptancePrepTimeSeconds: 1500,
      enableOrderApi: true,
      enableMenuApi: true,
      enableTimeSlotsApi: false,
    },
    menuSettings: {
      currency: "EUR",
      primaryLanguage: "el",
      autoSyncMenu: false,
      syncInterval: 60,
      enableInventorySync: true,
      enablePriceSync: true,
      enableWoltToPosSync: false,
      defaultVatPercentage: 24,
    },
    orderSettings: {
      autoAcceptOrders: false,
      orderNotificationSound: true,
      enableOrderTracking: true,
      enableSelfDelivery: false,
      defaultDeliveryTime: 30,
      enablePreOrders: true,
      enableRefunds: true,
      enableItemReplacements: true,
    },
    timeSlotConfig: {
      enableTimeSlots: false,
      deliveryLeadTime: 0,
      schedule: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
    },
    venueInfo: {
      name: "",
      address: "",
      phone: "",
      email: "",
      openingHours: [],
      deliveryArea: [],
      specialHours: [],
    },
    webhookUrl: "",
    enableWebhooks: true,
    lastSync: "",
    connectionStatus: "disconnected",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState("credentials");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const woltDoc = await getDoc(doc(db, "config", "wolt"));
        if (woltDoc.exists()) {
          const data = woltDoc.data();
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Error loading Wolt settings:", error);
        setMessage("Σφάλμα φόρτωσης ρυθμίσεων Wolt");
      }
    };

    loadSettings();
  }, []);

  // Save settings to Firestore
  const saveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "config", "wolt"), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      setMessage("Οι ρυθμίσεις Wolt αποθηκεύτηκαν επιτυχώς!");
    } catch (error) {
      console.error("Error saving Wolt settings:", error);
      setMessage("Σφάλμα αποθήκευσης ρυθμίσεων");
    } finally {
      setLoading(false);
    }
  };

  // Test Wolt API connection
  const testConnection = async () => {
    if (!settings.credentials.apiKey || !settings.credentials.venueId) {
      setMessage("Παρακαλώ συμπληρώστε API Key και Venue ID");
      return;
    }

    setTestingConnection(true);
    setSettings((prev) => ({ ...prev, connectionStatus: "testing" }));

    try {
      // Test venue status endpoint
      const response = await fetch(
        `/api/wolt/venue/${settings.credentials.venueId}/status`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${settings.credentials.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          connectionStatus: "connected",
          lastSync: new Date().toISOString(),
          venueInfo: {
            ...prev.venueInfo,
            name: data.contact_details?.name || prev.venueInfo.name,
            address: data.contact_details?.address || prev.venueInfo.address,
            phone: data.contact_details?.phone || prev.venueInfo.phone,
          },
          venueConfig: {
            ...prev.venueConfig,
            isOnline: data.status?.is_online || false,
            isOpen: data.status?.is_open || false,
          },
        }));
        setMessage("✅ Σύνδεση με Wolt επιτυχής!");
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      setSettings((prev) => ({ ...prev, connectionStatus: "error" }));
      setMessage(`❌ Σφάλμα σύνδεσης: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Update venue status (online/offline)
  const updateVenueStatus = async (status: "ONLINE" | "OFFLINE") => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/wolt/venue/${settings.credentials.venueId}/online`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${settings.credentials.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        setSettings((prev) => ({
          ...prev,
          venueConfig: {
            ...prev.venueConfig,
            isOnline: status === "ONLINE",
          },
        }));
        setMessage(
          `Το κατάστημα είναι τώρα ${
            status === "ONLINE" ? "online" : "offline"
          } στο Wolt`
        );
      } else {
        throw new Error(`Σφάλμα ενημέρωσης status: ${response.status}`);
      }
    } catch (error: any) {
      setMessage(`Σφάλμα: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: "credentials", label: "API Credentials", icon: FaKey },
    { id: "venue", label: "Venue Configuration", icon: FaStore },
    { id: "menu", label: "Menu Settings", icon: FaUtensils },
    { id: "orders", label: "Order Settings", icon: FaShoppingCart },
    { id: "timeslots", label: "Time Slots", icon: FaClock },
    { id: "webhooks", label: "Webhooks", icon: FaBell },
  ];

  const renderCredentials = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaInfoCircle className="text-blue-500" />
          <span className="font-medium text-blue-800">
            Wolt API Credentials
          </span>
        </div>
        <p className="text-sm text-blue-700">
          Επικοινωνήστε με τον Wolt account manager σας για να λάβετε τα API
          credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Environment
          </label>
          <select
            value={settings.credentials.environment}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                credentials: {
                  ...prev.credentials,
                  environment: e.target.value as "production" | "test",
                  baseUrl:
                    e.target.value === "production"
                      ? "https://pos-integration-service.wolt.com"
                      : "https://pos-integration-service.development.dev.woltapi.com",
                },
              }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="test">Test Environment</option>
            <option value="production">Production</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Venue ID *
          </label>
          <input
            type="text"
            value={settings.credentials.venueId}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                credentials: { ...prev.credentials, venueId: e.target.value },
              }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Venue ID από το Wolt"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API Key *
        </label>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={settings.credentials.apiKey}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                credentials: { ...prev.credentials, apiKey: e.target.value },
              }))
            }
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="JWT Token από το Wolt"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showApiKey ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={testConnection}
          disabled={testingConnection || !settings.credentials.apiKey}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {testingConnection ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaCheckCircle />
          )}
          Test Connection
        </button>

        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              settings.connectionStatus === "connected"
                ? "bg-green-500"
                : settings.connectionStatus === "error"
                ? "bg-red-500"
                : settings.connectionStatus === "testing"
                ? "bg-yellow-500 animate-pulse"
                : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-600">
            {settings.connectionStatus === "connected"
              ? "Συνδεδεμένο"
              : settings.connectionStatus === "error"
              ? "Σφάλμα σύνδεσης"
              : settings.connectionStatus === "testing"
              ? "Δοκιμή σύνδεσης..."
              : "Μη συνδεδεμένο"}
          </span>
        </div>
      </div>
    </div>
  );

  const renderMenuSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Βασικές Ρυθμίσεις Menu</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Νόμισμα
            </label>
            <select
              value={settings.menuSettings.currency}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  menuSettings: {
                    ...prev.menuSettings,
                    currency: e.target.value,
                  },
                }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Κύρια Γλώσσα
            </label>
            <select
              value={settings.menuSettings.primaryLanguage}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  menuSettings: {
                    ...prev.menuSettings,
                    primaryLanguage: e.target.value,
                  },
                }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="el">Ελληνικά (el)</option>
              <option value="en">English (en)</option>
              <option value="de">Deutsch (de)</option>
              <option value="fr">Français (fr)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Προεπιλεγμένο ΦΠΑ (%)
            </label>
            <input
              type="number"
              value={settings.menuSettings.defaultVatPercentage}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  menuSettings: {
                    ...prev.menuSettings,
                    defaultVatPercentage: parseInt(e.target.value) || 24,
                  },
                }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="30"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Αυτόματος Συγχρονισμός</h4>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium">
                Αυτόματος συγχρονισμός menu
              </span>
              <p className="text-xs text-gray-500">
                Συγχρονισμός προϊόντων με Wolt
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.menuSettings.autoSyncMenu}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  menuSettings: {
                    ...prev.menuSettings,
                    autoSyncMenu: e.target.checked,
                  },
                }))
              }
              className="rounded text-blue-500 focus:ring-blue-500"
            />
          </div>

          {settings.menuSettings.autoSyncMenu && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Διάστημα συγχρονισμού (λεπτά)
              </label>
              <input
                type="number"
                value={settings.menuSettings.syncInterval}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    menuSettings: {
                      ...prev.menuSettings,
                      syncInterval: parseInt(e.target.value) || 60,
                    },
                  }))
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="15"
                max="1440"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">
                Συγχρονισμός αποθέματος (POS → Wolt)
              </span>
              <input
                type="checkbox"
                checked={settings.menuSettings.enableInventorySync}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    menuSettings: {
                      ...prev.menuSettings,
                      enableInventorySync: e.target.checked,
                    },
                  }))
                }
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">
                Συγχρονισμός τιμών (POS → Wolt)
              </span>
              <input
                type="checkbox"
                checked={settings.menuSettings.enablePriceSync}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    menuSettings: {
                      ...prev.menuSettings,
                      enablePriceSync: e.target.checked,
                    },
                  }))
                }
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <span className="text-sm font-medium text-blue-800">
                  Εισαγωγή καταλόγου από Wolt (Wolt → POS)
                </span>
                <p className="text-xs text-blue-600">
                  Χρησιμοποιήστε τον κατάλογο που έχετε στη Wolt
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.menuSettings.enableWoltToPosSync}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    menuSettings: {
                      ...prev.menuSettings,
                      enableWoltToPosSync: e.target.checked,
                    },
                  }))
                }
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {settings.menuSettings.enableWoltToPosSync && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <FaDownload className="text-blue-500" />
                <span className="font-medium text-blue-800">
                  Εισαγωγή Καταλόγου από Wolt
                </span>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Κατεβάστε τον κατάλογό σας από το Wolt και εισάγετέ τον στο POS
                σας. Αυτό θα δημιουργήσει νέα προϊόντα και κατηγορίες βάση των
                δεδομένων της Wolt.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setMessage(
                      "Η εισαγωγή καταλόγου από Wolt θα υλοποιηθεί σύντομα!"
                    )
                  }
                  disabled={loading || !settings.credentials.venueId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaDownload />
                  )}
                  Εισαγωγή Καταλόγου
                </button>
                <button
                  onClick={() =>
                    setMessage("Η προεπισκόπηση θα υλοποιηθεί σύντομα!")
                  }
                  disabled={!settings.credentials.venueId}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  <FaEye />
                  Προεπισκόπηση
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderOrderSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Διαχείριση Παραγγελιών</h4>

          <div className="space-y-3">
            {[
              {
                key: "autoAcceptOrders",
                label: "Αυτόματη αποδοχή παραγγελιών",
                desc: "Αποδοχή χωρίς επιβεβαίωση",
              },
              {
                key: "orderNotificationSound",
                label: "Ήχος ειδοποίησης",
                desc: "Ήχος για νέες παραγγελίες",
              },
              {
                key: "enableOrderTracking",
                label: "Παρακολούθηση παραγγελιών",
                desc: "Real-time tracking",
              },
              {
                key: "enableSelfDelivery",
                label: "Ιδία παράδοση",
                desc: "Self-delivery orders",
              },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={
                    settings.orderSettings[
                      key as keyof WoltOrderSettings
                    ] as boolean
                  }
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      orderSettings: {
                        ...prev.orderSettings,
                        [key]: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Χρόνοι Παράδοσης</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Προεπιλεγμένος χρόνος παράδοσης (λεπτά)
            </label>
            <input
              type="number"
              value={settings.orderSettings.defaultDeliveryTime}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  orderSettings: {
                    ...prev.orderSettings,
                    defaultDeliveryTime: parseInt(e.target.value) || 30,
                  },
                }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="15"
              max="120"
            />
          </div>

          <div className="space-y-3">
            {[
              {
                key: "enablePreOrders",
                label: "Προ-παραγγελίες",
                desc: "Παραγγελίες για μελλοντική παράδοση",
              },
              {
                key: "enableRefunds",
                label: "Επιστροφές χρημάτων",
                desc: "Δυνατότητα refund",
              },
              {
                key: "enableItemReplacements",
                label: "Αντικατάσταση προϊόντων",
                desc: "Αλλαγή προϊόντων σε παραγγελία",
              },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={
                    settings.orderSettings[
                      key as keyof WoltOrderSettings
                    ] as boolean
                  }
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      orderSettings: {
                        ...prev.orderSettings,
                        [key]: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaInfoCircle className="text-blue-500" />
          <span className="font-medium text-blue-800">Wolt Webhooks</span>
        </div>
        <p className="text-sm text-blue-700">
          Οι webhooks επιτρέπουν στο Wolt να στέλνει real-time ειδοποιήσεις για
          νέες παραγγελίες και αλλαγές status.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm font-medium">Ενεργοποίηση Webhooks</span>
            <p className="text-xs text-gray-500">
              Λήψη real-time ειδοποιήσεων από Wolt
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.enableWebhooks}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                enableWebhooks: e.target.checked,
              }))
            }
            className="rounded text-blue-500 focus:ring-blue-500"
          />
        </div>

        {settings.enableWebhooks && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings.webhookUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    webhookUrl: e.target.value,
                  }))
                }
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourdomain.com/api/orders/wolt/webhook"
              />
              <button
                onClick={() => {
                  const url = `${window.location.origin}/api/orders/wolt/webhook`;
                  setSettings((prev) => ({ ...prev, webhookUrl: url }));
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Auto
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Αυτό το URL πρέπει να καταχωρηθεί στο Wolt dashboard
            </p>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaExclamationTriangle className="text-yellow-600" />
          <span className="font-medium text-yellow-800">Σημαντικό</span>
        </div>
        <p className="text-sm text-yellow-700">
          Για να λειτουργήσουν τα webhooks, πρέπει να καταχωρήσετε το webhook
          URL στο Wolt Partner Portal και να ενεργοποιήσετε τα events που θέλετε
          να λαμβάνετε.
        </p>
      </div>
    </div>
  );

  const renderVenueConfig = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Venue Status</h4>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Online Status</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateVenueStatus(
                    settings.venueConfig.isOnline ? "OFFLINE" : "ONLINE"
                  )
                }
                disabled={loading}
                className={`p-2 rounded-lg ${
                  settings.venueConfig.isOnline
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {settings.venueConfig.isOnline ? (
                  <FaToggleOn size={20} />
                ) : (
                  <FaToggleOff size={20} />
                )}
              </button>
              <span className="text-sm">
                {settings.venueConfig.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Preparation Times</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Χρόνος προετοιμασίας (δευτερόλεπτα)
            </label>
            <input
              type="number"
              value={settings.venueConfig.prepTimeSeconds}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  venueConfig: {
                    ...prev.venueConfig,
                    prepTimeSeconds: parseInt(e.target.value) || 900,
                  },
                }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="300"
              max="3600"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-800">API Integrations</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: "enableOrderApi", label: "Order API", icon: FaShoppingCart },
            { key: "enableMenuApi", label: "Menu API", icon: FaUtensils },
            {
              key: "enableTimeSlotsApi",
              label: "Time Slots API",
              icon: FaClock,
            },
          ].map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Icon className="text-blue-500" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <input
                type="checkbox"
                checked={
                  settings.venueConfig[key as keyof WoltVenueConfig] as boolean
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    venueConfig: {
                      ...prev.venueConfig,
                      [key]: e.target.checked,
                    },
                  }))
                }
                className="rounded text-blue-500 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FaTruck className="text-blue-600 text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Wolt Integration
            </h2>
            <p className="text-sm text-gray-600">
              Διαχείριση ρυθμίσεων Wolt API
            </p>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Αποθήκευση
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes("✅") || message.includes("επιτυχώς")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeSection === "credentials" && renderCredentials()}
        {activeSection === "venue" && renderVenueConfig()}
        {activeSection === "menu" && renderMenuSettings()}
        {activeSection === "orders" && renderOrderSettings()}
        {activeSection === "webhooks" && renderWebhooks()}
      </div>
    </div>
  );
};

export default WoltSettings;
