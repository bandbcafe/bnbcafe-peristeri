"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaPhone,
  FaPhoneSlash,
  FaTimes,
  FaUser,
  FaPlus,
  FaHistory,
  FaSpinner,
  FaBell,
  FaCheck,
  FaExclamationTriangle,
  FaBuilding,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUserPlus,
  FaUtensils,
  FaCalendarPlus,
  FaEye,
} from "react-icons/fa";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer } from "@/types/customer";
import { useAuth } from "@/contexts/AuthContext";
import NewCustomerModal from "@/components/customers/NewCustomerModal";
import ReservationModal from "@/components/ReservationModal";

interface CallerIdEvent {
  type: "incoming" | "answered" | "terminated" | "missed";
  caller: string;
  timestamp: string;
  duration?: number;
}

interface IncomingCall {
  id: string;
  phoneNumber: string;
  timestamp: Date;
  duration?: number;
  status: "ringing" | "answered" | "missed" | "ended";
  customerName?: string; // Όνομα πελάτη αν βρεθεί
}

interface CallerIdWidgetProps {
  // Props for Grandstream integration
}

export default function CallerIdWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [activeCalls, setActiveCalls] = useState<IncomingCall[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState<string | null>(
    null
  );
  const [foundCustomers, setFoundCustomers] = useState<{
    [phoneNumber: string]: Customer | null;
  }>({});
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [callHistory, setCallHistory] = useState<
    Array<{
      ts: number;
      type: string;
      caller: string;
      called?: string;
    }>
  >([]);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState(true);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [openedForCalls, setOpenedForCalls] = useState<Set<string>>(new Set()); // Track which calls we've already opened for
  const [selectedPhoneForNewCustomer, setSelectedPhoneForNewCustomer] =
    useState("");
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedCustomerForReservation, setSelectedCustomerForReservation] =
    useState<Customer | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenTsRef = useRef<number>(0);
  const historyInitRef = useRef<boolean>(false);

  // Connect to Server-Sent Events
  const connectToEvents = () => {
    try {
      setConnectionStatus("connecting");

      const eventSource = new EventSource("/api/calls/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "hello") {
            // Connected to SSE stream
          }
        } catch (error) {
          console.error("📞 CallerID: Error parsing event:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("📞 CallerID: EventSource error:", error);
        setConnectionStatus("disconnected");
        eventSource.close();

        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToEvents();
        }, 5000);
      };
    } catch (error) {
      console.error("📞 CallerID: Failed to connect:", error);
      setConnectionStatus("disconnected");
    }
  };

  // Load user preferences from Firestore
  const loadUserPreferences = async () => {
    if (!user?.id) {
      setLoadingPreferences(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const callerIdPrefs = userData.callerIdPreferences || {};
        const autoOpen = callerIdPrefs.autoOpen !== false; // Default true
        setAutoOpenEnabled(autoOpen);
      } else {
        setAutoOpenEnabled(true);
      }
    } catch (error) {
      console.error("❌ Error loading caller ID preferences:", error);
      setAutoOpenEnabled(true); // Default to true on error
    } finally {
      setLoadingPreferences(false);
    }
  };

  // Save user preferences to Firestore
  const saveUserPreferences = async (autoOpen: boolean) => {
    if (!user?.id) return;

    try {
      await updateDoc(doc(db, "users", user.id), {
        "callerIdPreferences.autoOpen": autoOpen,
        "callerIdPreferences.updatedAt": new Date(),
      });
    } catch (error) {
      console.error("❌ Error saving caller ID preferences:", error);
      // Try to create the document if it doesn't exist
      try {
        await setDoc(
          doc(db, "users", user.id),
          {
            callerIdPreferences: {
              autoOpen: autoOpen,
              updatedAt: new Date(),
            },
          },
          { merge: true }
        );
      } catch (createError) {
        console.error("❌ Error creating caller ID preferences:", createError);
      }
    }
  };

  // Search customer by phone number
  const searchCustomerByPhone = async (phoneNumber: string) => {
    try {
      setSearching(true);
      const customersRef = collection(db, "customers");

      // Αναζήτηση στο phone
      const phoneQuery = query(customersRef, where("phone", "==", phoneNumber));
      const phoneSnapshot = await getDocs(phoneQuery);

      let foundCustomer = null;

      if (!phoneSnapshot.empty) {
        // Βρέθηκε στο phone
        const doc = phoneSnapshot.docs[0];
        foundCustomer = { id: doc.id, ...doc.data() } as Customer;
      } else {
        // Αναζήτηση στο mobile αν δεν βρέθηκε στο phone
        const mobileQuery = query(
          customersRef,
          where("mobile", "==", phoneNumber)
        );
        const mobileSnapshot = await getDocs(mobileQuery);

        if (!mobileSnapshot.empty) {
          const doc = mobileSnapshot.docs[0];
          foundCustomer = { id: doc.id, ...doc.data() } as Customer;
        }
      }

      setFoundCustomer(foundCustomer);

      // Ενημέρωση του call με το όνομα του πελάτη
      if (foundCustomer) {
        const customerName =
          `${foundCustomer.firstName} ${foundCustomer.lastName}`.trim() ||
          foundCustomer.companyName;
        setIncomingCalls((prev) =>
          prev.map((call) =>
            call.phoneNumber === phoneNumber ? { ...call, customerName } : call
          )
        );
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      setFoundCustomer(null);
    } finally {
      setSearching(false);
    }
  };

  // Handle new customer creation
  const handleCreateCustomer = (phoneNumber: string) => {
    setSelectedPhoneForNewCustomer(phoneNumber);
    setShowNewCustomerModal(true);
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    // Update the found customers cache
    setFoundCustomers((prev) => ({
      ...prev,
      [selectedPhoneForNewCustomer]: newCustomer,
    }));
    setShowNewCustomerModal(false);
    setSelectedPhoneForNewCustomer("");
  };

  // Handle reservation creation
  const handleCreateReservation = (customer: Customer) => {
    setSelectedCustomerForReservation(customer);
    setShowReservationModal(true);
  };

  const handleReservationSuccess = () => {
    setShowReservationModal(false);
    setSelectedCustomerForReservation(null);
    // Optionally show success message or redirect
  };

  // Real-time history from Firestore - only start after preferences are loaded
  useEffect(() => {
    if (loadingPreferences) return; // Wait for preferences to load

    const q = query(collection(db, "calls"), orderBy("ts", "desc"), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Array<{
          ts: number;
          type: string;
          caller: string;
          called?: string;
        }> = [];
        snap.forEach((d) => {
          const v = d.data() as any;
          if (v && typeof v.ts === "number" && v.type && v.caller) {
            rows.push({
              ts: v.ts,
              type: String(v.type),
              caller: String(v.caller),
              called: v.called ? String(v.called) : undefined,
            });
          }
        });

        // Already descending due to query; ensure
        rows.sort((a, b) => b.ts - a.ts);

        // Ενημέρωση του ιστορικού κλήσεων (όπως στο crm-episkopakis - χωρίς ομαδοποίηση)
        setCallHistory(rows);

        // Auto-search customers for recent calls in history
        const recentCallers = rows.slice(0, 20).map((r) => r.caller);
        const uniqueCallers = [...new Set(recentCallers)];

        uniqueCallers.forEach(async (phoneNumber) => {
          if (!foundCustomers[phoneNumber]) {
            try {
              const customersRef = collection(db, "customers");
              const phoneQuery = query(
                customersRef,
                where("phone", "==", phoneNumber)
              );
              const phoneSnapshot = await getDocs(phoneQuery);

              let foundCustomer = null;
              if (!phoneSnapshot.empty) {
                const doc = phoneSnapshot.docs[0];
                foundCustomer = { id: doc.id, ...doc.data() } as Customer;
              } else {
                // Check mobile field too
                const mobileQuery = query(
                  customersRef,
                  where("mobile", "==", phoneNumber)
                );
                const mobileSnapshot = await getDocs(mobileQuery);
                if (!mobileSnapshot.empty) {
                  const doc = mobileSnapshot.docs[0];
                  foundCustomer = { id: doc.id, ...doc.data() } as Customer;
                }
              }

              if (foundCustomer) {
                setFoundCustomers((prev) => ({
                  ...prev,
                  [phoneNumber]: foundCustomer,
                }));
              }
            } catch (error) {
              console.error("Error searching customer for history:", error);
            }
          }
        });

        const newest = rows[0];
        // Στο πρώτο snapshot: απλώς αρχικοποιούμε το lastSeen για να ΜΗΝ ανοίγει στο refresh
        if (!historyInitRef.current) {
          historyInitRef.current = true;
          if (newest) lastSeenTsRef.current = newest.ts;
          return;
        }

        // Σε επόμενα snapshots: άνοιγμα μόνο για νεότερα events
        if (newest && newest.ts > (lastSeenTsRef.current || 0)) {
          lastSeenTsRef.current = newest.ts;

          if (newest.type === "incoming") {
            // Άμεση αναζήτηση πελάτη για real-time caller ID
            const searchCustomerImmediate = async (phoneNumber: string) => {
              try {
                const customersRef = collection(db, "customers");

                // Αναζήτηση στο phone
                const phoneQuery = query(
                  customersRef,
                  where("phone", "==", phoneNumber)
                );
                const phoneSnapshot = await getDocs(phoneQuery);

                let foundCustomer = null;

                if (!phoneSnapshot.empty) {
                  // Βρέθηκε στο phone
                  const doc = phoneSnapshot.docs[0];
                  foundCustomer = { id: doc.id, ...doc.data() } as Customer;
                } else {
                  // Αναζήτηση στο mobile αν δεν βρέθηκε στο phone
                  const mobileQuery = query(
                    customersRef,
                    where("mobile", "==", phoneNumber)
                  );
                  const mobileSnapshot = await getDocs(mobileQuery);

                  if (!mobileSnapshot.empty) {
                    const doc = mobileSnapshot.docs[0];
                    foundCustomer = { id: doc.id, ...doc.data() } as Customer;
                  }
                }

                return foundCustomer;
              } catch (error) {
                console.error("Error searching customer immediately:", error);
                return null;
              }
            };

            // Δημιουργία άμεσης κλήσης (χωρίς καθυστέρηση)
            const immediateCall: IncomingCall = {
              id: `${newest.caller}-${newest.ts}`,
              phoneNumber: newest.caller,
              timestamp: new Date(newest.ts),
              status: "ringing",
              customerName: undefined, // Θα ενημερωθεί άμεσα
            };

            setIncomingCalls((prev) => [immediateCall, ...prev.slice(0, 9)]);
            setActiveCalls((prev) => [...prev, immediateCall]);

            // Άμεση αναζήτηση πελάτη (async)
            searchCustomerImmediate(newest.caller)
              .then((customer) => {
                const customerName = customer
                  ? `${customer.firstName} ${customer.lastName}`.trim() ||
                    customer.companyName
                  : undefined;

                // Ενημέρωση της κλήσης με το όνομα πελάτη
                if (customerName) {
                  setIncomingCalls((prev) =>
                    prev.map((call) =>
                      call.phoneNumber === newest.caller &&
                      call.id === `${newest.caller}-${newest.ts}`
                        ? { ...call, customerName }
                        : call
                    )
                  );
                  setActiveCalls((prev) =>
                    prev.map((call) =>
                      call.phoneNumber === newest.caller &&
                      call.id === `${newest.caller}-${newest.ts}`
                        ? { ...call, customerName }
                        : call
                    )
                  );
                }

                // Ενημέρωση cache πελατών
                if (customer) {
                  setFoundCustomers((prev) => ({
                    ...prev,
                    [newest.caller]: customer,
                  }));
                }
              })
              .catch((error) => {
                console.error("📞 Error in customer lookup:", error);
              });

            // Auto-open widget (only if enabled and not already opened for this call)
            const callKey = `${newest.caller}-${newest.ts}`;

            if (
              autoOpenEnabled &&
              !loadingPreferences &&
              !openedForCalls.has(callKey)
            ) {
              setIsOpen(true);
              setOpenedForCalls((prev) => new Set([...prev, callKey]));
            }
          } else if (newest.type === "missed" || newest.type === "terminated") {
            // Κλείσιμο κλήσης - ενημέρωση status και αφαίρεση από active
            setActiveCalls((prev) =>
              prev.filter((call) => call.phoneNumber !== newest.caller)
            );

            // Clean up tracking for this call (optional - prevents memory buildup)
            const callKey = `${newest.caller}-${newest.ts}`;
            setOpenedForCalls((prev) => {
              const newSet = new Set(prev);
              newSet.delete(callKey);
              return newSet;
            });
            setIncomingCalls((prev) =>
              prev.map((call) =>
                call.phoneNumber === newest.caller
                  ? {
                      ...call,
                      status: newest.type === "missed" ? "missed" : "ended",
                    }
                  : call
              )
            );

            // Κλείσιμο widget αν δεν υπάρχουν άλλες ενεργές κλήσεις
            setActiveCalls((currentActive) => {
              const remaining = currentActive.filter(
                (call) => call.phoneNumber !== newest.caller
              );
              if (remaining.length === 0) {
                setIsOpen(false);
              }
              return remaining;
            });
          }
        }
      },
      (err) => {
        console.warn("[CallerId] Firestore listener error", err);
      }
    );
    return () => unsub();
  }, [loadingPreferences, autoOpenEnabled]);

  // Load user preferences on mount
  useEffect(() => {
    if (user?.id) {
      loadUserPreferences();
    }
  }, [user?.id]);

  // Auto-open logic is now handled in the Firestore listener above

  return (
    <>
      {/* Floating Phone Icon */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 border-2 ${
            activeCalls.some((call) => call.status === "ringing")
              ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-400 animate-pulse shadow-emerald-200"
              : connectionStatus === "connected"
              ? "bg-slate-700 hover:bg-slate-800 border-slate-600 shadow-slate-200"
              : "bg-gray-400 hover:bg-gray-500 border-gray-300"
          }`}
          title="Εισερχόμενες Κλήσεις"
        >
          <FaPhone className="text-white text-xl" />

          {/* Active call indicator */}
          {activeCalls.some((call) => call.status === "ringing") && (
            <div className="absolute inset-0 rounded-full border-4 border-emerald-300 animate-ping"></div>
          )}
        </button>

        {/* Call notification badge */}
        {activeCalls.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
            {activeCalls.length}
          </div>
        )}
      </div>

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l border-gray-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <FaPhone className="text-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Εισερχόμενες Κλήσεις</h3>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Calls List */}
        <div className="flex-1 overflow-y-auto">
          {/* Active/New Calls Section */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <FaPhone className="mr-2 text-green-500" />
              Νέες Κλήσεις
            </h3>
            {activeCalls.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                <FaBell className="mx-auto text-2xl mb-2 opacity-50" />
                <p className="text-sm">Δεν υπάρχουν νέες κλήσεις</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCalls.map((call) => {
                  const customer = foundCustomers[call.phoneNumber];
                  const isSearching = searchingCustomer === call.phoneNumber;

                  return (
                    <div
                      key={call.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        call.status === "ringing"
                          ? "border-green-300 bg-green-50 shadow-md"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {/* Call Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              call.status === "ringing"
                                ? "bg-green-500 animate-pulse"
                                : call.status === "answered"
                                ? "bg-blue-500"
                                : call.status === "missed"
                                ? "bg-red-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {call.customerName || call.phoneNumber}
                            </span>
                            {call.customerName && (
                              <span className="text-xs text-gray-500">
                                {call.phoneNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {call.timestamp.toLocaleTimeString("el-GR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Customer Info or Search */}
                      {searching ? (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <FaSpinner className="animate-spin" />
                          <span className="text-sm">Αναζήτηση πελάτη...</span>
                        </div>
                      ) : call.customerName ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-emerald-700 mb-2">
                            <div className="p-1.5 bg-emerald-100 rounded-full">
                              <FaUser className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="font-semibold">
                              Υπάρχων Πελάτης
                            </span>
                          </div>
                          <p className="text-sm text-emerald-600 mb-3">
                            Ο πελάτης βρέθηκε στη βάση δεδομένων
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              className="flex flex-col items-center justify-center p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                              title="Νέα Παραγγελία"
                            >
                              <FaUtensils className="w-4 h-4 mb-1" />
                              <span className="text-xs font-medium">
                                Παραγγελία
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                customer && handleCreateReservation(customer)
                              }
                              className="flex flex-col items-center justify-center p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                              title="Νέα Κράτηση"
                            >
                              <FaCalendarPlus className="w-4 h-4 mb-1" />
                              <span className="text-xs font-medium">
                                Κράτηση
                              </span>
                            </button>
                            <button
                              className="flex flex-col items-center justify-center p-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                              title="Προβολή Πελάτη"
                            >
                              <FaEye className="w-4 h-4 mb-1" />
                              <span className="text-xs font-medium">
                                Προβολή
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Δεν βρέθηκε πελάτης - εμφάνιση κουμπιού για καταχώρηση
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-amber-700 mb-2">
                            <div className="p-1.5 bg-amber-100 rounded-full">
                              <FaExclamationTriangle className="w-3 h-3 text-amber-600" />
                            </div>
                            <span className="font-semibold">
                              Άγνωστος Πελάτης
                            </span>
                          </div>
                          <p className="text-sm text-amber-600 mb-3">
                            Δεν βρέθηκε πελάτης με αυτό το τηλέφωνο
                          </p>
                          <button
                            onClick={() =>
                              handleCreateCustomer(call.phoneNumber)
                            }
                            className="w-full flex flex-col items-center justify-center p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                            title="Καταχώρηση Νέου Πελάτη"
                          >
                            <FaUserPlus className="w-5 h-5 mb-1" />
                            <span className="text-sm font-semibold">
                              Καταχώρηση Πελάτη
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Call History */}
          {callHistory.length > 0 && (
            <div className="border-t border-gray-200 pt-4 px-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <FaHistory className="mr-2" />
                Ιστορικό Κλήσεων
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(() => {
                  // Υπολόγισε τελευταίο event ανά caller (όπως στο crm-episkopakis)
                  const latestByCaller = new Map<
                    string,
                    {
                      ts: number;
                      type: string;
                      caller: string;
                      called?: string;
                    }
                  >();

                  for (const h of callHistory) {
                    if (!latestByCaller.has(h.caller)) {
                      latestByCaller.set(h.caller, {
                        ts: h.ts,
                        type: h.type,
                        caller: h.caller,
                        called: h.called,
                      });
                    }
                  }

                  // Μετατροπή σε array και ταξινόμηση
                  const uniqueCalls = Array.from(latestByCaller.values()).sort(
                    (a, b) => b.ts - a.ts
                  );

                  return uniqueCalls.slice(0, 20).map((call, index) => (
                    <div
                      key={`${call.caller}-${call.ts}`}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            call.type === "incoming"
                              ? "bg-blue-500"
                              : call.type === "missed"
                              ? "bg-red-500"
                              : call.type === "answered"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {foundCustomers[call.caller]?.firstName &&
                            foundCustomers[call.caller]?.lastName
                              ? `${foundCustomers[call.caller]?.firstName} ${
                                  foundCustomers[call.caller]?.lastName
                                }`
                              : foundCustomers[call.caller]?.companyName ||
                                call.caller}
                          </span>
                          {(foundCustomers[call.caller]?.firstName ||
                            foundCustomers[call.caller]?.companyName) && (
                            <span className="text-xs text-gray-500">
                              {call.caller}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            call.type === "incoming"
                              ? "bg-blue-100 text-blue-700"
                              : call.type === "missed"
                              ? "bg-red-100 text-red-700"
                              : call.type === "answered"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {call.type === "incoming"
                            ? "Εισερχόμενη"
                            : call.type === "missed"
                            ? "Χαμένη"
                            : call.type === "answered"
                            ? "Απαντημένη"
                            : call.type === "terminated"
                            ? "Τερματισμένη"
                            : call.type}
                        </span>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className="text-xs text-gray-500">
                          {new Date(call.ts).toLocaleString("el-GR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {/* Action buttons for history - conditional based on customer existence */}
                        <div className="flex space-x-1">
                          {foundCustomers[call.caller] ? (
                            // Customer exists - show order and reservation buttons
                            <>
                              <button
                                className="p-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                                title="Νέα Παραγγελία"
                              >
                                <FaUtensils className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  foundCustomers[call.caller] &&
                                  handleCreateReservation(
                                    foundCustomers[call.caller]!
                                  )
                                }
                                className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                                title="Νέα Κράτηση"
                              >
                                <FaCalendarPlus className="w-3 h-3" />
                              </button>
                              <button
                                className="p-1.5 bg-slate-500 hover:bg-slate-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                                title="Προβολή Πελάτη"
                              >
                                <FaEye className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            // Customer doesn't exist - show only add customer button
                            <button
                              onClick={() => handleCreateCustomer(call.caller)}
                              className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                              title="Καταχώρηση Νέου Πελάτη"
                            >
                              <FaUserPlus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Footer with Auto-open Setting */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  id="auto-open-checkbox"
                  checked={autoOpenEnabled}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setAutoOpenEnabled(newValue);
                    saveUserPreferences(newValue);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label
                  htmlFor="auto-open-checkbox"
                  className="text-gray-700 cursor-pointer select-none font-medium"
                  title="Αυτόματο άνοιγμα του modal όταν χτυπάει κλήση"
                >
                  Αυτόματο άνοιγμα
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      <NewCustomerModal
        isOpen={showNewCustomerModal}
        onClose={() => {
          setShowNewCustomerModal(false);
          setSelectedPhoneForNewCustomer("");
        }}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={showReservationModal}
        onClose={() => {
          setShowReservationModal(false);
          setSelectedCustomerForReservation(null);
        }}
        onSuccess={handleReservationSuccess}
        prefilledData={
          selectedCustomerForReservation
            ? {
                customerName: `${selectedCustomerForReservation.firstName} ${selectedCustomerForReservation.lastName}`,
                phone:
                  selectedCustomerForReservation.phone ||
                  selectedCustomerForReservation.mobile ||
                  "",
                email: selectedCustomerForReservation.email || "",
              }
            : undefined
        }
      />

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
