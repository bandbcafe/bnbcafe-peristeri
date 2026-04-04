"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaUser,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSave,
  FaSearch,
  FaSpinner,
} from "react-icons/fa";
import { Customer, CustomerFormData, AADEVatInfo } from "@/types/customer";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  customer?: Customer; // For edit mode
  mode?: "create" | "edit";
}

export default function NewCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  onCustomerUpdated,
  customer,
  mode = "create",
}: NewCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: "",
    lastName: "",
    companyName: "",
    vatNumber: "",
    taxOffice: "",
    vatExempt: false,
    email: "",
    phone: "",
    mobile: "",
    addresses: [
      {
        id: "1",
        label: "Κύρια Διεύθυνση",
        street: "",
        city: "",
        postalCode: "",
        country: "Ελλάδα",
        floor: "",
        doorbell: "",
        notes: "",
        isDefault: true,
      },
    ],
    profession: "",
    activity: "",
    notes: "",
    tags: [],
    creditLimit: 0,
    paymentTerms: 30,
    discount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [vatLoading, setVatLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wrappSettings, setWrappSettings] = useState<any>({});

  // Load WRAPP settings
  useEffect(() => {
    const loadWrappSettings = async () => {
      try {
        const wrappDoc = await getDocs(collection(db, "config"));
        const wrappData = wrappDoc.docs
          .find((doc) => doc.id === "wrapp")
          ?.data();
        if (wrappData) {
          setWrappSettings(wrappData);
        }
      } catch (error) {
        console.error("Error loading WRAPP settings:", error);
      }
    };
    loadWrappSettings();
  }, []);

  // Load customer data for edit mode or reset form
  useEffect(() => {
    if (isOpen && mode === "edit" && customer) {
      setFormData({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        companyName: customer.companyName || "",
        vatNumber: customer.vatNumber || "",
        taxOffice: customer.taxOffice || "",
        vatExempt: customer.vatExempt || false,
        email: customer.email || "",
        phone: customer.phone || "",
        mobile: customer.mobile || "",
        addresses: customer.addresses || [],
        profession: customer.profession || "",
        activity: customer.activity || "",
        notes: customer.notes || "",
        tags: customer.tags || [],
        creditLimit: customer.creditLimit || 0,
        paymentTerms: customer.paymentTerms || 30,
        discount: customer.discount || 0,
      });
    } else if (!isOpen) {
      setFormData({
        firstName: "",
        lastName: "",
        companyName: "",
        vatNumber: "",
        taxOffice: "",
        vatExempt: false,
        email: "",
        phone: "",
        mobile: "",
        addresses: [],
        profession: "",
        activity: "",
        notes: "",
        tags: [],
        creditLimit: 0,
        paymentTerms: 30,
        discount: 0,
      });
      setError("");
      setSuccess("");
    }
  }, [isOpen, mode, customer]);

  // VAT Number lookup
  const handleVatLookup = async () => {
    if (!formData.vatNumber || formData.vatNumber.length < 9) {
      setError("Εισάγετε έγκυρο ΑΦΜ (9 ψηφία)");
      return;
    }

    setVatLoading(true);
    setError("");

    try {
      // Check if WRAPP credentials are available
      if (!wrappSettings.email || !wrappSettings.apiKey) {
        setError(
          "Παρακαλώ ρυθμίστε πρώτα τα διαπιστευτήρια WRAPP στις ρυθμίσεις"
        );
        setVatLoading(false);
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

      // Update customer info with found data
      if (vatData && vatData.name) {
        // Combine address and street_number for complete address
        const fullAddress =
          vatData.address && vatData.street_number
            ? `${vatData.address} ${vatData.street_number}`
            : vatData.address;

        // Create address from VAT data
        const newAddress = {
          id: Date.now().toString(),
          label: "Κύρια Διεύθυνση",
          street: fullAddress || "",
          city: vatData.city || "",
          postalCode: vatData.postal_code || "",
          country: "Ελλάδα",
          floor: "",
          doorbell: "",
          notes: "",
          isDefault: true,
        };

        setFormData((prev) => ({
          ...prev,
          companyName: vatData.name || prev.companyName,
          firstName: vatData.name?.split(" ")[0] || prev.firstName,
          lastName:
            vatData.name?.split(" ").slice(1).join(" ") || prev.lastName,
          taxOffice: vatData.doy || prev.taxOffice,
          profession: vatData.profession || prev.profession,
          activity: vatData.activity || prev.activity,
          addresses:
            fullAddress || vatData.city ? [newAddress] : prev.addresses,
        }));

        setSuccess("Στοιχεία συμπληρώθηκαν από AADE");
      } else {
        setError("Δεν βρέθηκαν στοιχεία για αυτό το ΑΦΜ");
      }
    } catch (error: any) {
      console.error("VAT search error:", error);
      setError(error.message || "Σφάλμα κατά την αναζήτηση στοιχείων");
    } finally {
      setVatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName) {
      setError("Τα πεδία Όνομα και Επώνυμο είναι υποχρεωτικά");
      return;
    }

    if (!formData.vatNumber) {
      setError("Το ΑΦΜ είναι υποχρεωτικό");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "edit" && customer) {
        // Update existing customer
        const customerData = {
          ...formData,
          addresses: formData.addresses || [],
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(db, "customers", customer.id), customerData);

        const updatedCustomer: Customer = {
          ...customer,
          ...formData,
          addresses: formData.addresses || [],
          updatedAt: new Date(),
        };

        onCustomerUpdated?.(updatedCustomer);
        setSuccess("Ο πελάτης ενημερώθηκε επιτυχώς!");
      } else {
        // Create new customer
        const customerData = {
          ...formData,
          addresses: formData.addresses || [],
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "customers"), customerData);

        const newCustomer: Customer = {
          id: docRef.id,
          ...formData,
          addresses: formData.addresses || [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        onCustomerCreated?.(newCustomer);
        setSuccess("Ο πελάτης δημιουργήθηκε επιτυχώς!");
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error creating customer:", error);
      setError("Σφάλμα κατά τη δημιουργία του πελάτη");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FaUser className="mr-2 text-teal-600" />
            {mode === "edit" ? "Επεξεργασία Πελάτη" : "Νέος Πελάτης"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Βασικά Στοιχεία */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <FaUser className="mr-2 text-teal-600" />
                Βασικά Στοιχεία
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Όνομα *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Επώνυμο *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Επωνυμία Εταιρείας
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* ΑΦΜ με lookup */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ΑΦΜ *
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vatNumber: e.target.value,
                      }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="123456789"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVatLookup}
                    disabled={vatLoading || !formData.vatNumber}
                    className="px-4 py-2 bg-teal-600 text-white rounded-r-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {vatLoading ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSearch />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ΔΟΥ
                </label>
                <input
                  type="text"
                  value={formData.taxOffice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taxOffice: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vatExempt"
                  checked={formData.vatExempt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vatExempt: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="vatExempt"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Απαλλαγή ΦΠΑ
                </label>
              </div>
            </div>

            {/* Στοιχεία Επικοινωνίας */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <FaPhone className="mr-2 text-teal-600" />
                Επικοινωνία
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Τηλέφωνο
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Κινητό
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mobile: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Διεύθυνση */}
              <h4 className="text-md font-medium text-gray-700 flex items-center mt-6">
                <FaMapMarkerAlt className="mr-2 text-teal-600" />
                Διεύθυνση
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Οδός
                </label>
                <input
                  type="text"
                  value={formData.addresses?.[0]?.street || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      addresses: (prev.addresses || []).map((addr, index) =>
                        index === 0 ? { ...addr, street: e.target.value } : addr
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Πόλη
                  </label>
                  <input
                    type="text"
                    value={formData.addresses?.[0]?.city || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        addresses: (prev.addresses || []).map((addr, index) =>
                          index === 0 ? { ...addr, city: e.target.value } : addr
                        ),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Τ.Κ.
                  </label>
                  <input
                    type="text"
                    value={formData.addresses?.[0]?.postalCode || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        addresses: (prev.addresses || []).map((addr, index) =>
                          index === 0
                            ? { ...addr, postalCode: e.target.value }
                            : addr
                        ),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Χώρα
                </label>
                <input
                  type="text"
                  value={formData.addresses?.[0]?.country || "Ελλάδα"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      addresses: (prev.addresses || []).map((addr, index) =>
                        index === 0
                          ? { ...addr, country: e.target.value }
                          : addr
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Επαγγελματικά Στοιχεία */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-700 flex items-center mb-4">
                <FaBuilding className="mr-2 text-teal-600" />
                Επαγγελματικά Στοιχεία
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Επάγγελμα
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        profession: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Δραστηριότητα
                  </label>
                  <input
                    type="text"
                    value={formData.activity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        activity: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4">
                Εμπορικοί Όροι
              </h4>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Πιστωτικό Όριο (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.creditLimit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          creditLimit: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ημέρες Πληρωμής
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.paymentTerms}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentTerms: parseInt(e.target.value) || 30,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Έκπτωση (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Σημειώσεις */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Σημειώσεις
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Πρόσθετες πληροφορίες για τον πελάτη..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaSave className="mr-2" />
              )}
              {loading ? "Αποθήκευση..." : "Αποθήκευση"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
