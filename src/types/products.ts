// Types για το σύστημα προϊόντων και συνταγών

export type RecipeOptionType = "radio" | "checkbox" | "dropdown";

export type RecipeOption = {
  id: string;
  name: string;
  price: number; // επιπλέον κόστος
  isDefault?: boolean;
};

export type RecipeGroup = {
  id: string;
  name: string; // π.χ. "Γλυκό", "Μέγεθος", "Γάλα"
  description?: string;
  type: RecipeOptionType; // radio, checkbox, dropdown
  required: boolean; // αν είναι υποχρεωτικό να επιλέξει κάτι
  maxSelections?: number; // για checkbox, μέγιστες επιλογές
  options: RecipeOption[];
  sortOrder: number;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  groups: RecipeGroup[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  image?: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  image?: string; // Base64 WebP image
  displayOrder?: number; // Σειρά εμφάνισης
  
  // Quantity type settings για την κατηγορία
  quantityType?: number; // Default quantity type για προϊόντα σε αυτή την κατηγορία
  pricePerUnit?: boolean; // Αν η τιμή είναι ανά μονάδα (π.χ. €/κιλό αντί για €/τεμάχιο)
};

export type ProductPriceListPrice = {
  priceListId: string;
  price: number;
  vatRate: number; // ΦΠΑ ανά τιμοκατάλογο
};

export type Product = {
  id: string;
  name: string;
  description: string;
  priceListPrices: ProductPriceListPrice[]; // Τιμές ανά τιμοκατάλογο
  costPrice?: number;
  sku: string;
  barcode?: string;
  category: ProductCategory;
  stock: number;
  minStock: number;
  trackStock: boolean;
  neverOutOfStock: boolean; // δεν εμφανίζεται ποτέ ως εξαντλημένο
  status: "active" | "inactive" | "draft";
  variants: ProductVariant[];
  tags: string[];
  recipeIds?: string[]; // σύνδεση με συνταγές (πολλαπλές)
  image?: string; // Base64 WebP image
  displayOrder?: number; // Σειρά εμφάνισης
  
  // Τύπος ποσότητας (1 = τεμάχια, 2 = κιλά, κλπ)
  quantityType: number;
  
  createdAt: Date;
  updatedAt: Date;
};

export type PriceList = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  // MyDATA Classifications (optional - falls back to global defaults if not set)
  myDataClassificationCategory?: string; // e.g., "category1_1", "category1_3"
  myDataClassificationType?: string;     // e.g., "E3_561_003", "E3_561_004"
  createdAt: Date;
  updatedAt: Date;
};

export type ProductStats = {
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
};
