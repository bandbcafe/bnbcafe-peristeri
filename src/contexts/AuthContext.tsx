"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  pin: string;
  isActive: boolean;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    // For PIN login, we don't have a Firebase user, so we set firebaseUser to null
    // but we still have the user data from Firestore
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
