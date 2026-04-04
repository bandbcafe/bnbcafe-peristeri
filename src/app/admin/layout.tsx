"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import LoginPage from "@/components/LoginPage";
import { useAuth } from "@/contexts/AuthContext";
import { OrderNotificationProvider } from "@/contexts/OrderNotificationContext";
import CallerIdWidget from "@/components/pos/CallerIdWidget";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hideSidebar, setHideSidebar] = useState(false);

  // Check if we're on the POS page
  const isPOSPage = pathname === "/admin/pos";

  // Load sidebar preference from Firestore only for POS page
  useEffect(() => {
    const loadSidebarPreference = async () => {
      if (!user?.id || !isPOSPage) {
        // Reset sidebar when not on POS page
        if (!isPOSPage) {
          setHideSidebar(false);
        }
        return;
      }

      try {
        const userDoc = await getDoc(
          doc(db, "users", user.id, "settings", "pos")
        );
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (typeof data.hideSidebar === "boolean") {
            setHideSidebar(data.hideSidebar);
          }
        }
      } catch (error) {
        console.error("Error loading sidebar preference:", error);
      }
    };

    loadSidebarPreference();
  }, [user?.id, isPOSPage]);

  // Listen for sidebar toggle events from POS page
  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      // Only allow sidebar toggle on POS page
      if (isPOSPage) {
        setHideSidebar(event.detail.hideSidebar);
      }
    };

    window.addEventListener(
      "sidebarToggle",
      handleSidebarToggle as EventListener
    );

    return () => {
      window.removeEventListener(
        "sidebarToggle",
        handleSidebarToggle as EventListener
      );
    };
  }, [isPOSPage]);

  // Old Electron audio - now handled by OrderNotificationContext
  // useEffect(() => {
  //   const audio = new Audio("/sounds/ring.mp3");
  //   audio.loop = true;

  //   if (typeof window !== "undefined" && window.api) {
  //     window.api.onPlaySound(() => {
  //       audio
  //         .play()
  //         .catch((error) => console.error("Failed to play sound:", error));
  //     });

  //     window.api.onStopSound(() => {
  //       audio.pause();
  //       audio.currentTime = 0;
  //     });

  //     window.api.onGoToOrders(() => {
  //       router.push("/orders");
  //     });
  //   }
  // }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={(userData) => {
          // Login handled by AuthContext
        }}
      />
    );
  }

  return (
    <OrderNotificationProvider>
      <div className="flex flex-col h-screen relative">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          {!hideSidebar && <Sidebar className="flex-shrink-0" />}
          <main className="flex-grow bg-gray-100 relative overflow-y-auto">
            {children}
          </main>
        </div>

        {/* CallerID Widget - Active across entire admin panel */}
        <CallerIdWidget />
      </div>
    </OrderNotificationProvider>
  );
}
