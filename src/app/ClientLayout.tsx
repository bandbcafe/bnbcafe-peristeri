"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  WebsiteSettingsProvider,
  useWebsiteSettings,
} from "@/contexts/WebsiteSettingsContext";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import OrderTrackingIcon from "@/components/OrderTrackingIcon";
import CookieConsent from "@/components/customer/CookieConsent";
import CookieSettingsButton from "@/components/customer/CookieSettingsButton";
import MaintenanceChecker from "@/components/MaintenanceChecker";
import StoreClosedPopup from "@/components/StoreClosedPopup";
import SEOMetadata from "@/components/SEOMetadata";
import StructuredData from "@/components/StructuredData";
import Script from "next/script";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMaintenancePage = pathname === "/maintenance";
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const gaId = websiteSettings?.googleAnalyticsId || null;

  // Maintenance page doesn't get customer layout
  if (isMaintenancePage) {
    return <>{children}</>;
  }

  // Show loading screen until settings are loaded from the database
  // This prevents flash of hardcoded default content (e.g. wrong city/address)
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-[#8B7355] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Customer routes get header/footer, Google Analytics, and SEO
  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
      <SEOMetadata />
      <StructuredData />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <CustomerHeader />
        <main className="flex-grow">{children}</main>
        <CustomerFooter />
        <OrderTrackingIcon />
        <CookieConsent />
        <CookieSettingsButton />
        <StoreClosedPopup />
      </div>
    </>
  );
}

function DynamicFavicon() {
  const { websiteSettings } = useWebsiteSettings();

  const hasCustomFavicon = !!websiteSettings?.favicon;
  const faviconUrl = hasCustomFavicon ? "/api/favicon" : "/favicon.ico";
  const businessName = websiteSettings?.heroSection?.title || "";

  return (
    <>
      {/* Favicon - all sizes from dynamic API */}
      <link rel="shortcut icon" href={faviconUrl} />
      <link rel="icon" href={faviconUrl} />
      {hasCustomFavicon && (
        <>
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/api/favicon?size=32"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="192x192"
            href="/api/favicon?size=192"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="512x512"
            href="/api/favicon?size=512"
          />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/api/favicon?size=180"
          />
        </>
      )}

      {/* PWA - dynamic manifest from API */}
      <link rel="manifest" href="/api/manifest" />
      <meta name="theme-color" content="#C9AC7A" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      {businessName && (
        <meta name="apple-mobile-web-app-title" content={businessName} />
      )}
      <meta name="mobile-web-app-capable" content="yes" />
      {businessName && <meta name="application-name" content={businessName} />}
      <meta name="msapplication-TileColor" content="#C9AC7A" />
    </>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <WebsiteSettingsProvider>
        <DynamicFavicon />
        <MaintenanceChecker />
        <LayoutContent>{children}</LayoutContent>
      </WebsiteSettingsProvider>
    </AuthProvider>
  );
}
