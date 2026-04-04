"use client";

import { useState, useEffect, useCallback } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import logoWhite from "@/assets/images/logowhite.png";
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaSignInAlt,
  FaKeyboard,
  FaBackspace,
  FaCog,
} from "react-icons/fa";

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useAuth();
  const [loginMode, setLoginMode] = useState<"pin" | "email">("pin");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Load logo from Firestore
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const logoDoc = await getDoc(doc(db, "config", "logo"));
        if (logoDoc.exists()) {
          const logoData = logoDoc.data();
          setLogoUrl(logoData.logoBase64 || logoData.logoUrl || "");
        }
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    };

    loadLogo();
  }, []);

  // PIN Login
  const handlePinLogin = useCallback(
    async (pinToCheck?: string) => {
      const currentPin = pinToCheck || pin;

      if (currentPin.length !== 4) {
        setError("Το PIN πρέπει να είναι 4 ψηφία");
        return;
      }

      setLoading(true);
      setError("");

      try {
        // Search for user with this PIN (try both string and number)
        const usersQuery = query(
          collection(db, "users"),
          where("pin", "==", currentPin),
          where("isActive", "==", true)
        );

        let querySnapshot = await getDocs(usersQuery);

        // If no results, try with PIN as number
        if (querySnapshot.empty) {
          const usersQueryNumber = query(
            collection(db, "users"),
            where("pin", "==", parseInt(currentPin)),
            where("isActive", "==", true)
          );
          querySnapshot = await getDocs(usersQueryNumber);
        }

        if (querySnapshot.empty) {
          // Try without isActive filter to see if user exists but is inactive
          const allUsersQuery = query(
            collection(db, "users"),
            where("pin", "==", currentPin)
          );
          const allSnapshot = await getDocs(allUsersQuery);

          if (allSnapshot.size > 0) {
            setError(`Χρήστης βρέθηκε αλλά είναι ανενεργός`);
          } else {
            setError("Δεν βρέθηκε χρήστης με αυτό το PIN");
          }
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as any;

        // Use AuthContext login function
        login(userData);
        onLogin(userData);
      } catch (error) {
        setError("Σφάλμα σύνδεσης. Δοκιμάστε ξανά.");
      } finally {
        setLoading(false);
      }
    },
    [pin, login, onLogin]
  );

  // Keyboard support for PIN input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard input when in PIN mode and not loading
      if (loginMode !== "pin" || loading) return;

      const key = event.key;

      // Handle number keys (0-9)
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        addDigit(key);
      }
      // Handle Backspace
      else if (key === "Backspace") {
        event.preventDefault();
        removeDigit();
      }
      // Handle Delete or Escape to clear PIN
      else if (key === "Delete" || key === "Escape") {
        event.preventDefault();
        clearPin();
      }
      // Handle Enter to login (if PIN is complete)
      else if (key === "Enter" && pin.length === 4) {
        event.preventDefault();
        handlePinLogin();
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loginMode, loading, pin, handlePinLogin]);

  // Email/Password Login
  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("Παρακαλώ συμπληρώστε email και κωδικό");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Try to get user profile from Firestore first
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

      let userData: any;

      if (userDoc.exists()) {
        // User exists in Firestore collection
        userData = { id: userDoc.id, ...userDoc.data() };

        if (!userData.isActive) {
          setError("Ο λογαριασμός σας είναι ανενεργός");
          return;
        }
      } else {
        // User exists only in Firebase Authentication
        // Create and save user profile to Firestore as admin
        const displayName =
          userCredential.user.displayName ||
          userCredential.user.email?.split("@")[0] ||
          "Admin";
        const nameParts = displayName.split(" ");

        userData = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          firstName: nameParts[0] || "Admin",
          lastName: nameParts.slice(1).join(" ") || "",
          role: "admin", // Firebase Auth users get admin role
          isActive: true,
          createdAt: new Date(),
          authOnly: true, // Flag to indicate this is an auth-only user (cannot be deleted)
          canDelete: false, // Prevent deletion
        };

        // Save to Firestore for future logins
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), userData, {
            merge: true,
          });
          console.log(
            "✅ Firebase Auth user added to Firestore as admin:",
            userData.email
          );
        } catch (firestoreError) {
          console.error("Error saving auth user to Firestore:", firestoreError);
          // Continue with login even if Firestore save fails
        }
      }

      // Use AuthContext login function
      login(userData);
      onLogin(userData);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setError("Δεν βρέθηκε χρήστης με αυτό το email");
      } else if (error.code === "auth/wrong-password") {
        setError("Λάθος κωδικός");
      } else if (error.code === "auth/invalid-email") {
        setError("Μη έγκυρο email");
      } else {
        setError("Σφάλμα σύνδεσης. Δοκιμάστε ξανά.");
      }
    } finally {
      setLoading(false);
    }
  };

  // PIN Keypad
  const addDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-login when PIN is complete (4 digits)
      if (newPin.length === 4) {
        // Small delay for better UX - let user see the complete PIN
        setTimeout(() => {
          handlePinLogin(newPin);
        }, 300);
      }
    }
  };

  const removeDigit = () => {
    setPin(pin.slice(0, -1));
  };

  const clearPin = () => {
    setPin("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="w-28 h-28 mx-auto mb-4 rounded-full bg-white p-1"
            />
          ) : (
            <div className="w-24 h-24 mx-auto mb-4  flex items-center justify-center p-2">
              <Image
                src={logoWhite}
                alt="Logo"
                width={78}
                height={78}
                className="object-contain"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-2">Order System</h1>
          <p className="text-amber-100">Σύνδεση στο σύστημα παραγγελιών</p>
        </div>

        {/* Login Mode Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => {
              setLoginMode("pin");
              setError("");
              setPin("");
            }}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              loginMode === "pin"
                ? "bg-amber-50 text-amber-600 border-b-2 border-amber-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaKeyboard className="inline mr-2" />
            PIN
          </button>
          <button
            onClick={() => {
              setLoginMode("email");
              setError("");
              setEmail("");
              setPassword("");
            }}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              loginMode === "email"
                ? "bg-amber-50 text-amber-600 border-b-2 border-amber-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaEnvelope className="inline mr-2" />
            Email
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loginMode === "pin" ? (
            <div className="space-y-6">
              {/* PIN Display */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Εισάγετε το PIN σας
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Χρησιμοποιήστε το πληκτρολόγιο ή τα κουμπιά - η σύνδεση
                  γίνεται αυτόματα
                </p>
                <div className="flex justify-center space-x-3 mb-6">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold ${
                        pin.length > index
                          ? "border-amber-500 bg-amber-50 text-amber-600"
                          : "border-gray-200 bg-gray-50 text-gray-300"
                      }`}
                    >
                      {pin.length > index ? "●" : ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* PIN Keypad */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => addDigit(digit.toString())}
                    className="h-14 bg-gray-100 hover:bg-gray-200 rounded-lg text-xl font-semibold text-gray-700 transition-colors"
                    disabled={loading}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={clearPin}
                  className="h-14 bg-red-100 hover:bg-red-200 rounded-lg text-red-600 transition-colors flex items-center justify-center"
                  disabled={loading}
                >
                  C
                </button>
                <button
                  onClick={() => addDigit("0")}
                  className="h-14 bg-gray-100 hover:bg-gray-200 rounded-lg text-xl font-semibold text-gray-700 transition-colors"
                  disabled={loading}
                >
                  0
                </button>
                <button
                  onClick={removeDigit}
                  className="h-14 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors flex items-center justify-center"
                  disabled={loading}
                >
                  <FaBackspace />
                </button>
              </div>

              {/* PIN Login Button */}
              <button
                onClick={() => handlePinLogin()}
                disabled={loading || pin.length !== 4}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaSignInAlt className="mr-2" />
                    Σύνδεση
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Κωδικός
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Κωδικός"
                    disabled={loading}
                    onKeyPress={(e) => e.key === "Enter" && handleEmailLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Email Login Button */}
              <button
                onClick={handleEmailLogin}
                disabled={loading || !email || !password}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaSignInAlt className="mr-2" />
                    Σύνδεση
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-500">
          Order Management System
        </div>
      </div>
    </div>
  );
}
