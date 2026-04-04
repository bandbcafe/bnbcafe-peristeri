/**
 * Wrapp API Client Library
 * Provides client-side functions for interacting with Wrapp API
 * Uses dynamic base URL from user settings (no hardcoded URLs)
 */

// Base request helper that uses user settings for base URL
async function request(endpoint: string, method: string, body?: any, requiresAuth = false) {
  const url = `/api/wrapp${endpoint}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  if (requiresAuth) {
    // JWT tokens are now session-based and passed directly to functions
    // This function should not be used for authenticated requests anymore
    throw new Error("Please use direct API calls with JWT tokens instead of this helper");
  }
  
  const response = await fetch(url, { 
    method, 
    headers, 
    body: body ? JSON.stringify(body) : undefined 
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return data;
}

/**
 * Login to Wrapp API and get JWT token
 * @param email User email
 * @param apiKey User API key
 * @param baseUrl WRAPP API base URL
 * @returns Promise with WRAPP API response structure
 */
export function wrappLogin(email: string, apiKey: string, baseUrl?: string): Promise<any> {
  return request(`/login`, "POST", { email, api_key: apiKey, baseUrl }, false);
}

/**
 * Get user details from Wrapp API
 * @param baseUrl WRAPP API base URL
 * @returns Promise with user details
 */
export function wrappUserDetails(baseUrl?: string): Promise<any> {
  const url = baseUrl ? `/user?baseUrl=${encodeURIComponent(baseUrl)}` : `/user`;
  return request(url, "GET", undefined, true);
}

/**
 * Get billing books from Wrapp API
 * @param baseUrl WRAPP API base URL
 * @returns Promise with billing books array
 */
export function wrappBillingBooks(baseUrl?: string): Promise<any[]> {
  const url = baseUrl ? `/billing-books?baseUrl=${encodeURIComponent(baseUrl)}` : `/billing-books`;
  return request(url, "GET", undefined, true);
}

/**
 * Create a new billing book
 * @param bookData Billing book data
 * @param baseUrl WRAPP API base URL
 * @returns Promise with created billing book
 */
export function wrappCreateBillingBook(bookData: any, baseUrl?: string): Promise<any> {
  const data = baseUrl ? { ...bookData, baseUrl } : bookData;
  return request(`/billing-books`, "POST", data, true);
}

/**
 * Update billing book
 * @param bookId Billing book ID
 * @param updateData Data to update (number, series, invoice_type_code, etc.)
 * @param baseUrl WRAPP API base URL
 * @returns Promise with updated billing book
 */
export function wrappUpdateBillingBook(bookId: string, updateData: any, baseUrl?: string): Promise<any> {
  const data = baseUrl ? { ...updateData, baseUrl } : updateData;
  return request(`/billing-books/${bookId}`, "PUT", data, true);
}

/**
 * Delete billing book
 * @param bookId Billing book ID
 * @param baseUrl WRAPP API base URL
 * @returns Promise with deletion result
 */
export function wrappDeleteBillingBook(bookId: string, baseUrl?: string): Promise<any> {
  const data = baseUrl ? { baseUrl } : {};
  return request(`/billing-books/${bookId}`, "DELETE", data, true);
}

/**
 * Create invoice via Wrapp API
 * @param payload Invoice data
 * @param baseUrl WRAPP API base URL
 * @returns Promise with created invoice
 */
export function wrappCreateInvoice(payload: any, baseUrl?: string): Promise<any> {
  const invoiceData = baseUrl ? { ...payload, baseUrl } : payload;
  return request(`/invoices`, "POST", invoiceData, true);
}


/**
 * Get invoice details
 * @param invoiceId Invoice ID
 * @returns Promise with invoice details
 */
export function wrappGetInvoice(invoiceId: string): Promise<any> {
  return request(`/invoices/${invoiceId}`, "GET", undefined, true);
}

/**
 * Cancel invoice
 * @param invoiceId Invoice ID
 * @returns Promise with cancellation result
 */
export function wrappCancelInvoice(invoiceId: string): Promise<any> {
  return request(`/invoices/${invoiceId}/cancel`, "DELETE", undefined, true);
}

/**
 * Search VAT number
 * @param vat VAT number
 * @param countryCode Country code (default: "EL")
 * @returns Promise with VAT search results
 */
export function wrappVatSearch(vat: string, countryCode = "EL"): Promise<any> {
  return request(`/vat-search?vat=${vat}&country_code=${countryCode}`, "GET", undefined, true);
}

/**
 * Get VAT exemptions from Wrapp API
 * @param baseUrl WRAPP API base URL
 * @returns Promise with VAT exemptions array
 */
export function wrappVatExemptions(baseUrl?: string): Promise<any[]> {
  const url = baseUrl ? `/vat-exemptions?baseUrl=${encodeURIComponent(baseUrl)}` : `/vat-exemptions`;
  return request(url, "GET", undefined, true);
}

/**
 * Get user defaults from Wrapp API
 * @param baseUrl WRAPP API base URL
 * @returns Promise with user defaults
 */
export function wrappGetDefaults(baseUrl?: string): Promise<any> {
  const url = baseUrl ? `/defaults?baseUrl=${encodeURIComponent(baseUrl)}` : `/defaults`;
  return request(url, "GET", undefined, true);
}

/**
 * Save user defaults to Wrapp API
 * @param defaults Default settings data
 * @param baseUrl WRAPP API base URL
 * @returns Promise with save result
 */
export function wrappSaveDefaults(defaults: any, baseUrl?: string): Promise<any> {
  const data = baseUrl ? { ...defaults, baseUrl } : defaults;
  return request(`/defaults`, "POST", data, true);
}

/**
 * Generate PDF for invoice
 * @param invoiceId Invoice ID
 * @param locale Language locale ("el" or "en")
 * @returns Promise with PDF generation result
 */
export function wrappGeneratePdf(invoiceId: string, locale = "el"): Promise<any> {
  return request(`/invoices/${invoiceId}/generate-pdf?locale=${locale}`, "GET", undefined, true);
}

/**
 * Get formatted subscription information
 * @param baseUrl WRAPP API base URL
 * @returns Promise with formatted subscription info
 */
export async function getFormattedSubscriptionInfo(baseUrl?: string): Promise<any> {
  try {
    const userDetails = await wrappUserDetails(baseUrl);
    
    // Format the subscription information
    return {
      status: userDetails?.subscription?.status || 'inactive',
      plan: userDetails?.subscription?.plan || 'N/A',
      expiresAt: userDetails?.subscription?.expires_at || null,
      user: {
        name: userDetails?.name || 'N/A',
        email: userDetails?.email || 'N/A',
        company: userDetails?.company || 'N/A'
      }
    };
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    throw new Error('Αδυναμία φόρτωσης στοιχείων συνδρομής');
  }
}

// Helper functions for invoice type labels - OFFICIAL AADE CODES
export const invoiceTypeLabels: Record<string, string> = {
  // Αντικριζόμενα Παραστατικά Εκδότη ημεδαπής / αλλοδαπής
  
  // Τιμολόγιο Πώλησης
  '1.1': 'Τιμολόγιο Πώλησης',
  '1.2': 'Τιμολόγιο Πώλησης / Ενδοκοινοτητες Παραδόσεις',
  '1.3': 'Τιμολόγιο Πώλησης / Παραδόσεις Τρίτων Χωρών',
  '1.4': 'Τιμολόγιο Πώλησης / Πώληση για Λογαριασμό Τρίτων',
  '1.5': 'Τιμολόγιο Πώλησης / Εκκαθάριση Πωλήσεων Τρίτων - Αμοιβή από Πωλήσεις Τρίτων',
  '1.6': 'Τιμολόγιο Πώλησης / Συμπληρωματικό Παραστατικό',
  
  // Τιμολόγιο Παροχής Υπηρεσιών
  '2.1': 'Τιμολόγιο Παροχής Υπηρεσιών',
  '2.2': 'Τιμολόγιο Παροχής / Ενδοκοινοτική Παροχή Υπηρεσιών',
  '2.3': 'Τιμολόγιο Παροχής / Παροχή Υπηρεσιών Τρίτων Χωρών',
  '2.4': 'Τιμολόγιο Παροχής / Συμπληρωματικό Παραστατικό',
  
  // Τίτλος Κτήσης
  '3.1': 'Τίτλος Κτήσης (μη υπόχρεος Εκδότης)',
  '3.2': 'Τίτλος Κτήσης (άρνηση έκδοσης από υπόχρεο Εκδότη)',
  
  // Πιστωτικό Τιμολόγιο
  '5.1': 'Πιστωτικό Τιμολόγιο / Συσχετιζόμενο',
  '5.2': 'Πιστωτικό Τιμολόγιο / Μη Συσχετιζόμενο',
  
  // Στοιχείο Αυτοπαράδοσης - Ιδιοχρησιμοποίησης
  '6.1': 'Στοιχείο Αυτοπαράδοσης',
  '6.2': 'Στοιχείο Ιδιοχρησιμοποίησης',
  
  // Συμβόλαιο - Έσοδο
  '7.1': 'Συμβόλαιο - Έσοδο',
  
  // Ειδικό Στοιχείο (Έσοδο) – Απόδειξη Είσπραξης
  '8.1': 'Ενοίκια - Έσοδο',
  '8.2': 'Τέλος ανθεκτικότητας κλιματικής κρίσης',
  '8.4': 'Απόδειξη Είσπραξης POS',
  '8.5': 'Απόδειξη Επιστροφής POS',
  
  // Δελτίο Παραγγελίας
  '8.6': 'Δελτίο Παραγγελίας Εστίασης',
  
  // Παραστατικά Διακίνησης
  '9.3': 'Δελτίο Αποστολής',
  
  // Μη Αντικριζόμενα Παραστατικά Εκδότη ημεδαπής / αλλοδαπής
  
  // Παραστατικά Λιανικής
  '11.1': 'Απόδειξη Λιανικής Πώλησης (ΑΛΠ)',
  '11.2': 'Απόδειξη Παροχής Υπηρεσιών (ΑΠΥ)',
  '11.3': 'Απλοποιημένο Τιμολόγιο',
  '11.4': 'Πιστωτικό Στοιχ. Λιανικής',
  '11.5': 'Απόδειξη Λιανικής Πώλησης για Λογ/σμό Τρίτων',
  
  // Μη Αντικριζόμενα Παραστατικά Λήπτη ημεδαπής / αλλοδαπής
  
  // Λήψη Παραστατικών Λιανικής
  '13.1': 'Έξοδα - Αγορές Λιανικών Συναλλαγών ημεδαπής / αλλοδαπής',
  '13.2': 'Παροχή Λιανικών Συναλλαγών ημεδαπής / αλλοδαπής',
  '13.3': 'Κοινόχρηστα',
  '13.4': 'Συνδρομές',
  '13.30': 'Παραστατικά Οντότητας ως Αναγράφονται από την ίδια (Δυναμικό)',
  '13.31': 'Πιστωτικό Στοιχ. Λιανικής ημεδαπής / αλλοδαπής',
  
  // Αντικριζόμενα Παραστατικά Λήπτη ημεδαπής / αλλοδαπής
  
  // Παραστ. Εξαιρ. Οντοτήτων ημεδαπής / αλλοδαπής
  '14.1': 'Τιμολόγιο / Ενδοκοινοτικές Αποκτήσεις',
  '14.2': 'Τιμολόγιο / Αποκτήσεις Τρίτων Χωρών',
  '14.3': 'Τιμολόγιο / Ενδοκοινοτική Λήψη Υπηρεσιών',
  '14.4': 'Τιμολόγιο / Λήψη Υπηρεσιών Τρίτων Χωρών',
  '14.5': 'ΕΦΚΑ και λοιποί Ασφαλιστικοί Οργανισμοί',
  '14.30': 'Παραστατικά Οντότητας ως Αναγράφονται από την ίδια (Δυναμικό)',
  '14.31': 'Πιστωτικό ημεδαπής / αλλοδαπής',
  
  // Συμβόλαιο - Έξοδο
  '15.1': 'Συμβόλαιο - Έξοδο',
  
  // Ειδικό Στοιχείο (Έξοδο) – Απόδειξη Πληρωμής
  '16.1': 'Ενοίκιο Έξοδο',
  
  // Εγγραφές Τακτοποίησης Εσόδων- Εξόδων
  
  // Εγγραφές Οντότητας
  '17.1': 'Μισθοδοσία',
  '17.2': 'Αποσβέσεις',
  '17.3': 'Λοιπές Εγγραφές Τακτοποίησης Εσόδων - Λογιστική Βάση',
  '17.4': 'Λοιπές Εγγραφές Τακτοποίησης Εσόδων - Φορολογική Βάση',
  '17.5': 'Λοιπές Εγγραφές Τακτοποίησης Εξόδων - Λογιστική Βάση',
  '17.6': 'Λοιπές Εγγραφές Τακτοποίησης Εξόδων - Φορολογική Βάση',
};

// Payment method labels
export const paymentMethodLabels: Record<number, string> = {
  0: 'Μετρητά',
  1: 'Πίστωση',
  2: 'Τοπικός τραπεζικός λογαριασμός',
  3: 'Κάρτα',
  4: 'Επιταγή',
  5: 'Εξωτερικός τραπεζικός λογαριασμός',
  6: 'Web banking transfer',
  7: 'Iris payment',
};

// Classification categories for restaurant/catering businesses
// These map to MyDATA income categories (Πεδία Εισοδημάτων)
export const classificationCategories: Record<string, string> = {
  'category1_1': 'Έσοδα από Πώληση Εμπορευμάτων (+)',
  'category1_2': 'Έσοδα από Πώληση Προϊόντων (+)',
  'category1_3': 'Έσοδα από Παροχή Υπηρεσιών (+)',
  'category1_4': 'Έσοδα από Πώληση Παγίων (+)',
  'category1_5': 'Λοιπά Έσοδα/ Κέρδη (+)',
  'category1_7': 'Έσοδα για λογαριασμό τρίτων (+)',
  'category1_95': 'Λοιπά Πληροφοριακά Στοιχεία Εσόδων (+)',
};

// Detailed descriptions for classification categories
export const classificationCategoryDescriptions: Record<string, string> = {
  'category1_1': 'Έσοδα από πώληση εμπορευμάτων (αγοράζετε και μεταπωλείτε)',
  'category1_2': 'Έσοδα από πώληση προϊόντων (παράγετε εσείς)',
  'category1_3': 'Έσοδα από παροχή υπηρεσιών (εστίαση, καφέ, ποτά)',
  'category1_4': 'Έσοδα από πώληση παγίων (εξοπλισμός, μηχανήματα)',
  'category1_5': 'Λοιπά έσοδα και κέρδη',
  'category1_7': 'Έσοδα για λογαριασμό τρίτων (φόροι πλαστικών, σακούλας)',
  'category1_95': 'Λοιπά πληροφοριακά στοιχεία εσόδων',
};

// Classification types for restaurant/catering businesses
// These are the specific E3 codes for MyDATA
export const classificationTypes: Record<string, string> = {
  'E3_561_001': 'Πωλήσεις αγαθών και υπηρεσιών Χονδρικές',
  'E3_561_002': 'Πωλήσεις αγαθών και υπηρεσιών Χονδρικές βάσει άρθρου 39α παρ 5',
  'E3_561_003': 'Πωλήσεις αγαθών και υπηρεσιών Λιανικές - Ιδιωτική Πελατεία',
  'E3_561_004': 'Πωλήσεις αγαθών και υπηρεσιών Λιανικές βάσει άρθρου 39α παρ 5',
  'E3_561_005': 'Πωλήσεις αγαθών και υπηρεσιών Εξωτερικού Ενδοκοινοτικές',
  'E3_561_006': 'Πωλήσεις αγαθών και υπηρεσιών Εξωτερικού Τρίτες Χώρες',
  'E3_561_007': 'Πωλήσεις αγαθών και υπηρεσιών Λοιπά',
  'E3_562': 'Λοιπά συνήθη έσοδα',
  'E3_563': 'Πιστωτικοί τόκοι και συναφή έσοδα',
  'E3_570': 'Ασυνήθη έσοδα και κέρδη',
  'E3_595': 'Έξοδα σε ιδιοπαραγωγή',
  'E3_596': 'Επιδοτήσεις - Επιχορηγήσεις',
  'E3_880_001': 'Πωλήσεις Παγίων Χονδρικές',
  'E3_880_002': 'Πωλήσεις Παγίων Λιανικές',
  'E3_880_003': 'Πωλήσεις Παγίων Εξωτερικού Ενδοκοινοτικές',
  'E3_880_004': 'Πωλήσεις Παγίων Εξωτερικού Τρίτες Χώρες',
  'E3_881_001': 'Πωλήσεις για λογ/σμο Τρίτων Χονδρικές',
  'E3_881_002': 'Πωλήσεις για λογ/σμο Τρίτων Λιανικές',
  'E3_881_003': 'Πωλήσεις για λογ/σμο Τρίτων Εξωτερικού Ενδοκοινοτικές',
  'E3_881_004': 'Πωλήσεις για λογ/σμο Τρίτων Εξωτερικού Τρίτες Χώρες',
};

// Detailed descriptions for classification types
export const classificationTypeDescriptions: Record<string, string> = {
  'E3_561_001': 'Χονδρικές πωλήσεις σε επιτηδευματίες (επιχειρήσεις, εστιατόρια, ξενοδοχεία)',
  'E3_561_002': 'Χονδρικές πωλήσεις βάσει ειδικού καθεστώτος ΦΠΑ (άρθρο 39α παρ 5)',
  'E3_561_003': 'Λιανικές πωλήσεις σε ιδιώτες - ΚΥΡΙΑ ΧΡΗΣΗ ΓΙΑ ΕΣΤΙΑΣΗ (φαγητό, ποτά, delivery, take away, dine-in)',
  'E3_561_004': 'Λιανικές πωλήσεις βάσει ειδικού καθεστώτος ΦΠΑ (άρθρο 39α παρ 5)',
  'E3_561_005': 'Ενδοκοινοτικές πωλήσεις (εξαγωγές εντός ΕΕ)',
  'E3_561_006': 'Πωλήσεις σε τρίτες χώρες (εξαγωγές εκτός ΕΕ)',
  'E3_561_007': 'Λοιπές πωλήσεις που δεν εμπίπτουν στις παραπάνω κατηγορίες',
  'E3_562': 'Λοιπά συνήθη έσοδα της επιχείρησης',
  'E3_563': 'Τόκοι από καταθέσεις και λοιπά χρηματοοικονομικά έσοδα',
  'E3_570': 'Έκτακτα και ασυνήθη έσοδα',
  'E3_595': 'Έξοδα που κεφαλαιοποιούνται (ιδιοπαραγωγή)',
  'E3_596': 'Επιδοτήσεις και επιχορηγήσεις',
  'E3_880_001': 'Χονδρική πώληση παγίων σε επιτηδευματίες',
  'E3_880_002': 'Λιανική πώληση παγίων σε ιδιώτες',
  'E3_880_003': 'Ενδοκοινοτική πώληση παγίων',
  'E3_880_004': 'Πώληση παγίων σε τρίτες χώρες',
  'E3_881_001': 'Χονδρικές πωλήσεις για λογαριασμό τρίτων',
  'E3_881_002': 'Λιανικές πωλήσεις για λογαριασμό τρίτων - ΜΟΝΟ ΓΙΑ ΦΟΡΟΥΣ ΠΛΑΣΤΙΚΩΝ ΚΑΙ ΣΑΚΟΥΛΑΣ',
  'E3_881_003': 'Ενδοκοινοτικές πωλήσεις για λογαριασμό τρίτων',
  'E3_881_004': 'Πωλήσεις σε τρίτες χώρες για λογαριασμό τρίτων',
};
