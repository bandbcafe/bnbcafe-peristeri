// myDATA Classification Constants for AADE invoicing

export const VAT_RATES = [
  { value: 24, label: "24% (Κανονικός συντελεστής)" },
  { value: 13, label: "13% (Μειωμένος συντελεστής)" },
  { value: 6, label: "6% (Υπερμειωμένος συντελεστής)" },
  { value: 0, label: "0% (Μηδενικός συντελεστής)" },
] as const;

export const QUANTITY_TYPES = [
  { value: 1, label: "Τεμάχια" },
  { value: 2, label: "Κιλά" },
  { value: 3, label: "Λίτρα" },
  { value: 4, label: "Μέτρα" },
  { value: 5, label: "Τετραγωνικά μέτρα" },
  { value: 6, label: "Κυβικά μέτρα" },
  { value: 7, label: "Ώρες" },
  { value: 8, label: "Ημέρες" },
] as const;

// Common myDATA Classification Categories
export const CLASSIFICATION_CATEGORIES = [
  { value: "category1_1", label: "Εισόδημα από Πώληση Εμπορευμάτων (+)" },
  { value: "category1_2", label: "Εισόδημα από Πώληση Προϊόντων (+)" },
  { value: "category1_3", label: "Εισόδημα από Παροχή Υπηρεσιών (+)" },
  { value: "category1_4", label: "Εισόδημα από Πώληση Παγίων (+)" },
  { value: "category1_5", label: "Λοιπά Έσοδα/ Κέρδη (+)" },
  { value: "category1_6", label: "Αυτοπαραδόσεις - Ιδιοχρησιμοποιήσεις (+)" },
  { value: "category1_7", label: "Εισόδημα από Πώληση για λογ/σμό τρίτων (+)" },
  { value: "category1_8", label: "Εισόδημα προηγούμενων χρήσεων (+)" },
  { value: "category1_9", label: "Εισόδημα επομένων χρήσεων (+)" },
  { value: "category1_10", label: "Λοιπές Εγγραφές Εσόδων (+)" },
] as const;

// Common myDATA Classification Types for Food & Beverage
export const CLASSIFICATION_TYPES = [
  // Εισόδημα από Παροχή Υπηρεσιών
  { value: "E3_561_001", label: "Έσοδα από υπηρεσίες εστίασης" },
  { value: "E3_561_002", label: "Έσοδα από υπηρεσίες ποτών" },
  { value: "E3_561_003", label: "Έσοδα από catering" },
  { value: "E3_561_004", label: "Έσοδα από delivery" },
  { value: "E3_561_005", label: "Έσοδα από take away" },
  
  // Εισόδημα από Πώληση Εμπορευμάτων
  { value: "E3_106", label: "Λιανικές πωλήσεις αγαθών και υπηρεσιών" },
  { value: "E3_205", label: "Πωλήσεις αγαθών σε χώρες ΕΕ" },
  { value: "E3_210", label: "Πωλήσεις αγαθών σε τρίτες χώρες" },
  
  // Εισόδημα από Πώληση Προϊόντων
  { value: "E3_102", label: "Πωλήσεις προϊόντων" },
  { value: "E3_103", label: "Πωλήσεις παραγωγής" },
  
  // Λοιπά Έσοδα
  { value: "E3_880_001", label: "Λοιπά έσοδα" },
  { value: "E3_880_002", label: "Έσοδα από προμήθειες" },
  { value: "E3_880_003", label: "Έσοδα από ενοίκια" },
] as const;

// VAT Exemption Categories (Optional)
export const VAT_EXEMPTION_CATEGORIES = [
  { value: "1", label: "Άρθρο 2 & 3" },
  { value: "2", label: "Άρθρο 5 (Παράδοση αγαθών)" },
  { value: "3", label: "Άρθρο 13" },
  { value: "4", label: "Άρθρο 14" },
  { value: "5", label: "Άρθρο 16" },
  { value: "6", label: "Άρθρο 19" },
  { value: "7", label: "Άρθρο 22" },
  { value: "8", label: "Άρθρο 24" },
  { value: "9", label: "Άρθρο 25" },
  { value: "10", label: "Άρθρο 26" },
  { value: "11", label: "Άρθρο 27" },
  { value: "12", label: "Άρθρο 27 - Λοιπές περιπτώσεις" },
  { value: "13", label: "Άρθρο 28" },
] as const;

// Default values for common product types
export const DEFAULT_PRODUCT_CLASSIFICATIONS = {
  FOOD: {
    vatRate: 13,
    classificationCategory: "category1_3",
    classificationType: "E3_561_001",
    quantityType: 1,
  },
  BEVERAGE: {
    vatRate: 24,
    classificationCategory: "category1_3", 
    classificationType: "E3_561_002",
    quantityType: 1,
  },
  SERVICE: {
    vatRate: 24,
    classificationCategory: "category1_3",
    classificationType: "E3_561_001", 
    quantityType: 7,
  },
  RETAIL_GOODS: {
    vatRate: 24,
    classificationCategory: "category1_1",
    classificationType: "E3_106",
    quantityType: 1,
  },
} as const;

// Helper functions για quantity types
export const getQuantityTypeLabel = (quantityType: number): string => {
  const type = QUANTITY_TYPES.find(t => t.value === quantityType);
  return type ? type.label : "Τεμάχια";
};

export const getQuantityUnit = (quantityType: number): string => {
  const units: Record<number, string> = {
    1: "τεμ.",
    2: "κιλά",
    3: "λίτρα", 
    4: "μέτρα",
    5: "μ²",
    6: "μ³",
    7: "ώρες",
    8: "ημέρες"
  };
  return units[quantityType] || "τεμ.";
};

export const getQuantityShortLabel = (quantityType: number): string => {
  const labels: Record<number, string> = {
    1: "τμχ",
    2: "κγ",
    3: "λτ",
    4: "μ",
    5: "μ²", 
    6: "μ³",
    7: "ώρες",
    8: "ημέρες"
  };
  return labels[quantityType] || "τμχ";
};

export const formatQuantityWithUnit = (quantity: number, quantityType: number): string => {
  const unit = getQuantityUnit(quantityType);
  return `${quantity} ${unit}`;
};

// Format quantity for receipts (show grams/ml for weight/volume)
export const formatQuantityForReceipt = (quantity: number, quantityType: number): string => {
  if (quantityType === 2) {
    // Kilos -> show in grams
    const grams = Math.round(quantity * 1000);
    return `${grams} γραμμάρια`;
  } else if (quantityType === 3) {
    // Liters -> show in ml
    const ml = Math.round(quantity * 1000);
    return `${ml} ml`;
  } else {
    // Pieces or other units
    const unit = getQuantityUnit(quantityType);
    return `${quantity} ${unit}`;
  }
};

export const formatPricePerUnit = (price: number, quantityType: number): string => {
  const unit = getQuantityUnit(quantityType);
  return `€${price.toFixed(2)} / ${unit}`;
};
