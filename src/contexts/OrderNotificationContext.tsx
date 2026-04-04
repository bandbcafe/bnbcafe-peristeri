"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

interface OrderNotificationContextType {
  newOrdersCount: number;
  clearNotifications: () => void;
  hasNewOrders: boolean;
}

const OrderNotificationContext = createContext<OrderNotificationContextType>({
  newOrdersCount: 0,
  clearNotifications: () => {},
  hasNewOrders: false,
});

export const useOrderNotifications = () => useContext(OrderNotificationContext);

export const OrderNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [lastViewedTime, setLastViewedTime] = useState<Date>(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/ring.mp3");
    audioRef.current.loop = true; // Loop continuously until stopped
  }, []);

  // Play notification sound function (loops continuously)
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error("Error playing notification sound:", error);
      });
    }
  }, []);

  // Stop notification sound function
  const stopNotificationSound = useCallback(() => {
    console.log("🔇 stopNotificationSound called");
    if (audioRef.current) {
      console.log("🔇 Audio ref exists, stopping sound");
      console.log("🔇 Audio paused state:", audioRef.current.paused);
      console.log("🔇 Audio current time:", audioRef.current.currentTime);

      // Force stop the audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;

      console.log("🔇 After stop - paused:", audioRef.current.paused);
    } else {
      console.log("⚠️ Audio ref is null!");
    }
  }, []);

  // Listen for new orders in real-time
  useEffect(() => {
    // Simple query without where clause to avoid composite index
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      // Filter in memory for active orders created after last viewed time
      const newOrders = snapshot.docs.filter((doc) => {
        const orderData = doc.data();
        const createdAt = orderData.createdAt?.toDate();
        const status = orderData.status;

        // Only count active orders (not completed/cancelled)
        const isActiveOrder = [
          "pending",
          "accepted",
          "preparing",
          "ready",
          "delivering",
        ].includes(status);

        return createdAt && createdAt > lastViewedTime && isActiveOrder;
      });

      const currentCount = newOrders.length;

      // Play sound only if count increased (new order arrived)
      // Skip on initial load to avoid playing sound for existing orders
      if (
        previousOrderCountRef.current !== null &&
        !isInitialLoadRef.current &&
        currentCount > previousOrderCountRef.current
      ) {
        playNotificationSound();
      }

      // Mark initial load as complete
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }

      previousOrderCountRef.current = currentCount;
      setNewOrdersCount(currentCount);
    });

    return () => unsubscribe();
  }, [lastViewedTime, playNotificationSound]);

  const clearNotifications = useCallback(() => {
    setLastViewedTime(new Date());
    setNewOrdersCount(0);
    previousOrderCountRef.current = 0;
    stopNotificationSound(); // Stop the looping sound
  }, [stopNotificationSound]);

  return (
    <OrderNotificationContext.Provider
      value={{
        newOrdersCount,
        clearNotifications,
        hasNewOrders: newOrdersCount > 0,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
};
