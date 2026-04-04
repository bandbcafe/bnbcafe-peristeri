"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth, getCurrentUser, type CustomerUser } from "@/utils/auth";
import { CustomerAddress } from "@/types/customer";
import {
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaArrowLeft,
  FaBuilding,
  FaPlus,
  FaTrash,
  FaHome,
  FaBriefcase,
} from "react-icons/fa";

interface User extends CustomerUser {
  companyName?: string;
  taxOffice?: string;
  vatExempt?: boolean;
  mobile?: string;
  addresses?: CustomerAddress[];
  profession?: string;
  activity?: string;
  notes?: string;
  tags?: string[];
  creditLimit?: number;
  paymentTerms?: number;
  discount?: number;
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    vatNumber: "",
    companyName: "",
    taxOffice: "",
    vatExempt: false,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    try {
      const currentUser = requireAuth(router);
      if (!currentUser) {
        return; // requireAuth already redirects to login
      }

      // Load full customer data from Firebase
      const customersRef = collection(db, "customers");
      const q = query(customersRef, where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        const customerData = {
          id: customerDoc.id,
          ...customerDoc.data(),
        } as User;

        // Ensure addresses array exists
        if (!customerData.addresses) {
          customerData.addresses = [];
        }

        setUser(customerData);
        setFormData(customerData);
      } else {
        // Use basic user data if no customer record found
        const basicUser = {
          ...currentUser,
          companyName: "",
          taxOffice: "",
          vatExempt: false,
          mobile: "",
          addresses: [],
          profession: "",
          activity: "",
          notes: "",
          tags: [],
          creditLimit: 0,
          paymentTerms: 30,
          discount: 0,
        } as User;

        setUser(basicUser);
        setFormData(basicUser);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      router.push("/login");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const addAddress = () => {
    const newAddress: CustomerAddress = {
      id: Date.now().toString(),
      label: "Νέα Διεύθυνση",
      street: "",
      city: "",
      postalCode: "",
      country: "Ελλάδα",
      floor: "",
      doorbell: "",
      notes: "",
      isDefault: formData.addresses?.length === 0,
    };

    setFormData((prev) => ({
      ...prev,
      addresses: [...(prev.addresses || []), newAddress],
    }));
  };

  const removeAddress = (addressId: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses?.filter((addr) => addr.id !== addressId) || [],
    }));
  };

  const updateAddress = (
    addressId: string,
    field: keyof CustomerAddress,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      addresses:
        prev.addresses?.map((addr) =>
          addr.id === addressId ? { ...addr, [field]: value } : addr
        ) || [],
    }));
  };

  const setDefaultAddress = (addressId: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses:
        prev.addresses?.map((addr) => ({
          ...addr,
          isDefault: addr.id === addressId,
        })) || [],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Το όνομα είναι υποχρεωτικό";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Το επώνυμο είναι υποχρεωτικό";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Το email είναι υποχρεωτικό";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Μη έγκυρο email";
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = "Το τηλέφωνο είναι υποχρεωτικό";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Update Firebase document
      if (user?.id) {
        const customerDocRef = doc(db, "customers", user.id);
        const updateData = {
          ...formData,
          updatedAt: new Date(),
        };

        await updateDoc(customerDocRef, updateData);
      }

      // Update localStorage for session
      const sessionData = {
        id: formData.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        vatNumber: formData.vatNumber,
      };

      // Check if user has persistent session
      const rememberMeFlag = localStorage.getItem("customerRememberMe");
      if (rememberMeFlag === "true") {
        localStorage.setItem("customerUser", JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem("customerUser", JSON.stringify(sessionData));
      }

      // Update state
      setUser(formData);
      setIsEditing(false);

      // Dispatch auth change event
      window.dispatchEvent(new Event("authChanged"));

      // Show success message
      setErrors({ general: "" });
      alert("Το προφίλ ενημερώθηκε επιτυχώς!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrors({ general: "Σφάλμα κατά την ενημέρωση του προφίλ" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(
      user || {
        id: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        vatNumber: "",
        companyName: "",
        taxOffice: "",
        vatExempt: false,
        mobile: "",
        addresses: [],
        profession: "",
        activity: "",
        notes: "",
        tags: [],
        creditLimit: 0,
        paymentTerms: 30,
        discount: 0,
      }
    );
    setIsEditing(false);
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9AC7A] mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση προφίλ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-[#C9AC7A] hover:text-[#9F7D41]"
                >
                  <FaArrowLeft />
                  <span>Επιστροφή</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                  Το Προφίλ μου
                </h1>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-[#C9AC7A] text-white px-4 py-2 rounded-lg hover:bg-[#9F7D41] transition-colors"
                >
                  <FaEdit />
                  <span>Επεξεργασία</span>
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                {errors.general}
              </div>
            )}

            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaUser className="text-[#C9AC7A]" />
                  Προσωπικά Στοιχεία
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Όνομα
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                          errors.firstName
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Όνομα"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.firstName}
                      </p>
                    )}
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Επώνυμο
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                          errors.lastName ? "border-red-300" : "border-gray-300"
                        }`}
                        placeholder="Επώνυμο"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.lastName}
                      </p>
                    )}
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaBuilding className="text-[#C9AC7A]" />
                  Στοιχεία Εταιρείας
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ΑΦΜ
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="vatNumber"
                        value={formData.vatNumber || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                        placeholder="ΑΦΜ"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.vatNumber || "Δεν έχει οριστεί"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Επωνυμία Εταιρείας
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                        placeholder="Επωνυμία εταιρείας"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.companyName || "Δεν έχει οριστεί"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ΔΟΥ
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="taxOffice"
                        value={formData.taxOffice || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                        placeholder="Δημόσια Οικονομική Υπηρεσία"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.taxOffice || "Δεν έχει οριστεί"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Επάγγελμα
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="profession"
                        value={formData.profession || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                        placeholder="Επάγγελμα"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.profession || "Δεν έχει οριστεί"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaEnvelope className="text-[#C9AC7A]" />
                  Στοιχεία Επικοινωνίας
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                          errors.email ? "border-red-300" : "border-gray-300"
                        }`}
                        placeholder="Email"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.email}
                      </p>
                    )}
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Τηλέφωνο
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent ${
                          errors.phone ? "border-red-300" : "border-gray-300"
                        }`}
                        placeholder="Τηλέφωνο"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.phone || "Δεν έχει οριστεί"}
                      </p>
                    )}
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Κινητό
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9AC7A] focus:border-transparent"
                        placeholder="Κινητό τηλέφωνο"
                      />
                    ) : (
                      <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        {user?.mobile || "Δεν έχει οριστεί"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Addresses Information */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#C9AC7A]" />
                    Διευθύνσεις
                  </h2>
                  {isEditing && (
                    <button
                      onClick={addAddress}
                      className="flex items-center gap-2 text-[#C9AC7A] hover:text-[#9F7D41] text-sm font-medium"
                    >
                      <FaPlus />
                      Προσθήκη Διεύθυνσης
                    </button>
                  )}
                </div>

                {formData.addresses && formData.addresses.length > 0 ? (
                  <div className="space-y-4">
                    {formData.addresses.map((address) => (
                      <div
                        key={address.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {address.label === "Σπίτι" && (
                              <FaHome className="text-blue-500" />
                            )}
                            {address.label === "Γραφείο" && (
                              <FaBriefcase className="text-green-500" />
                            )}
                            {!["Σπίτι", "Γραφείο"].includes(address.label) && (
                              <FaMapMarkerAlt className="text-gray-500" />
                            )}
                            {isEditing ? (
                              <input
                                type="text"
                                value={address.label}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "label",
                                    e.target.value
                                  )
                                }
                                className="text-sm font-medium border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-[#C9AC7A] rounded px-1"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-900">
                                {address.label}
                              </span>
                            )}
                            {address.isDefault && (
                              <span className="text-xs bg-[#EBE4D8] text-[#8B6B38] px-2 py-1 rounded">
                                Προεπιλογή
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing &&
                              !address.isDefault &&
                              formData.addresses!.length > 1 && (
                                <button
                                  onClick={() => setDefaultAddress(address.id)}
                                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                  title="Ορισμός ως προεπιλογή"
                                >
                                  Ορισμός ως Προεπιλογή
                                </button>
                              )}
                            {isEditing && formData.addresses!.length > 1 && (
                              <button
                                onClick={() => removeAddress(address.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Διαγραφή διεύθυνσης"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Διεύθυνση
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={address.street}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "street",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                                placeholder="Οδός, αριθμός"
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                {address.street || "Δεν έχει οριστεί"}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Πόλη
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={address.city}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "city",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                                placeholder="Πόλη"
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                {address.city || "Δεν έχει οριστεί"}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Τ.Κ.
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={address.postalCode}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "postalCode",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                                placeholder="Τ.Κ."
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                {address.postalCode || "Δεν έχει οριστεί"}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Όροφος
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={address.floor || ""}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "floor",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                                placeholder="π.χ. 2ος"
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                {address.floor || "Δεν έχει οριστεί"}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Κουδούνι
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={address.doorbell || ""}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "doorbell",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                                placeholder="π.χ. Α2, Παπαδόπουλος"
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                {address.doorbell || "Δεν έχει οριστεί"}
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Σημειώσεις
                            </label>
                            {isEditing ? (
                              <textarea
                                value={address.notes || ""}
                                onChange={(e) =>
                                  updateAddress(
                                    address.id,
                                    "notes",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#C9AC7A]"
                                placeholder="Επιπλέον οδηγίες παράδοσης..."
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                {address.notes || "Δεν έχουν οριστεί"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaMapMarkerAlt className="mx-auto text-4xl mb-2" />
                    <p>Δεν έχετε προσθέσει καμία διεύθυνση ακόμα</p>
                    {isEditing && (
                      <button
                        onClick={addAddress}
                        className="mt-2 text-[#C9AC7A] hover:text-[#9F7D41] font-medium"
                      >
                        Προσθέστε την πρώτη σας διεύθυνση
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FaTimes />
                    <span>Ακύρωση</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-[#C9AC7A] text-white px-4 py-2 rounded-lg hover:bg-[#9F7D41] transition-colors disabled:opacity-50"
                  >
                    <FaSave />
                    <span>{isSaving ? "Αποθήκευση..." : "Αποθήκευση"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
