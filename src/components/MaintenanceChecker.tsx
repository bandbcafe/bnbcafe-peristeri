"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function MaintenanceChecker() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Don't check on maintenance page or admin pages
    if (
      pathname === "/maintenance" ||
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/api")
    ) {
      return;
    }

    const checkMaintenanceStatus = async () => {
      try {
        const response = await fetch("/api/maintenance/status");
        const data = await response.json();

        if (data.enabled) {
          router.push("/maintenance");
        }
      } catch (error) {
        console.error("Error checking maintenance status:", error);
      }
    };

    checkMaintenanceStatus();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);

    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}
