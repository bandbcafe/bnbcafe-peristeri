import type { Metadata } from "next";
import { getWebsiteSettings } from "./getWebsiteSettings";

export async function generatePageMetadata(
  pathname: string
): Promise<Metadata> {
  const settings = await getWebsiteSettings();

  if (!settings) {
    return { title: "Online Κατάστημα" };
  }

  const seo = settings.seoSettings;
  const businessName = settings.heroSection?.title || "";
  const city = settings.contactInfo?.address?.city || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const defaultDescription =
    seo?.metaDescription || settings.heroSection?.subtitle || "";
  const ogImage =
    seo?.ogImageUrl || (siteUrl ? `${siteUrl}/og-image.png` : "");

  const location = city ? ` ${city}` : "";
  const base =
    seo?.siteTitle ||
    (businessName ? `${businessName}${location}` : "Online Κατάστημα");

  // Check for custom per-page titles/descriptions from Ordio SEO settings
  const pageTitles = seo?.pageTitles;
  const pageDescriptions = seo?.pageDescriptions;

  const pageMap: {
    [key: string]: {
      key: string;
      title: string;
      description: string;
    };
  } = {
    "/": {
      key: "home",
      title: seo?.siteTitle || `${base} | Παραγγείλτε Online`,
      description: `${businessName}${city ? ` στην περιοχή ${city}` : ""}. ${defaultDescription}. Παραγγείλτε online ή κλείστε τραπέζι.`,
    },
    "/menu": {
      key: "menu",
      title: `Μενού - ${base}`,
      description: `Δείτε το πλήρες μενού του ${businessName}${city ? ` στην περιοχή ${city}` : ""}. Παραγγείλτε online με delivery.`,
    },
    "/reservations": {
      key: "reservations",
      title: `Κρατήσεις Τραπεζιού - ${base}`,
      description: `Κλείστε τραπέζι online στο ${businessName}${city ? ` στην περιοχή ${city}` : ""}. Εγγυημένο τραπέζι, επιλέξτε την ώρα σας.`,
    },
    "/contact": {
      key: "contact",
      title: `Επικοινωνία - ${base}`,
      description: `Επικοινωνήστε με το ${businessName}${city ? ` στην περιοχή ${city}` : ""}. Στοιχεία επικοινωνίας, διεύθυνση και ωράριο.`,
    },
    "/order": {
      key: "order",
      title: `Online Παραγγελία - ${base}`,
      description: `Παραγγείλτε online από το ${businessName}${city ? ` στην περιοχή ${city}` : ""}. Delivery στην πόρτα σας.`,
    },
    "/checkout": {
      key: "checkout",
      title: `Ολοκλήρωση Παραγγελίας - ${base}`,
      description: `Ολοκληρώστε την παραγγελία σας από το ${businessName}${city ? ` στην περιοχή ${city}` : ""}.`,
    },
  };

  const page = pageMap[pathname] || {
    key: "",
    title: base,
    description: defaultDescription,
  };

  // Use custom per-page title if set in Ordio
  const title =
    pageTitles?.[page.key as keyof typeof pageTitles] || page.title;
  const description =
    pageDescriptions?.[page.key as keyof typeof pageDescriptions] ||
    page.description;

  const keywords = seo?.keywords
    ? seo.keywords
    : businessName && city
      ? `${businessName}, ${city}, delivery, online παραγγελία, κρατήσεις τραπεζιού`
      : "delivery, online παραγγελία";

  const canonicalUrl = siteUrl ? `${siteUrl}${pathname}` : undefined;

  return {
    title,
    description,
    keywords,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      type: "website",
      url: canonicalUrl || undefined,
      siteName: businessName || undefined,
      title,
      description,
      locale: "el_GR",
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: businessName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
