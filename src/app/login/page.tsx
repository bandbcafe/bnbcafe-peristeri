"use client";

import { useState, useEffect } from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaSpinner,
  FaGoogle,
} from "react-icons/fa";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { saveUserSession, getCurrentUser } from "@/utils/auth";

interface LoginFormData {
  email: string;
  password: string;
}

export default function CustomerLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const isLoadingSettings = !isLoaded;
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Check for existing session and load settings on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setSuccess("Έχετε ήδη συνδεθεί!");
        window.dispatchEvent(new Event("authChanged"));
        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    };

    checkExistingSession();
  }, [router]);

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
    }

    return true;
  };

  const handleGoogleSignIn = async () => {
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
      } else {
        // User exists, use existing data
        const userDoc = querySnapshot.docs[0];
        userId = userDoc.id;
        userData = userDoc.data();
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

      saveUserSession(userSession, rememberMe);

      setSuccess("Επιτυχής σύνδεση με Google!");

      // Dispatch auth change event
      window.dispatchEvent(new Event("authChanged"));

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setError("Η σύνδεση ακυρώθηκε");
      } else {
        setError("Σφάλμα κατά τη σύνδεση με Google");
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
      // Query customers collection to find user by email
      const customersRef = collection(db, "customers");
      const q = query(customersRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Δεν βρέθηκε χρήστης με αυτό το email");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Simple password check (in production, use proper password hashing)
      if (userData.passwordHash !== formData.password) {
        setError("Λάθος κωδικός");
        return;
      }

      // Store user session using utility function
      const userSession = {
        id: userDoc.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone || "",
        vatNumber: userData.vatNumber || "",
      };

      saveUserSession(userSession, rememberMe);

      setSuccess("Επιτυχής σύνδεση!");

      // Dispatch auth change event
      window.dispatchEvent(new Event("authChanged"));

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      setError("Σφάλμα κατά τη σύνδεση");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-3 mb-4"
          >
            {isLoadingSettings ? (
              // Loading Skeleton
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ) : websiteSettings?.heroSection?.logo ? (
              // Custom Logo
              <div className="h-28 flex items-center">
                <img
                  src={websiteSettings.heroSection.logo}
                  alt="Business Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            ) : (
              // Default Logo
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-[#8B7355] to-[#A0826D] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">
                    {(websiteSettings?.heroSection?.title || "").substring(
                      0,
                      3,
                    ) || "☕"}
                  </span>
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-gray-800">
                    {websiteSettings?.heroSection?.title || ""}
                  </h1>
                  {websiteSettings?.heroSection?.subtitle && (
                    <p className="text-sm text-gray-600 truncate max-w-[200px]">
                      {websiteSettings.heroSection.subtitle}
                    </p>
                  )}
                </div>
              </>
            )}
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Καλώς ήρθατε πίσω!
          </h2>
          <p className="text-gray-600">
            Συνδεθείτε στον λογαριασμό σας για να συνεχίσετε
          </p>
        </div>

        {/* Login Card */}
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
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-[#C9AC7A] transition-all duration-200"
                  placeholder="Εισάγετε τον κωδικό σας"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#8B7355] focus:ring-[#8B7355] border-gray-300 rounded transition-colors"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Να με θυμάσαι
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-[#8B7355] hover:text-[#A0826D] font-medium transition-colors"
                onClick={() => {
                  // TODO: Implement forgot password functionality
                  alert(
                    "Η λειτουργία 'Ξεχάσατε τον κωδικό σας' θα υλοποιηθεί σύντομα!",
                  );
                }}
              >
                Ξεχάσατε τον κωδικό σας;
              </button>
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
                  Σύνδεση...
                </>
              ) : (
                "Σύνδεση"
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
                  Ή συνδεθείτε με
                </span>
              </div>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-6 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B7355] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
          >
            <FaGoogle className="mr-2 h-5 w-5 text-red-500" />
            Σύνδεση με Google
          </button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Δεν έχετε λογαριασμό;{" "}
              <Link
                href="/register"
                className="font-medium text-[#8B7355] hover:text-[#A0826D] transition-colors"
              >
                Εγγραφείτε εδώ
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-8 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Γιατί να συνδεθείτε;
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#8B7355] rounded-full"></div>
                <span>Γρήγορη παραγγελία</span>
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
                <span>Αποθηκευμένα στοιχεία</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
