"use client";

import { useState, useCallback } from "react";
import { CartItem, PaymentMethod, CustomerInfo } from '../types/pos';
import {
  getQuantityTypeLabel,
} from "@/constants/mydata";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PriceList } from '@/types/products';

// Helper function to compare recipe selections
const compareRecipeSelections = (recipes1?: CartItem['selectedRecipes'], recipes2?: CartItem['selectedRecipes']) => {
  // If both are undefined or empty, they're the same
  if ((!recipes1 || recipes1.length === 0) && (!recipes2 || recipes2.length === 0)) {
    return true;
  }
  
  // If one has recipes and the other doesn't, they're different
  if (!recipes1 || !recipes2 || recipes1.length !== recipes2.length) {
    return false;
  }
  
  // Compare each recipe selection
  return recipes1.every((recipe1: any) => {
    const recipe2 = recipes2.find((r: any) => r.recipeId === recipe1.recipeId);
    if (!recipe2) return false;
    
    // Compare selected options for each recipe
    const options1Keys = Object.keys(recipe1.selectedOptions).sort();
    const options2Keys = Object.keys(recipe2.selectedOptions).sort();
    
    if (options1Keys.length !== options2Keys.length) return false;
    
    return options1Keys.every((groupId: string) => {
      const opts1 = recipe1.selectedOptions[groupId]?.sort() || [];
      const opts2 = recipe2.selectedOptions[groupId]?.sort() || [];
      return opts1.length === opts2.length && opts1.every((opt: string, idx: number) => opt === opts2[idx]);
    });
  });
};

// Invoice data for WRAPP API
export interface InvoiceData {
  invoice_type_code: string;
  billing_book_id: string;
  payment_method_type: number;
  net_total_amount: number;
  vat_total_amount: number;
  total_amount: number;
  payable_total_amount: number;
  counterpart?: {
    name: string;
    country_code: string;
    vat: string;
    city: string;
    street: string;
    number: string;
    postal_code: string;
    email: string;
  };
  invoice_lines: Array<{
    line_number: number;
    name: string;
    description: string;
    quantity: number;
    quantity_type: number;
    unit_price: number;
    net_total_price: number;
    vat_rate: number;
    vat_total: number;
    subtotal: number;
    classification_category: string;
    classification_type: string;
  }>;
}

export const usePOS = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);

  // Add product to cart
  const addToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => 
        cartItem.product.id === item.product.id && 
        cartItem.selectedPriceListId === item.selectedPriceListId &&
        compareRecipeSelections(cartItem.selectedRecipes, item.selectedRecipes)
      );

      if (existingItem) {
        
        return prev.map(cartItem => 
          cartItem.id === existingItem.id 
            ? { 
                ...cartItem, 
                quantity: cartItem.quantity + item.quantity, 
                totalPrice: cartItem.unitPrice * (cartItem.quantity + item.quantity),
                vatRate: item.vatRate // Ensure VAT rate is updated
              }
            : cartItem
        );
      } else {
        return [...prev, item];
      }
    });
  }, []);

  // Update cart item quantity
  const updateCartItemQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }

    setCart(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
        : item
    ));
  }, []);

  // Update cart item in place (preserves position)
  const updateCartItem = useCallback((updatedItem: CartItem) => {
    setCart(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Calculate totals (prices already include VAT)
  const calculateTotals = useCallback(() => {
    let total = 0;
    let subtotal = 0;
    let vatAmount = 0;

    // Calculate totals per item with individual VAT rates
    cart.forEach((item) => {
      const itemTotal = item.totalPrice;
      const itemVatRate = item.vatRate; // VAT rate as percentage (e.g., 13 for 13%)
      const itemVatRateDecimal = itemVatRate / 100; // Convert to decimal for calculations
      const itemSubtotal = itemTotal / (1 + itemVatRateDecimal);
      const itemVatAmount = itemTotal - itemSubtotal;

      total += itemTotal;
      subtotal += itemSubtotal;
      vatAmount += itemVatAmount;
    });
    
    
    return { subtotal, vatAmount, total };
  }, [cart]);

  // Process payment with WRAPP API
  const processPayment = async (
    paymentMethod: PaymentMethod,
    customerInfo: CustomerInfo,
    selectedBillingBookId: string,
    wrappSettings: any,
    businessInfo?: any,
    selectedPriceListId?: string,
    finalTotals?: { subtotal: number; vatAmount: number; total: number; discount?: number }
  ) => {
    if (cart.length === 0) {
      throw new Error("Το καλάθι είναι άδειο");
    }

    setIsProcessing(true);

    try {
      // Load price list to get MyDATA classifications (if provided)
      let priceListClassifications: { category?: string; type?: string } = {};
      
      if (selectedPriceListId) {
        try {
          const priceListDoc = await getDoc(doc(db, 'priceLists', selectedPriceListId));
          if (priceListDoc.exists()) {
            const priceListData = priceListDoc.data() as PriceList;
            priceListClassifications = {
              category: priceListData.myDataClassificationCategory,
              type: priceListData.myDataClassificationType
            };
          }
        } catch (error) {
          console.warn('⚠️ Could not load price list classifications:', error);
        }
      }

      // Use finalTotals (with discount) if provided, otherwise calculate from cart
      const totals = finalTotals || calculateTotals();

      // Calculate discount ratio if finalTotals with discount are provided
      const originalTotals = calculateTotals();
      const discountRatio = finalTotals && finalTotals.discount 
        ? (originalTotals.total - finalTotals.discount) / originalTotals.total 
        : 1;

      if (finalTotals && finalTotals.discount) {
      }

      // Calculate line items with discount applied proportionally
      const invoiceLines = cart.map((item, index) => {
        const vatRate = item.vatRate || 24; // VAT rate as percentage (e.g., 24 for 24%)
        const vatRateDecimal = vatRate / 100; // Convert to decimal for calculations (e.g., 24 -> 0.24)
        
        // Apply discount proportionally to this line item
        const originalGrossAmount = Math.round(item.totalPrice * 100) / 100;
        const grossAmount = Math.round((originalGrossAmount * discountRatio) * 100) / 100; // Apply discount
        const netAmount = Math.round((grossAmount / (1 + vatRateDecimal)) * 100) / 100; // Round to 2 decimals
        const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100; // Round to 2 decimals
        const unitNetPrice = Math.round(((item.unitPrice * discountRatio) / (1 + vatRateDecimal)) * 100) / 100; // Apply discount to unit price
        
        // Check if this is a plastic tax item (SKU 999.999.998 or 999.999.999)
        const isPlasticTax = item.product.sku === "999.999.998" || item.product.sku === "999.999.999";
        
        // Get classification with priority: Price List > Global Settings > Hardcoded Defaults
        const defaultCategory = priceListClassifications.category || wrappSettings?.defaultClassificationCategory || "category1_1";
        const defaultType = priceListClassifications.type || wrappSettings?.defaultClassificationType || "E3_561_003";
        
        // Convert quantity to grams/ml for WRAPP API (type 2=kg->g, type 3=L->ml)
        const quantityType = item.product.quantityType || 1;
        const apiQuantity = (quantityType === 2 || quantityType === 3) 
          ? Math.round(item.quantity * 1000) // Convert kg/L to g/ml
          : item.quantity;
        
        const lineItem: any = {
          line_number: index + 1,
          name: item.product.name,
          description: item.product.name,
          quantity: apiQuantity, // Send as grams/ml for weight/volume products
          quantity_type: quantityType,
          unit_price: unitNetPrice,
          net_total_price: netAmount,
          vat_rate: vatRate, // VAT rate as percentage (e.g., 24)
          vat_total: vatAmount,
          subtotal: grossAmount,
          // Priority: Plastic Tax (hardcoded) > Price List > Global Settings
          classification_category: isPlasticTax ? "category1_7" : defaultCategory,
          classification_type: isPlasticTax ? "E3_881_002" : defaultType,
        };
        
        // Log tax items with special formatting
        if (isPlasticTax) {
        }
        
        return lineItem;
      });

      // Calculate totals from invoice lines to ensure consistency with rounding
      const calculatedNetTotal = Math.round(invoiceLines.reduce((sum, line) => sum + line.net_total_price, 0) * 100) / 100;
      const calculatedVatTotal = Math.round(invoiceLines.reduce((sum, line) => sum + line.vat_total, 0) * 100) / 100;
      const calculatedGrossTotal = Math.round(invoiceLines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100;

      // Summary logging
      const taxItems = invoiceLines.filter(line => line.classification_category === "category1_7");
      const regularItems = invoiceLines.filter(line => line.classification_category !== "category1_7");
      
      const finalCategory = priceListClassifications.category || wrappSettings?.defaultClassificationCategory || "category1_1";
      const finalType = priceListClassifications.type || wrappSettings?.defaultClassificationType || "E3_561_003";
      const source = priceListClassifications.category ? "τιμοκατάλογο" : "global settings";
      

      // Prepare invoice data for WRAPP API
      const invoiceData: InvoiceData = {
        invoice_type_code: "11.1", // Απόδειξη Λιανικής Πώλησης
        billing_book_id: selectedBillingBookId,
        payment_method_type: paymentMethod === "cash" ? 0 : 1, // 0 = Μετρητά, 1 = Κάρτα
        net_total_amount: calculatedNetTotal,
        vat_total_amount: calculatedVatTotal,
        total_amount: calculatedGrossTotal,
        payable_total_amount: calculatedGrossTotal,
        invoice_lines: invoiceLines
      };

      // First login to get JWT token
      const loginResponse = await fetch('/api/wrapp/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: wrappSettings.email,
          api_key: wrappSettings.apiKey,
          baseUrl: wrappSettings.baseUrl,
        }),
      });

      
      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error("❌ Login failed:", errorText);
        throw new Error(`Failed to login to WRAPP API: ${loginResponse.status} ${loginResponse.statusText}`);
      }

      const loginData = await loginResponse.json();
      
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        throw new Error('No JWT token received from login');
      }

      // Call WRAPP API to create invoice with JWT token
      
      const response = await fetch('/api/wrapp/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          ...invoiceData,
          baseUrl: wrappSettings.baseUrl,
        }),
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Invoice API failed:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Invoice API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      
      // Check if WRAPP returned errors
      if (result.status === 'myData Errors' && result.errors) {
        console.error("❌ WRAPP API returned myData errors:");
        result.errors.forEach((error: any) => {
          console.error(`- Code ${error.code}: ${error.message}`);
        });
        throw new Error(`WRAPP API myData Errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }
      
      
      // WRAPP API returns data directly, not in nested structure
      setLastInvoiceData(result);
      
      // Trigger print immediately after WRAPP response
      setTimeout(() => {
        const printFunction = (window as any).printReceiptFunction;
        if (printFunction) {
          const printData = {
            invoiceData: result,
            cart: (window as any).cartDataForPrint || [],
            paymentMethod: (window as any).paymentMethodForPrint || 'cash',
            businessInfo: (window as any).businessInfoForPrint || {},
            currentUser: (window as any).currentUserForPrint || 'Χρήστης POS',
            recipes: (window as any).recipesDataForPrint || [],
            appliedDiscount: (window as any).appliedDiscountForPrint || null
          };
          
          
          printFunction(printData);
        } else {
          console.warn("⚠️ Print function not available yet");
        }
      }, 100);
      
      // Clear cart after successful payment
      clearCart();
      
      return result;

    } catch (error) {
      console.error("Payment error:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Save cart to localStorage
  const saveCartToStorage = useCallback(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  // Load cart from localStorage
  const loadCartFromStorage = useCallback(() => {
    try {
      const savedCart = localStorage.getItem('pos_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Error loading cart from storage:", error);
    }
  }, []);

  return {
    cart,
    isProcessing,
    lastInvoiceData,
    addToCart,
    updateCartItem,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    calculateTotals,
    processPayment,
    saveCartToStorage,
    loadCartFromStorage,
  };
};
