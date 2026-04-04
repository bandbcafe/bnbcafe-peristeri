// Types for POS system

export interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    quantityType?: number; // Quantity type for the product
  };
  quantity: number;
  selectedPriceListId: string;
  selectedRecipes?: {
    recipeId: string;
    selectedOptions: {[groupId: string]: string[]};
    additionalCost: number;
  }[];
  unitPrice: number;
  totalPrice: number;
  vatRate: number; // VAT rate for this item (e.g., 0.24 for 24%)
}

export type PaymentMethod = "cash" | "card";

export interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  address?: string;
}
