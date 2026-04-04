"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit as fbLimit,
  type QuerySnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import {
  FiEdit2,
  FiMail,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiX,
  FiSave,
  FiPhone,
  FiMapPin,
  FiUser,
  FiPackage,
  FiDollarSign,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSend,
  FiEye,
} from "react-icons/fi";

type Supplier = {
  id: number;
  companyName: string;
  phone: string;
  email: string;
  vatNumber: string;
  supplierType: string;
  contactName?: string;
  address?: string;
  city?: string;
  taxOffice?: string;
  iban?: string;
  notes?: string;
  status?: "active" | "inactive";
};

type EmailOrder = {
  id: string;
  to: string;
  subject: string;
  message: string;
  supplierId?: number | string | null;
  supplierName?: string | null;
  messageId?: string | null;
  createdAt?: Timestamp | null;
  status?: string;
};

type SupplierStats = {
  total: number;
  active: number;
  inactive: number;
  withEmail: number;
  recentOrders: number;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState<Supplier>({
    id: Date.now(),
    companyName: "",
    phone: "",
    email: "",
    vatNumber: "",
    supplierType: "",
    contactName: "",
    address: "",
    city: "",
    taxOffice: "",
    iban: "",
    notes: "",
    status: "active",
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [editData, setEditData] = useState<Supplier | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCompose, setShowCompose] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>(
    "Παραγγελία από το κατάστημα SweetLeaf"
  );
  const [composeBody, setComposeBody] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [composeSupplierId, setComposeSupplierId] = useState<number | null>(
    null
  );
  const [composeSupplierName, setComposeSupplierName] = useState<string | null>(
    null
  );
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<EmailOrder[]>([]);
  const [vatSearchLoading, setVatSearchLoading] = useState<boolean>(false);
  const [vatSearchMessage, setVatSearchMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [wrappSettings, setWrappSettings] = useState<any>({});
  const [businessInfo, setBusinessInfo] = useState<any>({
    storeName: "Το Κατάστημά μας",
    address: "",
    city: "",
    phone: "",
    email: "",
  });
  const [showTemplatePreview, setShowTemplatePreview] =
    useState<boolean>(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [editableSubject, setEditableSubject] = useState<string>("");
  const [editableBody, setEditableBody] = useState<string>("");
  const [templateSaving, setTemplateSaving] = useState<boolean>(false);

  // Calculate statistics
  const stats = useMemo<SupplierStats>(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === "active").length,
      inactive: suppliers.filter((s) => s.status === "inactive").length,
      withEmail: suppliers.filter((s) => s.email).length,
      recentOrders: historyItems.length,
    };
  }, [suppliers, historyItems]);

  // Realtime fetch από Firestore - ΔΙΑΤΗΡΗΣΗ ΑΚΡΙΒΩΣ
  useEffect(() => {
    const colRef = collection(db, "suppliers");
    const unsub = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: Supplier[] = snapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => ({
            id: Number(d.id),
            ...(d.data() as Omit<Supplier, "id">),
          })
        );
        setSuppliers(items);
      }
    );
    return () => unsub();
  }, []);

  // Load WRAPP settings and business info
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const configDocs = await getDocs(collection(db, "config"));

        // Load WRAPP settings
        const wrappData = configDocs.docs
          .find((doc) => doc.id === "wrapp")
          ?.data();
        if (wrappData) {
          setWrappSettings(wrappData);
        }

        // Load business info
        const settingsData = configDocs.docs
          .find((doc) => doc.id === "settings")
          ?.data();
        if (settingsData?.businessInfo) {
          setBusinessInfo(settingsData.businessInfo);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  // VAT Search functionality
  const handleVatSearch = async () => {
    if (!formData.vatNumber || formData.vatNumber.length < 9) {
      setVatSearchMessage({
        type: "error",
        text: "Παρακαλώ εισάγετε έγκυρο ΑΦΜ (τουλάχιστον 9 ψηφία)",
      });
      return;
    }

    setVatSearchLoading(true);
    setVatSearchMessage(null);

    try {
      // Check if WRAPP credentials are available
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

      // Search VAT
      const vatResponse = await fetch(
        `/api/wrapp/vat-search?vat=${
          formData.vatNumber
        }&country_code=EL&baseUrl=${encodeURIComponent(wrappSettings.baseUrl)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (!vatResponse.ok) {
        throw new Error("Αποτυχία αναζήτησης ΑΦΜ");
      }

      const vatData = await vatResponse.json();
      console.log("VAT search result:", vatData);

      // Update supplier info with found data
      if (vatData && vatData.name) {
        // Combine address and street_number for complete address
        const fullAddress =
          vatData.address && vatData.street_number
            ? `${vatData.address} ${vatData.street_number}`
            : vatData.address;

        setFormData((prev) => ({
          ...prev,
          companyName: vatData.name || prev.companyName,
          address: fullAddress || prev.address,
          city: vatData.city || prev.city,
          // Note: tax_office is not provided by WRAPP VAT search API
        }));

        setVatSearchMessage({
          type: "success",
          text: "Τα στοιχεία προμηθευτή συμπληρώθηκαν επιτυχώς!",
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
    }
  };

  // VAT Search functionality for edit modal
  const handleEditVatSearch = async () => {
    if (!editData || !editData.vatNumber || editData.vatNumber.length < 9) {
      setVatSearchMessage({
        type: "error",
        text: "Παρακαλώ εισάγετε έγκυρο ΑΦΜ (τουλάχιστον 9 ψηφία)",
      });
      return;
    }

    setVatSearchLoading(true);
    setVatSearchMessage(null);

    try {
      // Check if WRAPP credentials are available
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

      // Search VAT
      const vatResponse = await fetch(
        `/api/wrapp/vat-search?vat=${
          editData.vatNumber
        }&country_code=EL&baseUrl=${encodeURIComponent(wrappSettings.baseUrl)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (!vatResponse.ok) {
        throw new Error("Αποτυχία αναζήτησης ΑΦΜ");
      }

      const vatData = await vatResponse.json();
      console.log("VAT search result:", vatData);

      // Update supplier info with found data
      if (vatData && vatData.name) {
        // Combine address and street_number for complete address
        const fullAddress =
          vatData.address && vatData.street_number
            ? `${vatData.address} ${vatData.street_number}`
            : vatData.address;

        setEditData((prev) =>
          prev
            ? {
                ...prev,
                companyName: vatData.name || prev.companyName,
                address: fullAddress || prev.address,
                city: vatData.city || prev.city,
                // Note: tax_office is not provided by WRAPP VAT search API
              }
            : null
        );

        setVatSearchMessage({
          type: "success",
          text: "Τα στοιχεία προμηθευτή συμπληρώθηκαν επιτυχώς!",
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const ref = doc(db, "suppliers", String(newId));
    await setDoc(ref, {
      companyName: formData.companyName,
      phone: formData.phone,
      email: formData.email,
      vatNumber: formData.vatNumber,
      supplierType: formData.supplierType,
      contactName: formData.contactName,
      address: formData.address,
      city: formData.city,
      taxOffice: formData.taxOffice,
      iban: formData.iban,
      notes: formData.notes,
      status: formData.status || "active",
    });

    setFormData({
      id: Date.now(),
      companyName: "",
      phone: "",
      email: "",
      vatNumber: "",
      supplierType: "",
      contactName: "",
      address: "",
      city: "",
      taxOffice: "",
      iban: "",
      notes: "",
      status: "active",
    });
    setIsEditing(false);
    setShowAddModal(false);
  };

  const openHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "email_orders"),
        orderBy("createdAt", "desc"),
        fbLimit(50)
      );
      const snap = await getDocs(q);
      const items: EmailOrder[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          to: data.to,
          subject: data.subject,
          message: data.message,
          supplierId: data.supplierId ?? null,
          supplierName: data.supplierName ?? null,
          messageId: data.messageId ?? null,
          createdAt: (data.createdAt as Timestamp) ?? null,
          status: data.status ?? "sent",
        };
      });
      setHistoryItems(items);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditData({ ...supplier });
  };

  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    const ref = doc(db, "suppliers", String(pendingDeleteId));
    await deleteDoc(ref);
    setPendingDeleteId(null);
  };

  const cancelDelete = () => setPendingDeleteId(null);

  // Load email template from Firestore
  const loadEmailTemplate = async () => {
    try {
      const templateRef = doc(db, "config", "emailTemplates");
      const templateSnap = await getDoc(templateRef);

      if (templateSnap.exists() && templateSnap.data().supplierOrder) {
        const template = templateSnap.data().supplierOrder;
        return {
          subject:
            template.subject ||
            `Παραγγελία προϊόντων - ${businessInfo.storeName}`,
          body:
            template.body ||
            `Αγαπητέ/ή [Όνομα Προμηθευτή],\n\nΘα θέλαμε να παραγγείλουμε τα παρακάτω προϊόντα:\n\n[Παρακαλώ συμπληρώστε τα προϊόντα και τις ποσότητες εδώ]\n\nΠαρακαλούμε να μας ενημερώσετε για τον χρόνο παράδοσης.\n\nΕυχαριστούμε!`,
        };
      }
    } catch (error) {
      console.error("Error loading email template:", error);
    }

    // Default template
    return {
      subject: `Παραγγελία προϊόντων - ${businessInfo.storeName}`,
      body: `Αγαπητέ/ή [Όνομα Προμηθευτή],\n\nΘα θέλαμε να παραγγείλουμε τα παρακάτω προϊόντα:\n\n[Παρακαλώ συμπληρώστε τα προϊόντα και τις ποσότητες εδώ]\n\nΠαρακαλούμε να μας ενημερώσετε για τον χρόνο παράδοσης.\n\nΕυχαριστούμε!`,
    };
  };

  // Save email template to Firestore
  const saveEmailTemplate = async () => {
    setTemplateSaving(true);
    try {
      const templateRef = doc(db, "config", "emailTemplates");
      await setDoc(
        templateRef,
        {
          supplierOrder: {
            subject: editableSubject,
            body: editableBody,
            updatedAt: new Date(),
          },
        },
        { merge: true }
      );

      setIsEditingTemplate(false);
      setPageMessage("Το template αποθηκεύτηκε επιτυχώς!");
      setTimeout(() => setPageMessage(null), 3000);
    } catch (error) {
      console.error("Error saving email template:", error);
      alert("Σφάλμα κατά την αποθήκευση του template");
    } finally {
      setTemplateSaving(false);
    }
  };

  const openComposeFor = async (s: Supplier) => {
    if (!s.email) return;
    setComposeTo(s.email);

    // Load template from Firestore
    const template = await loadEmailTemplate();
    setComposeSubject(template.subject);

    // Replace placeholder with actual supplier name
    const emailBody = template.body.replace(
      "[Όνομα Προμηθευτή]",
      s.companyName
    );
    setComposeBody(emailBody);

    setSendMessage(null);
    setShowCompose(true);
    setComposeSupplierId(s.id);
    setComposeSupplierName(s.companyName);
  };

  const sendEmail = async () => {
    if (!composeTo) {
      setSendMessage("Δεν υπάρχει email παραλήπτη.");
      return;
    }
    setSending(true);
    setSendMessage(null);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          message: composeBody,
          supplierId: composeSupplierId ?? undefined,
          supplierName: composeSupplierName ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const details =
          data?.details?.message || data?.response || data?.code || "";
        throw new Error(
          `${data.error || "Send failed"}${details ? ` | ${details}` : ""}`
        );
      }
      setShowCompose(false);
      setSendMessage(null);
      setPageMessage("Το email στάλθηκε επιτυχώς.");
      setTimeout(() => setPageMessage(null), 4000);
    } catch (e: any) {
      setSendMessage(`Αποτυχία αποστολής: ${e?.message || e}`);
    } finally {
      setSending(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return suppliers.filter(
      (supplier) =>
        supplier.companyName.toLowerCase().includes(term) ||
        (supplier.contactName || "").toLowerCase().includes(term) ||
        supplier.phone.includes(searchTerm) ||
        (supplier.city || "").toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const formatDate = (ts?: Timestamp | null) => {
    if (!ts) return "-";
    try {
      const d = ts.toDate();
      return d.toLocaleString("el-GR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "-";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "inactive":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "active":
        return <FiCheckCircle className="w-4 h-4" />;
      case "inactive":
        return <FiXCircle className="w-4 h-4" />;
      default:
        return <FiCheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Διαχείριση Προμηθευτών
            </h1>
            <p className="text-slate-600 mt-1">
              Πλήρης έλεγχος προμηθευτών και παραγγελιών
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const template = await loadEmailTemplate();
                setEditableSubject(template.subject);
                setEditableBody(template.body);
                setIsEditingTemplate(false);
                setShowTemplatePreview(true);
              }}
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-medium flex items-center gap-2"
              title="Προεπισκόπηση Email Template"
            >
              <FiEye className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Νέος Προμηθευτής
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Σύνολο Προμηθευτών</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Ενεργοί</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.active}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <FiCheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Με Email</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.withEmail}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FiMail className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Πρόσφατες Παραγγελίες</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.recentOrders}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <FiFileText className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Αναζήτηση: Επωνυμία, Επαφή, Τηλέφωνο, Πόλη"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={openHistory}
            className="px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 font-medium flex items-center gap-2"
          >
            <FiClock className="w-4 h-4" />
            Ιστορικό Παραγγελιών
          </button>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          Λίστα Προμηθευτών
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Επωνυμία
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Επαφή
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Τηλέφωνο
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  ΑΦΜ/ΔΟΥ
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Πόλη
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Κατάσταση
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-slate-800">
                        {s.companyName}
                      </div>
                      {s.supplierType && (
                        <div className="text-xs text-slate-500 mt-1">
                          {s.supplierType}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">
                        {s.contactName || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{s.phone}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <FiMail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{s.email || "-"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="text-slate-700">{s.vatNumber || "-"}</div>
                      {s.taxOffice && (
                        <div className="text-xs text-slate-500 mt-1">
                          {s.taxOffice}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{s.city || "-"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
                        s.status
                      )}`}
                    >
                      {getStatusIcon(s.status)}
                      {(s.status || "active") === "active"
                        ? "Ενεργός"
                        : "Ανενεργός"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Επεξεργασία"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openComposeFor(s)}
                        disabled={!s.email}
                        className={`p-2 rounded-lg transition-colors ${
                          s.email
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                        title={s.email ? "Αποστολή Email" : "Δεν υπάρχει email"}
                      >
                        <FiSend className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Διαγραφή"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Δεν βρέθηκαν προμηθευτές</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Καταχώρηση Προμηθευτή
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setVatSearchMessage(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">
                    Βασικά Στοιχεία
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Επωνυμία Εταιρείας *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Επαφή (Ονοματεπώνυμο)
                    </label>
                    <input
                      type="text"
                      value={formData.contactName || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactName: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Τηλέφωνο *
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiPhone className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiMail className="text-slate-400 mr-2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Είδος Προμηθευτή *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplierType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplierType: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">
                    Οικονομικά & Διεύθυνση
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ΑΦΜ
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.vatNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vatNumber: e.target.value,
                          })
                        }
                        onBlur={handleVatSearch}
                        className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Εισάγετε ΑΦΜ για αυτόματη συμπλήρωση"
                      />
                      <button
                        type="button"
                        onClick={handleVatSearch}
                        disabled={vatSearchLoading || !formData.vatNumber}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Αναζήτηση στοιχείων προμηθευτή"
                      >
                        {vatSearchLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <FiSearch className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {vatSearchMessage && (
                      <div
                        className={`mt-2 text-sm ${
                          vatSearchMessage.type === "success"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {vatSearchMessage.text}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ΔΟΥ
                    </label>
                    <input
                      type="text"
                      value={formData.taxOffice || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, taxOffice: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      IBAN
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiDollarSign className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={formData.iban || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, iban: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Διεύθυνση
                    </label>
                    <input
                      type="text"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Πόλη
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiMapPin className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={formData.city || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Κατάσταση
                  </label>
                  <select
                    value={formData.status || "active"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Supplier["status"],
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="active">Ενεργός</option>
                    <option value="inactive">Ανενεργός</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Σημειώσεις
                  </label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <FiSave className="w-4 h-4" />
                  Αποθήκευση Προμηθευτή
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Επεξεργασία Προμηθευτή
                </h2>
                <button
                  onClick={() => {
                    setEditData(null);
                    setVatSearchMessage(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editData) return;

                const ref = doc(db, "suppliers", String(editData.id));
                await setDoc(ref, {
                  companyName: editData.companyName,
                  phone: editData.phone,
                  email: editData.email,
                  vatNumber: editData.vatNumber,
                  supplierType: editData.supplierType,
                  contactName: editData.contactName,
                  address: editData.address,
                  city: editData.city,
                  taxOffice: editData.taxOffice,
                  iban: editData.iban,
                  notes: editData.notes,
                  status: editData.status || "active",
                });
                setEditData(null);
              }}
              className="p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">
                    Βασικά Στοιχεία
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Επωνυμία Εταιρείας *
                    </label>
                    <input
                      type="text"
                      required
                      value={editData.companyName}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Επαφή (Ονοματεπώνυμο)
                    </label>
                    <input
                      type="text"
                      value={editData.contactName || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          contactName: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Τηλέφωνο *
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiPhone className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        required
                        value={editData.phone}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiMail className="text-slate-400 mr-2" />
                      <input
                        type="email"
                        value={editData.email || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Είδος Προμηθευτή *
                    </label>
                    <input
                      type="text"
                      required
                      value={editData.supplierType}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          supplierType: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">
                    Οικονομικά & Διεύθυνση
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ΑΦΜ
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editData.vatNumber || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            vatNumber: e.target.value,
                          })
                        }
                        onBlur={handleEditVatSearch}
                        className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Εισάγετε ΑΦΜ για αυτόματη συμπλήρωση"
                      />
                      <button
                        type="button"
                        onClick={handleEditVatSearch}
                        disabled={vatSearchLoading || !editData.vatNumber}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Αναζήτηση στοιχείων προμηθευτή"
                      >
                        {vatSearchLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <FiSearch className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {vatSearchMessage && (
                      <div
                        className={`mt-2 text-sm ${
                          vatSearchMessage.type === "success"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {vatSearchMessage.text}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ΔΟΥ
                    </label>
                    <input
                      type="text"
                      value={editData.taxOffice || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, taxOffice: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      IBAN
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiDollarSign className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={editData.iban || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, iban: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Διεύθυνση
                    </label>
                    <input
                      type="text"
                      value={editData.address || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, address: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Πόλη
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-lg p-3">
                      <FiMapPin className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={editData.city || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, city: e.target.value })
                        }
                        className="w-full focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Κατάσταση
                  </label>
                  <select
                    value={editData.status || "active"}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        status: e.target.value as Supplier["status"],
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="active">Ενεργός</option>
                    <option value="inactive">Ανενεργός</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Σημειώσεις
                  </label>
                  <textarea
                    value={editData.notes || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditData(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <FiSave className="w-4 h-4" />
                  Ενημέρωση Προμηθευτή
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                Επιβεβαίωση Διαγραφής
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Θέλετε σίγουρα να διαγράψετε τον προμηθευτή #{pendingDeleteId};
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Διαγραφή
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Ιστορικό Αποστολών
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-slate-600 mt-4">Φόρτωση...</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-12">
                  <FiFileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Δεν υπάρχουν καταγραφές.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Ημερομηνία
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Προμηθευτής
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Προς
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Θέμα
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Περιεχόμενο
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.map((h) => (
                        <tr key={h.id} className="border-b border-slate-100">
                          <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                            {formatDate(h.createdAt)}
                          </td>
                          <td className="py-4 px-4 text-slate-700">
                            {h.supplierName || "-"}
                          </td>
                          <td className="py-4 px-4 text-slate-700">{h.to}</td>
                          <td className="py-4 px-4 text-slate-700">
                            {h.subject}
                          </td>
                          <td className="py-4 px-4">
                            <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-auto">
                              <pre className="whitespace-pre-wrap text-sm text-slate-700">
                                {h.message}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Αποστολή Email Παραγγελίας
                </h2>
                <button
                  onClick={() => setShowCompose(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Προς (email)
                </label>
                <div className="flex items-center border border-slate-200 rounded-lg p-3">
                  <FiMail className="text-slate-400 mr-2" />
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Θέμα
                </label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Μήνυμα
                </label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={10}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              {sendMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {sendMessage}
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCompose(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={sendEmail}
                  disabled={sending}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    sending
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700"
                  }`}
                >
                  <FiSend className="w-4 h-4" />
                  {sending ? "Αποστολή..." : "Αποστολή"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Preview Modal */}
      {showTemplatePreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Προεπισκόπηση Email Template
                </h2>
                <button
                  onClick={() => setShowTemplatePreview(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Edit/Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (isEditingTemplate) {
                      saveEmailTemplate();
                    } else {
                      setIsEditingTemplate(true);
                    }
                  }}
                  disabled={templateSaving}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isEditingTemplate
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                >
                  <FiEdit2 className="w-4 h-4" />
                  {templateSaving
                    ? "Αποθήκευση..."
                    : isEditingTemplate
                    ? "Αποθήκευση"
                    : "Επεξεργασία"}
                </button>
              </div>

              {/* Email Header Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-slate-700 mt-2">
                      Θέμα:
                    </span>
                    {isEditingTemplate ? (
                      <input
                        type="text"
                        value={editableSubject}
                        onChange={(e) => setEditableSubject(e.target.value)}
                        className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-slate-600 mt-2">
                        {editableSubject}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Προς:</span>
                    <span className="text-slate-600">[Email Προμηθευτή]</span>
                  </div>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                {isEditingTemplate ? (
                  <textarea
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Γράψτε το περιεχόμενο του email..."
                  />
                ) : (
                  <div className="space-y-4 whitespace-pre-wrap text-slate-700">
                    {editableBody}
                  </div>
                )}
              </div>

              {/* Email Signature Preview */}
              <div className="border border-slate-200 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="space-y-3">
                  <p className="text-slate-600 text-sm">Με εκτίμηση,</p>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800">
                        Ομάδα του {businessInfo.storeName}
                      </p>
                      {businessInfo.address && (
                        <p className="text-slate-600 text-sm">
                          {businessInfo.address}
                          {businessInfo.city && `, ${businessInfo.city}`}
                        </p>
                      )}
                      {(businessInfo.phone || businessInfo.email) && (
                        <p className="text-slate-600 text-sm">
                          {businessInfo.phone &&
                            `Τηλέφωνο: ${businessInfo.phone}`}
                          {businessInfo.phone && businessInfo.email && " • "}
                          {businessInfo.email && `email: ${businessInfo.email}`}
                        </p>
                      )}
                      {businessInfo.taxId && (
                        <p className="text-slate-600 text-sm font-semibold">
                          ΑΦΜ {businessInfo.taxId}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mt-4">
                    do not reply to this email
                  </p>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FiMail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Σημείωση:</p>
                    <p>
                      Αυτό το template χρησιμοποιείται αυτόματα όταν στέλνετε
                      email σε προμηθευτές. Οι πληροφορίες (όνομα καταστήματος,
                      διεύθυνση, τηλέφωνο, κλπ) τραβιούνται αυτόματα από τις
                      ρυθμίσεις στο{" "}
                      <span className="font-semibold">/admin/settings</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowTemplatePreview(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-medium"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {pageMessage && (
        <div className="fixed top-4 right-4 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <FiCheckCircle className="w-5 h-5" />
          {pageMessage}
        </div>
      )}
    </div>
  );
}
