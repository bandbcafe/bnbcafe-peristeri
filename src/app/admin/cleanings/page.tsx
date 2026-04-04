"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  collectionGroup,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  documentId,
  deleteField,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { format } from "date-fns";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from "date-fns/locale/el";
import {
  FiEdit2,
  FiTrash2,
  FiSave,
  FiPlus,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiDownload,
  FiSearch,
  FiX,
  FiClock,
  FiCheckSquare,
  FiSquare,
  FiArchive,
  FiAlertCircle,
} from "react-icons/fi";
import { formatDM, formatTimeEL } from "@/lib/date";

// Register Greek locale for datepicker
registerLocale("el", el);

// Types
type CleaningTemplate = {
  id: string;
  title: string;
  description?: string;
  active: boolean;
};

type CleaningEntry = {
  done: boolean;
  notes?: string;
  timestamp?: string; // ISO
};

type CleaningStats = {
  total: number;
  completed: number;
  pending: number;
  archived: number;
};

const CleaningsPage: React.FC = () => {
  const [templates, setTemplates] = useState<CleaningTemplate[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd") || "unknown"
  );
  const [entries, setEntries] = useState<Record<string, CleaningEntry>>({});
  // transient UI states
  const [inDone, setInDone] = useState<Record<string, boolean>>({});
  const [inNotes, setInNotes] = useState<Record<string, string>>({});
  const [editTarget, setEditTarget] = useState<CleaningTemplate | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CleaningTemplate | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  // history mode
  const [historyMode, setHistoryMode] = useState(false);
  const [fromDate, setFromDate] = useState<string>(selectedDate);
  const [toDate, setToDate] = useState<string>(selectedDate);
  const [history, setHistory] = useState<
    Array<{
      date: string;
      templateId: string;
      title: string;
      done?: boolean;
      notes?: string;
      timestamp?: string;
    }>
  >([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Calculate statistics
  const stats = useMemo<CleaningStats>(() => {
    const activeTemplates = templates.filter((t) => t.active !== false);
    const completedToday = activeTemplates.filter(
      (t) => inDone[t.id] ?? entries[t.id]?.done ?? false
    );

    return {
      total: activeTemplates.length,
      completed: completedToday.length,
      pending: activeTemplates.length - completedToday.length,
      archived: templates.filter((t) => t.active === false).length,
    };
  }, [templates, entries, inDone]);

  // Helpers for DatePicker binding (state kept as YYYY-MM-DD)
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

  // Load templates realtime
  useEffect(() => {
    const colRef = collection(db, "cleaningTemplates");
    const unsub = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => ({
            id: d.id,
            ...(d.data() as Omit<CleaningTemplate, "id">),
          })
        );
        // Show all templates regardless of archived status
        setTemplates(items);
      }
    );
    return () => unsub();
  }, []);

  // Load entries for selected date
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    templates.forEach((t) => {
      const entryDoc = doc(
        db,
        "cleaningsLogs",
        selectedDate || "unknown",
        "items",
        t.id
      );
      const unsub = onSnapshot(entryDoc, (snap) => {
        setEntries((prev) => ({
          ...prev,
          [t.id]: (snap.exists()
            ? (snap.data() as CleaningEntry)
            : { done: false }) as CleaningEntry,
        }));
      });
      unsubscribers.push(unsub);
    });
    return () => unsubscribers.forEach((u) => u());
  }, [templates, selectedDate]);

  const mergedList = useMemo(() => {
    return templates.map((t) => ({
      ...t,
      entry: entries[t.id] || { done: false },
    }));
  }, [templates, entries]);

  const addTemplate = async () => {
    if (!newTitle.trim()) return;
    const id = String(Date.now());
    const ref = doc(db, "cleaningTemplates", id);
    const payload: any = {
      title: newTitle.trim(),
      active: true,
    };
    const desc = newDescription.trim();
    if (desc) payload.description = desc;
    await setDoc(ref, payload);
    setNewTitle("");
    setNewDescription("");
    setShowAddModal(false);
  };

  // bulk save: write only changed items
  const saveAll = async () => {
    const ids = Object.keys({ ...inDone, ...inNotes });
    if (ids.length === 0) return;
    // ensure parent date doc exists so history can list dates directly
    await setDoc(
      doc(db, "cleaningsLogs", selectedDate),
      { updatedAt: new Date().toISOString() },
      { merge: true }
    );
    for (let i = 0; i < ids.length; i += 450) {
      const slice = ids.slice(i, i + 450);
      const writes = slice.map(async (id) => {
        const ref = doc(
          db,
          "cleaningsLogs",
          selectedDate || "unknown",
          "items",
          id
        );
        const patch: any = { timestamp: new Date().toISOString() };
        if (id in inDone) patch.done = !!inDone[id];
        if (id in inNotes) {
          const n = inNotes[id]?.trim?.() ?? "";
          patch.notes = n ? n : deleteField();
        }
        return setDoc(ref, patch, { merge: true });
      });
      await Promise.all(writes);
    }
    // clear transient states after save
    setInDone({});
    setInNotes({});
  };

  // Save individual item status immediately
  const saveItemStatus = async (itemId: string, done: boolean) => {
    // ensure parent date doc exists
    await setDoc(
      doc(db, "cleaningsLogs", selectedDate),
      { updatedAt: new Date().toISOString() },
      { merge: true }
    );
    
    const ref = doc(db, "cleaningsLogs", selectedDate, "items", itemId);
    await setDoc(ref, {
      done,
      timestamp: new Date().toISOString()
    }, { merge: true });
  };

  // Save individual item notes immediately
  const saveItemNotes = async (itemId: string, notes: string) => {
    // ensure parent date doc exists
    await setDoc(
      doc(db, "cleaningsLogs", selectedDate),
      { updatedAt: new Date().toISOString() },
      { merge: true }
    );
    
    const ref = doc(db, "cleaningsLogs", selectedDate, "items", itemId);
    const patch: any = { timestamp: new Date().toISOString() };
    
    if (notes.trim() === "") {
      patch.notes = deleteField();
    } else {
      patch.notes = notes.trim();
    }
    
    await setDoc(ref, patch, { merge: true });
  };

  const openEdit = (t: CleaningTemplate) => {
    setEditTarget(t);
    setETitle(t.title || "");
    setEDescription(t.description || "");
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const ref = doc(db, "cleaningTemplates", editTarget.id);
    const payload: any = { title: eTitle.trim() || editTarget.title };
    if (eDescription.trim() !== "") payload.description = eDescription.trim();
    else payload.description = deleteField();
    await setDoc(ref, payload, { merge: true });
    setEditTarget(null);
  };

  const archiveTemplate = async (id: string) => {
    const ref = doc(db, "cleaningTemplates", id);
    await setDoc(ref, { active: false }, { merge: true });
    setInDone((s) => ({ ...s, [id]: false }));
    setInNotes((s) => ({ ...s, [id]: "" }));
  };

  const unarchiveTemplate = async (id: string) => {
    const ref = doc(db, "cleaningTemplates", id);
    await setDoc(ref, { active: true }, { merge: true });
  };

  const requestDelete = (t: CleaningTemplate) => setDeleteTarget(t);
  const cancelDelete = () => setDeleteTarget(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      // delete logs across dates (no collectionGroup)
      const datesSnap = await getDocs(collection(db, "cleaningsLogs"));
      const dateIds = datesSnap.docs.map((d) => d.id);
      for (let i = 0; i < dateIds.length; i += 450) {
        const ops = dateIds
          .slice(i, i + 450)
          .map((dateId) =>
            deleteDoc(doc(db, "cleaningsLogs", dateId, "items", id))
          );
        await Promise.all(ops);
      }
      // Fallback: remove any orphan logs that live under cleaningsLogs without parent date docs being enumerated
      try {
        const cgSnap = await getDocs(
          query(collectionGroup(db, "items"), where(documentId(), "==", id))
        );
        const deletions: Promise<any>[] = [];
        cgSnap.forEach((s) => {
          const parentDoc = s.ref.parent.parent; // cleaningsLogs/{date}
          const grandParent = parentDoc?.parent; // collection cleaningsLogs
          if (grandParent?.id === "cleaningsLogs") {
            deletions.push(deleteDoc(s.ref));
          }
        });
        if (deletions.length) await Promise.all(deletions);
      } catch (e) {
        console.warn(
          "cascade fallback via collectionGroup failed (cleanings)",
          e
        );
      }
      // delete template
      await deleteDoc(doc(db, "cleaningTemplates", id));
    } finally {
      setDeleteTarget(null);
    }
  };

  // date change: reset transient input states
  useEffect(() => {
    setInDone({});
    setInNotes({});
  }, [selectedDate]);

  const loadHistory = async () => {
    if (!historyMode) return setHistory([]);
    const days = listDates(fromDate, toDate);
    const rows: Array<{
      date: string;
      templateId: string;
      title: string;
      done?: boolean;
      notes?: string;
      timestamp?: string;
    }> = [];
    try {
      for (const day of days) {
        const col = collection(db, "cleaningsLogs", day, "items");
        const snap = await getDocs(col);
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CleaningEntry;
          const tpl = templates.find((t) => t.id === docSnap.id);
          if (!tpl) return; // skip entries for deleted templates
          rows.push({
            date: day,
            templateId: docSnap.id,
            title: tpl?.title || docSnap.id,
            done: data.done,
            notes: data.notes,
            timestamp: data.timestamp,
          });
        });
      }
      if (rows.length === 0) {
        // Fallback via collectionGroup filtered by timestamp
        const startIso = new Date(fromDate + "T00:00:00").toISOString();
        const endIso = new Date(toDate + "T23:59:59").toISOString();
        const cgQ = query(
          collectionGroup(db, "items"),
          where("timestamp", ">=", startIso),
          where("timestamp", "<=", endIso)
        );
        const cgSnap = await getDocs(cgQ);
        cgSnap.forEach((d) => {
          const parentDoc = d.ref.parent.parent; // cleaningsLogs/{date}
          const grandParent = parentDoc?.parent; // collection cleaningsLogs
          if (grandParent?.id !== "cleaningsLogs" || !parentDoc?.id) return;
          const dateId = parentDoc.id;
          if (dateId < fromDate || dateId > toDate) return;
          const tpl = templates.find((t) => t.id === d.id);
          if (!tpl) return;
          const data = d.data() as CleaningEntry;
          rows.push({
            date: dateId,
            templateId: d.id,
            title: tpl?.title || d.id,
            done: data.done,
            notes: data.notes,
            timestamp: data.timestamp,
          });
        });
      }
    } catch (err: any) {
      console.warn("Load cleanings history failed; returning empty", {
        code: err?.code,
        message: err?.message,
      });
      setHistory([]);
      return;
    }
    rows.sort((a, b) =>
      a.date === b.date
        ? a.title.localeCompare(b.title)
        : a.date.localeCompare(b.date)
    );
    setHistory(rows);
  };

  // auto load on changes similar to fridges
  useEffect(() => {
    void loadHistory();
  }, [historyMode, fromDate, toDate, templates]);

  // Export PDF similar to fridges
  const exportHistoryToPdf = () => {
    if (!historyMode) {
      alert("Ενεργοποιήστε πρώτα το Ιστορικό και ορίστε διάστημα.");
      return;
    }
    if (history.length === 0) {
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
      .range { margin-bottom: 12px; font-size: 12px; }
      .day-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 18px; }
    `;
    const title = `Ιστορικό Καθαριοτήτων`;
    const fmtDMY = (ymd: string) =>
      new Intl.DateTimeFormat("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(ymd + "T00:00:00"));
    const fmtTime = (iso?: string) =>
      iso
        ? new Intl.DateTimeFormat("el-GR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(iso))
        : "";
    const rangeText = `Διάστημα: ${fmtDMY(fromDate)} — ${fmtDMY(toDate)}`;

    // group by date
    const map = new Map<string, typeof history>();
    for (const row of history) {
      const list = map.get(row.date) || ([] as typeof history);
      list.push(row);
      map.set(row.date, list);
    }
    const groups = Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    let html = `<html><head><meta charset="utf-8" /><title>${title}</title><style>${css}</style></head><body>`;
    html += `<h1>${title}</h1>`;
    html += `<div class="range">${rangeText}</div>`;

    groups.forEach(([date, rows]) => {
      html += `<div class="day-section">`;
      html += `<h2>${fmtDMY(date)}</h2>`;
      html += `<table><thead><tr><th>Εργασία</th><th>Ολοκληρώθηκε</th><th>Σημειώσεις</th><th>Ώρα</th></tr></thead><tbody>`;
      rows
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach((r) => {
          html +=
            `<tr>` +
            `<td>${r.title}</td>` +
            `<td>${r.done ? "✓" : ""}</td>` +
            `<td>${r.notes ? String(r.notes).replace(/</g, "&lt;") : ""}</td>` +
            `<td>${fmtTime(r.timestamp)}</td>` +
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
    setTimeout(() => {
      try {
        w.print();
      } catch {}
      try {
        w.close();
      } catch {}
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 space-y-6">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <FiCheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Καθαριότητες
              </h1>
              <p className="text-slate-600 mt-1 text-sm">
                Διαχείριση εργασιών καθαρισμού και ιστορικού
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 flex items-center gap-2"
              onClick={() => setShowAddModal(true)}
              title="Προσθήκη νέας εργασίας καθαριότητας"
            >
              <FiPlus className="w-4 h-4" />
              Νέα Εργασία
            </button>
            <button
              className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 flex items-center gap-2"
              onClick={() => {
                setShowHistoryModal(true);
                setHistoryMode(true);
              }}
              title="Άνοιγμα ιστορικού καθαριοτήτων"
            >
              <FiClock className="w-4 h-4" />
              Ιστορικό
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Σύνολο Εργασιών</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <FiFileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Ολοκληρωμένες</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.completed}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              <FiCheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Εκκρεμούν</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.pending}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <FiClock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Αρχειοθετημένες</p>
              <p className="text-2xl font-bold text-slate-600">
                {stats.archived}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl shadow-lg">
              <FiArchive className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>


      {/* Daily Checklist */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
              <FiCheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Ημερήσιος Έλεγχος</h2>
              <p className="text-slate-600 mt-1 text-sm">{formatDM(selectedDate)}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
          Επιλέξτε ημερομηνία και σημειώστε τι ολοκληρώθηκε. Οι αλλαγές αποθηκεύονται αυτόματα.
        </p>
        {mergedList.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiFileText className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Δεν υπάρχουν εργασίες καθαρισμού</h3>
            <p className="text-slate-500">Προσθέστε νέες εργασίες από την παραπάνω φόρμα
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mergedList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 hover:bg-white transition-all duration-200 shadow-sm border border-white/20"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        className="mt-1 transition-all"
                        onClick={async () => {
                          const newDone = !(inDone[item.id] ?? !!item.entry?.done);
                          setInDone((s) => ({ ...s, [item.id]: newDone }));
                          await saveItemStatus(item.id, newDone);
                        }}
                      >
                        {inDone[item.id] ?? !!item.entry?.done ? (
                          <FiCheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <FiSquare className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 flex items-center gap-2">
                          {item.title}
                          {item.active === false && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-200 rounded-full px-2 py-1">
                              <FiArchive className="w-3 h-3" />
                              Αρχειοθετημένο
                            </span>
                          )}
                        </p>
                        {item.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Σημειώσεις (προαιρετικό)"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        value={inNotes[item.id] ?? (item.entry?.notes || "")}
                        onChange={(e) =>
                          setInNotes((s) => ({
                            ...s,
                            [item.id]: e.target.value,
                          }))
                        }
                        onBlur={async (e) => {
                          const notes = e.target.value;
                          await saveItemNotes(item.id, notes);
                          setInNotes((s) => ({ ...s, [item.id]: "" })); // Clear transient state after save
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 rounded-xl hover:bg-blue-100 text-blue-600 transition-colors duration-150"
                          title="Επεξεργασία"
                          aria-label="Επεξεργασία"
                          onClick={() => openEdit(item)}
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {item.active === false ? (
                          <button
                            className="p-2 rounded-xl hover:bg-emerald-100 text-emerald-600 transition-colors duration-150"
                            title="Επαναφορά από αρχειοθέτηση"
                            aria-label="Επαναφορά από αρχειοθέτηση"
                            onClick={() => unarchiveTemplate(item.id)}
                          >
                            <FiCheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors duration-150"
                            title="Αρχειοθέτηση"
                            aria-label="Αρχειοθέτηση"
                            onClick={() => archiveTemplate(item.id)}
                          >
                            <FiArchive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-2 rounded-xl hover:bg-red-100 text-red-600 transition-colors duration-150"
                          title="Διαγραφή"
                          aria-label="Διαγραφή"
                          onClick={() => requestDelete(item)}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

        {/* Summary for the selected day */}
        {!historyMode && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                Καταχωρήσεις Ημέρας ({formatDM(selectedDate)})
              </h2>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 relative" style={{ zIndex: 10 }}>
                <FiCalendar className="w-5 h-5 text-slate-600" />
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
            {mergedList.filter(
              (i) =>
                i.entry?.done ||
                (inDone[i.id] ?? false) ||
                (i.entry?.notes && i.entry?.notes !== "")
            ).length === 0 ? (
              <div className="text-center py-12">
                <FiAlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  Δεν υπάρχουν καταχωρήσεις για σήμερα
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Επιλέξτε εργασίες από τον παραπάνω κατάλογο
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="p-3 text-left text-sm font-semibold text-slate-700">
                        Εργασία
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700">
                        Ολοκληρώθηκε
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700">
                        Σημειώσεις
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700">
                        Ώρα
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedList
                      .filter(
                        (i) =>
                          i.entry?.done ||
                          (inDone[i.id] ?? false) ||
                          (i.entry?.notes && i.entry?.notes !== "")
                      )
                      .map((i) => (
                        <tr
                          key={i.id}
                          className="border-b border-slate-100 hover:bg-slate-50Transition-colors"
                        >
                          <td className="p-3 text-slate-800 font-medium">
                            {i.title}
                          </td>
                          <td className="p-3">
                            {inDone[i.id] ?? i.entry?.done ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <FiCheckCircle className="w-4 h-4" />
                                Ναι
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <FiXCircle className="w-4 h-4" />
                                Όχι
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            {inNotes[i.id] ?? i.entry?.notes ?? "-"}
                          </td>
                          <td className="p-3 text-slate-600">
                            {i.entry?.timestamp ? (
                              <span className="inline-flex items-center gap-1">
                                <FiClock className="w-4 h-4" />
                                {formatTimeEL(i.entry.timestamp)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* Add Cleaning Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowAddModal(false)} 
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 border border-white/20 my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                  <FiPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Νέα Εργασία Καθαριότητας</h3>
                  <p className="text-slate-600 mt-1">Δημιουργία νέας εργασίας καθαρισμού</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors duration-150"
                title="Κλείσιμο"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Τίτλος Εργασίας *
                </label>
                <input
                  type="text"
                  placeholder="π.χ. Καθαρισμός πάγκων"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Περιγραφή (προαιρετικό)
                </label>
                <input
                  type="text"
                  placeholder="Προαιρετική περιγραφή της εργασίας"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 bg-white"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200"
              >
                Ακύρωση
              </button>
              <button
                onClick={addTemplate}
                disabled={!newTitle.trim()}
                className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Δημιουργία Εργασίας
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Edit Modal */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-slate-800">
                    Επεξεργασία Εργασίας
                  </h3>
                  <button
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-600Transition-colors"
                    onClick={() => setEditTarget(null)}
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Τίτλος
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Τίτλος"
                      value={eTitle}
                      onChange={(e) => setETitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Περιγραφή (προαιρετικό)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Περιγραφή"
                      value={eDescription}
                      onChange={(e) => setEDescription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50Transition-colors"
                    onClick={() => setEditTarget(null)}
                  >
                    Άκυρο
                  </button>
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25Transition-all"
                    onClick={saveEdit}
                  >
                    Αποθήκευση
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-slate-800">
                    Διαγραφή Εργασίας
                  </h3>
                  <button
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-600Transition-colors"
                    onClick={cancelDelete}
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-start gap-3 mb-6">
                  <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-slate-700">
                    Είστε σίγουροι ότι θέλετε να διαγράψετε την εργασία "
                    <span className="font-semibold">{deleteTarget.title}</span>"
                    Θα διαγραφούν και οι καταχωρήσεις της.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50Transition-colors"
                    onClick={cancelDelete}
                  >
                    Άκυρο
                  </button>
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-medium hover:shadow-lg hover:shadow-red-500/25Transition-all"
                    onClick={confirmDelete}
                  >
                    Διαγραφή
                  </button>
                </div>
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
                      <FiCalendar className="w-6 h-6 text-blue-600" />
                      Ιστορικό Καθαριοτήτων
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
                  {history.length > 0 && (
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
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <FiFileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
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
                            {history.length}
                          </span>{" "}
                          εγγραφές ιστορικού για το διάστημα{" "}
                          {formatDM(fromDate)} — {formatDM(toDate)}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="p-3 text-left text-sm font-semibold text-slate-700">
                              Ημερομηνία
                            </th>
                            <th className="p-3 text-left text-sm font-semibold text-slate-700">
                              Εργασία
                            </th>
                            <th className="p-3 text-left text-sm font-semibold text-slate-700">
                              Ολοκληρώθηκε
                            </th>
                            <th className="p-3 text-left text-sm font-semibold text-slate-700">
                              Σημειώσεις
                            </th>
                            <th className="p-3 text-left text-sm font-semibold text-slate-700">
                              Ώρα
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((row, idx) => (
                            <tr
                              key={`${row.date}-${row.templateId}-${idx}`}
                              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3 text-slate-800 font-medium">
                                {formatDM(row.date)}
                              </td>
                              <td className="p-3 text-slate-800">
                                {row.title}
                              </td>
                              <td className="p-3">
                                {row.done ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600">
                                    <FiCheckCircle className="w-4 h-4" />
                                    Ναι
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-400">
                                    <FiXCircle className="w-4 h-4" />
                                    Όχι
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">
                                {row.notes || "-"}
                              </td>
                              <td className="p-3 text-slate-600">
                                {row.timestamp ? (
                                  <span className="inline-flex items-center gap-1">
                                    <FiClock className="w-4 h-4" />
                                    {formatTimeEL(row.timestamp)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

export default CleaningsPage;
