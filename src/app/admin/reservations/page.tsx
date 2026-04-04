"use client";

import { useState, useEffect, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import el from "date-fns/locale/el";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiUsers,
  FiDollarSign,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiPlus,
  FiX,
  FiSave,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import TimePicker from "react-time-picker";
import { db } from "@/lib/firebase";
import { formatDM } from "@/lib/date";
import {
  doc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";

registerLocale("el", el);

type Reservation = {
  id: string;
  title: string;
  description: string;
  phone: string;
  numberOfPeople: number;
  pricePerPerson: number;
  date: string;
  time: string;
  customerName?: string;
  email?: string;
  tableNumber?: string;
  status?: "pending" | "confirmed" | "seated" | "completed" | "cancelled";
  deposit?: number;
  notes?: string;
  source?: "website" | "manual";
  specialRequests?: string;
};

type ReservationStats = {
  total: number;
  pending: number;
  confirmed: number;
  seated: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  totalDeposits: number;
  todayReservations: number;
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [formData, setFormData] = useState<Reservation>({
    id: String(Date.now()),
    title: "",
    description: "",
    phone: "",
    numberOfPeople: 1,
    pricePerPerson: 0,
    date: new Date().toISOString().split("T")[0],
    time: "12:00",
    customerName: "",
    email: "",
    tableNumber: "",
    status: "pending",
    deposit: 0,
    notes: "",
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [pendingDeleteReservation, setPendingDeleteReservation] =
    useState<Reservation | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "seated" | "completed" | "cancelled"
  >("all");
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [search, setSearch] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Real-time listener for reservations
  useEffect(() => {
    const reservationsQuery = query(
      collection(db, "reservations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      reservationsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const reservationsData: Reservation[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Handle both API format (website) and direct Firestore format (manual)
          const isApiFormat = data.name && data.guests; // Website reservation format

          if (isApiFormat) {
            // Website reservation format
            return {
              id: doc.id,
              title: `Κράτηση ${data.name}`,
              description: data.specialRequests || "Κράτηση από ιστοσελίδα",
              phone: data.phone,
              numberOfPeople: parseInt(data.guests) || 1,
              pricePerPerson: data.pricePerPerson || 0,
              date: data.date,
              time: data.time,
              customerName: data.name,
              email: data.email || "",
              tableNumber: data.tableNumber || "",
              status: data.status || "pending",
              deposit: data.deposit || 0,
              notes: data.specialRequests || "",
              source: data.source || "website",
              specialRequests: data.specialRequests || "",
            };
          } else {
            // Manual reservation format (legacy)
            return {
              id: doc.id,
              title: data.title || `Κράτηση ${data.customerName}`,
              description: data.description || data.notes || "",
              phone: data.phone,
              numberOfPeople: data.numberOfPeople || 1,
              pricePerPerson: data.pricePerPerson || 0,
              date: data.date,
              time: data.time,
              customerName: data.customerName || "",
              email: data.email || "",
              tableNumber: data.tableNumber || "",
              status: data.status || "pending",
              deposit: data.deposit || 0,
              notes: data.notes || "",
              source: data.source || "manual",
              specialRequests: data.notes || "",
            };
          }
        });

        setReservations(reservationsData);
      },
      (error) => {
        console.error("Error listening to reservations:", error);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Calculate statistics
  const stats = useMemo<ReservationStats>(() => {
    const today = new Date().toISOString().split("T")[0];

    return {
      total: reservations.length,
      pending: reservations.filter((r) => r.status === "pending").length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
      seated: reservations.filter((r) => r.status === "seated").length,
      completed: reservations.filter((r) => r.status === "completed").length,
      cancelled: reservations.filter((r) => r.status === "cancelled").length,
      totalRevenue: reservations.reduce(
        (sum, r) => sum + r.numberOfPeople * r.pricePerPerson,
        0
      ),
      totalDeposits: reservations.reduce((sum, r) => sum + (r.deposit || 0), 0),
      todayReservations: reservations.filter((r) => r.date === today).length,
    };
  }, [reservations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const reservationData = {
      name: formData.customerName,
      phone: formData.phone,
      email: formData.email,
      date: selectedDate?.toISOString().split("T")[0] || formData.date,
      time: formData.time.padStart(5, "0"),
      guests: formData.numberOfPeople,
      specialRequests: formData.notes,
      source: "manual",
      status: formData.status,
      tableNumber: formData.tableNumber,
      pricePerPerson: formData.pricePerPerson,
      deposit: Number(formData.deposit || 0),
    };

    try {
      if (isEditing) {
        // Update existing reservation via API
        const response = await fetch(`/api/reservations/${formData.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reservationData),
        });

        if (!response.ok) {
          throw new Error("Failed to update reservation");
        }
      } else {
        // Create new reservation via API
        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reservationData),
        });

        if (!response.ok) {
          throw new Error("Failed to create reservation");
        }
      }

      // No need to reload - real-time listener will update automatically
    } catch (error) {
      console.error("Error saving reservation:", error);
      alert("Σφάλμα κατά την αποθήκευση της κράτησης");
      return;
    }

    setFormData({
      id: String(Date.now()),
      title: "",
      description: "",
      phone: "",
      numberOfPeople: 1,
      pricePerPerson: 0,
      date: new Date().toISOString().split("T")[0],
      time: "12:00",
      customerName: "",
      email: "",
      tableNumber: "",
      status: "pending",
      deposit: 0,
      notes: "",
      source: "manual",
    });
    setIsEditing(false);
    setIsEditMode(false);
    setShowModal(false);
  };

  const handleEdit = (reservation: Reservation) => {
    setFormData({ ...reservation });
    setSelectedDate(new Date(reservation.date));
    setIsEditMode(true);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleNewReservation = () => {
    setFormData({
      id: String(Date.now()),
      title: "",
      description: "",
      phone: "",
      numberOfPeople: 1,
      pricePerPerson: 0,
      date: new Date().toISOString().split("T")[0],
      time: "12:00",
      customerName: "",
      email: "",
      tableNumber: "",
      status: "pending",
      deposit: 0,
      notes: "",
      source: "manual",
    });
    setSelectedDate(new Date());
    setIsEditMode(false);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleDelete = async (reservation: Reservation) => {
    setPendingDeleteReservation(reservation);
  };

  const handleStatusChange = async (
    reservationId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // No need to reload - real-time listener will update automatically
      } else {
        console.error("Failed to update reservation status");
      }
    } catch (error) {
      console.error("Error updating reservation status:", error);
    }
  };

  // Helper function to guess source for old reservations
  const guessReservationSource = (
    reservation: Reservation
  ): "website" | "manual" | "unknown" => {
    // If source is already set, return it
    if (reservation.source) return reservation.source;

    // Try to guess based on available data
    // Website reservations typically have email and notes (specialRequests)
    if (reservation.email && reservation.notes) {
      return "website";
    }

    // Website reservations might also have just email without notes
    if (reservation.email && !reservation.tableNumber) {
      return "website";
    }

    // Manual reservations typically have tableNumber set
    if (reservation.tableNumber && !reservation.email) {
      return "manual";
    }

    // If we can't determine, return unknown
    return "unknown";
  };

  const confirmDelete = async () => {
    if (pendingDeleteReservation == null) return;
    const ref = doc(db, "reservations", String(pendingDeleteReservation.id));
    await deleteDoc(ref);
    setPendingDeleteReservation(null);
  };

  const cancelDelete = () => setPendingDeleteReservation(null);

  const sortedReservations = useMemo(() => {
    const base = [...reservations].sort(
      (a, b) =>
        new Date(a.date + "T" + a.time).getTime() -
        new Date(b.date + "T" + b.time).getTime()
    );
    const filtered = base.filter((r) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : (r.status || "pending") === statusFilter;
      const s = search.toLowerCase();
      const matchesSearch =
        !s ||
        r.title.toLowerCase().includes(s) ||
        (r.customerName || "").toLowerCase().includes(s) ||
        r.phone.includes(search);
      return matchesStatus && matchesSearch;
    });
    return filtered;
  }, [reservations, statusFilter, search]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "seated":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "confirmed":
        return <FiCheck className="w-3 h-3" />;
      case "seated":
        return <FiUsers className="w-3 h-3" />;
      case "completed":
        return <FiCheck className="w-3 h-3" />;
      case "cancelled":
        return <FiX className="w-3 h-3" />;
      default:
        return <FiAlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Διαχείριση Κρατήσεων
            </h1>
            <p className="text-slate-600 mt-1">
              Πλήρης έλεγχος κρατήσεων πελατών
            </p>
          </div>
          <button
            onClick={handleNewReservation}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center gap-2"
          >
            <FiCalendar className="w-4 h-4" />
            Νέα Κράτηση
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Σύνολο Κρατήσεων</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FiCalendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Σημερινές</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.todayReservations}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <FiCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Συνολικά Έσοδα</p>
              <p className="text-2xl font-bold text-slate-800">
                €{stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FiDollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Προκαταβολές</p>
              <p className="text-2xl font-bold text-slate-800">
                €{stats.totalDeposits.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <FiDollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Κατάσταση Κρατήσεων
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { status: "pending", label: "Σε αναμονή", count: stats.pending },
            {
              status: "confirmed",
              label: "Επιβεβαιωμένες",
              count: stats.confirmed,
            },
            { status: "seated", label: "Καθισμένοι", count: stats.seated },
            {
              status: "completed",
              label: "Ολοκληρωμένες",
              count: stats.completed,
            },
            {
              status: "cancelled",
              label: "Ακυρωμένες",
              count: stats.cancelled,
            },
          ].map(({ status, label, count }) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`p-3 rounded-xl border-2 transition-all ${
                statusFilter === status
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {getStatusIcon(status)}
                <span className="text-lg font-bold text-slate-800">
                  {count}
                </span>
              </div>
              <span className="text-xs text-slate-600">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Αναζήτηση (τίτλος/όνομα/τηλέφωνο)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="all">Όλες οι καταστάσεις</option>
              <option value="pending">Σε αναμονή</option>
              <option value="confirmed">Επιβεβαιωμένες</option>
              <option value="seated">Καθισμένοι</option>
              <option value="completed">Ολοκληρωμένες</option>
              <option value="cancelled">Ακυρωμένες</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Προγραμματισμένες Κρατήσεις
          </h2>
          <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {sortedReservations.length} κρατήσεις
          </div>
        </div>
        <div className="space-y-3">
          {sortedReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-gradient-to-r from-white to-slate-50/50 rounded-xl border border-slate-200/60 p-4 transition-all duration-300"
            >
              {/* First Row - Main Info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setShowDetailsModal(true);
                    }}
                    className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    {reservation.customerName || reservation.title}
                  </button>

                  {/* Source Flag */}
                  {(() => {
                    const guessedSource = guessReservationSource(reservation);
                    return (
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                          guessedSource === "website"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : guessedSource === "manual"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {guessedSource === "website" ? (
                          <>
                            <span className="text-xs">🌐</span>
                            Website
                          </>
                        ) : guessedSource === "manual" ? (
                          <>
                            <span className="text-xs">👤</span>
                            Χειροκίνητα
                          </>
                        ) : (
                          <>
                            <span className="text-xs">❓</span>
                            Άγνωστο
                          </>
                        )}
                      </span>
                    );
                  })()}

                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-4 h-4" />
                      {formatDM(reservation.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock className="w-4 h-4" />
                      {reservation.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers className="w-4 h-4" />
                      {reservation.numberOfPeople}
                    </span>
                    {reservation.tableNumber && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-4 h-4" />
                        Τραπ. {reservation.tableNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                      reservation.status
                    )}`}
                  >
                    {getStatusIcon(reservation.status)}
                    {reservation.status === "pending" && "Σε αναμονή"}
                    {reservation.status === "confirmed" && "Επιβεβαιωμένη"}
                    {reservation.status === "seated" && "Καθισμένοι"}
                    {reservation.status === "completed" && "Ολοκληρωμένη"}
                    {reservation.status === "cancelled" && "Ακυρωμένη"}
                  </span>
                </div>
              </div>

              {/* Second Row - Contact & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <FiPhone className="w-4 h-4" />
                    {reservation.phone}
                  </span>
                  {reservation.email && (
                    <span className="flex items-center gap-1">
                      <FiMail className="w-4 h-4" />
                      {reservation.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FiDollarSign className="w-4 h-4" />€
                    {reservation.pricePerPerson}/άτομο
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status Change Dropdown */}
                  <select
                    value={reservation.status}
                    onChange={(e) =>
                      handleStatusChange(String(reservation.id), e.target.value)
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="pending">Σε αναμονή</option>
                    <option value="confirmed">Επιβεβαιωμένη</option>
                    <option value="seated">Καθισμένοι</option>
                    <option value="completed">Ολοκληρωμένη</option>
                    <option value="cancelled">Ακυρωμένη</option>
                  </select>

                  {/* Action Buttons */}
                  <button
                    onClick={() => handleEdit(reservation)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1 text-sm"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    Επεξεργασία
                  </button>
                  <button
                    onClick={() => handleDelete(reservation)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1 text-sm"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Διαγραφή
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sortedReservations.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FiCalendar className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Δεν βρέθηκαν κρατήσεις
              </h3>
              <p className="text-slate-500 mb-6">
                Δεν υπάρχουν κρατήσεις που να ταιριάζουν με τα κριτήρια
                αναζήτησης
              </p>
              <button
                onClick={handleNewReservation}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center gap-2 mx-auto"
              >
                <FiCalendar className="w-4 h-4" />
                Δημιουργία Νέας Κράτησης
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Reservation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiCalendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {isEditMode ? "Επεξεργασία Κράτησης" : "Νέα Κράτηση"}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {isEditMode
                        ? "Ενημέρωση στοιχείων κράτησης"
                        : "Δημιουργία νέας κράτησης τραπεζιού"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
              <form onSubmit={handleSubmit} className="p-8">
                <div className="w-full gap-8">
                  {/* Left Column - Date & Time */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FiClock className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        Ημερομηνία & Ώρα
                      </h3>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex flex-row  items-center justify-between  border-2 border-slate-200 rounded-xl p-4 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white transition-colors w-full mb-6 ">
                          <div className="flex flex-row items-center gap-2 w-[50%]">
                            <FiCalendar className="text-slate-400 mr-3 w-5 h-5" />
                            <DatePicker
                              selected={selectedDate}
                              onChange={(date) => setSelectedDate(date)}
                              className="flex-1 border border-slate-200 rounded-xl p-4 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white transition-colors "
                              dateFormat="dd/MM/yyyy"
                              locale="el"
                              placeholderText="Επιλέξτε ημερομηνία"
                            />
                          </div>
                          <div className="flex flex-row items-center gap-2 w-[50%]">
                            <FiClock className="text-slate-400 mr-3 w-5 h-5" />
                            <TimePicker
                              onChange={(value) =>
                                setFormData({
                                  ...formData,
                                  time: value || "00:00",
                                })
                              }
                              value={formData.time || "00:00"}
                              disableClock={true}
                              format="HH:mm"
                              className="flex-1 border border-slate-200 rounded-xl p-4 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white transition-colors w-[50%]"
                              clearIcon={null}
                              clockIcon={null}
                              hourPlaceholder="ΩΩ"
                              minutePlaceholder="ΛΛ"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Middle Column - Customer Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FiUser className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      Στοιχεία Πελάτη
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Τίτλος Κράτησης <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors focus:bg-white"
                        placeholder="π.χ. Κράτηση για 4 άτομα"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Περιγραφή
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Όνομα
                        </label>
                        <input
                          type="text"
                          value={formData.customerName || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerName: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            className="w-full focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Τραπέζι
                        </label>
                        <input
                          type="text"
                          value={formData.tableNumber || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tableNumber: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Pricing & Status */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">
                      Κοστολόγηση & Κατάσταση
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Άτομα *
                        </label>
                        <div className="flex items-center border border-slate-200 rounded-lg p-3">
                          <FiUsers className="text-slate-400 mr-2" />
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.numberOfPeople}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                numberOfPeople:
                                  parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Τιμή/άτομο *
                        </label>
                        <div className="flex items-center border border-slate-200 rounded-lg p-3">
                          <FiDollarSign className="text-slate-400 mr-2" />
                          <input
                            type="number"
                            required
                            step="0.01"
                            value={formData.pricePerPerson}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                pricePerPerson: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Προκαταβολή
                      </label>
                      <div className="flex items-center border border-slate-200 rounded-lg p-3">
                        <FiDollarSign className="text-slate-400 mr-2" />
                        <input
                          type="number"
                          step="0.01"
                          value={formData.deposit || 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deposit: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Κατάσταση
                      </label>
                      <select
                        value={formData.status || "pending"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as Reservation["status"],
                          })
                        }
                        className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="pending">Σε αναμονή</option>
                        <option value="confirmed">Επιβεβαιωμένη</option>
                        <option value="seated">Καθισμένοι</option>
                        <option value="completed">Ολοκληρωμένη</option>
                        <option value="cancelled">Ακυρωμένη</option>
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

                    {/* Cost Summary */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-3">
                        Σύνοψη Κόστους
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Σύνολο:</span>
                          <span className="font-semibold text-slate-800">
                            €
                            {(
                              formData.numberOfPeople * formData.pricePerPerson
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Προκαταβολή:</span>
                          <span className="font-semibold text-emerald-600">
                            €{Number(formData.deposit || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
                          <span className="text-slate-800">Υπόλοιπο:</span>
                          <span className="text-slate-800">
                            €
                            {Math.max(
                              formData.numberOfPeople *
                                formData.pricePerPerson -
                                Number(formData.deposit || 0),
                              0
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>{" "}
                {/* Close grid container */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    Ακύρωση
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center justify-center gap-2"
                  >
                    <FiSave className="w-4 h-4" />
                    {isEditMode ? "Ενημέρωση Κράτησης" : "Αποθήκευση Κράτησης"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteReservation !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                Επιβεβαίωση Διαγραφής
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-slate-600 mb-3">
                  Θέλετε σίγουρα να διαγράψετε την κράτηση:
                </p>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-2">
                    "{pendingDeleteReservation.title}"
                  </h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>
                      📅 {formatDM(pendingDeleteReservation.date)} στις{" "}
                      {pendingDeleteReservation.time}
                    </p>
                    <p>👥 {pendingDeleteReservation.numberOfPeople} άτομα</p>
                    {pendingDeleteReservation.customerName && (
                      <p>👤 {pendingDeleteReservation.customerName}</p>
                    )}
                  </div>
                </div>
                <p className="text-red-600 text-sm mt-3 font-medium">
                  Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </p>
              </div>
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

      {/* Reservation Details Modal */}
      {showDetailsModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Λεπτομέρειες Κράτησης</h2>
                  <p className="text-blue-100 mt-1">
                    {selectedReservation.customerName ||
                      selectedReservation.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FiCalendar className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-800">
                      Ημερομηνία & Ώρα
                    </span>
                  </div>
                  <p className="text-slate-600">
                    {formatDM(selectedReservation.date)} στις{" "}
                    {selectedReservation.time}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FiUsers className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-slate-800">Άτομα</span>
                  </div>
                  <p className="text-slate-600">
                    {selectedReservation.numberOfPeople} άτομα
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  Στοιχεία Επικοινωνίας
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <FiUser className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Όνομα</p>
                      <p className="font-medium text-slate-800">
                        {selectedReservation.customerName || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <FiPhone className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Τηλέφωνο</p>
                      <p className="font-medium text-slate-800">
                        {selectedReservation.phone}
                      </p>
                    </div>
                  </div>
                  {selectedReservation.email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg md:col-span-2">
                      <FiMail className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="font-medium text-slate-800">
                          {selectedReservation.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table & Status */}
              <div className="grid grid-cols-2 gap-4">
                {selectedReservation.tableNumber && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FiMapPin className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-slate-800">
                        Τραπέζι
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Τραπέζι {selectedReservation.tableNumber}
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-5 h-5 flex items-center justify-center">
                      {getStatusIcon(selectedReservation.status)}
                    </span>
                    <span className="font-semibold text-slate-800">
                      Κατάσταση
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(
                      selectedReservation.status
                    )}`}
                  >
                    {selectedReservation.status === "pending" && "Σε αναμονή"}
                    {selectedReservation.status === "confirmed" &&
                      "Επιβεβαιωμένη"}
                    {selectedReservation.status === "seated" && "Καθισμένοι"}
                    {selectedReservation.status === "completed" &&
                      "Ολοκληρωμένη"}
                    {selectedReservation.status === "cancelled" && "Ακυρωμένη"}
                  </span>
                </div>
              </div>

              {/* Source Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  Προέλευση Κράτησης
                </h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const guessedSource =
                        guessReservationSource(selectedReservation);
                      return (
                        <>
                          <span
                            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                              guessedSource === "website"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : guessedSource === "manual"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {guessedSource === "website" ? (
                              <>
                                <span className="text-lg">🌐</span>
                                Κράτηση από Website
                              </>
                            ) : guessedSource === "manual" ? (
                              <>
                                <span className="text-lg">👤</span>
                                Χειροκίνητη Εισαγωγή
                              </>
                            ) : (
                              <>
                                <span className="text-lg">❓</span>
                                Άγνωστη Προέλευση
                              </>
                            )}
                          </span>
                          <span className="text-sm text-slate-500">
                            {guessedSource === "website"
                              ? "Η κράτηση έγινε από τον πελάτη μέσω του website"
                              : guessedSource === "manual"
                              ? "Η κράτηση καταχωρήθηκε από το προσωπικό"
                              : "Η προέλευση εκτιμάται βάσει των διαθέσιμων δεδομένων"}
                            {!selectedReservation.source && (
                              <span className="block text-xs text-amber-600 mt-1">
                                * Εκτίμηση για παλιά κράτηση
                              </span>
                            )}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  Οικονομικά Στοιχεία
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <FiDollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-1">Τιμή/άτομο</p>
                    <p className="font-bold text-slate-800">
                      €{selectedReservation.pricePerPerson}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <FiDollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-1">Σύνολο</p>
                    <p className="font-bold text-slate-800">
                      €
                      {(
                        selectedReservation.numberOfPeople *
                        selectedReservation.pricePerPerson
                      ).toFixed(2)}
                    </p>
                  </div>
                  {selectedReservation.deposit &&
                    selectedReservation.deposit > 0 && (
                      <>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <FiDollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 mb-1">
                            Προκαταβολή
                          </p>
                          <p className="font-bold text-emerald-600">
                            €{selectedReservation.deposit.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <FiDollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 mb-1">
                            Υπόλοιπο
                          </p>
                          <p className="font-bold text-slate-800">
                            €
                            {Math.max(
                              selectedReservation.numberOfPeople *
                                selectedReservation.pricePerPerson -
                                selectedReservation.deposit,
                              0
                            ).toFixed(2)}
                          </p>
                        </div>
                      </>
                    )}
                </div>
              </div>

              {/* Notes */}
              {selectedReservation.notes && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    Σημειώσεις
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">
                      {selectedReservation.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedReservation.specialRequests && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    Ειδικές Παρατηρήσεις
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">
                      {selectedReservation.specialRequests}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-8 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Κλείσιμο
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedReservation);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiEdit2 className="w-4 h-4" />
                Επεξεργασία
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
