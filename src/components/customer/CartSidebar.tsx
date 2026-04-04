"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FaTimes,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaTrash,
  FaCreditCard,
  FaUtensils,
} from "react-icons/fa";

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
  vatRate?: number; // ΦΠΑ από τον τιμοκατάλογο
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCartFromStorage();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleCartUpdate = () => {
      if (isOpen) {
        loadCartFromStorage();
      }
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [isOpen]);

  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem("customerCart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    const updatedCart = cartItems.map((item) => {
      if (item.id === itemId) {
        const optionsPrice = item.selectedOptions.reduce(
          (sum, option) => sum + option.price,
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
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartSubtotal = () => {
    // Οι τιμές των προϊόντων είναι ΜΕ ΦΠΑ - υπολογίζουμε το καθαρό ποσό
    return cartItems.reduce((totalSubtotal, item) => {
      // Το vatRate μπορεί να είναι σε δεκαδική μορφή (0.24) ή ποσοστό (24)
      let vatRate = item.vatRate || 24; // Default 24% αν δεν υπάρχει
      // Αν είναι μεγαλύτερο από 1, το μετατρέπουμε σε δεκαδικό
      if (vatRate > 1) {
        vatRate = vatRate / 100;
      }
      // Υπολογισμός καθαρού ποσού από τιμή με ΦΠΑ
      const itemSubtotal = item.totalPrice / (1 + vatRate);
      return totalSubtotal + itemSubtotal;
    }, 0);
  };

  const getCartVAT = () => {
    // Υπολογισμός ΦΠΑ από τη διαφορά μεταξύ συνόλου και καθαρού
    return getCartTotal() - getCartSubtotal();
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Συνάρτηση για να βρίσκει τα μοναδικά ποσοστά ΦΠΑ στο καλάθι
  const getVATRatesUsed = () => {
    const vatRates = new Set<number>();
    cartItems.forEach((item) => {
      let vatRate = item.vatRate || 24;
      if (vatRate > 1) {
        vatRate = vatRate / 100;
      }
      vatRates.add(vatRate * 100); // Μετατροπή σε ποσοστό για εμφάνιση
    });
    return Array.from(vatRates).sort();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ease-in-out ${
          isOpen
            ? "bg-opacity-50 opacity-100"
            : "bg-opacity-0 opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaShoppingCart className="text-[#C9AC7A]" />
            Το Καλάθι μου ({getCartItemsCount()})
          </h2>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο καλαθιού"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9AC7A]"></div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-4">
              <FaShoppingCart className="text-gray-300 text-4xl mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                Το καλάθι σας είναι άδειο
              </h3>
              <p className="text-gray-400 text-center mb-4">
                Προσθέστε προϊόντα από το μενού για να ξεκινήσετε
              </p>
              <Link
                href="/menu"
                onClick={onClose}
                className="bg-[#9F7D41] hover:bg-[#8B6A35] text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <FaUtensils />
                Δείτε το Μενού
              </Link>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-3 transform transition-all duration-300 ease-in-out hover:shadow-md hover:scale-[1.02]"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: isOpen
                      ? "slideInUp 0.4s ease-out forwards"
                      : "none",
                  }}
                >
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product.image &&
                      item.product.image.startsWith("data:image") ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          suppressHydrationWarning
                        />
                      ) : item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={64}
                          height={64}
                          className="object-cover rounded-lg"
                          unoptimized={true}
                        />
                      ) : (
                        <FaUtensils className="text-gray-400" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {item.product.description}
                      </p>

                      {/* Selected Options */}
                      {item.selectedOptions &&
                        item.selectedOptions.length > 0 && (
                          <div className="mb-2">
                            <div className="flex flex-wrap gap-1">
                              {item.selectedOptions.map((option, index) => (
                                <span
                                  key={index}
                                  className="bg-[#EBE4D8] text-[#8B6B38] text-xs px-2 py-1 rounded"
                                >
                                  {option.name || `Επιλογή ${index + 1}`} (+€
                                  {option.price.toFixed(2)})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Notes */}
                      {item.notes && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 italic">
                            Σημειώσεις: {item.notes}
                          </p>
                        </div>
                      )}

                      {/* Price and Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium text-[#C9AC7A]">
                            €{item.totalPrice.toFixed(2)}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">
                            (€
                            {(
                              item.basePrice +
                              item.selectedOptions.reduce(
                                (sum, opt) => sum + opt.price,
                                0
                              )
                            ).toFixed(2)}{" "}
                            x {item.quantity})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <FaMinus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <FaPlus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors ml-2"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with totals and checkout */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Υποσύνολο (χωρίς ΦΠΑ):</span>
                <span className="font-medium">
                  €{getCartSubtotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  ΦΠΑ ({getVATRatesUsed().join("%, ")}%):
                </span>
                <span className="font-medium">€{getCartVAT().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Έξοδα αποστολής:</span>
                <span className="font-medium">€0.00</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Σύνολο (με ΦΠΑ):</span>
                <span className="text-[#C9AC7A]">
                  €{(getCartSubtotal() + getCartVAT()).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Link
                href="/checkout"
                onClick={onClose}
                className="w-full bg-[#9F7D41] hover:bg-[#8B6A35] text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <FaCreditCard />
                Ταμείο
              </Link>

              <div className="flex gap-2">
                <Link
                  href="/menu"
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"
                >
                  <FaUtensils />
                  Συνέχεια Αγορών
                </Link>

                <button
                  onClick={clearCart}
                  className="flex-1 text-red-600 hover:text-red-700 py-2 text-sm transition-colors border border-red-200 hover:border-red-300 rounded-lg"
                >
                  Καθαρισμός
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
