/**
 * Simple utility to get series codes from Firestore billing books configuration
 * Reads the existing config that's already populated from /settings page
 */
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Get enabled billing books from Firestore config
 */
async function getEnabledBillingBooks() {
  try {
    const wrappDoc = await getDoc(doc(db, "config", "wrapp"));
    if (wrappDoc.exists()) {
      const wrappData = wrappDoc.data();
      return wrappData.enabled_billing_books || [];
    }
    return [];
  } catch (error) {
    console.error("Error loading billing books:", error);
    return [];
  }
}

/**
 * Get series code by invoice type code from billing books
 */
export async function getSeriesByInvoiceTypeCode(invoiceTypeCode: string): Promise<string> {
  const enabledBooks = await getEnabledBillingBooks();
  const targetBook = enabledBooks.find((book: any) => 
    book.invoice_type_code === invoiceTypeCode
  );
  
  if (!targetBook) {
    // Fallback to defaults if no billing book found
    return invoiceTypeCode === "8.6" ? "ΔΠΕ" : 
           invoiceTypeCode === "11.1" ? "ΕΑΛΠ" : "";
  }
  
  return targetBook.series;
}

/**
 * Get order note series (8.6)
 */
export async function getOrderNoteSeries(): Promise<string> {
  return await getSeriesByInvoiceTypeCode("8.6");
}

/**
 * Get retail receipt series (11.1)
 */
export async function getRetailReceiptSeries(): Promise<string> {
  return await getSeriesByInvoiceTypeCode("11.1");
}
