"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaGoogle,
} from "react-icons/fa";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Customer } from "@/types/customer";
import { saveUserSession } from "@/utils/auth";

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError("Το όνομα είναι υποχρεωτικό");
      return false;
    }

    if (!formData.lastName.trim()) {
      setError("Το επώνυμο είναι υποχρεωτικό");
      return false;
    }

    if (!formData.email.trim()) {
      setError("Το email είναι υποχρεωτικό");
      return false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Μη έγκυρο email");
      return false;
    }

    if (!formData.password) {
      setError("Ο κωδικός είναι υποχρεωτικός");
      return false;
    } else if (formData.password.length < 6) {
      setError("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Οι κωδικοί δεν ταιριάζουν");
      return false;
    }

    return true;
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in customers collection
      const customersRef = collection(db, "customers");
      const q = query(customersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      let userId: string;
      let userData: any;

      if (querySnapshot.empty) {
        // Create new customer with Google account info
        const nameParts = user.displayName?.split(" ") || ["", ""];
        const customerData = {
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          mobile: "",
          vatNumber: "",
          companyName: "",
          taxOffice: "",
          vatExempt: false,
          profession: "",
          activity: "",
          notes: "Εγγραφή μέσω Google",
          tags: [],
          creditLimit: 0,
          paymentTerms: 30,
          discount: 0,
          isActive: true,
          googleUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(customersRef, customerData);
        userId = docRef.id;
        userData = customerData;

        setSuccess("Ο λογαριασμός δημιουργήθηκε με επιτυχία!");
      } else {
        // User already exists, just log them in
        const userDoc = querySnapshot.docs[0];
        userId = userDoc.id;
        userData = userDoc.data();

        setSuccess("Επιτυχής σύνδεση!");
      }

      // Store user session
      const userSession = {
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email || "",
        phone: userData.phone || "",
        vatNumber: userData.vatNumber || "",
      };

      saveUserSession(userSession, false);

      // Dispatch auth change event
      window.dispatchEvent(new Event("authChanged"));

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error: any) {
      console.error("Google sign-up error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setError("Η εγγραφή ακυρώθηκε");
      } else {
        setError("Σφάλμα κατά την εγγραφή με Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create customer with basic info - other details can be filled later in profile
      const customerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        // Store password hash (in real app you'd hash this properly)
        passwordHash: formData.password, // TODO: Implement proper password hashing
        vatNumber: "", // Empty initially - can be filled in profile
        phone: "",
        mobile: "",
        companyName: "",
        taxOffice: "",
        vatExempt: false,
        profession: "",
        activity: "",
        notes: "",
        tags: [],
        creditLimit: 0,
        paymentTerms: 30,
        discount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "customers"), customerData);

      const newCustomer: Customer = {
        id: docRef.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        vatNumber: "",
        phone: "",
        mobile: "",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store user session (automatically logged in after registration)
      const userSession = {
        id: docRef.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: "",
        vatNumber: "",
      };

      // Store in sessionStorage (will be cleared when browser closes)
      saveUserSession(userSession, false);

      setSuccess("Ο λογαριασμός δημιουργήθηκε επιτυχώς!");

      // Dispatch auth change event
      window.dispatchEvent(new Event("authChanged"));

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Error creating customer:", error);
      setError("Σφάλμα κατά τη δημιουργία του λογαριασμού");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">☕</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Δημιουργία Λογαριασμού
          </h2>
          <p className="text-gray-600">
            Εγγραφείτε για να απολαύσετε όλα τα πλεονεκτήματα
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Όνομα
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-[#C9AC7A] transition-all duration-200"
                    placeholder="Το όνομά σας"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Επώνυμο
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-[#C9AC7A] transition-all duration-200"
                    placeholder="Το επώνυμό σας"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-[#C9AC7A] transition-all duration-200"
                  placeholder="Εισάγετε το email σας"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Κωδικός Πρόσβασης
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-[#C9AC7A] transition-all duration-200"
                  placeholder="Τουλάχιστον 6 χαρακτήρες"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Επιβεβαίωση Κωδικού
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-[#C9AC7A] transition-all duration-200"
                  placeholder="Επαναλάβετε τον κωδικό"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#8B7355] to-[#A0826D] hover:from-[#A0826D] hover:to-[#8B7355] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B7355] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                  Δημιουργία...
                </>
              ) : (
                "Δημιουργία Λογαριασμού"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Ή εγγραφείτε με
                </span>
              </div>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="mt-6 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B7355] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
          >
            <FaGoogle className="mr-2 h-5 w-5 text-red-500" />
            Εγγραφή με Google
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Έχετε ήδη λογαριασμό;{" "}
              <Link
                href="/login"
                className="font-medium text-[#8B7355] hover:text-[#A0826D] transition-colors"
              >
                Συνδεθείτε εδώ
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-8 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Τι κερδίζετε με την εγγραφή;
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#8B7355] rounded-full"></div>
                <span>Γρήγορες παραγγελίες</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#8B7355] rounded-full"></div>
                <span>Ιστορικό παραγγελιών</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#8B7355] rounded-full"></div>
                <span>Ειδικές προσφορές</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#8B7355] rounded-full"></div>
                <span>Προσωπικό προφίλ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
