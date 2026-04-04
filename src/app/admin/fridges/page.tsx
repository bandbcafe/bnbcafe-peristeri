"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  setDoc,
  deleteField,
  deleteDoc,
  getDocs,
  query,
  where,
  documentId,
  writeBatch,
  type QuerySnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { format } from "date-fns";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from "date-fns/locale/el";
import { 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaSnowflake, 
  FaThermometerHalf, 
  FaPlus,
  FaHistory,
  FaArchive,
  FaRegFileAlt,
  FaRegCalendarAlt
} from "react-icons/fa";
import { formatDM } from "@/lib/date";
import { FiThermometer, FiClock, FiMapPin, FiSettings, FiAlertCircle, FiCheckCircle, FiDownload, FiSearch, FiX } from "react-icons/fi";

// Register Greek locale for datepicker
registerLocale("el", el);

// Types
export type FridgeUnit = {
  id: string;
  name: string;
  location?: string;
  kind: "fridge" | "freezer";
  min?: number; // expected range for monitoring
  max?: number;
  active: boolean;
};

export type FridgeLog = {
  tempMorning?: number | null;
  tempEvening?: number | null;
  notes?: string;
  updatedAt?: string; // ISO
};

const FridgesPage: React.FC = () => {
  const [units, setUnits] = useState<FridgeUnit[]>([]);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newKind, setNewKind] = useState<"fridge" | "freezer">("fridge");
  const [newMin, setNewMin] = useState<string>("");
  const [newMax, setNewMax] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [logs, setLogs] = useState<Record<string, FridgeLog>>({});
  // Transient input state so that after saving we can clear cells
  const [inMorning, setInMorning] = useState<Record<string, string>>({});
  const [inEvening, setInEvening] = useState<Record<string, string>>({});
  const [inNotes, setInNotes] = useState<Record<string, string>>({});

  // Reset transient inputs when date changes to avoid carry-over values
  useEffect(() => {
    setInMorning({});
    setInEvening({});
    setInNotes({});
  }, [selectedDate]);

  // UI state for archived view and edit/delete modals
  const [showArchived, setShowArchived] = useState(false);
  // History (date-range) mode
  const [historyMode, setHistoryMode] = useState(false);
  const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [historyRows, setHistoryRows] = useState<Array<{ date: string; unitId: string; log: FridgeLog }>>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FridgeUnit | null>(null);
  const [eName, setEName] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eKind, setEKind] = useState<"fridge" | "freezer">("fridge");
  const [eMin, setEMin] = useState<string>("");
  const [eMax, setEMax] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<FridgeUnit | null>(null);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitLocation, setNewUnitLocation] = useState("");
  const [newUnitKind, setNewUnitKind] = useState<"fridge" | "freezer">("fridge");
  const [newUnitMin, setNewUnitMin] = useState<string>("");
  const [newUnitMax, setNewUnitMax] = useState<string>("");

  // Helpers: present dd/mm/yyyy in inputs but keep state as YYYY-MM-DD
  const toDMY = (ymd: string) => {
    if (!ymd) return "";
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
  };
  const ymdToDate = (ymd: string): Date | null => {
    if (!ymd) return null;
    const dt = new Date(ymd + "T00:00:00");
    return isNaN(dt.getTime()) ? null : dt;
  };
  const dateToYMD = (d: Date | null): string => {
    if (!d) return format(new Date(), "yyyy-MM-dd");
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const toYMD = (dmy: string) => {
    // Accept also with d-m-y, d.m.y, spaces
    const cleaned = dmy.replace(/\./g, "/").replace(/-/g, "/").trim();
    const parts = cleaned.split("/");
    if (parts.length !== 3) return "";
    let [d, m, y] = parts;
    if (d.length === 1) d = `0${d}`;
    if (m.length === 1) m = `0${m}`;
    if (y.length === 2) y = `20${y}`; // naive 2-digit year handling
    const ymd = `${y}-${m}-${d}`;
    // basic validation
    const dt = new Date(ymd + "T00:00:00");
    if (isNaN(dt.getTime())) return "";
    return ymd;
  };

  // Initialize date range when modal opens
  useEffect(() => {
    if (showHistoryModal && fromDate === toDate) {
      // Set default range to last 7 days
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      setFromDate(format(weekAgo, "yyyy-MM-dd"));
      setToDate(format(today, "yyyy-MM-dd"));
    }
  }, [showHistoryModal]);

  // Auto load history when modal opens or dates change
  useEffect(() => {
    if (showHistoryModal) {
      void loadHistory();
    }
  }, [showHistoryModal, fromDate, toDate, units]);

  // Auto load on changes when in history mode
  useEffect(() => {
    if (historyMode) {
      void loadHistory();
    }
  }, [historyMode, fromDate, toDate, units]);

  // Load units realtime
  useEffect(() => {
    const colRef = collection(db, "fridgeUnits");
    const unsub = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const list = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
          id: d.id,
          ...(d.data() as Omit<FridgeUnit, "id">),
        }));
        setUnits(list as FridgeUnit[]);
      }
    );
    return () => unsub();
  }, []);

  // Display all units (even archived) in daily logging
  const activeUnits = useMemo(() => units, [units]);
  const archivedUnits = useMemo(() => units.filter((u) => u.active === false), [units]);

  // Load per-unit log for selected date (all units)
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    activeUnits.forEach((u) => {
      const logDoc = doc(db, "fridgeLogs", selectedDate, "items", u.id);
      const unsub = onSnapshot(logDoc, (snap) => {
        setLogs((prev) => ({
          ...prev,
          [u.id]: (snap.exists() ? (snap.data() as FridgeLog) : {}) as FridgeLog,
        }));
      });
      unsubscribers.push(unsub);
    });
    return () => unsubscribers.forEach((u) => u());
  }, [activeUnits, selectedDate]);

  const addUnit = async () => {
    if (!newName.trim()) return;
    const id = String(Date.now());
    const ref = doc(db, "fridgeUnits", id);
    const payload: any = {
      name: newName.trim(),
      kind: newKind,
      active: true,
    };
    if (newLocation.trim() !== "") payload.location = newLocation.trim();
    if (newMin !== "") payload.min = Number(newMin);
    if (newMax !== "") payload.max = Number(newMax);
    await setDoc(ref, payload);
    setNewName("");
    setNewLocation("");
    setNewKind("fridge");
    setNewMin("");
    setNewMax("");
  };

  const addUnitFromModal = async () => {
    if (!newName.trim()) return;
    await addUnit();
    setShowAddUnitModal(false);
  };

  const cancelAddUnit = () => {
    setShowAddUnitModal(false);
    setNewName("");
    setNewLocation("");
    setNewKind("fridge");
    setNewMin("");
    setNewMax("");
  };

  const archiveUnit = async (unitId: string) => {
    const ref = doc(db, "fridgeUnits", unitId);
    await setDoc(ref, { active: false }, { merge: true });
    // Clear transient inputs for that unit so the row is ready for νέα καταχώριση
    setInMorning((s) => ({ ...s, [unitId]: "" }));
    setInEvening((s) => ({ ...s, [unitId]: "" }));
    setInNotes((s) => ({ ...s, [unitId]: "" }));
  };

  const unarchiveUnit = async (unitId: string) => {
    const ref = doc(db, "fridgeUnits", unitId);
    await setDoc(ref, { active: true }, { merge: true });
  };

  const openEdit = (u: FridgeUnit) => {
    setEditTarget(u);
    setEName(u.name || "");
    setELocation(u.location || "");
    setEKind(u.kind);
    setEMin(u.min != null ? String(u.min) : "");
    setEMax(u.max != null ? String(u.max) : "");
  };

  // Jump to today's inputs for a unit from the summary list
  const jumpToEdit = (unitId: string) => {
    try {
      const row = document.querySelector(`#row-${unitId}`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = row?.querySelector("input");
      if (firstInput && (firstInput as HTMLInputElement).focus) {
        setTimeout(() => (firstInput as HTMLInputElement).focus(), 150);
      }
    } catch {}
  };

  // Clear today's log for a unit (used by summary delete)
  const clearTodayLog = async (unitId: string) => {
    const refItem = doc(db, "fridgeLogs", selectedDate, "items", unitId);
    await setDoc(
      refItem,
      { unitId, updatedAt: new Date().toISOString(), tempMorning: null, tempEvening: null, notes: deleteField() },
      { merge: true }
    );
    // also clear transient inputs
    setInMorning((s) => ({ ...s, [unitId]: "" }));
    setInEvening((s) => ({ ...s, [unitId]: "" }));
    setInNotes((s) => ({ ...s, [unitId]: "" }));
  };

  // Save button per row: commits entered inputs (if any) and clears them
  const saveRow = async (unitId: string) => {
    const patch: Partial<FridgeLog> = {};
    const m = inMorning[unitId];
    const e = inEvening[unitId];
    const n = inNotes[unitId];
    if (m !== undefined && m !== "") patch.tempMorning = Number(m);
    if (e !== undefined && e !== "") patch.tempEvening = Number(e);
    if (n !== undefined && n !== "") patch.notes = n;
    if (Object.keys(patch).length === 0) return;
    await saveLogPart(unitId, patch);
    setInMorning((s) => ({ ...s, [unitId]: "" }));
    setInEvening((s) => ({ ...s, [unitId]: "" }));
    setInNotes((s) => ({ ...s, [unitId]: "" }));
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const ref = doc(db, "fridgeUnits", editTarget.id);
    const payload: any = {
      name: eName.trim() || editTarget.name,
      kind: eKind,
    };
    if (eLocation.trim() !== "") payload.location = eLocation.trim();
    else payload.location = deleteField();
    if (eMin !== "") payload.min = Number(eMin); else payload.min = deleteField();
    if (eMax !== "") payload.max = Number(eMax); else payload.max = deleteField();
    await setDoc(ref, payload, { merge: true });
    setEditTarget(null);
  };

  const cancelEdit = () => setEditTarget(null);

  const requestDelete = (u: FridgeUnit) => setDeleteTarget(u);
  const cancelDelete = () => setDeleteTarget(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const unitId = deleteTarget.id;
    try {
      // 1) Delete all logs for this unit across dates by iterating each date collection
      const datesSnap = await getDocs(collection(db, "fridgeLogs"));
      const dateIds = datesSnap.docs.map((d) => d.id);
      for (let i = 0; i < dateIds.length; i += 450) {
        const batch = writeBatch(db);
        const slice = dateIds.slice(i, i + 450);
        slice.forEach((dateId) => {
          const ref = doc(db, "fridgeLogs", dateId, "items", unitId);
          batch.delete(ref); // deleting non-existing docs is a no-op
        });
        await batch.commit();
      }

      // 2) Then delete the unit itself
      await deleteDoc(doc(db, "fridgeUnits", unitId));
    } catch (err: any) {
      console.error("Delete unit failed", {
        code: err?.code,
        message: err?.message,
        stack: err?.stack,
      });
      alert(`Σφάλμα δικαιωμάτων κατά τη διαγραφή: ${err?.code || "unknown"}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  
  const saveLogPart = async (
    unitId: string,
    patch: Partial<FridgeLog>
  ) => {
    const ref = doc(db, "fridgeLogs", selectedDate, "items", unitId);
    // Build payload without undefined values; remove notes when explicitly cleared
    const data: any = { updatedAt: new Date().toISOString(), unitId };
    if ("tempMorning" in patch) data.tempMorning = patch.tempMorning ?? null;
    if ("tempEvening" in patch) data.tempEvening = patch.tempEvening ?? null;
    if ("notes" in patch) data.notes = patch.notes === undefined ? deleteField() : patch.notes;
    // Ensure parent date doc exists (helps history listing and permissions)
    await setDoc(doc(db, "fridgeLogs", selectedDate), { updatedAt: data.updatedAt }, { merge: true });
    await setDoc(ref, data, { merge: true });
  };

  // Build a quick lookup for unit details (includes archived units)
  const unitById = useMemo(() => {
    const m: Record<string, FridgeUnit> = {};
    for (const u of units) m[u.id] = u;
    return m;
  }, [units]);

  // Ομαδοποίηση ιστορικού ανά ημερομηνία
  const groupedHistory = useMemo(() => {
    const map = new Map<string, Array<{ unit: FridgeUnit | undefined; log: FridgeLog }>>();
    for (const row of historyRows) {
      const arr = map.get(row.date) || [];
      arr.push({ unit: unitById[row.unitId], log: row.log });
      map.set(row.date, arr);
    }
    // Ταξινόμηση ανά ημερομηνία ASC και εντός ανά όνομα μονάδας
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([date, arr]) => ({
      date,
      items: arr.sort((x, y) => (x.unit?.name || "").localeCompare(y.unit?.name || "")),
    }));
  }, [historyRows, unitById]);

  const exportHistoryToPdf = () => {
    if (historyRows.length === 0) {
      alert("Δεν υπάρχουν δεδομένα ιστορικού. Πατήστε πρώτα Αναζήτηση.");
      return;
    }
    const css = `
      body { font-family: Arial, sans-serif; margin: 24px; }
      h1 { font-size: 20px; margin: 0 0 8px 0; }
      h2 { font-size: 16px; margin: 16px 0 8px 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
      .muted { color: #666; font-size: 12px; margin-bottom: 8px; }
      .range { margin-bottom: 12px; font-size: 12px; }
      .day-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 18px; }
    `;
    const title = `Ημερολόγιο Θερμοκρασιών Ψυγείων`;
    const fmtDMY = (ymd: string) => new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ymd + 'T00:00:00'));
    const rangeText = `Διάστημα: ${fmtDMY(fromDate)} — ${fmtDMY(toDate)}`;

    let html = `<html><head><meta charset="utf-8" /><title>${title}</title><style>${css}</style></head><body>`;
    html += `<h1>${title}</h1>`;
    html += `<div class="range">${rangeText}</div>`;

    groupedHistory.forEach((g) => {
      html += `<div class="day-section">`;
      html += `<h2>${fmtDMY(g.date)}</h2>`;
      html += `<table><thead><tr><th>Μονάδα</th><th>Εύρος (°C)</th><th>Πρωί (°C)</th><th>Βράδυ (°C)</th><th>Σημειώσεις</th></tr></thead><tbody>`;
      g.items.forEach(({ unit, log }) => {
        const range = unit ? `${unit.min ?? "-"} — ${unit.max ?? "-"}` : "-";
        html += `<tr>` +
          `<td>${unit?.name || "-"}</td>` +
          `<td>${range}</td>` +
          `<td>${log.tempMorning ?? ""}</td>` +
          `<td>${log.tempEvening ?? ""}</td>` +
          `<td>${log.notes ? String(log.notes).replace(/</g, "&lt;") : ""}</td>` +
        `</tr>`;
      });
      html += `</tbody></table>`;
      html += `</div>`;
    });

    html += `</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // Μικρή καθυστέρηση ώστε να φορτώσει το DOM πριν το print
    setTimeout(() => {
      try { w.print(); } catch {}
      try { w.close(); } catch {}
    }, 300);
  };

  // Utility: enumerate YYYY-MM-DD strings between two dates inclusive
  const listDates = (start: string, end: string): string[] => {
    const res: string[] = [];
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return res;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      res.push(format(d, "yyyy-MM-dd"));
    }
    return res;
  };

  const loadHistory = async () => {
    const days = listDates(fromDate, toDate);
    const rows: Array<{ date: string; unitId: string; log: FridgeLog }> = [];
    try {
      // Primary: read per-day subcollections (fast and cheap)
      for (const day of days) {
        const col = collection(db, "fridgeLogs", day, "items");
        const snap = await getDocs(col);
        snap.forEach((docSnap) => {
          rows.push({ date: day, unitId: docSnap.id, log: (docSnap.data() as FridgeLog) || {} });
        });
      }
      if (rows.length === 0) {
        // Fallback: collectionGroup on items and infer date from path, filtered by updatedAt range
        // Note: updatedAt is ISO; we bound using start/end of selected range
        const startIso = new Date(fromDate + "T00:00:00").toISOString();
        const endIso = new Date(toDate + "T23:59:59").toISOString();
        const cgQ = query(
          collectionGroup(db, "items"),
          where("updatedAt", ">=", startIso),
          where("updatedAt", "<=", endIso)
        );
        const cgSnap = await getDocs(cgQ);
        cgSnap.forEach((d) => {
          // Expect path: fridgeLogs/{date}/items/{unitId}
          const parts = d.ref.path.split("/");
          const date = parts.length >= 2 ? parts[1] : "";
          if (!date) return;
          rows.push({ date, unitId: d.id, log: (d.data() as FridgeLog) || {} });
        });
      }
    } catch (err: any) {
      console.error("Load fridge history failed", { code: err?.code, message: err?.message });
      alert(`Σφάλμα κατά την ανάγνωση ιστορικού: ${err?.code || "unknown"}`);
    }
    // sort by date asc then by unit name
    rows.sort((a, b) => (a.date === b.date ? (unitById[a.unitId]?.name || "").localeCompare(unitById[b.unitId]?.name || "") : a.date.localeCompare(b.date)));
    setHistoryRows(rows);
  };

  const rows = useMemo(
    () => activeUnits.map((u) => ({ unit: u, log: logs[u.id] || {} })),
    [activeUnits, logs]
  );

  const isOutOfRange = (u: FridgeUnit, value?: number | null) => {
    if (value === undefined || value === null) return false;
    if (u.min != null && value < u.min) return true;
    if (u.max != null && value > u.max) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 space-y-6">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
              <FaSnowflake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Θερμοκρασίες Ψυγείων/Καταψυκτών
              </h1>
              <p className="text-slate-600 mt-1 text-sm">
                Παρακολούθηση και καταγραφή θερμοκρασιών για όλες τις μονάδες
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowAddUnitModal(true)}
              title="Προσθήκη νέας μονάδας"
            >
              <FaPlus className="w-4 h-4" />
              Νέα Μονάδα
            </button>
            <button
              className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowHistoryModal(true)}
              title="Άνοιγμα ιστορικού θερμοκρασιών"
            >
              <FaHistory className="w-4 h-4" />
              Ιστορικό
            </button>
          </div>
        </div>
      </div>


      {/* Daily Logging Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
            <FiThermometer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Ημερολόγιο Θερμοκρασιών</h2>
            <p className="text-slate-600 mt-1 text-sm">Καταγράψτε θερμοκρασίες (πρωί/βράδυ) για την επιλεγμένη ημερομηνία</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiThermometer className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Δεν υπάρχουν μονάδες</h3>
            <p className="text-slate-500">Προσθέστε νέες μονάδες ψυγείων/καταψυκτών για να ξεκινήσετε την καταγραφή</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-white/50 rounded-2xl border border-white/20 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <FiSettings className="w-4 h-4" />
                        Μονάδα
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-4 h-4" />
                        Τοποθεσία
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Τύπος</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Εύρος (°C)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <FiThermometer className="w-4 h-4" />
                        Πρωί (°C)
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <FiThermometer className="w-4 h-4" />
                        Βράδυ (°C)
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Σημειώσεις</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ unit, log }) => {
                    const outMorning = isOutOfRange(unit, log.tempMorning ?? undefined);
                    const outEvening = isOutOfRange(unit, log.tempEvening ?? undefined);
                    return (
                      <tr key={unit.id} id={`row-${unit.id}`} className="hover:bg-blue-50/50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              unit.kind === 'fridge' ? 'bg-blue-100 text-blue-600' : 'bg-cyan-100 text-cyan-600'
                            }`}>
                              {unit.kind === 'fridge' ? '🧊' : '❄️'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{unit.name}</div>
                              <div className="text-xs text-slate-500">ID: {unit.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <FiMapPin className="w-4 h-4 text-slate-400" />
                            {unit.location || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            unit.kind === 'fridge' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {unit.kind === 'fridge' ? 'Ψυγείο' : 'Καταψύκτης'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FiThermometer className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {unit.min ?? "-"} — {unit.max ?? "-"}
                            </span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${outMorning ? "bg-red-50" : ""}`}>
                          <input
                            type="number"
                            step="0.1"
                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-150 ${
                              outMorning 
                                ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                : 'border-slate-200 bg-white/50 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                            value={inMorning[unit.id] ?? ""}
                            placeholder={log.tempMorning != null ? String(log.tempMorning) : ""}
                            onChange={(e) => setInMorning((s) => ({ ...s, [unit.id]: e.target.value }))}
                            onBlur={async (e) => {
                              const v = e.target.value;
                              if (v === "") return;
                              await saveLogPart(unit.id, { tempMorning: Number(v) });
                              setInMorning((s) => ({ ...s, [unit.id]: "" }));
                            }}
                          />
                        </td>
                        <td className={`px-6 py-4 ${outEvening ? "bg-red-50" : ""}`}>
                          <input
                            type="number"
                            step="0.1"
                            className={`w-full px-3 py-2 rounded-lg border transition-all duration-150 ${
                              outEvening 
                                ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                : 'border-slate-200 bg-white/50 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                            value={inEvening[unit.id] ?? ""}
                            placeholder={log.tempEvening != null ? String(log.tempEvening) : ""}
                            onChange={(e) => setInEvening((s) => ({ ...s, [unit.id]: e.target.value }))}
                            onBlur={async (e) => {
                              const v = e.target.value;
                              if (v === "") return;
                              await saveLogPart(unit.id, { tempEvening: Number(v) });
                              setInEvening((s) => ({ ...s, [unit.id]: "" }));
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/50 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150"
                            value={inNotes[unit.id] ?? ""}
                            placeholder={log.notes ?? ""}
                            onChange={(e) => setInNotes((s) => ({ ...s, [unit.id]: e.target.value }))}
                            onBlur={async (e) => {
                              const v = e.target.value;
                              if (v === "") return;
                              await saveLogPart(unit.id, { notes: v });
                              setInNotes((s) => ({ ...s, [unit.id]: "" }));
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors duration-150"
                              onClick={() => saveRow(unit.id)}
                              title="Καταχώριση"
                              aria-label="Καταχώριση"
                            >
                              <FaSave className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors duration-150"
                              onClick={() => openEdit(unit)}
                              title="Επεξεργασία"
                              aria-label="Επεξεργασία"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors duration-150"
                              onClick={() => requestDelete(unit)}
                              title="Διαγραφή"
                              aria-label="Διαγραφή"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Today's saved entries preview */}
        <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg">
                  <FiCheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Καταχωρήσεις Ημέρας</h3>
                  <p className="text-slate-600 mt-1 text-sm">Αποθηκευμένες καταγραφές</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <FaRegCalendarAlt className="w-5 h-5 text-slate-600" />
                <DatePicker
                  selected={ymdToDate(selectedDate)}
                  onChange={(d) => setSelectedDate(dateToYMD(d as Date))}
                  dateFormat="dd/MM/yyyy"
                  className="border-0 bg-transparent text-slate-800 font-medium focus:outline-none"
                  locale="el"
                  popperPlacement="bottom-start"
                />
                <span className="text-sm text-slate-600 font-medium">
                  {formatDM(selectedDate)}
                </span>
              </div>
            </div>
            {rows.every(({ log }) => !log.tempMorning && !log.tempEvening && !log.notes) ? (
              <div className="text-center py-12 bg-amber-50/50 rounded-2xl border border-amber-100">
                <div className="p-3 bg-amber-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <FiAlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="text-lg font-medium text-amber-800 mb-1">Δεν υπάρχουν καταχωρήσεις ακόμη</h4>
                <p className="text-amber-600">Καταγράψτε θερμοκρασίες για να εμφανιστούν εδώ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-2xl border border-amber-100 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Μονάδα</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Πρωί (°C)</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Βράδυ (°C)</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Σημειώσεις</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-amber-800">Ενέργειες</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {rows.filter(({ log }) => log.tempMorning != null || log.tempEvening != null || (log.notes ?? "") !== "").map(({ unit, log }) => (
                        <tr key={unit.id} className="hover:bg-amber-50/50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                unit.kind === 'fridge' ? 'bg-blue-100 text-blue-600' : 'bg-cyan-100 text-cyan-600'
                              }`}>
                                {unit.kind === 'fridge' ? '🧊' : '❄️'}
                              </div>
                              <div className="font-medium text-slate-800">{unit.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FiThermometer className="w-4 h-4 text-amber-500" />
                              <span className="text-slate-700">{log.tempMorning ?? "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FiThermometer className="w-4 h-4 text-amber-500" />
                              <span className="text-slate-700">{log.tempEvening ?? "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-700">{log.notes ?? "-"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors duration-150"
                                onClick={() => jumpToEdit(unit.id)}
                                title="Επεξεργασία καταχώρισης"
                                aria-label="Επεξεργασία καταχώρισης"
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors duration-150"
                                onClick={() => clearTodayLog(unit.id)}
                                title="Διαγραφή καταχώρισης"
                                aria-label="Διαγραφή καταχώρισης"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Archived Units */}
      {showArchived && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg shadow-lg">
              <FaArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Αρχειοθετημένες Μονάδες</h2>
              <p className="text-slate-600 mt-1 text-sm">Προβολή και διαχείριση μη-ενεργών μονάδων</p>
            </div>
          </div>
          {archivedUnits.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaArchive className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Δεν υπάρχουν αρχειοθετημένες μονάδες</h3>
              <p className="text-slate-500">Όλες οι μονάδες είναι ενεργές</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="bg-gradient-to-br from-slate-50/50 to-gray-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-gray-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <FiSettings className="w-4 h-4" />
                          Μονάδα
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="w-4 h-4" />
                          Τοποθεσία
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Τύπος</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Εύρος (°C)</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {archivedUnits.map((u: FridgeUnit) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors duration-150 opacity-75">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              u.kind === 'fridge' ? 'bg-blue-100 text-blue-600' : 'bg-cyan-100 text-cyan-600'
                            }`}>
                              {u.kind === 'fridge' ? '🧊' : '❄️'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{u.name}</div>
                              <div className="text-xs text-slate-500">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <FiMapPin className="w-4 h-4 text-slate-400" />
                            {u.location || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            u.kind === 'fridge' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {u.kind === 'fridge' ? 'Ψυγείο' : 'Καταψύκτης'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FiThermometer className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {u.min ?? "-"} — {u.max ?? "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors duration-150"
                              onClick={() => openEdit(u)}
                              title="Επεξεργασία"
                              aria-label="Επεξεργασία"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors duration-150"
                              onClick={() => requestDelete(u)}
                              title="Διαγραφή"
                              aria-label="Διαγραφή"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={cancelAddUnit} 
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 border border-white/20 my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                  <FaPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Νέα Μονάδα</h3>
                  <p className="text-slate-600 mt-1">Προσθήκη νέας μονάδας ψύξης</p>
                </div>
              </div>
              <button
                onClick={cancelAddUnit}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors duration-150"
                title="Κλείσιμο"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FiSettings className="w-4 h-4" />
                    Όνομα Μονάδας *
                  </label>
                  <input
                    type="text"
                    placeholder="π.χ. Ψυγείο Κουζίνας"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FiMapPin className="w-4 h-4" />
                    Τοποθεσία
                  </label>
                  <input
                    type="text"
                    placeholder="π.χ. Κουζίνα, Αποθήκη"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Τύπος Μονάδας</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value as "fridge" | "freezer")}
                  >
                    <option value="fridge">🧊 Ψυγείο</option>
                    <option value="freezer">❄️ Καταψύκτης</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FiThermometer className="w-4 h-4" />
                    Εύρος Θερμοκρασίας (°C)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Ελάχιστη</label>
                      <input
                        type="number"
                        placeholder="π.χ. -18"
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                        value={newMin}
                        onChange={(e) => setNewMin(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Μέγιστη</label>
                      <input
                        type="number"
                        placeholder="π.χ. 4"
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                        value={newMax}
                        onChange={(e) => setNewMax(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={cancelAddUnit}
                className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200"
              >
                Ακύρωση
              </button>
              <button
                onClick={addUnitFromModal}
                disabled={!newName.trim()}
                className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Unit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={cancelEdit} 
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <FaEdit className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Επεξεργασία Μονάδας</h3>
              </div>
              <button
                onClick={cancelEdit}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200"
              >
                <FaTrash className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <FiSettings className="w-4 h-4" />
                  Όνομα Μονάδας
                </label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm" 
                  placeholder="Όνομα" 
                  value={eName} 
                  onChange={(e) => setEName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <FiMapPin className="w-4 h-4" />
                  Τοποθεσία
                </label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm" 
                  placeholder="Τοποθεσία" 
                  value={eLocation} 
                  onChange={(e) => setELocation(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Τύπος Μονάδας</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm" 
                  value={eKind} 
                  onChange={(e) => setEKind(e.target.value as any)}
                >
                  <option value="fridge">🧊 Ψυγείο</option>
                  <option value="freezer">❄️ Καταψύκτης</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Εύρος Θερμοκρασίας</label>
                <div className="flex gap-3">
                  <input 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm" 
                    type="number" 
                    step="0.1" 
                    placeholder="Ελάχιστη" 
                    value={eMin} 
                    onChange={(e) => setEMin(e.target.value)} 
                  />
                  <input 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm" 
                    type="number" 
                    step="0.1" 
                    placeholder="Μέγιστη" 
                    value={eMax} 
                    onChange={(e) => setEMax(e.target.value)} 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button 
                className="px-6 py-3 rounded-xl text-base font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200" 
                onClick={cancelEdit}
              >
                Άκυρο
              </button>
              <button 
                className="px-6 py-3 rounded-xl text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200" 
                onClick={saveEdit}
              >
                Αποθήκευση Αλλαγών
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Delete Unit Confirmation Modal */}
    {deleteTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={cancelDelete} 
        />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-white/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
              <FaTrash className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Διαγραφή Μονάδας</h3>
              <p className="text-slate-600 mt-1">Επιβεβαίωση διαγραφής</p>
            </div>
          </div>
          <div className="bg-red-50/50 rounded-2xl border border-red-100 p-6 mb-8">
            <p className="text-slate-700 text-center">
              Είστε σίγουροι ότι θέλετε να διαγράψετε τη μονάδα
              <span className="font-bold text-red-700 block text-xl mt-2">
                "{deleteTarget?.name}"
              </span>
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-red-600">
              <FiAlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Αυτή η ενέργεια δεν μπορεί να αναιρεθεί</span>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button 
              className="px-6 py-3 rounded-xl text-base font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200" 
              onClick={cancelDelete}
            >
              Άκυρο
            </button>
            <button 
              className="px-6 py-3 rounded-xl text-base font-medium bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-200 flex items-center gap-2" 
              onClick={confirmDelete}
            >
              <FaTrash className="w-4 h-4" />
              Διαγραφή
            </button>
          </div>
        </div>
      </div>
    )}

    {/* History Modal */}
    {showHistoryModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                  <FaHistory className="w-6 h-6 text-indigo-600" />
                  Ιστορικό Θερμοκρασιών
                </h3>
                <p className="text-slate-600 mt-1">
                  Επιλέξτε διάστημα ημερομηνιών για προβολή ιστορικού
                </p>
              </div>
              <button
                className="p-3 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryMode(false);
                }}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Date Range Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2">
                  <span className="text-sm text-slate-600">Από</span>
                  <DatePicker
                    selected={ymdToDate(fromDate)}
                    onChange={(d) => setFromDate(dateToYMD(d as Date))}
                    dateFormat="dd/MM/yyyy"
                    className="border-0 bg-transparent text-slate-800 font-medium focus:outline-none"
                    locale="el"
                    popperPlacement="bottom-start"
                  />
                  <span className="text-sm text-slate-600">
                    {formatDM(fromDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2">
                  <span className="text-sm text-slate-600">Έως</span>
                  <DatePicker
                    selected={ymdToDate(toDate)}
                    onChange={(d) => setToDate(dateToYMD(d as Date))}
                    dateFormat="dd/MM/yyyy"
                    className="border-0 bg-transparent text-slate-800 font-medium focus:outline-none"
                    locale="el"
                    popperPlacement="bottom-start"
                  />
                  <span className="text-sm text-slate-600">
                    {formatDM(toDate)}
                  </span>
                </div>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                  onClick={loadHistory}
                >
                  <FiSearch className="w-4 h-4" />
                  Αναζήτηση
                </button>
                {historyRows.length > 0 && (
                  <button
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
                    onClick={exportHistoryToPdf}
                    title="Εξαγωγή σε PDF"
                  >
                    <FiDownload className="w-4 h-4" />
                    Εξαγωγή PDF
                  </button>
                )}
              </div>
              
              {/* Quick Date Range Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 mr-2">Γρήγορη επιλογή:</span>
                <button
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  onClick={() => {
                    const today = new Date();
                    setFromDate(format(today, "yyyy-MM-dd"));
                    setToDate(format(today, "yyyy-MM-dd"));
                  }}
                >
                  Σήμερα
                </button>
                <button
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    setFromDate(format(weekAgo, "yyyy-MM-dd"));
                    setToDate(format(today, "yyyy-MM-dd"));
                  }}
                >
                  Τελευταίες 7 ημέρες
                </button>
                <button
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    setFromDate(format(monthAgo, "yyyy-MM-dd"));
                    setToDate(format(today, "yyyy-MM-dd"));
                  }}
                >
                  Τελευταίος μήνας
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {historyRows.length === 0 ? (
              <div className="text-center py-12">
                <FaRegFileAlt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  Δεν βρέθηκαν εγγραφές ιστορικού
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Επιλέξτε διάστημα ημερομηνιών και πατήστε Αναζήτηση
                </p>
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 mb-4">
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                    <p className="text-emerald-800">
                      Βρέθηκαν{" "}
                      <span className="font-semibold">
                        {historyRows.length}
                      </span>{" "}
                      καταγραφές
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl border border-indigo-100 overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b border-indigo-200 sticky top-0">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Ημερομηνία</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Μονάδα</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Τοποθεσία</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Τύπος</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Εύρος (°C)</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Πρωί (°C)</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Βράδυ (°C)</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-indigo-800">Σημειώσεις</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100">
                        {historyRows.map(({ date, unitId, log }) => {
                          const u = unitById[unitId];
                          return (
                            <tr key={date + unitId} className="hover:bg-indigo-50/50 transition-colors duration-150">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <FiClock className="w-4 h-4 text-indigo-500" />
                                  <span className="font-medium text-slate-800">{formatDM(date)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    u?.kind === 'fridge' ? 'bg-blue-100 text-blue-600' : 'bg-cyan-100 text-cyan-600'
                                  }`}>
                                    {u?.kind === 'fridge' ? '🧊' : '❄️'}
                                  </div>
                                  <div className="font-medium text-slate-800">{u?.name || unitId}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <FiMapPin className="w-4 h-4 text-slate-400" />
                                  {u?.location || "-"}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  u?.kind === 'fridge' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-cyan-100 text-cyan-700'
                                }`}>
                                  {u ? (u.kind === 'fridge' ? 'Ψυγείο' : 'Καταψύκτης') : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <FiThermometer className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-600">
                                    {u?.min ?? "-"} — {u?.max ?? "-"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-slate-700">{log.tempMorning ?? "-"}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-slate-700">{log.tempEvening ?? "-"}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-slate-700">{log.notes ?? "-"}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default FridgesPage;
