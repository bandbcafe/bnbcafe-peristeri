"use client";

import { useState, useEffect, useRef } from "react";
import {
  FaTable,
  FaTimes,
  FaExpand,
  FaCompress,
  FaTh,
  FaChair,
  FaSpinner,
  FaUtensils,
  FaClock,
  FaEuroSign,
  FaSync,
  FaFileInvoice,
} from "react-icons/fa";
import { Table, TableLayout, DividerLine } from "@/types/table";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  onSnapshot,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import {
  getOrderNoteSeries,
  getRetailReceiptSeries,
} from "@/lib/billing-books";
import { db } from "@/lib/firebase";
import TableOrdersModal from "./TableOrdersModal";

interface RestaurantFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTableSelect: (table: any, floorPriceListId?: string) => void;
}

export default function RestaurantFloorModal({
  isOpen,
  onClose,
  onTableSelect,
}: RestaurantFloorModalProps) {
  // State management
  const [tables, setTables] = useState<Table[]>([]);
  const [currentLayout, setCurrentLayout] = useState<TableLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableOrders, setTableOrders] = useState<{ [key: string]: any[] }>({});
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showTableOrdersModal, setShowTableOrdersModal] = useState(false);
  const [selectedTableForOrders, setSelectedTableForOrders] =
    useState<Table | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [unsubscribeListener, setUnsubscribeListener] = useState<
    (() => void) | null
  >(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [orderNoteSeries, setOrderNoteSeries] = useState("ΔΠΕ");
  const [receiptSeries, setReceiptSeries] = useState("ΕΑΛΠ");

  // Load dynamic series names from billing books
  const loadSeriesNames = async () => {
    try {
      const [orderSeries, receiptSeriesValue] = await Promise.all([
        getOrderNoteSeries(),
        getRetailReceiptSeries(),
      ]);
      setOrderNoteSeries(orderSeries);
      setReceiptSeries(receiptSeriesValue);
      console.log("✅ Series names loaded in RestaurantFloorModal:", {
        orderSeries,
        receiptSeriesValue,
      });
    } catch (error) {
      console.error(
        "❌ Error loading series names in RestaurantFloorModal:",
        error
      );
      // Keep defaults if loading fails
    }
  };

  // Load tables from Firestore and sync with WRAPP
  const loadTables = async () => {
    try {
      setLoading(true);

      const q = query(collection(db, "tables"), orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);

      const tablesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Table[];

      // Sort tables numerically by name (1, 2, 3, etc.)
      tablesData.sort((a, b) => {
        const aNum = parseInt(a.name) || 0;
        const bNum = parseInt(b.name) || 0;
        return aNum - bNum;
      });

      // Set tables data - the onSnapshot listener will handle real-time updates
      setTables(tablesData);

      // WRAPP sync will be done only when explicitly needed (modal open, table click)
    } catch (error) {
      console.error("Error loading tables:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sync table status with WRAPP using SHOW for each table
  const syncSingleTableWithWrapp = async (table: Table) => {
    if (!table.wrappId) {
      console.warn("Table has no wrappId, skipping sync");
      return false;
    }

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.warn("WRAPP not configured");
        return false;
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
        console.error("WRAPP login failed during single table sync");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Get current status from WRAPP for THIS TABLE ONLY
      const showResponse = await fetch(
        `/api/wrapp/catering-tables/${table.wrappId}/show`,
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
        const wrappTable = await showResponse.json();

        // Use WRAPP status as-is - WRAPP is the source of truth
        const actualStatus = wrappTable.status;
        const wrappTotal = parseFloat(wrappTable.total || "0");
        const wrappInvoicesCount = wrappTable.invoices?.length || 0;
        const localInvoicesCount = table.invoices?.length || 0;

        // Special case: If WRAPP total is 0 but has invoices, clear them
        const shouldClearInvoices = wrappTotal === 0 && wrappInvoicesCount > 0;

        // Additional case: If table is available OR closed with total 0, it should have no invoices
        const shouldClearForStatus =
          (actualStatus === "available" ||
            (actualStatus === "closed" && wrappTotal === 0)) &&
          wrappInvoicesCount > 0;

        // Update if status, total, or invoices changed, OR if we need to clear invoices
        if (
          table.status !== actualStatus ||
          table.total !== wrappTotal ||
          localInvoicesCount !== wrappInvoicesCount ||
          shouldClearInvoices ||
          shouldClearForStatus
        ) {
          const clearReason = shouldClearInvoices
            ? " (clearing invoices - total is 0)"
            : shouldClearForStatus
            ? ` (clearing invoices - ${actualStatus} table with total 0)`
            : "";
          // Updating single table status

          await updateDoc(doc(db, "tables", table.id), {
            status: actualStatus,
            total: wrappTotal,
            invoices:
              shouldClearInvoices || shouldClearForStatus
                ? []
                : wrappTable.invoices || [],
            updatedAt: new Date(),
          });

          // Also update local state immediately for instant UI feedback
          setTables((prevTables) =>
            prevTables.map((t) =>
              t.id === table.id
                ? {
                    ...t,
                    status: actualStatus,
                    total: wrappTotal,
                    invoices:
                      shouldClearInvoices || shouldClearForStatus
                        ? []
                        : wrappTable.invoices || [],
                    updatedAt: new Date(),
                  }
                : t
            )
          );

          console.log(
            `✅ Table ${table.name} synced: ${actualStatus}, total: ${wrappTotal}${clearReason}`
          );
          let updatedCount = 0;
          updatedCount++;
        }
      } else {
        console.error(
          `❌ Failed to sync table ${table.name}:`,
          await showResponse.text()
        );
      }
    } catch (error) {
      console.error(`❌ Error syncing table ${table.name}:`, error);
      return false;
    }

    return true;
  };

  const loadSingleTableOrders = async (table: Table) => {
    try {
      // Get WRAPP settings for API calls
      const wrappDoc = await getDocs(query(collection(db, "config")));
      let wrappSettings = null;

      for (const doc of wrappDoc.docs) {
        if (doc.id === "wrapp") {
          wrappSettings = doc.data();
          break;
        }
      }

      if (!wrappSettings) {
        console.warn("No WRAPP settings found");
        setTableOrders((prev) => ({ ...prev, [table.id]: [] }));
        return;
      }

      // Login to get JWT token
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
        console.error("❌ Failed to login to WRAPP");
        setTableOrders((prev) => ({ ...prev, [table.id]: [] }));
        return;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Load orders for THIS SPECIFIC TABLE only
      const response = await fetch("/api/wrapp/table-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          tableId: table.wrappId,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (response.ok) {
        const orderData = await response.json();

        // Update table status from WRAPP data
        if (orderData.tableStatus || orderData.tableTotal !== undefined) {
          setTables((prevTables) =>
            prevTables.map((t) =>
              t.id === table.id
                ? {
                    ...t,
                    status: orderData.tableStatus || t.status,
                    total:
                      orderData.tableTotal !== undefined
                        ? orderData.tableTotal
                        : t.total,
                  }
                : t
            )
          );
        }

        // WRAPP returns invoice IDs in the invoices array
        const invoiceIds = orderData.invoices || [];
        if (invoiceIds && invoiceIds.length > 0) {
          // Fetch full invoice data for each invoice ID
          const fullInvoices: any[] = [];
          for (const invoiceId of invoiceIds) {
            try {
              const invoiceResponse = await fetch(
                `/api/wrapp/invoices/${invoiceId}?baseUrl=${encodeURIComponent(
                  wrappSettings.baseUrl
                )}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${jwt}`,
                  },
                }
              );

              if (invoiceResponse.ok) {
                const invoiceData = await invoiceResponse.json();

                // Try to load created_at from Firestore
                let createdAt = invoiceData.created_at;
                try {
                  console.log(
                    `🔍 Loading timestamp for invoice ${invoiceId} (${invoiceData.series})`
                  );
                  // Check if this is an order note or receipt using dynamic series names
                  if (
                    invoiceData.series === orderNoteSeries ||
                    invoiceData.series === receiptSeries
                  ) {
                    // For both receipts and order notes, use just the number since invoiceNumber stores only the number
                    const searchInvoiceNumber = invoiceData.num;

                    // Query invoices collection by invoiceNumber (since document ID is generated)
                    const invoicesQuery = query(
                      collection(db, "invoices"),
                      where("invoiceNumber", "==", searchInvoiceNumber),
                      where("series", "==", invoiceData.series),
                      limit(1)
                    );
                    const querySnapshot = await getDocs(invoicesQuery);
                    if (!querySnapshot.empty) {
                      const invoiceDocData = querySnapshot.docs[0].data();
                      console.log(`📄 Firestore data for ${invoiceData.num}:`, {
                        timestamp: invoiceDocData.timestamp,
                        created_at: invoiceDocData.created_at,
                        allFields: Object.keys(invoiceDocData),
                      });
                      createdAt =
                        invoiceDocData.timestamp?.toDate?.() ||
                        invoiceDocData.timestamp ||
                        invoiceDocData.created_at?.toDate?.() ||
                        invoiceDocData.created_at;
                      console.log(
                        `✅ Loaded timestamp for ${invoiceData.num}:`,
                        createdAt
                      );
                    } else {
                      console.log(
                        `❌ No Firestore document found for invoiceNumber: ${searchInvoiceNumber}`
                      );
                    }
                  }
                } catch (firestoreError) {
                  console.warn(
                    `⚠️ Could not load created_at from Firestore for ${invoiceId}:`,
                    firestoreError
                  );
                }

                // Normalize the invoice data structure
                let normalizedInvoice = {
                  ...invoiceData,
                  created_at: createdAt,
                  // Try to find invoice lines in various possible fields
                  invoice_lines:
                    invoiceData.invoice_lines ||
                    invoiceData.lines ||
                    invoiceData.items ||
                    invoiceData.line_items ||
                    [],
                  // Try to find total amount in various possible fields
                  total_amount:
                    invoiceData.total_amount ||
                    invoiceData.total ||
                    invoiceData.amount ||
                    invoiceData.payable_total_amount ||
                    0,
                };

                // If invoice has no lines but table has total, create placeholder
                if (
                  normalizedInvoice.invoice_lines &&
                  normalizedInvoice.invoice_lines.length === 0 &&
                  table.total > 0
                ) {
                  // Create a placeholder invoice line based on table total
                  const vatRate = 24; // Default VAT rate
                  const grossAmount = table.total;
                  const netAmount =
                    Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
                  const vatAmount =
                    Math.round((grossAmount - netAmount) * 100) / 100;

                  normalizedInvoice.invoice_lines = [
                    {
                      line_number: 1,
                      name: `Παραγγελία ${invoiceData.series}-${invoiceData.num}`,
                      description: `Δελτίο Παραγγελίας Εστίασης`,
                      quantity: 1,
                      unit_price: netAmount,
                      vat_rate: vatRate,
                      vat_amount: vatAmount,
                      net_amount: netAmount,
                      gross_amount: grossAmount,
                    },
                  ];
                }

                fullInvoices.push(normalizedInvoice);
              } else {
                console.warn(
                  `⚠️ Failed to fetch invoice ${invoiceId} for table ${table.name}`
                );
              }
            } catch (invoiceError) {
              console.error(
                `❌ Error fetching invoice ${invoiceId}:`,
                invoiceError
              );
            }
          }

          // Store full invoice data
          if (fullInvoices.length > 0) {
            setTableOrders((prev) => ({ ...prev, [table.id]: fullInvoices }));

            // Update Firestore with invoice IDs and metadata
            try {
              await updateDoc(doc(db, "tables", table.id), {
                invoices: invoiceIds,
                wrappData: {
                  lastOrdersLoadedAt: new Date(),
                  invoiceCount: invoiceIds.length,
                  hasOrderData: true,
                },
                updatedAt: new Date(),
              });

              // Update local state immediately
              setTables((prevTables) =>
                prevTables.map((t) =>
                  t.id === table.id
                    ? {
                        ...t,
                        invoices: invoiceIds,
                        wrappData: {
                          lastOrdersLoadedAt: new Date(),
                          invoiceCount: invoiceIds.length,
                          hasOrderData: true,
                        },
                        updatedAt: new Date(),
                      }
                    : t
                )
              );
            } catch (firestoreError) {
              console.error(
                `❌ Error updating Firestore for table ${table.name}:`,
                firestoreError
              );
            }
          } else {
            setTableOrders((prev) => ({ ...prev, [table.id]: [] }));
          }
        } else {
          // No invoices for this table
          setTableOrders((prev) => ({ ...prev, [table.id]: [] }));
        }
      } else {
        console.error(`❌ Failed to load orders for table ${table.name}`);
        setTableOrders((prev) => ({ ...prev, [table.id]: [] }));
      }
    } catch (error) {
      console.error(`❌ Error loading orders for table ${table.name}:`, error);
      setTableOrders((prev) => ({ ...prev, [table.id]: [] }));
    }
  };

  const syncWithWrapp = async (localTables: Table[]) => {
    try {
      setSyncing(true);
      // DISABLING Firestore listener during sync to prevent race conditions

      // Temporarily disable Firestore listener to prevent race conditions
      if (unsubscribeListener) {
        unsubscribeListener();
        setUnsubscribeListener(null);
      }

      // Syncing tables with WRAPP

      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.warn(" WRAPP not configured");
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
        console.error(" WRAPP login failed during sync");
        return;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Sync each table individually using SHOW
      let updatedCount = 0;
      for (const table of localTables) {
        if (!table.wrappId) {
          // Table has no wrappId, skipping sync
          continue;
        }

        try {
          // Get current status from WRAPP
          const showResponse = await fetch(
            `/api/wrapp/catering-tables/${table.wrappId}/show`,
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
            const wrappTable = await showResponse.json();

            // Use WRAPP status as-is - WRAPP is the source of truth
            const actualStatus = wrappTable.status;
            const wrappTotal = parseFloat(wrappTable.total || "0");
            const wrappInvoicesCount = wrappTable.invoices?.length || 0;
            const localInvoicesCount = table.invoices?.length || 0;

            // Special case: If WRAPP total is 0 but has invoices, clear them
            const shouldClearInvoices =
              wrappTotal === 0 && wrappInvoicesCount > 0;

            // Additional case: If table is available OR closed with total 0, it should have no invoices
            const shouldClearForStatus =
              (actualStatus === "available" ||
                (actualStatus === "closed" && wrappTotal === 0)) &&
              wrappInvoicesCount > 0;

            // Update if status, total, or invoices changed, OR if we need to clear invoices
            if (
              table.status !== actualStatus ||
              table.total !== wrappTotal ||
              localInvoicesCount !== wrappInvoicesCount ||
              shouldClearInvoices ||
              shouldClearForStatus
            ) {
              const clearReason = shouldClearInvoices
                ? " (clearing invoices - total is 0)"
                : shouldClearForStatus
                ? ` (clearing invoices - ${actualStatus} table with total 0)`
                : "";
              // Updating table status

              await updateDoc(doc(db, "tables", table.id), {
                status: actualStatus,
                total: wrappTotal,
                invoices:
                  shouldClearInvoices || shouldClearForStatus
                    ? []
                    : wrappTable.invoices || [],
                updatedAt: new Date(),
              });

              // Also update local state immediately for instant UI feedback
              setTables((prevTables) =>
                prevTables.map((t) =>
                  t.id === table.id
                    ? {
                        ...t,
                        status: actualStatus,
                        total: wrappTotal,
                        invoices:
                          shouldClearInvoices || shouldClearForStatus
                            ? []
                            : wrappTable.invoices || [],
                        updatedAt: new Date(),
                      }
                    : t
                )
              );

              updatedCount++;
            }
          } else {
            console.warn(
              `⚠️ Failed to get WRAPP status for table ${table.name}`
            );
          }
        } catch (error) {
          console.error(`❌ Error syncing table ${table.name}:`, error);
        }
      }

      // Updated tables in Firestore

      // Re-enable Firestore listener after sync completes
      // RE-ENABLING Firestore listener after sync completion
      const q = query(collection(db, "tables"), orderBy("createdAt", "asc"));
      const unsubscribeFn = onSnapshot(
        q,
        async (querySnapshot) => {
          // Tables updated from Firestore
          const tablesData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as Table[];

          // Apply numeric sorting here too
          tablesData.sort((a, b) => {
            const aNum = parseInt(a.name) || 0;
            const bNum = parseInt(b.name) || 0;
            return aNum - bNum;
          });

          setTables(tablesData);
          // Tables updated from Firestore listener
        },
        (error) => {
          console.error("❌ Error in tables listener:", error);
        }
      );
      setUnsubscribeListener(() => unsubscribeFn);
    } catch (error) {
      console.error("❌ WRAPP sync error:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Load series names globally when component mounts
  useEffect(() => {
    loadSeriesNames();
  }, []); // Run only once on mount

  // Load tables on modal open and sync with WRAPP
  useEffect(() => {
    if (!isOpen) return;

    let unsubscribe: (() => void) | undefined;

    const initializeTables = async () => {
      // Loading tables and syncing with WRAPP

      // Load tables first
      await loadTables();

      // Load orders for ALL tables to show which ones have products (red indicators)
      await loadTableOrders();

      // Set up real-time listener for Firestore updates
      const q = query(collection(db, "tables"), orderBy("createdAt", "asc"));
      const unsubscribeFn = onSnapshot(
        q,
        async (querySnapshot) => {
          // Tables updated from Firestore

          const tablesData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as Table[];

          setTables(tablesData);

          // No automatic sync here - only sync when explicitly needed
          // Tables updated from Firestore listener
        },
        (error) => {
          console.error(" Error in tables listener:", error);
        }
      );

      // Store unsubscribe function in state
      setUnsubscribeListener(() => unsubscribeFn);
    };

    initializeTables();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribeListener) {
        // Cleaning up tables listener
        unsubscribeListener();
        setUnsubscribeListener(null);
      }
    };
  }, [isOpen]);

  // Canvas and layout state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(0.6); // Start with smaller zoom for better overview
  const [showGrid, setShowGrid] = useState(false); // Hide grid by default in usage mode
  const [gridSize] = useState(20);
  const [hasLoadedUserZoom, setHasLoadedUserZoom] = useState(false); // Prevent auto-zoom override

  // Simple zoom persistence functions
  const loadUserZoom = async () => {
    try {
      const userDoc = await getDoc(
        doc(db, "users", "default", "settings", "restaurant")
      );
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.defaultZoomLevel) {
          setZoom(data.defaultZoomLevel);
          setHasLoadedUserZoom(true); // Prevent auto-zoom override
          return true;
        }
      }
    } catch (error) {
      console.error("Error loading zoom:", error);
    }
    return false;
  };

  const saveUserZoom = async (zoomLevel: number) => {
    try {
      await setDoc(
        doc(db, "users", "default", "settings", "restaurant"),
        {
          defaultZoomLevel: zoomLevel,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving zoom:", error);
    }
  };

  // Load zoom immediately when component mounts
  useEffect(() => {
    loadUserZoom();
  }, []); // Run only once on mount

  // Save current zoom when modal closes (but only after zoom has been loaded)
  useEffect(() => {
    if (!isOpen && hasLoadedUserZoom) {
      saveUserZoom(zoom);
    }
  }, [isOpen, zoom, hasLoadedUserZoom]);

  // Simple wrapper for zoom buttons
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    saveUserZoom(newZoom);
  };

  // Auto-zoom function to fit the room layout (canvas) to viewport
  const calculateOptimalZoom = () => {
    // Use the canvas size (room layout dimensions) instead of table bounds
    const roomWidth = canvasSize.width;
    const roomHeight = canvasSize.height;

    // Get available viewport size from canvas container
    const canvasContainer = canvasRef.current?.parentElement;
    let availableWidth = window.innerWidth * 0.7;
    let availableHeight = window.innerHeight * 0.6;

    if (canvasContainer) {
      const containerRect = canvasContainer.getBoundingClientRect();
      availableWidth = containerRect.width - 40; // Account for padding
      availableHeight = containerRect.height - 40;
    }

    // Calculate zoom to fit the entire room layout in available space
    const zoomX = availableWidth / roomWidth;
    const zoomY = availableHeight / roomHeight;

    // Use the smaller zoom to ensure the entire room fits, with a slight margin
    const optimalZoom = Math.min(zoomX, zoomY) * 0.9;

    // Clamp between reasonable limits
    const finalZoom = Math.max(0.3, Math.min(2.0, optimalZoom));

    return finalZoom;
  };

  // Auto-zoom functionality removed - only zoom persistence is active

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTables();
      loadTableOrders();
      loadCurrentLayout();
    }
  }, [isOpen]);

  // Sync all tables with WRAPP only when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Initial sync when modal opens (only once)
    if (tables.length > 0) {
      syncAllTablesWithWrapp();
    }
  }, [isOpen]); // Removed tables.length dependency to prevent loops

  // Load table orders when tables are loaded (only once)
  useEffect(() => {
    if (tables.length > 0) {
      loadTableOrders();
    }
  }, [tables.length]); // Only depend on length, not the entire tables array

  // Function to load order notes for tables with orders
  const loadTableOrders = async () => {
    setLoadingOrders(true);
    try {
      // Get WRAPP settings for API calls
      const wrappDoc = await getDocs(query(collection(db, "config")));
      let wrappSettings = null;

      for (const doc of wrappDoc.docs) {
        if (doc.id === "wrapp") {
          wrappSettings = doc.data();
          break;
        }
      }

      if (!wrappSettings) {
        // No WRAPP settings found
        return;
      }

      // Login to get JWT token
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
        console.error("❌ Failed to login to WRAPP");
        return;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Load orders for tables that might have orders
      const ordersMap: { [key: string]: any[] } = {};

      for (const table of tables) {
        // Only try to load orders if table has WRAPP ID
        if ((table.status === "open" || table.total > 0) && table.wrappId) {
          try {
            const response = await fetch("/api/wrapp/table-orders", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
              },
              body: JSON.stringify({
                tableId: table.wrappId,
                baseUrl: wrappSettings.baseUrl,
              }),
            });

            if (response.ok) {
              const orderData = await response.json();

              // Update table status from WRAPP data
              if (orderData.tableStatus || orderData.tableTotal !== undefined) {
                // Update local table state
                setTables((prevTables) =>
                  prevTables.map((t) =>
                    t.id === table.id
                      ? {
                          ...t,
                          status: orderData.tableStatus || t.status,
                          total:
                            orderData.tableTotal !== undefined
                              ? orderData.tableTotal
                              : t.total,
                        }
                      : t
                  )
                );
              }

              // WRAPP returns invoice IDs in the invoices array
              const invoiceIds = orderData.invoices || [];
              if (invoiceIds && invoiceIds.length > 0) {
                // Fetch full invoice data for each invoice ID
                const fullInvoices = [];
                for (const invoiceId of invoiceIds) {
                  try {
                    const invoiceResponse = await fetch(
                      `/api/wrapp/invoices/${invoiceId}?baseUrl=${encodeURIComponent(
                        wrappSettings.baseUrl
                      )}`,
                      {
                        method: "GET",
                        headers: {
                          Authorization: `Bearer ${jwt}`,
                        },
                      }
                    );

                    if (invoiceResponse.ok) {
                      const invoiceData = await invoiceResponse.json();

                      // Try to load created_at from Firestore
                      let createdAt = invoiceData.created_at;
                      try {
                        // Check if this is an order note
                        if (invoiceData.series === orderNoteSeries) {
                          // Try invoices collection first (where order notes are saved with timestamps)
                          const invoiceDoc = await getDoc(
                            doc(db, "invoices", invoiceId)
                          );
                          if (invoiceDoc.exists()) {
                            const invoiceDocData = invoiceDoc.data();
                            createdAt =
                              invoiceDocData.timestamp?.toDate?.() ||
                              invoiceDocData.timestamp ||
                              invoiceDocData.created_at?.toDate?.() ||
                              invoiceDocData.created_at;
                          }
                        }
                        // Check if this is a receipt
                        else if (invoiceData.series === receiptSeries) {
                          const invoiceDoc = await getDoc(
                            doc(db, "invoices", invoiceId)
                          );
                          if (invoiceDoc.exists()) {
                            const invoiceDocData = invoiceDoc.data();
                            createdAt =
                              invoiceDocData.created_at?.toDate?.() ||
                              invoiceDocData.created_at;
                          }
                        }
                      } catch (firestoreError) {
                        console.warn(
                          `⚠️ Could not load created_at from Firestore for ${invoiceId}:`,
                          firestoreError
                        );
                      }

                      // Normalize the invoice data structure
                      let normalizedInvoice = {
                        ...invoiceData,
                        created_at: createdAt,
                        // Preserve invoiceNumber from Firestore if available
                        invoiceNumber:
                          invoiceData.invoiceNumber || invoiceData.num,
                        // Try to find invoice lines in various possible fields
                        invoice_lines:
                          invoiceData.invoice_lines ||
                          invoiceData.lines ||
                          invoiceData.items ||
                          invoiceData.line_items ||
                          [],
                        // Try to find total amount in various possible fields
                        total_amount:
                          invoiceData.total_amount ||
                          invoiceData.total ||
                          invoiceData.amount ||
                          invoiceData.payable_total_amount ||
                          0,
                      };

                      // If no invoice lines found, create placeholder from table total
                      if (
                        normalizedInvoice.invoice_lines.length === 0 &&
                        table.total > 0
                      ) {
                        // Create a placeholder invoice line based on table total
                        const vatRate = 24; // Default VAT rate
                        const grossAmount = table.total;
                        const netAmount =
                          Math.round(
                            (grossAmount / (1 + vatRate / 100)) * 100
                          ) / 100;
                        const vatAmount =
                          Math.round((grossAmount - netAmount) * 100) / 100;

                        normalizedInvoice.invoice_lines = [
                          {
                            line_number: 1,
                            name: `Παραγγελία ${invoiceData.series}-${invoiceData.num}`,
                            description: `Δελτίο Παραγγελίας Εστίασης`,
                            quantity: 1,
                            unit_price: netAmount,
                            net_total_price: netAmount,
                            vat_rate: vatRate,
                            vat_total: vatAmount,
                            subtotal: grossAmount,
                          },
                        ];

                        normalizedInvoice.total_amount = grossAmount;

                        // Add created_at if missing
                        if (!normalizedInvoice.created_at) {
                          normalizedInvoice.created_at =
                            new Date().toISOString();
                        }
                      }

                      fullInvoices.push(normalizedInvoice);
                    } else {
                      console.error(
                        `❌ Failed to load invoice ${invoiceId}:`,
                        await invoiceResponse.text()
                      );
                    }
                  } catch (error) {
                    console.error(
                      `❌ Error loading invoice ${invoiceId}:`,
                      error
                    );
                  }
                }

                // Store full invoice data
                if (fullInvoices.length > 0) {
                  ordersMap[table.id] = fullInvoices;

                  // Update Firestore with invoice IDs and metadata
                  try {
                    await updateDoc(doc(db, "tables", table.id), {
                      invoices: invoiceIds,
                      wrappData: {
                        lastOrdersLoadedAt: new Date(),
                        invoiceCount: invoiceIds.length,
                        hasOrderData: true,
                      },
                      updatedAt: new Date(),
                    });

                    // Update local state immediately
                    setTables((prevTables) =>
                      prevTables.map((t) =>
                        t.id === table.id ? { ...t, invoices: invoiceIds } : t
                      )
                    );
                  } catch (error) {
                    console.error(
                      `❌ Error updating table ${table.id} with invoices:`,
                      error
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error(
              `❌ Error loading orders for table ${table.name}:`,
              error
            );
          }
        } else if (!table.wrappId) {
        }
      }

      // Clear orders for tables that are now available or closed (no active orders)
      tables.forEach((table) => {
        if (table.status === "available" || table.status === "closed") {
          // For available/closed tables, force empty orders array to clear red indicators
          ordersMap[table.id] = [];
        }
      });

      setTableOrders(ordersMap);
    } catch (error) {
      console.error("❌ Error loading table orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadCurrentLayout = async () => {
    try {
      const q = query(
        collection(db, "table_layouts"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const layoutData = querySnapshot.docs[0];
        const layout = {
          id: layoutData.id,
          ...layoutData.data(),
          createdAt: layoutData.data().createdAt?.toDate() || new Date(),
          updatedAt: layoutData.data().updatedAt?.toDate() || new Date(),
        } as TableLayout;

        setCurrentLayout(layout);
        setCanvasSize({ width: layout.width, height: layout.height });

        // Auto-zoom removed - zoom persistence is now active
      }
    } catch (error) {
      console.error("Error loading layout:", error);
    }
  };

  // Open table in WRAPP (only for available tables)
  const openTable = async (table: Table) => {
    if (!table.wrappId) {
      console.error("❌ Cannot open table without WRAPP ID");
      return false;
    }

    // Don't try to open closed tables via WRAPP API
    if (table.status === "closed") {
      console.error(
        "❌ Cannot open closed table via WRAPP API. Use resetTableToAvailable instead."
      );
      return false;
    }

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.error("❌ WRAPP not configured");
        return false;
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
        console.error("❌ WRAPP login failed");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Open table
      const response = await fetch("/api/wrapp/catering-tables/open-table", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          id: table.wrappId,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state
        await updateDoc(doc(db, "tables", table.id), {
          status: "open",
          updatedAt: new Date(),
        });

        // Update tables state
        setTables((prev) =>
          prev.map((t) => (t.id === table.id ? { ...t, status: "open" } : t))
        );

        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to open table in WRAPP:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        // If it's a 422 error, the table might already be in the desired state
        if (response.status === 422) {
          // Try to sync the table status from WRAPP
          await syncAllTablesWithWrapp();
        }

        return false;
      }
    } catch (error) {
      console.error("❌ Error opening table:", error);
      return false;
    }
  };

  // Force open table (ignore local status, try WRAPP API directly)
  const forceOpenTable = async (table: Table) => {
    if (!table.wrappId) {
      console.error("❌ Cannot open table without WRAPP ID");
      return false;
    }

    // Reuse the same logic as openTable but without the status check
    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.error("❌ WRAPP not configured");
        return false;
      }

      // Login to WRAPP using the same method as sync
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
        console.error("❌ Failed to login to WRAPP for force open");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        console.error("❌ No JWT received from login");
        return false;
      }

      // Try to open the table via WRAPP API
      const response = await fetch("/api/wrapp/catering-tables/open-table", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          id: table.wrappId,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(
          `✅ Force open successful! Table ${table.name} opened in WRAPP`
        );

        // Update local state
        await updateDoc(doc(db, "tables", table.id), {
          status: "open",
          updatedAt: new Date(),
        });

        // Update tables state
        setTables((prev) =>
          prev.map((t) => (t.id === table.id ? { ...t, status: "open" } : t))
        );

        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ Force open failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        // Possible reasons for failure

        // If it fails, sync the table status from WRAPP
        await syncAllTablesWithWrapp();

        return false;
      }
    } catch (error) {
      console.error("❌ Error force opening table:", error);
      return false;
    }
  };

  // Refresh table information from WRAPP (force sync)
  const refreshTableFromWrapp = async (table: Table) => {
    if (!table.wrappId) {
      console.error("❌ Cannot refresh table without WRAPP ID");
      return false;
    }

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.error("❌ WRAPP not configured");
        return false;
      }

      // Login to WRAPP
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
        console.error("❌ Failed to login to WRAPP for refresh");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        console.error("❌ No JWT received from login");
        return false;
      }

      // Get fresh table data from WRAPP
      const response = await fetch(
        `/api/wrapp/catering-tables/${table.wrappId}/show`,
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

      if (response.ok) {
        const wrappTable = await response.json();

        // Update local state with fresh WRAPP data
        await updateDoc(doc(db, "tables", table.id), {
          status: wrappTable.status,
          total: parseFloat(wrappTable.total),
          updatedAt: new Date(),
        });

        // Update tables state
        setTables((prev) =>
          prev.map((t) =>
            t.id === table.id
              ? {
                  ...t,
                  status: wrappTable.status,
                  total: parseFloat(wrappTable.total),
                }
              : t
          )
        );

        // If the table is now available, try to open it
        if (wrappTable.status === "available") {
        }

        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to refresh table from WRAPP:", errorText);
        return false;
      }
    } catch (error) {
      console.error("❌ Error refreshing table from WRAPP:", error);
      return false;
    }
  };

  // Reset closed table to available using WRAPP UPDATE API
  const resetTableToAvailable = async (table: Table) => {
    if (!table.wrappId) {
      console.error("❌ Cannot reset table without WRAPP ID");
      return false;
    }

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.error("❌ WRAPP not configured");
        return false;
      }

      // Login to WRAPP
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
        console.error("❌ Failed to login to WRAPP for table reset");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        console.error("❌ No JWT received from login");
        return false;
      }

      // Delete the closed table from WRAPP
      const deleteResponse = await fetch(
        `/api/wrapp/catering-tables/${table.wrappId}/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            baseUrl: wrappSettings.baseUrl,
          }),
        }
      );

      if (!deleteResponse.ok) {
        const deleteError = await deleteResponse.text();
        console.error("❌ Failed to delete table from WRAPP:", deleteError);

        // Fallback to local reset if delete fails
        // Falling back to local reset
        await updateDoc(doc(db, "tables", table.id), {
          status: "available",
          total: 0,
          updatedAt: new Date(),
        });

        setTables((prev) =>
          prev.map((t) =>
            t.id === table.id ? { ...t, status: "available", total: 0 } : t
          )
        );

        console.log(
          `✅ Table ${table.name} reset to available locally (fallback)`
        );
        return true;
      }

      // Create a new table with the same name (will be available)
      const createResponse = await fetch("/api/wrapp/catering-tables/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          name: table.name,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (createResponse.ok) {
        const newTable = await createResponse.json();

        // Update local state with new WRAPP table
        await updateDoc(doc(db, "tables", table.id), {
          wrappId: newTable.id,
          status: newTable.status,
          total: parseFloat(newTable.total),
          updatedAt: new Date(),
        });

        // Update tables state
        setTables((prev) =>
          prev.map((t) =>
            t.id === table.id
              ? {
                  ...t,
                  wrappId: newTable.id,
                  status: newTable.status,
                  total: parseFloat(newTable.total),
                }
              : t
          )
        );

        return true;
      } else {
        const createError = await createResponse.text();
        console.error("❌ Failed to create new table in WRAPP:", createError);

        // Fallback to local reset if WRAPP update fails
        // Falling back to local reset
        await updateDoc(doc(db, "tables", table.id), {
          status: "available",
          total: 0,
          updatedAt: new Date(),
        });

        setTables((prev) =>
          prev.map((t) =>
            t.id === table.id ? { ...t, status: "available", total: 0 } : t
          )
        );

        console.log(
          `✅ Table ${table.name} reset to available locally (fallback)`
        );
        return true;
      }
    } catch (error) {
      console.error("❌ Error resetting table:", error);
      return false;
    }
  };

  // Force close table by deleting and recreating it
  const forceCloseTable = async (table: Table) => {
    if (!table.wrappId) {
      console.error("❌ Cannot force close table without WRAPP ID");
      return false;
    }

    if (
      !confirm(
        `⚠️ Αναγκαστικό κλείσιμο τραπεζιού ${table.name}?\n\nΑυτό θα διαγράψει το τραπέζι από το WRAPP και θα το ξαναδημιουργήσει ως διαθέσιμο.\n\nΌλα τα invoices θα παραμείνουν στο WRAPP αλλά δεν θα συνδέονται με το τραπέζι.`
      )
    ) {
      return false;
    }

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.error("❌ WRAPP not configured");
        return false;
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
        console.error("❌ WRAPP login failed");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Delete the table from WRAPP
      const deleteResponse = await fetch(
        `/api/wrapp/catering-tables/${table.wrappId}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        console.error("❌ Failed to delete table from WRAPP");
        return false;
      }

      // Recreate the table in WRAPP
      const createResponse = await fetch("/api/wrapp/catering-tables/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          name: table.name,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (createResponse.ok) {
        const newWrappTable = await createResponse.json();

        // Update Firestore with new WRAPP ID and closed status
        await updateDoc(doc(db, "tables", table.id), {
          wrappId: newWrappTable.id,
          status: "available",
          total: 0,
          invoices: [],
          updatedAt: new Date(),
        });

        // Update local state
        setTables((prev) =>
          prev.map((t) =>
            t.id === table.id
              ? {
                  ...t,
                  wrappId: newWrappTable.id,
                  status: "available" as const,
                  total: 0,
                  invoices: [],
                }
              : t
          )
        );

        alert(
          `✅ Το τραπέζι ${table.name} κλείστηκε αναγκαστικά και είναι τώρα διαθέσιμο!`
        );
        return true;
      } else {
        console.error("❌ Failed to recreate table in WRAPP");
        return false;
      }
    } catch (error) {
      console.error("❌ Error force closing table:", error);
      return false;
    }
  };

  // Reopen a closed table for new orders
  // According to WRAPP docs, we can open a table by name (creates if doesn't exist)
  const reopenTable = async (table: Table, autoMode = false) => {
    // Removed annoying confirmation dialog
    console.log(
      `🔄 ${autoMode ? "Auto-reopening" : "Reopening"} table ${table.name}...`
    );

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        console.error("❌ WRAPP not configured");
        return false;
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
        console.error("❌ WRAPP login failed");
        return false;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Open table by NAME (WRAPP will handle it automatically)
      // According to docs: "name is required unless id is specified"
      // Opening table by name
      const openResponse = await fetch(
        "/api/wrapp/catering-tables/open-table",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            name: table.name,
            baseUrl: wrappSettings.baseUrl,
          }),
        }
      );

      if (!openResponse.ok) {
        const errorText = await openResponse.text();
        console.error("❌ Failed to open table in WRAPP:", errorText);
        return false;
      }

      const wrappTable = await openResponse.json();
      // WRAPP table opened

      // Update Firestore with WRAPP ID and open status
      await updateDoc(doc(db, "tables", table.id), {
        wrappId: wrappTable.id,
        status: "open",
        total: 0,
        invoices: [],
        updatedAt: new Date(),
      });

      // Update local state
      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id
            ? {
                ...t,
                wrappId: wrappTable.id,
                status: "open" as const,
                total: 0,
                invoices: [],
              }
            : t
        )
      );

      // Removed annoying alert - table opened successfully
      console.log(
        `✅ Το τραπέζι ${table.name} άνοιξε και είναι έτοιμο για νέα παραγγελία!`
      );
      return true;
    } catch (error) {
      console.error("❌ Error reopening table:", error);
      return false;
    }
  };

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table);

    // NEVER change wrappId - use existing one
    if (!table.wrappId) {
      console.error("❌ Table has no wrappId:", table.name);
      alert(
        "❌ Το τραπέζι δεν έχει WRAPP ID. Παρακαλώ επικοινωνήστε με τον διαχειριστή."
      );
      return;
    }

    // ALWAYS open the modal - let the modal handle all actions
    // The modal will show appropriate buttons based on table status
    // Opening table modal
    // Table Details logged
    setLoadingOrders(true);

    // Sync ONLY this table with WRAPP for performance (no more bulk calls)
    await syncSingleTableWithWrapp(table);

    // Load orders for this table only (performance optimization)
    await loadSingleTableOrders(table);

    // Show the modal - it will handle closed/open/available states
    setSelectedTableForOrders(table);
    setShowTableOrdersModal(true);
    setLoadingOrders(false);
  };

  const getTableStatusColor = (table: Table): string => {
    // Check WRAPP status - use WRAPP data as source of truth
    // Return inline style color instead of Tailwind class
    switch (table.status) {
      case "available":
        return "#f87171"; // Red - closed table, ready to open
      case "open":
        return "#4ade80"; // Green - active table with orders
      case "closed":
        return "#6b7280"; // Gray - completely closed
      case "alert":
        return "#fb923c"; // Orange
      default:
        return "#60a5fa"; // Blue fallback
    }
  };

  const getTableStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Διαθέσιμο";
      case "open":
        return "Ανοιχτό";
      case "closed":
        return "Κλειστό";
      case "alert":
        return "Ειδοποίηση";
      default:
        return "Άγνωστο";
    }
  };

  // WRAPP Table Management Functions
  const createWrappTable = async (tableName: string, retryCount = 0) => {
    try {
      // Get WRAPP settings for API calls
      const wrappDoc = await getDocs(query(collection(db, "config")));
      let wrappSettings = null;

      for (const doc of wrappDoc.docs) {
        if (doc.id === "wrapp") {
          wrappSettings = doc.data();
          break;
        }
      }

      if (!wrappSettings) {
        // No WRAPP settings found
        return null;
      }

      // Login to get JWT token
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
        console.error("❌ Failed to login to WRAPP");
        return null;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Generate unique table name if duplicate
      let uniqueTableName = tableName;
      if (retryCount > 0) {
        uniqueTableName = `${tableName}_${Date.now()}_${retryCount}`;
      }

      // Create table in WRAPP
      const response = await fetch("/api/wrapp/catering-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          name: uniqueTableName,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      if (response.ok) {
        const wrappTable = await response.json();
        return wrappTable;
      } else if (response.status === 422 && retryCount < 3) {
        // Duplicate name error - retry with unique name
        console.log(
          `⚠️ Table name '${uniqueTableName}' already exists, retrying with unique name...`
        );
        return await createWrappTable(tableName, retryCount + 1);
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Failed to create WRAPP table:",
          response.status,
          errorText
        );
        return null;
      }
    } catch (error) {
      console.error("❌ Error creating WRAPP table:", error);
      return null;
    }
  };

  const syncTableWithWrapp = async (table: Table) => {
    // NEVER change wrappId - just return existing one
    console.log(
      `✅ Using existing wrappId for table "${table.name}": ${table.wrappId}`
    );
    return table.wrappId;
  };

  const findExistingWrappTable = async (tableName: string) => {
    try {
      // Get WRAPP settings
      const wrappDoc = await getDocs(query(collection(db, "config")));
      let wrappSettings = null;

      for (const doc of wrappDoc.docs) {
        if (doc.id === "wrapp") {
          wrappSettings = doc.data();
          break;
        }
      }

      if (!wrappSettings) {
        return null;
      }

      // Login to get JWT token
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
        return null;
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data.attributes.jwt;

      // Get all WRAPP tables
      const response = await fetch(
        `/api/wrapp/catering-tables?baseUrl=${encodeURIComponent(
          wrappSettings.baseUrl
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (response.ok) {
        const wrappTables = await response.json();

        // Find table with matching name (multiple strategies)
        let matchingTable = wrappTables.find(
          (wt: any) =>
            wt.name &&
            wt.name.toString().trim().toLowerCase() ===
              tableName.trim().toLowerCase()
        );

        // Fallback: try exact match without trimming
        if (!matchingTable) {
          matchingTable = wrappTables.find(
            (wt: any) =>
              wt.name &&
              wt.name.toString().toLowerCase() === tableName.toLowerCase()
          );
        }

        // Fallback: try finding table name that contains our name
        if (!matchingTable) {
          matchingTable = wrappTables.find(
            (wt: any) =>
              wt.name &&
              (wt.name.toString().trim().includes(tableName) ||
                tableName.includes(wt.name.toString().trim()))
          );
        }

        if (matchingTable) {
        } else {
          // Available table names logged
        }

        return matchingTable || null;
      } else {
        console.error("❌ Failed to fetch WRAPP tables:", response.status);
      }
    } catch (error) {
      console.error("❌ Error finding existing WRAPP table:", error);
    }
    return null;
  };

  const syncAllTablesWithWrapp = async () => {
    setSyncing(true);
    try {
      // Manual sync started

      // Call the main sync function that does SHOW for each table
      await syncWithWrapp(tables);

      // Update last sync time
      setLastSyncTime(new Date());
      // Manual sync completed
    } catch (error) {
      console.error("❌ Manual sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const manualSyncTable = async (table: Table) => {
    const wrappId = await syncTableWithWrapp(table);
    if (wrappId) {
      // Reload table orders after successful sync
      await loadTableOrders();
    } else {
    }
  };

  const handlePayment = async (
    selectedItems: any[],
    paymentMethod: string,
    paymentDetails?: any
  ) => {
    if (!selectedTableForOrders) {
      console.error("❌ No table selected for payment");
      return;
    }

    const total = selectedItems.reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );

    // Processing payment

    try {
      // Get WRAPP settings
      const { getWrappConfig } = await import("@/lib/firebase");
      const wrappSettings = await getWrappConfig();

      if (
        !wrappSettings?.email ||
        !wrappSettings?.apiKey ||
        !wrappSettings?.baseUrl
      ) {
        throw new Error("WRAPP δεν είναι ρυθμισμένο");
      }

      // Login to WRAPP
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
        throw new Error("Αποτυχία σύνδεσης με WRAPP");
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        throw new Error("Δεν ελήφθη JWT token");
      }

      // Get order note IDs from selected items
      const orderNoteIds = [
        ...new Set(selectedItems.map((item) => item.orderId)),
      ];

      // Find receipt billing book (11.1 - Απόδειξη Λιανικής Πώλησης)
      const billingBooksResponse = await fetch(
        `/api/wrapp/billing-books?baseUrl=${encodeURIComponent(
          wrappSettings.baseUrl
        )}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (!billingBooksResponse.ok) {
        throw new Error("Αποτυχία φόρτωσης βιβλίων έκδοσης");
      }

      const billingBooks = await billingBooksResponse.json();
      const receiptBillingBook = billingBooks.find(
        (book: any) => book.invoice_type_code === "11.1"
      );

      if (!receiptBillingBook) {
        throw new Error(
          "Δεν βρέθηκε βιβλίο έκδοσης για Απόδειξη Λιανικής Πώλησης (11.1)"
        );
      }

      // Converting order notes to receipt

      // About to call convert-to-receipt API

      // Convert order notes to receipt
      const convertResponse = await fetch("/api/wrapp/convert-to-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          tableId: selectedTableForOrders.wrappId,
          orderNotes: orderNoteIds,
          paymentMethod: paymentMethod,
          paymentDetails: paymentDetails,
          billingBook: receiptBillingBook.id,
          priceListId: currentLayout?.selectedPriceListId, // Pass price list for classifications
          customerInfo: {
            name: "Πελάτης λιανικής",
            address: "",
            city: "",
            postalCode: "",
            country: "GR",
            phone: "",
            email: "",
          },
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      // API call completed

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text();
        console.error("❌ Convert to receipt error:", errorText);
        throw new Error(
          `Αποτυχία μετατροπής σε απόδειξη: ${convertResponse.status}`
        );
      }

      const receiptResult = await convertResponse.json();
      // Receipt result processed

      // Success - no alert needed, user will see updated data in modal
      // Receipt success details logged

      // Refresh table data from WRAPP to get updated invoice status
      // Don't clear invoices locally - let WRAPP manage the state
      // Refreshing table data from WRAPP

      // Reload table orders to get updated status for the specific table
      await loadTableOrders();

      // WRAPP sync will handle the table status update automatically
      // Payment completed and table status synced

      // Reload table orders to get fresh data with timestamps
      if (selectedTableForOrders) {
        console.log("🔄 Reloading table orders after receipt creation...");
        await loadSingleTableOrders(selectedTableForOrders);
      }

      // Return receipt data for printing
      return receiptResult;
    } catch (error) {
      console.error("❌ Payment processing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Άγνωστο σφάλμα";
      alert(`Σφάλμα κατά την πληρωμή: ${errorMessage}`);
    }
  };

  const getTableStats = () => {
    return {
      total: tables.length,
      available: tables.filter((t) => t.status === "available").length,
      open: tables.filter((t) => t.status === "open").length,
      closed: tables.filter((t) => t.status === "closed").length,
      alert: tables.filter((t) => t.status === "alert").length,
    };
  };

  const stats = getTableStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaTable className="text-2xl" />
              <div>
                <h2 className="text-xl font-bold">Σάλα Εστιατορίου</h2>
                <p className="text-blue-100 text-sm">
                  Επιλέξτε τραπέζι για εξυπηρέτηση
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Manual Sync Button */}
              <div className="flex flex-col items-end">
                <button
                  onClick={() => syncAllTablesWithWrapp()}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                  title="Ανανέωση από WRAPP"
                >
                  <FaSync className={syncing ? "animate-spin" : ""} />
                  <span className="text-sm">Sync</span>
                </button>
                {lastSyncTime && (
                  <span className="text-xs text-blue-200 mt-1">
                    {lastSyncTime.toLocaleTimeString("el-GR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            <div className="bg-blue-500 p-3 rounded-lg text-center">
              <div className="text-xl font-bold">{stats.total}</div>
              <div className="text-sm text-blue-100">Σύνολο</div>
            </div>
            <div className="bg-red-500 p-3 rounded-lg text-center">
              <div className="text-xl font-bold">{stats.available}</div>
              <div className="text-sm text-red-100">Διαθέσιμα</div>
            </div>
            <div className="bg-green-500 p-3 rounded-lg text-center">
              <div className="text-xl font-bold">{stats.open}</div>
              <div className="text-sm text-green-100">Ανοιχτά</div>
            </div>
            <div className="bg-gray-500 p-3 rounded-lg text-center">
              <div className="text-xl font-bold">{stats.closed}</div>
              <div className="text-sm text-gray-100">Κλειστά</div>
            </div>
            <div className="bg-orange-500 p-3 rounded-lg text-center">
              <div className="text-xl font-bold">{stats.alert}</div>
              <div className="text-sm text-orange-100">Ειδοποίηση</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Table List */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaUtensils className="mr-2 text-blue-600" />
                Λίστα Τραπεζιών
              </h3>

              <div className="space-y-2">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTable?.id === table.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    onClick={() => handleTableClick(table)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: table.color || "#3B82F6" }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {table.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <FaChair className="mr-1" />
                            {table.seats} θέσεις
                          </div>
                        </div>
                      </div>

                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getTableStatusColor(table) }}
                      />
                    </div>

                    {/* Status and Info Row */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            table.status === "available"
                              ? "bg-red-100 text-red-800"
                              : table.status === "open"
                              ? "bg-green-100 text-green-800"
                              : table.status === "closed"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {getTableStatusLabel(table.status)}
                        </span>

                        {/* Show invoice count badge */}
                        {table.invoices && table.invoices.length > 0 && (
                          <div className="flex items-center text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                            <FaFileInvoice className="mr-1" size={10} />
                            {table.invoices.length} {orderNoteSeries}
                          </div>
                        )}
                      </div>

                      {/* Total Amount */}
                      {table.status === "open" && (
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          <FaEuroSign className="mr-1" size={12} />
                          {table.total.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    {table.wrappId && (
                      <div className="mt-2">
                        {table.status === "available" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTable(table);
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors"
                            title="Άνοιγμα τραπεζιού"
                          >
                            Άνοιγμα Τραπεζιού
                          </button>
                        )}
                        {table.status === "closed" && table.total === 0 && (
                          <div className="text-xs text-green-700 font-medium flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            Έτοιμο για παραγγελία
                          </div>
                        )}
                      </div>
                    )}

                    {table.section && (
                      <div className="mt-2 text-xs text-gray-500">
                        📍 {table.section}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-lg transition-colors ${
                    showGrid
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                  title="Toggle Grid"
                >
                  <FaTh />
                </button>

                <div className="flex items-center space-x-2">
                  {selectedTable && !selectedTable.wrappId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        manualSyncTable(selectedTable);
                      }}
                      className="text-orange-600 hover:text-orange-800"
                      title="Σύνδεση με WRAPP"
                    >
                      <FaSync className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleZoomChange(Math.max(0.3, zoom - 0.1))}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    <FaCompress />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => handleZoomChange(Math.min(2, zoom + 0.1))}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    <FaExpand />
                  </button>
                  <button
                    onClick={() => {
                      const optimalZoom = calculateOptimalZoom();
                      handleZoomChange(optimalZoom);
                      // Manual auto-fit applied
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-xs font-medium"
                    title="Προσαρμογή ζουμ στο περιεχόμενο"
                  >
                    Auto Fit
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {selectedTable ? (
                  <div className="flex items-center space-x-4">
                    <span>Επιλεγμένο: {selectedTable.name}</span>
                    <span className="text-xs text-gray-500">
                      Status: {getTableStatusLabel(selectedTable.status)}
                    </span>
                  </div>
                ) : (
                  "Κάντε κλικ σε τραπέζι για επιλογή"
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Φόρτωση σάλας...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div
                    ref={canvasRef}
                    className="relative bg-white border border-gray-300 shadow-lg"
                    style={{
                      width: canvasSize.width,
                      height: canvasSize.height,
                      transform: `scale(${zoom})`,
                      transformOrigin: "center center",
                      backgroundImage: showGrid
                        ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`
                        : "none",
                      backgroundSize: showGrid
                        ? `${gridSize}px ${gridSize}px`
                        : "auto",
                    }}
                  >
                    {/* Render Divider Lines */}
                    {currentLayout?.dividerLines?.map((divider) => (
                      <svg
                        key={divider.id}
                        className="absolute inset-0 pointer-events-none"
                        style={{ width: "100%", height: "100%" }}
                      >
                        <line
                          x1={divider.x1}
                          y1={divider.y1}
                          x2={divider.x2}
                          y2={divider.y2}
                          stroke={divider.color}
                          strokeWidth={divider.thickness}
                          strokeDasharray={
                            divider.style === "dashed"
                              ? "5,5"
                              : divider.style === "dotted"
                              ? "2,2"
                              : "none"
                          }
                        />
                      </svg>
                    ))}

                    {/* Render Tables */}
                    {tables.map((table) => (
                      <div
                        key={table.id}
                        className={`absolute border-2 cursor-pointer transition-all hover:shadow-lg ${
                          selectedTable?.id === table.id
                            ? "border-blue-500 shadow-lg z-10"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                        style={{
                          left: table.x,
                          top: table.y,
                          width: table.width,
                          height: table.height,
                          backgroundColor: table.color || "#3B82F6",
                          borderRadius:
                            table.shape === "circle" ? "50%" : "4px",
                          transform: `rotate(${table.rotation}deg)`,
                        }}
                        onClick={() => handleTableClick(table)}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                          {table.name}
                        </div>

                        {/* Status indicator */}
                        <div
                          className="absolute top-1 right-1 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getTableStatusColor(table),
                          }}
                        />

                        {/* WRAPP sync indicator */}
                        {!table.wrappId && (
                          <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            !
                          </div>
                        )}

                        {/* Order notes indicator */}
                        {table.invoices && table.invoices.length > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {table.invoices.length}
                          </div>
                        )}

                        {/* Total amount indicator */}
                        {table.total > 0 && (
                          <div className="absolute -bottom-2 -right-2 bg-green-600 text-white text-xs rounded-full px-2 py-1 font-bold">
                            €{table.total.toFixed(2)}
                          </div>
                        )}

                        {/* Loading indicator for orders */}
                        {loadingOrders &&
                          (table.status === "open" || table.total > 0) && (
                            <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              <FaSpinner className="animate-spin text-xs" />
                            </div>
                          )}

                        {/* Table info on hover */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          {table.seats} θέσεις •{" "}
                          {getTableStatusLabel(table.status)}
                          {table.invoices && table.invoices.length > 0 && (
                            <span> • {table.invoices.length} παραγγελίες</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Σύνολο τραπεζιών: {tables.length} • Διαθέσιμα: {stats.available} •
              Ανοιχτά: {stats.open}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Orders Modal */}
      <TableOrdersModal
        isOpen={showTableOrdersModal}
        onClose={async () => {
          setShowTableOrdersModal(false);
          setSelectedTableForOrders(null);

          // SIMPLE: Wait 3 seconds then FORCE clear the closed table
          // Waiting 3 seconds then FORCE clearing closed table
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // FORCE update any closed tables to have empty invoices
          setTables((prevTables) =>
            prevTables.map((table) =>
              table.status === "closed" || table.status === "available"
                ? { ...table, invoices: [], total: 0 }
                : table
            )
          );

          // Forced all closed/available tables to be empty
        }}
        table={selectedTableForOrders}
        orders={
          selectedTableForOrders
            ? tableOrders[selectedTableForOrders.id] || []
            : []
        }
        onPayment={handlePayment}
        onAddProducts={() => {
          // Close modal and call parent callback to add products
          setShowTableOrdersModal(false);
          if (selectedTableForOrders && onTableSelect) {
            onTableSelect(
              selectedTableForOrders,
              currentLayout?.selectedPriceListId
            );
          }
        }}
        onReopenTable={async () => {
          // Reopen closed table
          if (selectedTableForOrders) {
            const success = await reopenTable(selectedTableForOrders, false);
            if (success) {
              setShowTableOrdersModal(false);
            }
          }
        }}
        loading={loadingOrders}
      />
    </div>
  );
}
