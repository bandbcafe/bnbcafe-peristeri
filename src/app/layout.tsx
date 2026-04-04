import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import ClientLayout from "./ClientLayout";
import { getWebsiteSettings } from "@/lib/getWebsiteSettings";

const appSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin", "greek"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

const appMono = Noto_Sans_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Monaco",
    "Consolas",
    "monospace",
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWebsiteSettings();

  if (!settings) {
    return {
      title: "Online Κατάστημα",
      description: "Παραγγείλτε online",
    };
  }

  const seo = settings.seoSettings;
  const businessName = settings.heroSection?.title || "";
  const description =
    seo?.metaDescription || settings.heroSection?.subtitle || "";
  const city = settings.contactInfo?.address?.city || "";
  const street = settings.contactInfo?.address?.street || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const pageTitle = seo?.siteTitle
    ? seo.siteTitle
    : businessName && city
      ? `${businessName} ${city} | Παραγγείλτε Online`
      : businessName
        ? `${businessName} | Παραγγείλτε Online`
        : "Online Κατάστημα";

  const ogImage =
    seo?.ogImageUrl || (siteUrl ? `${siteUrl}/og-image.png` : "");

  const keywords = seo?.keywords
    ? seo.keywords
    : businessName && city
      ? `${businessName}, ${city}, delivery, online παραγγελία, κρατήσεις τραπεζιού`
      : "delivery, online παραγγελία";

  const fullAddress = [street, city].filter(Boolean).join(", ");

  // Build structured data for JSON-LD (server-side)
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": seo?.businessType || "Restaurant",
    "@id": `${siteUrl}/#restaurant`,
    name: businessName,
    description: seo?.metaDescription || description,
    url: siteUrl,
    telephone: settings.contactInfo?.phone || "",
    email: settings.contactInfo?.email || "",
    image: ogImage || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city,
      postalCode: settings.contactInfo?.address?.postalCode || "",
      addressCountry: "GR",
    },
    openingHoursSpecification: generateOpeningHours(
      settings.deliverySettings?.weeklyHours
    ),
    servesCuisine: seo?.servesCuisine?.length
      ? seo.servesCuisine
      : ["Mediterranean", "Greek", "Cafe"],
    priceRange: seo?.priceRange || "€€",
    acceptsReservations: true,
    hasMenu: `${siteUrl}/menu`,
    paymentAccepted: ["Cash", "Credit Card"],
    currenciesAccepted: "EUR",
    areaServed: city ? { "@type": "City", name: city } : undefined,
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: businessName,
    description,
    inLanguage: "el",
  };

  return {
    title: pageTitle,
    description,
    keywords,
    authors: businessName ? [{ name: businessName }] : undefined,
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    alternates: siteUrl ? { canonical: siteUrl } : undefined,
    openGraph: {
      type: "website",
      url: siteUrl || undefined,
      siteName: businessName || undefined,
      title: pageTitle,
      description,
      locale: "el_GR",
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: businessName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    other: {
      "geo.region": "GR",
      ...(fullAddress ? { "geo.placename": fullAddress } : {}),
      ...(city
        ? { "business:contact_data:locality": city }
        : {}),
      "business:contact_data:country_name": "Ελλάδα",
      "content-language": "el",
    },
  };
}

function generateOpeningHours(weeklyHours: any) {
  if (!weeklyHours) return [];

  const dayMap: { [key: string]: string } = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return Object.entries(weeklyHours)
    .filter(([_, hours]: [string, any]) => hours.isOpen)
    .map(([day, hours]: [string, any]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayMap[day],
      opens: hours.start,
      closes: hours.end,
    }));
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getWebsiteSettings();

  const seo = settings?.seoSettings;
  const businessName = settings?.heroSection?.title || "";
  const description =
    seo?.metaDescription || settings?.heroSection?.subtitle || "";
  const city = settings?.contactInfo?.address?.city || "";
  const street = settings?.contactInfo?.address?.street || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const ogImage =
    seo?.ogImageUrl || (siteUrl ? `${siteUrl}/og-image.png` : "");

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": seo?.businessType || "Restaurant",
    "@id": `${siteUrl}/#restaurant`,
    name: businessName,
    description: seo?.metaDescription || description,
    url: siteUrl,
    telephone: settings?.contactInfo?.phone || "",
    email: settings?.contactInfo?.email || "",
    image: ogImage || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city,
      postalCode: settings?.contactInfo?.address?.postalCode || "",
      addressCountry: "GR",
    },
    openingHoursSpecification: generateOpeningHours(
      settings?.deliverySettings?.weeklyHours
    ),
    servesCuisine: seo?.servesCuisine?.length
      ? seo.servesCuisine
      : ["Mediterranean", "Greek", "Cafe"],
    priceRange: seo?.priceRange || "€€",
    acceptsReservations: true,
    hasMenu: `${siteUrl}/menu`,
    paymentAccepted: ["Cash", "Credit Card"],
    currenciesAccepted: "EUR",
    areaServed: city ? { "@type": "City", name: city } : undefined,
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: businessName,
    description,
    inLanguage: "el",
  };

  return (
    <html lang="el" className={`${appSans.variable} ${appMono.variable}`}>
      <head>
        {/* Server-side JSON-LD structured data - visible to crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>
      <body className="font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
