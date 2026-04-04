import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function getSettings() {
  try {
    const snap = await getDoc(doc(db, 'website_settings', 'main'));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const seo = settings?.seoSettings;
  const businessName = settings?.heroSection?.title || '';
  const city = settings?.contactInfo?.address?.city || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const title = seo?.siteTitle
    || (businessName && city ? `${businessName} ${city} | Παραγγείλτε Online` : 'Online Κατάστημα | Παραγγείλτε Online');
  const description = seo?.metaDescription
    || settings?.heroSection?.subtitle
    || 'Παραγγείλτε online ή κλείστε τραπέζι. Delivery στην πόρτα σας.';
  const keywords = seo?.keywords
    ? seo.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
    : ['online παραγγελία', 'delivery', 'κρατήσεις τραπεζιού'];
  const ogImage = seo?.ogImageUrl || `${siteUrl}/og-image.png`;

  return {
    title: {
      default: title,
      template: '%s',
    },
    description,
    keywords,
    authors: [{ name: businessName }],
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      locale: 'el_GR',
      type: 'website',
      title,
      description,
      siteName: businessName,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: settings?.favicon ? {
      icon: '/api/favicon',
      apple: '/api/favicon?size=180',
    } : undefined,
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  };
}
