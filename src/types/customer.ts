export interface CustomerAddress {
  id: string;
  label: string; // π.χ. "Σπίτι", "Γραφείο", "Εξοχικό"
  street: string;
  city: string;
  postalCode: string;
  country: string;
  floor?: string; // Όροφος
  doorbell?: string; // Κουδούνι
  notes?: string; // Σημειώσεις
  isDefault?: boolean; // Προεπιλεγμένη διεύθυνση
}

export interface Customer {
  id: string;
  // Βασικά στοιχεία
  firstName: string;
  lastName: string;
  companyName?: string;
  
  // Φορολογικά στοιχεία (AADE)
  vatNumber: string; // ΑΦΜ
  taxOffice?: string; // ΔΟΥ
  vatExempt?: boolean; // Απαλλαγή ΦΠΑ
  
  // Στοιχεία επικοινωνίας
  email?: string;
  phone?: string;
  mobile?: string;
  
  // Διευθύνσεις (πολλαπλές)
  addresses?: CustomerAddress[];
  
  // Επαγγελματικά στοιχεία
  profession?: string; // Επάγγελμα
  activity?: string; // Δραστηριότητα
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  
  // Πρόσθετες πληροφορίες
  notes?: string;
  tags?: string[];
  
  // Πιστωτικά όρια και όροι
  creditLimit?: number;
  paymentTerms?: number; // Ημέρες πληρωμής
  discount?: number; // Έκπτωση %
}

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  companyName?: string;
  vatNumber: string;
  taxOffice?: string;
  vatExempt?: boolean;
  email?: string;
  phone?: string;
  mobile?: string;
  addresses?: CustomerAddress[];
  profession?: string;
  activity?: string;
  notes?: string;
  tags?: string[];
  creditLimit?: number;
  paymentTerms?: number;
  discount?: number;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  hasVatNumber?: boolean;
  city?: string;
  tags?: string[];
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  withVatNumber: number;
  withoutVatNumber: number;
}

// AADE VAT Lookup Response
export interface AADEVatInfo {
  vatNumber: string;
  valid: boolean;
  name?: string;
  companyName?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
  taxOffice?: string;
  profession?: string;
  activity?: string;
  vatExempt?: boolean;
}
