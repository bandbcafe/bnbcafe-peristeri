"use client";

import { useState, useEffect, useRef } from "react";
import {
  FaTable,
  FaPlus,
  FaSave,
  FaEdit,
  FaTrash,
  FaUndo,
  FaRedo,
  FaTh,
  FaExpand,
  FaCompress,
  FaCog,
  FaChair,
  FaSquare,
  FaCircle,
  FaArrowLeft,
  FaSpinner,
  FaRuler,
  FaDrawPolygon,
  FaSlash,
  FaPencilRuler,
  FaEraser,
} from "react-icons/fa";
import {
  Table,
  TableLayout,
  TableFormData,
  TablePosition,
  TableStats,
  DividerLine,
} from "@/types/table";
import { PriceList } from "@/types/products";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function TablesPage() {
  const { user } = useAuth();

  // State management
  const [tables, setTables] = useState<Table[]>([]);
  const [currentLayout, setCurrentLayout] = useState<TableLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [draggedTable, setDraggedTable] = useState<Table | null>(null);
  const [isDragging, setIsDragging] = useState(false);


  // Canvas and layout state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize] = useState(20);

  // Room dimensions and dividers
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomDimensions, setRoomDimensions] = useState<{
    width: number;
    height: number;
    unit: "meters" | "feet";
  }>({ width: 10, height: 8, unit: "meters" });
  const [dividerLines, setDividerLines] = useState<DividerLine[]>([]);
  const [isDrawingDivider, setIsDrawingDivider] = useState(false);
  const [currentDivider, setCurrentDivider] =
    useState<Partial<DividerLine> | null>(null);
  const [dividerMode, setDividerMode] = useState<
    "wall" | "partition" | "decoration"
  >("wall");

  // Undo/Redo functionality for dividers
  const [dividerHistory, setDividerHistory] = useState<DividerLine[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Price lists for restaurant floor
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<TableFormData>({
    name: "",
    seats: 4,
    section: "",
    shape: "rectangle",
    width: 80,
    height: 60,
    color: "#3B82F6",
    notes: "",
  });

  // Load tables and layout
  useEffect(() => {
    loadTables();
    loadCurrentLayout();
    loadPriceLists();
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawingDivider) return;

      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoDivider();
      } else if (
        e.ctrlKey &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redoDivider();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawingDivider, historyIndex, dividerHistory.length]);


  const loadTables = async () => {
    try {
      const q = query(collection(db, "tables"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const tablesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Table[];

      setTables(tablesData);
    } catch (error) {
      console.error("Error loading tables:", error);
    } finally {
      setLoading(false);
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

        // Load room dimensions if available
        if (layout.roomWidth && layout.roomHeight) {
          setRoomDimensions({
            width: layout.roomWidth,
            height: layout.roomHeight,
            unit: (layout.roomUnit as "meters" | "feet") || "meters",
          });
        }

        // Load divider lines if available
        if (layout.dividerLines) {
          setDividerLines(layout.dividerLines);
          setDividerHistory([layout.dividerLines]);
          setHistoryIndex(0);
        }

        // Load selected price list if available
        if (layout.selectedPriceListId) {
          setSelectedPriceListId(layout.selectedPriceListId);
        }
      } else {
        // Create default layout
        const defaultLayout: Partial<TableLayout> = {
          name: "Default Layout",
          description: "Default restaurant layout",
          width: 800,
          height: 600,
          backgroundColor: "#F3F4F6",
          gridSize: 20,
          tables: [],
          isActive: true,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
          createdBy: user?.id,
        };

        const docRef = await addDoc(
          collection(db, "table_layouts"),
          defaultLayout
        );
        setCurrentLayout({ id: docRef.id, ...defaultLayout } as TableLayout);
      }
    } catch (error) {
      console.error("Error loading layout:", error);
    }
  };

  const loadPriceLists = async () => {
    try {
      const q = query(
        collection(db, "priceLists"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const priceListsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as PriceList[];

      setPriceLists(priceListsData);
      console.log("✅ Price lists loaded:", priceListsData.length, "lists");
      console.log("📋 Price lists data:", priceListsData);

      // Set default price list if none selected
      if (priceListsData.length > 0 && !selectedPriceListId) {
        const defaultPriceList =
          priceListsData.find((pl) => pl.isActive) || priceListsData[0];
        setSelectedPriceListId(defaultPriceList.id);
        console.log("🎯 Default price list selected:", defaultPriceList.name);
      }
    } catch (error) {
      console.error("❌ Error loading price lists:", error);
    }
  };

  // Table CRUD operations
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validation: Only numbers allowed for table name
      const tableNumber = formData.name.trim();
      if (!/^\d+$/.test(tableNumber)) {
        alert(
          "Το όνομα του τραπεζιού πρέπει να είναι μόνο αριθμός (π.χ. 1, 2, 15)"
        );
        setSaving(false);
        return;
      }

      // Check for duplicate table numbers (only for new tables or when changing name)
      const isDuplicateNumber = tables.some(
        (table) =>
          table.name === tableNumber &&
          (!editingTable || table.id !== editingTable.id)
      );

      if (isDuplicateNumber) {
        alert(
          `Το τραπέζι με αριθμό "${tableNumber}" υπάρχει ήδη. Παρακαλώ επιλέξτε διαφορετικό αριθμό.`
        );
        setSaving(false);
        return;
      }
      if (editingTable) {
        // Update existing table
        const updates = {
          ...formData,
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(db, "tables", editingTable.id), updates);

        setTables((prev) =>
          prev.map((table) =>
            table.id === editingTable.id
              ? { ...table, ...updates, updatedAt: new Date() }
              : table
          )
        );
      } else {
        // Create new table
        const newTable: Partial<Table> = {
          ...formData,
          status: "available",
          total: 0,
          invoices: [],
          x: 100, // Default position
          y: 100,
          rotation: 0,
          isActive: true,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
          createdBy: user?.id,
        };

        const docRef = await addDoc(collection(db, "tables"), newTable);
        const createdTable = {
          id: docRef.id,
          ...newTable,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Table;

        // Create corresponding WRAPP catering table (async)
        const createWrappTable = async () => {
          try {
            console.log("🍽️ Creating WRAPP table for:", newTable.name);

            // Get WRAPP settings from Firestore
            const { getWrappConfig } = await import("@/lib/firebase");
            const wrappSettings = await getWrappConfig();
            console.log("📋 WRAPP settings from Firestore:", wrappSettings);

            if (
              wrappSettings.email &&
              wrappSettings.apiKey &&
              wrappSettings.baseUrl
            ) {
              // Login to WRAPP first
              const loginResponse = await fetch("/api/wrapp/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: wrappSettings.email,
                  api_key: wrappSettings.apiKey,
                  baseUrl: wrappSettings.baseUrl,
                }),
              });

            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              const jwt = loginData.data.attributes.jwt;

              // Create WRAPP table
              const wrappResponse = await fetch(
                "/api/wrapp/catering-tables/create",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                  },
                  body: JSON.stringify({
                    name: newTable.name,
                    baseUrl: wrappSettings.baseUrl,
                  }),
                }
              );

              if (wrappResponse.ok) {
                const wrappTable = await wrappResponse.json();
                console.log("✅ WRAPP table created:", wrappTable.id);

                // Update local table with WRAPP ID
                await updateDoc(doc(db, "tables", docRef.id), {
                  wrappId: wrappTable.id,
                  updatedAt: serverTimestamp(),
                });

                // Update local state
                createdTable.wrappId = wrappTable.id;

                // Success message
                console.log(`✅ Τραπέζι ${newTable.name} δημιουργήθηκε επιτυχώς! Συνδέθηκε με WRAPP (ID: ${wrappTable.id})`);
              } else {
                const errorText = await wrappResponse.text();
                console.error("❌ Failed to create WRAPP table:", errorText);

                // Error message but table still created locally
                console.warn(`⚠️ Τραπέζι ${newTable.name} δημιουργήθηκε τοπικά αλλά απέτυχε η σύνδεση με WRAPP. Σφάλμα: ${errorText}`);
              }
            } else {
              console.error("❌ WRAPP login failed");
              console.warn(`⚠️ Τραπέζι ${newTable.name} δημιουργήθηκε τοπικά αλλά απέτυχε η σύνδεση με WRAPP. Αποτυχία σύνδεσης.`);
            }
          } else {
            console.log(
              "ℹ️ WRAPP settings not configured, skipping WRAPP table creation"
            );
              console.info(`ℹ️ Τραπέζι ${newTable.name} δημιουργήθηκε τοπικά. Για σύνδεση με WRAPP, ρυθμίστε τα διαπιστευτήρια στις ρυθμίσεις.`);
            }
          } catch (error) {
            console.error("❌ Error creating WRAPP table:", error);
            // Continue anyway - local table is created
          }
        };

        // Call the async function
        createWrappTable();

        setTables((prev) => [...prev, createdTable]);
      }

      setShowTableForm(false);
      resetForm();
    } catch (error) {
      console.error("Error saving table:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTable = async (
    tableId: string,
    updates: Partial<Table>
  ) => {
    try {
      await updateDoc(doc(db, "tables", tableId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, ...updates } : table
        )
      );
    } catch (error) {
      console.error("Error updating table:", error);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    const tableToDelete = tables.find((t) => t.id === tableId);
    if (!tableToDelete) return;

    if (
      !confirm(
        `Είστε σίγουροι ότι θέλετε να διαγράψετε το τραπέζι "${tableToDelete.name}";`
      )
    ) {
      return;
    }

    try {
      console.log("🗑️ Deleting table:", tableToDelete.name);

      // If table has WRAPP ID, delete from WRAPP first
      if (tableToDelete.wrappId) {
        try {
          console.log("🗑️ Deleting from WRAPP first:", tableToDelete.wrappId);

          // Get WRAPP settings from Firestore
          const { getWrappConfig } = await import("@/lib/firebase");
          const wrappSettings = await getWrappConfig();

          if (
            wrappSettings.email &&
            wrappSettings.apiKey &&
            wrappSettings.baseUrl
          ) {
            // Login to WRAPP first
            const loginResponse = await fetch("/api/wrapp/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: wrappSettings.email,
                api_key: wrappSettings.apiKey,
                baseUrl: wrappSettings.baseUrl,
              }),
            });

            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              const jwt = loginData.data.attributes.jwt;

              // Delete from WRAPP
              const deleteResponse = await fetch(
                `/api/wrapp/catering-tables/delete?tableId=${
                  tableToDelete.wrappId
                }&baseUrl=${encodeURIComponent(wrappSettings.baseUrl)}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${jwt}`,
                  },
                }
              );

              if (deleteResponse.ok) {
                console.log(`✅ Τραπέζι ${tableToDelete.name} διαγράφηκε επιτυχώς από το WRAPP!`);
              } else {
                const errorText = await deleteResponse.text();
                console.error("❌ Failed to delete from WRAPP:", errorText);
                console.warn(`⚠️ Τραπέζι ${tableToDelete.name} θα διαγραφεί τοπικά αλλά απέτυχε η διαγραφή από το WRAPP. Σφάλμα: ${errorText}`);
              }
            } else {
              console.error("❌ WRAPP login failed for deletion");
              console.warn(`⚠️ Τραπέζι ${tableToDelete.name} θα διαγραφεί τοπικά αλλά απέτυχε η σύνδεση με WRAPP.`);
            }
          } else {
            console.log(
              "ℹ️ No WRAPP settings configured, skipping WRAPP deletion"
            );
          }
        } catch (wrappError) {
          console.error("❌ Error deleting from WRAPP:", wrappError);
          console.warn(`⚠️ Τραπέζι ${tableToDelete.name} θα διαγραφεί τοπικά αλλά απέτυχε η διαγραφή από το WRAPP.`);
        }
      }

      // Delete from Firestore (always do this, even if WRAPP deletion failed)
      await deleteDoc(doc(db, "tables", tableId));
      setTables((prev) => prev.filter((table) => table.id !== tableId));

      console.log("✅ Table deleted from Firestore successfully");
    } catch (error) {
      console.error("Error deleting table:", error);
      alert(`❌ Σφάλμα κατά τη διαγραφή του τραπεζιού: ${error}`);
    }
  };

  // Drag and drop functionality
  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    e.preventDefault();
    if (isDrawingDivider) return; // Don't drag tables when drawing dividers
    setDraggedTable(table);
    setIsDragging(true);
    setSelectedTable(table);
  };

  // Divider drawing functionality
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!isDrawingDivider || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Snap to grid if enabled
    const snappedX = showGrid ? Math.round(x / gridSize) * gridSize : x;
    const snappedY = showGrid ? Math.round(y / gridSize) * gridSize : y;

    setCurrentDivider({
      id: `divider_${Date.now()}`,
      x1: snappedX,
      y1: snappedY,
      x2: snappedX,
      y2: snappedY,
      color:
        dividerMode === "wall"
          ? "#374151"
          : dividerMode === "partition"
          ? "#6B7280"
          : "#D1D5DB",
      thickness: dividerMode === "wall" ? 4 : 2,
      style: "solid",
      type: dividerMode,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (currentDivider && isDrawingDivider && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      // Snap to grid if enabled
      const snappedX = showGrid ? Math.round(x / gridSize) * gridSize : x;
      const snappedY = showGrid ? Math.round(y / gridSize) * gridSize : y;

      setCurrentDivider((prev) =>
        prev ? { ...prev, x2: snappedX, y2: snappedY } : null
      );
    }
  };

  // Undo/Redo helper functions
  const addToHistory = (newDividers: DividerLine[]) => {
    // Remove any future history if we're not at the end
    const newHistory = dividerHistory.slice(0, historyIndex + 1);
    newHistory.push(newDividers);

    // Limit history to 50 steps to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex((prev) => prev + 1);
    }

    setDividerHistory(newHistory);
    setDividerLines(newDividers);

    // Auto-save divider lines to Firestore
    saveDividersToFirestore(newDividers);
  };

  const saveDividersToFirestore = async (dividers: DividerLine[]) => {
    try {
      if (currentLayout) {
        const layoutRef = doc(db, "table_layouts", currentLayout.id);
        await updateDoc(layoutRef, {
          dividerLines: dividers,
          updatedAt: serverTimestamp(),
        });

        // Update local state
        setCurrentLayout((prev) =>
          prev
            ? {
                ...prev,
                dividerLines: dividers,
                updatedAt: new Date(),
              }
            : null
        );

        console.log("✅ Divider lines auto-saved to Firestore");
      }
    } catch (error) {
      console.error("❌ Error auto-saving divider lines:", error);
    }
  };

  const undoDivider = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDividerLines(dividerHistory[newIndex]);
      saveDividersToFirestore(dividerHistory[newIndex]);
    }
  };

  const redoDivider = () => {
    if (historyIndex < dividerHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDividerLines(dividerHistory[newIndex]);
      saveDividersToFirestore(dividerHistory[newIndex]);
    }
  };

  const clearAllDividers = () => {
    addToHistory([]);
  };

  const handleCanvasMouseUp = () => {
    if (currentDivider && isDrawingDivider) {
      // Only add divider if it has some length
      const length = Math.sqrt(
        Math.pow(currentDivider.x2! - currentDivider.x1!, 2) +
          Math.pow(currentDivider.y2! - currentDivider.y1!, 2)
      );

      if (length > 10) {
        // Minimum length threshold
        const newDividers = [...dividerLines, currentDivider as DividerLine];
        addToHistory(newDividers);
      }

      setCurrentDivider(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedTable || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Snap to grid if enabled
    const snappedX = showGrid ? Math.round(x / gridSize) * gridSize : x;
    const snappedY = showGrid ? Math.round(y / gridSize) * gridSize : y;

    setTables((prev) =>
      prev.map((table) =>
        table.id === draggedTable.id
          ? { ...table, x: snappedX, y: snappedY }
          : table
      )
    );
  };

  const handleMouseUp = () => {
    if (isDragging && draggedTable) {
      // Save position to database
      const updatedTable = tables.find((t) => t.id === draggedTable.id);
      if (updatedTable) {
        handleUpdateTable(draggedTable.id, {
          x: updatedTable.x,
          y: updatedTable.y,
        });
      }
    }

    setIsDragging(false);
    setDraggedTable(null);
  };

  // Utility functions
  const resetForm = () => {
    setFormData({
      name: "",
      seats: 4,
      section: "",
      shape: "rectangle",
      width: 80,
      height: 60,
      color: "#3B82F6",
      notes: "",
    });
    setEditingTable(null);
  };

  const getTableStats = (): TableStats => {
    return {
      total: tables.length,
      available: tables.filter((t) => t.status === "available").length,
      open: tables.filter((t) => t.status === "open").length,
      closed: tables.filter((t) => t.status === "closed").length,
      alert: tables.filter((t) => t.status === "alert").length,
    };
  };

  const stats = getTableStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/pos"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Επιστροφή στο POS"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <FaTable className="mr-3 text-blue-600" />
                Διαμόρφωση Σάλας
              </h1>
              <p className="text-gray-600">
                Σχεδιασμός και διαχείριση τραπεζιών
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Price List Selector for Restaurant Floor */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Τιμοκατάλογος:
              </label>
              <select
                value={selectedPriceListId}
                onChange={async (e) => {
                  const newPriceListId = e.target.value;
                  setSelectedPriceListId(newPriceListId);

                  // Auto-save to Firestore
                  if (currentLayout) {
                    try {
                      const layoutRef = doc(
                        db,
                        "table_layouts",
                        currentLayout.id
                      );
                      await updateDoc(layoutRef, {
                        selectedPriceListId: newPriceListId,
                        updatedAt: serverTimestamp(),
                      });

                      setCurrentLayout((prev) =>
                        prev
                          ? {
                              ...prev,
                              selectedPriceListId: newPriceListId,
                              updatedAt: new Date(),
                            }
                          : null
                      );

                      console.log("✅ Price list auto-saved:", newPriceListId);
                    } catch (error) {
                      console.error("❌ Error auto-saving price list:", error);
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[200px]"
              >
                <option value="">Επιλέξτε τιμοκατάλογο</option>
                {priceLists.map((priceList) => (
                  <option key={priceList.id} value={priceList.id}>
                    {priceList.name} {priceList.isActive ? "(Ενεργός)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowRoomSettings(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <FaRuler className="mr-2" />
              Διαστάσεις Σάλας
            </button>
            <button
              onClick={() => {
                const newDrawingState = !isDrawingDivider;
                setIsDrawingDivider(newDrawingState);

                // Initialize history when entering drawing mode
                if (
                  newDrawingState &&
                  dividerHistory.length === 1 &&
                  dividerHistory[0].length === 0
                ) {
                  setDividerHistory([dividerLines]);
                  setHistoryIndex(0);
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                isDrawingDivider
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              <FaDrawPolygon className="mr-2" />
              {isDrawingDivider ? "Τέλος Σχεδίασης" : "Διαχοριστικές"}
            </button>
            <button
              onClick={() => setShowTableForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <FaPlus className="mr-2" />
              Νέο Τραπέζι
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-4">
          <div className="bg-gray-100 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-600">Σύνολο</div>
          </div>
          <div className="bg-green-100 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-green-600">
              {stats.available}
            </div>
            <div className="text-sm text-gray-600">Διαθέσιμα</div>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-sm text-gray-600">Ανοιχτά</div>
          </div>
          <div className="bg-red-100 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-red-600">{stats.closed}</div>
            <div className="text-sm text-gray-600">Κλειστά</div>
          </div>
          <div className="bg-orange-100 p-3 rounded-lg text-center">
            <div className="text-xl font-bold text-orange-600">
              {stats.alert}
            </div>
            <div className="text-sm text-gray-600">Ειδοποίηση</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar - Table List */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Τραπέζια
            </h3>

            <div className="space-y-2">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTable?.id === table.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTable(table)}
                >
                  <div className="flex items-center justify-between">
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
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTable(table);
                          setFormData({
                            name: table.name,
                            seats: table.seats,
                            section: table.section || "",
                            shape: table.shape,
                            width: table.width,
                            height: table.height,
                            color: table.color || "#3B82F6",
                            notes: table.notes || "",
                          });
                          setShowTableForm(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        table.status === "available"
                          ? "bg-green-100 text-green-800"
                          : table.status === "open"
                          ? "bg-blue-100 text-blue-800"
                          : table.status === "closed"
                          ? "bg-red-100 text-red-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {table.status === "available"
                        ? "Διαθέσιμο"
                        : table.status === "open"
                        ? "Ανοιχτό"
                        : table.status === "closed"
                        ? "Κλειστό"
                        : "Ειδοποίηση"}
                    </span>
                  </div>
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

              {/* Divider Mode Selector */}
              {isDrawingDivider && (
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                  <span className="text-sm font-medium text-orange-800">
                    Τύπος:
                  </span>
                  <select
                    value={dividerMode}
                    onChange={(e) => setDividerMode(e.target.value as any)}
                    className="text-sm border border-orange-300 rounded px-2 py-1"
                  >
                    <option value="wall">Τοίχος</option>
                    <option value="partition">Διαχωριστικό</option>
                    <option value="decoration">Διακόσμηση</option>
                  </select>

                  {/* Undo/Redo buttons */}
                  <div className="flex items-center space-x-1 border-l border-orange-300 pl-2">
                    <button
                      onClick={undoDivider}
                      disabled={historyIndex <= 0}
                      className={`p-1 rounded ${
                        historyIndex <= 0
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                      }`}
                      title="Αναίρεση (Ctrl+Z)"
                    >
                      <FaUndo size={14} />
                    </button>
                    <button
                      onClick={redoDivider}
                      disabled={historyIndex >= dividerHistory.length - 1}
                      className={`p-1 rounded ${
                        historyIndex >= dividerHistory.length - 1
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                      }`}
                      title="Επανάληψη (Ctrl+Y)"
                    >
                      <FaRedo size={14} />
                    </button>
                  </div>

                  <button
                    onClick={clearAllDividers}
                    className="text-sm text-red-600 hover:text-red-800 px-2 py-1 border border-red-300 rounded"
                  >
                    Καθαρισμός
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <FaCompress />
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <FaExpand />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {isDrawingDivider ? (
                <div className="flex items-center space-x-4">
                  <span>
                    Σχεδίαση διαχοριστικών - {dividerLines.length} γραμμές
                  </span>
                  <span className="text-xs text-gray-500">
                    Ιστορικό: {historyIndex + 1}/{dividerHistory.length}
                  </span>
                </div>
              ) : selectedTable ? (
                `Επιλεγμένο: ${selectedTable.name}`
              ) : (
                "Κάντε κλικ σε τραπέζι για επιλογή"
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div
              ref={canvasRef}
              className="relative bg-white border border-gray-300 mx-auto"
              style={{
                width: canvasSize.width * zoom,
                height: canvasSize.height * zoom,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                backgroundImage: showGrid
                  ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`
                  : "none",
                backgroundSize: showGrid
                  ? `${gridSize}px ${gridSize}px`
                  : "auto",
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={(e) => {
                handleMouseMove(e);
                handleCanvasMouseMove(e);
              }}
              onMouseUp={() => {
                handleMouseUp();
                handleCanvasMouseUp();
              }}
              onMouseLeave={() => {
                handleMouseUp();
                handleCanvasMouseUp();
              }}
            >
              {/* Render Divider Lines */}
              {dividerLines.map((divider) => (
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

              {/* Render Current Divider Being Drawn */}
              {currentDivider && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: "100%", height: "100%" }}
                >
                  <line
                    x1={currentDivider.x1}
                    y1={currentDivider.y1}
                    x2={currentDivider.x2}
                    y2={currentDivider.y2}
                    stroke={currentDivider.color}
                    strokeWidth={currentDivider.thickness}
                    strokeDasharray={
                      currentDivider.style === "dashed"
                        ? "5,5"
                        : currentDivider.style === "dotted"
                        ? "2,2"
                        : "none"
                    }
                    opacity={0.7}
                  />
                </svg>
              )}

              {/* Render Tables */}
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`absolute border-2 cursor-move transition-all ${
                    selectedTable?.id === table.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{
                    left: table.x,
                    top: table.y,
                    width: table.width,
                    height: table.height,
                    backgroundColor: table.color || "#3B82F6",
                    borderRadius: table.shape === "circle" ? "50%" : "4px",
                    transform: `rotate(${table.rotation}deg)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, table)}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                    {table.name}
                  </div>

                  {/* Status indicator */}
                  <div
                    className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                      table.status === "available"
                        ? "bg-green-400"
                        : table.status === "open"
                        ? "bg-blue-400"
                        : table.status === "closed"
                        ? "bg-red-400"
                        : "bg-orange-400"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table Form Modal */}
      {showTableForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingTable ? "Επεξεργασία Τραπεζιού" : "Νέο Τραπέζι"}
              </h3>
            </div>

            <form onSubmit={handleSaveTable} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Όνομα Τραπεζιού *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setFormData((prev) => ({ ...prev, name: value }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. 1, 2, 15, 101"
                    required
                    maxLength={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Θέσεις
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.seats}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          seats: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Σχήμα
                    </label>
                    <select
                      value={formData.shape}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shape: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="rectangle">Ορθογώνιο</option>
                      <option value="square">Τετράγωνο</option>
                      <option value="circle">Κύκλος</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Πλάτος (px)
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={formData.width}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          width: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ύψος (px)
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      value={formData.height}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          height: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Χρώμα
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Τμήμα/Περιοχή
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        section: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="π.χ. Κεντρική Σάλα, Βεράντα, VIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Σημειώσεις
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Πρόσθετες πληροφορίες..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTableForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <FaSave className="mr-2" />
                  )}
                  {saving ? "Αποθήκευση..." : "Αποθήκευση"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Settings Modal */}
      {showRoomSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FaRuler className="mr-2 text-green-600" />
                Διαστάσεις Σάλας
              </h3>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Μονάδα Μέτρησης
                  </label>
                  <select
                    value={roomDimensions.unit}
                    onChange={(e) =>
                      setRoomDimensions((prev) => ({
                        ...prev,
                        unit: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="meters">Μέτρα (m)</option>
                    <option value="feet">Πόδια (ft)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Πλάτος ({roomDimensions.unit === "meters" ? "m" : "ft"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={roomDimensions.width}
                      onChange={(e) =>
                        setRoomDimensions((prev) => ({
                          ...prev,
                          width: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Μήκος ({roomDimensions.unit === "meters" ? "m" : "ft"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={roomDimensions.height}
                      onChange={(e) =>
                        setRoomDimensions((prev) => ({
                          ...prev,
                          height: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Διαστάσεις Canvas
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Πλάτος (pixels)
                      </label>
                      <input
                        type="number"
                        min="400"
                        max="2000"
                        value={canvasSize.width}
                        onChange={(e) =>
                          setCanvasSize((prev) => ({
                            ...prev,
                            width: parseInt(e.target.value),
                          }))
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Ύψος (pixels)
                      </label>
                      <input
                        type="number"
                        min="300"
                        max="1500"
                        value={canvasSize.height}
                        onChange={(e) =>
                          setCanvasSize((prev) => ({
                            ...prev,
                            height: parseInt(e.target.value),
                          }))
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>Κλίμακα:</strong> 1 pixel ={" "}
                  {(roomDimensions.width / canvasSize.width).toFixed(3)}{" "}
                  {roomDimensions.unit === "meters" ? "m" : "ft"}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRoomSettings(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      if (currentLayout) {
                        // Update layout with room dimensions and divider lines
                        const layoutRef = doc(
                          db,
                          "table_layouts",
                          currentLayout.id
                        );
                        await updateDoc(layoutRef, {
                          roomWidth: roomDimensions.width,
                          roomHeight: roomDimensions.height,
                          roomUnit: roomDimensions.unit,
                          width: canvasSize.width,
                          height: canvasSize.height,
                          dividerLines: dividerLines,
                          selectedPriceListId: selectedPriceListId,
                          updatedAt: serverTimestamp(),
                        });

                        // Update local state
                        setCurrentLayout((prev) =>
                          prev
                            ? {
                                ...prev,
                                roomWidth: roomDimensions.width,
                                roomHeight: roomDimensions.height,
                                roomUnit: roomDimensions.unit,
                                width: canvasSize.width,
                                height: canvasSize.height,
                                dividerLines: dividerLines,
                                selectedPriceListId: selectedPriceListId,
                                updatedAt: new Date(),
                              }
                            : null
                        );

                        console.log(
                          "✅ Layout saved successfully with room dimensions and divider lines"
                        );
                      } else {
                        // Create new layout if none exists
                        const newLayout = {
                          name: "Default Layout",
                          description: "Αυτόματα δημιουργημένη διάταξη",
                          width: canvasSize.width,
                          height: canvasSize.height,
                          roomWidth: roomDimensions.width,
                          roomHeight: roomDimensions.height,
                          roomUnit: roomDimensions.unit,
                          dividerLines: dividerLines,
                          selectedPriceListId: selectedPriceListId,
                          tables: [],
                          isActive: true,
                          createdAt: serverTimestamp(),
                          updatedAt: serverTimestamp(),
                          createdBy: user?.id,
                        };

                        const docRef = await addDoc(
                          collection(db, "table_layouts"),
                          newLayout
                        );
                        const createdLayout = {
                          id: docRef.id,
                          ...newLayout,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                        } as TableLayout;

                        setCurrentLayout(createdLayout);
                        console.log(
                          "✅ New layout created with room dimensions and divider lines"
                        );
                      }
                    } catch (error) {
                      console.error("❌ Error saving layout:", error);
                    } finally {
                      setSaving(false);
                    }
                    setShowRoomSettings(false);
                  }}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
                >
                  {saving ? (
                    <FaSpinner className="mr-2 animate-spin" />
                  ) : (
                    <FaSave className="mr-2" />
                  )}
                  {saving ? "Αποθήκευση..." : "Αποθήκευση"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
