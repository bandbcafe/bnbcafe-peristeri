"use client";

import { useState, useEffect } from "react";
import {
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaUtensils,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    description: string;
    image?: string;
  };
  quantity: number;
  basePrice: number;
  selectedOptions: {
    groupId: string;
    optionId: string;
    name?: string;
    price: number;
  }[];
  notes: string;
  totalPrice: number;
}

export default function CustomerOrderPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCartFromStorage();
  }, []);

  useEffect(() => {
    // Only save to storage when cartItems changes and it's not the initial load
    if (cartItems.length > 0) {
      saveCartToStorage();
    }
  }, [cartItems]);

  const loadProducts = async () => {
    // Not needed for cart page
    setLoading(false);
  };

  const loadCategories = async () => {
    // Not needed for cart page
  };

  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem("customerCart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const saveCartToStorage = () => {
    localStorage.setItem("customerCart", JSON.stringify(cartItems));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    const updatedCart = cartItems.map((item) => {
      if (item.id === itemId) {
        const optionsPrice = item.selectedOptions.reduce(
          (sum: number, option: any) => sum + option.price,
          0
        );
        const totalPrice = (item.basePrice + optionsPrice) * newQuantity;
        return { ...item, quantity: newQuantity, totalPrice };
      }
      return item;
    });

    setCartItems(updatedCart);
    localStorage.setItem("customerCart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const removeItem = (itemId: string) => {
    const updatedCart = cartItems.filter((item) => item.id !== itemId);
    setCartItems(updatedCart);
    localStorage.setItem("customerCart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.setItem("customerCart", JSON.stringify([]));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const getCartTotal = () => {
    return cartItems.reduce(
      (total: number, item: CartItem) => total + item.totalPrice,
      0
    );
  };

  const getCartSubtotal = () => {
    // Υπολογισμός χωρίς ΦΠΑ (assuming 24% VAT)
    const total = getCartTotal();
    return total / 1.24;
  };

  const getCartVAT = () => {
    const subtotal = getCartSubtotal();
    return subtotal * 0.24;
  };

  const getCartItemsCount = () => {
    return cartItems.reduce(
      (total: number, item: CartItem) => total + item.quantity,
      0
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    // Redirect to checkout page
    window.location.href = "/customer/checkout";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaUtensils className="animate-spin text-4xl text-[#C9AC7A] mx-auto mb-4" />
          <p className="text-xl text-gray-600">Φορτώνουμε το καλάθι...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Το Καλάθι μου
          </h1>
          <p className="text-xl text-gray-600">
            Ελέγξτε τα προϊόντα σας και προχωρήστε στην παραγγελία
          </p>
        </div>

        {cartItems.length === 0 ? (
          // Empty Cart
          <div className="text-center py-16">
            <FaShoppingCart className="text-gray-400 text-6xl mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-600 mb-4">
              Το καλάθι σας είναι άδειο
            </h2>
            <p className="text-gray-500 mb-8">
              Προσθέστε προϊόντα από το μενού για να ξεκινήσετε την παραγγελία
              σας
            </p>
            <a
              href="/menu"
              className="bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              <FaUtensils />
              Δείτε το Μενού
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  Προϊόντα ({getCartItemsCount()}{" "}
                  {getCartItemsCount() === 1 ? "τεμάχιο" : "τεμάχια"})
                </h2>

                <div className="space-y-4">
                  {cartItems.map((item: CartItem) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.product.image ? (
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              width={80}
                              height={80}
                              className="object-cover rounded-lg"
                            />
                          ) : (
                            <FaUtensils className="text-gray-400 text-2xl" />
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">
                            {item.product.name}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {item.product.description}
                          </p>

                          {/* Selected Options */}
                          {item.selectedOptions &&
                            item.selectedOptions.length > 0 && (
                              <div className="mb-2">
                                <p className="text-sm text-gray-500 mb-1">
                                  Επιλογές:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {item.selectedOptions.map(
                                    (option: any, index: number) => (
                                      <span
                                        key={index}
                                        className="bg-[#EBE4D8] text-[#8B6B38] text-xs px-2 py-1 rounded"
                                      >
                                        {option.name || `Επιλογή ${index + 1}`}{" "}
                                        (+€{option.price.toFixed(2)})
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Notes */}
                          {item.notes && (
                            <div className="mb-2">
                              <p className="text-sm text-gray-500 mb-1">
                                Σημειώσεις:
                              </p>
                              <p className="text-sm text-gray-700 italic">
                                {item.notes}
                              </p>
                            </div>
                          )}

                          {/* Price per item */}
                          <div className="text-sm text-gray-600">
                            €{item.basePrice.toFixed(2)}
                            {item.selectedOptions.length > 0 && (
                              <span>
                                {" "}
                                + €
                                {item.selectedOptions
                                  .reduce(
                                    (sum: number, opt: any) => sum + opt.price,
                                    0
                                  )
                                  .toFixed(2)}
                              </span>
                            )}
                            <span className="text-gray-500"> ανά τεμάχιο</span>
                          </div>
                        </div>

                        {/* Quantity Controls and Price */}
                        <div className="flex flex-col items-end gap-3">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            ✕
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                            >
                              <FaMinus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                            >
                              <FaPlus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold text-[#C9AC7A]">
                              €{item.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  Σύνοψη Παραγγελίας
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Υποσύνολο (χωρίς ΦΠΑ)</span>
                    <span className="font-semibold">
                      €{getCartSubtotal().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ΦΠΑ (24%)</span>
                    <span className="font-semibold">
                      €{getCartVAT().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Έξοδα αποστολής</span>
                    <span className="font-semibold">€0.00</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Σύνολο (με ΦΠΑ)</span>
                    <span className="text-[#C9AC7A]">
                      €{getCartTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-[#C9AC7A] hover:bg-[#9F7D41] text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <FaShoppingCart />
                    Προχώρηση στην Πληρωμή
                  </button>

                  <a
                    href="/menu"
                    className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-colors hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <FaUtensils />
                    Συνέχεια Αγορών
                  </a>

                  <button
                    onClick={clearCart}
                    className="w-full text-red-600 hover:text-red-700 py-2 text-sm transition-colors"
                  >
                    Καθαρισμός Καλαθιού
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
