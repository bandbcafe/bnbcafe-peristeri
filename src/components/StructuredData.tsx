"use client";

import { usePathname } from "next/navigation";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

interface BusinessData {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  openingHours?: any;
  logo?: string;
}

export default function StructuredData() {
  const pathname = usePathname();
  const { websiteSettings, isLoaded } = useWebsiteSettings();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute || !isLoaded || !websiteSettings) return null;

  const businessData: BusinessData = {
    name: websiteSettings.heroSection?.title || "",
    description: websiteSettings.heroSection?.subtitle || "",
    phone: websiteSettings.contactInfo?.phone || "",
    email: websiteSettings.contactInfo?.email || "",
    address: websiteSettings.contactInfo?.address || {
      street: "",
      city: "",
      postalCode: "",
    },
    openingHours: websiteSettings.deliverySettings?.weeklyHours,
    logo: websiteSettings.heroSection?.logo,
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const seo = websiteSettings.seoSettings;

  // Local Business Schema
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": seo?.businessType || "Restaurant",
    "@id": `${baseUrl}/#restaurant`,
    name: businessData.name,
    description: seo?.metaDescription || businessData.description,
    url: baseUrl,
    telephone: businessData.phone,
    email: businessData.email,
    image:
      seo?.ogImageUrl ||
      (businessData.logo ? `${baseUrl}${businessData.logo}` : undefined),
    logo: businessData.logo ? `${baseUrl}${businessData.logo}` : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: businessData.address.street,
      addressLocality: businessData.address.city,
      postalCode: businessData.address.postalCode,
      addressCountry: "GR",
    },
    geo: websiteSettings.geoCoordinates
      ? {
          "@type": "GeoCoordinates",
          latitude: websiteSettings.geoCoordinates.lat,
          longitude: websiteSettings.geoCoordinates.lng,
        }
      : undefined,
    openingHoursSpecification: generateOpeningHours(businessData.openingHours),
    servesCuisine: seo?.servesCuisine?.length
      ? seo.servesCuisine
      : ["Mediterranean", "Greek", "Cafe", "Brunch", "Coffee"],
    priceRange: seo?.priceRange || "€€",
    acceptsReservations: true,
    hasMenu: `${baseUrl}/menu`,
    paymentAccepted: ["Cash", "Credit Card"],
    currenciesAccepted: "EUR",
    areaServed: {
      "@type": "City",
      name: businessData.address.city,
    },
    amenityFeature: [
      {
        "@type": "LocationFeatureSpecification",
        name: "Free WiFi",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Parking",
        value: true,
      },
    ],
  };

  // Website Schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: businessData.name,
    description: businessData.description,
    publisher: {
      "@id": `${baseUrl}/#restaurant`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/menu?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "el",
  };

  // Menu Schema
  const menuSchema =
    pathname === "/menu"
      ? {
          "@context": "https://schema.org",
          "@type": "Menu",
          "@id": `${baseUrl}/menu#menu`,
          name: `${businessData.name} - Μενού`,
          description: "Δείτε το πλήρες μενού μας με φρέσκα υλικά",
          hasMenuSection: [
            {
              "@type": "MenuSection",
              name: "Brunch",
              description: "Ειδικές επιλογές brunch",
            },
            {
              "@type": "MenuSection",
              name: "Καφέδες",
              description: "Ποικιλία καφέδων",
            },
            {
              "@type": "MenuSection",
              name: "Φαγητό",
              description: "Κύρια πιάτα και σνακ",
            },
          ],
        }
      : null;

  // Reservation Schema
  const reservationSchema =
    pathname === "/reservations"
      ? {
          "@context": "https://schema.org",
          "@type": "ReserveAction",
          "@id": `${baseUrl}/reservations#reservation`,
          name: "Κράτηση Τραπεζιού",
          description: "Κλείστε τραπέζι online",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}/reservations`,
            actionPlatform: [
              "http://schema.org/DesktopWebPlatform",
              "http://schema.org/MobileWebPlatform",
            ],
          },
          result: {
            "@type": "Reservation",
            name: "Κράτηση Τραπεζιού",
          },
        }
      : null;

  // Breadcrumb Schema
  const breadcrumbSchema = generateBreadcrumbSchema(pathname, baseUrl);

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: businessData.name,
    url: baseUrl,
    logo: businessData.logo ? `${baseUrl}${businessData.logo}` : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: businessData.phone,
      email: businessData.email,
      contactType: "customer service",
      areaServed: "GR",
      availableLanguage: ["Greek", "English"],
    },
    sameAs: [],
  };

  return (
    <>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      {menuSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(menuSchema),
          }}
        />
      )}
      {reservationSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(reservationSchema),
          }}
        />
      )}
    </>
  );
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

function generateBreadcrumbSchema(pathname: string | null, baseUrl: string) {
  if (!pathname || pathname === "/" || pathname === "/online-ordering")
    return null;

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbList = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Αρχική",
      item: baseUrl,
    },
  ];

  let currentPath = "";
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const name = getBreadcrumbName(segment);
    breadcrumbList.push({
      "@type": "ListItem",
      position: index + 2,
      name: name,
      item: `${baseUrl}${currentPath}`,
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbList,
  };
}

function getBreadcrumbName(segment: string): string {
  const names: { [key: string]: string } = {
    menu: "Μενού",
    reservations: "Κρατήσεις",
    contact: "Επικοινωνία",
    checkout: "Ολοκλήρωση",
    order: "Παραγγελία",
    orders: "Οι Παραγγελίες μου",
  };

  return names[segment] || segment;
}
