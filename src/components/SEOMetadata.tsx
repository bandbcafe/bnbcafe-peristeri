"use client";

import { usePathname } from "next/navigation";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

export default function SEOMetadata() {
  const pathname = usePathname();
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute || !isLoaded || !websiteSettings) return null;

  const seo = websiteSettings.seoSettings;
  const businessName = websiteSettings.heroSection?.title || "";
  const description = websiteSettings.heroSection?.subtitle || "";
  const city = websiteSettings.contactInfo?.address?.city || "";
  const street = websiteSettings.contactInfo?.address?.street || "";
  const phone = websiteSettings.contactInfo?.phone || "";
  const email = websiteSettings.contactInfo?.email || "";

  // Use custom keywords from Ordio SEO settings, fallback to auto-generated
  const keywords = seo?.keywords
    ? seo.keywords
        .split(",")
        .map((k: string) => k.trim())
        .filter(Boolean)
    : generateKeywords(businessName, city);

  // Use per-page custom titles from Ordio, fallback to auto-generated
  const pageTitle = getPageTitle(
    pathname,
    businessName,
    city,
    seo?.pageTitles,
    seo?.siteTitle,
  );
  const pageDescription = getPageDescription(
    pathname,
    businessName,
    city,
    seo?.metaDescription || description,
    seo?.pageDescriptions,
  );
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}${pathname}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const ogImage = seo?.ogImageUrl || (siteUrl ? `${siteUrl}/og-image.png` : "");
  const fullAddress = [street, city].filter(Boolean).join(", ");

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={keywords.join(", ")} />
      <meta name="author" content={businessName} />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:site_name" content={businessName} />
      <meta property="og:locale" content="el_GR" />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Geo Tags */}
      <meta name="geo.region" content="GR" />
      {fullAddress && <meta name="geo.placename" content={fullAddress} />}

      {/* Business Contact */}
      {email && <meta name="contact" content={email} />}
      {phone && <meta name="phone" content={phone} />}

      {/* Language */}
      <meta httpEquiv="content-language" content="el" />
    </>
  );
}

function generateKeywords(businessName: string, city: string): string[] {
  if (!city && !businessName) return [];

  const keywords = [
    // Location-based
    ...(city
      ? [
          `καφετέρια ${city}`,
          `καφές ${city}`,
          `εστιατόριο ${city}`,
          `delivery ${city}`,
          `online παραγγελία ${city}`,
          `κρατήσεις τραπεζιού ${city}`,
        ]
      : []),
    // General
    "online παραγγελία",
    "delivery",
    "παράδοση κατ' οίκον",
    "κρατήσεις τραπεζιού",
    // Brand
    ...(businessName ? [businessName] : []),
    ...(businessName && city ? [`${businessName} ${city}`] : []),
  ];

  return keywords.filter(Boolean);
}

function getPageTitle(
  pathname: string | null,
  businessName: string,
  city: string,
  pageTitles?: {
    home?: string;
    menu?: string;
    reservations?: string;
    contact?: string;
  },
  siteTitle?: string,
): string {
  // Check for per-page custom title from Ordio
  if (pageTitles) {
    const pageKey = getPageKey(pathname);
    if (pageKey && pageTitles[pageKey as keyof typeof pageTitles]) {
      return pageTitles[pageKey as keyof typeof pageTitles]!;
    }
  }

  const location = city ? ` ${city}` : "";
  const base =
    siteTitle ||
    (businessName ? `${businessName}${location}` : "Online Κατάστημα");

  if (!pathname || pathname === "/")
    return siteTitle || `${base} | Παραγγείλτε Online`;

  const titles: { [key: string]: string } = {
    "/menu": `Μενού - ${base}`,
    "/reservations": `Κρατήσεις Τραπεζιού - ${base}`,
    "/contact": `Επικοινωνία - ${base}`,
    "/checkout": `Ολοκλήρωση Παραγγελίας - ${businessName || ""}`,
    "/order": `Online Παραγγελία - ${base}`,
    "/orders": `Οι Παραγγελίες μου - ${businessName || ""}`,
  };

  return titles[pathname] || base;
}

function getPageKey(pathname: string | null): string | null {
  if (!pathname || pathname === "/") return "home";
  const map: { [key: string]: string } = {
    "/menu": "menu",
    "/reservations": "reservations",
    "/contact": "contact",
  };
  return map[pathname] || null;
}

function getPageDescription(
  pathname: string | null,
  businessName: string,
  city: string,
  defaultDescription: string,
  pageDescriptions?: {
    home?: string;
    menu?: string;
    reservations?: string;
    contact?: string;
  },
): string {
  // Check for per-page custom description from Ordio
  if (pageDescriptions) {
    const pageKey = getPageKey(pathname);
    if (pageKey && pageDescriptions[pageKey as keyof typeof pageDescriptions]) {
      return pageDescriptions[pageKey as keyof typeof pageDescriptions]!;
    }
  }

  if (!businessName) return defaultDescription;

  const location = city ? ` στην περιοχή ${city}` : "";

  const descriptions: { [key: string]: string } = {
    "/": `${businessName}${location}. ${defaultDescription}. Παραγγείλτε online ή κλείστε τραπέζι.`,
    "/menu": `Δείτε το πλήρες μενού του ${businessName}${location}. Παραγγείλτε online με delivery.`,
    "/reservations": `Κλείστε τραπέζι online στο ${businessName}${location}. Εγγυημένο τραπέζι, επιλέξτε την ώρα σας.`,
    "/contact": `Επικοινωνήστε με το ${businessName}${location}. Στοιχεία επικοινωνίας, διεύθυνση και ωράριο.`,
    "/checkout": `Ολοκληρώστε την online παραγγελία σας από το ${businessName}.`,
    "/order": `Παραγγείλτε online από το ${businessName}${location}. Delivery στην πόρτα σας.`,
    "/orders": `Δείτε τις παραγγελίες σας από το ${businessName} και παρακολουθήστε σε πραγματικό χρόνο.`,
  };

  return descriptions[pathname || ""] || defaultDescription;
}
