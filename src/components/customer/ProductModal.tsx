"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  FaUtensils,
  FaTimes,
  FaPlus,
  FaMinus,
  FaShoppingCart,
} from "react-icons/fa";

interface Product {
  id: string;
  name: string;
  description: string;
  image?: string;
  category:
    | string
    | {
        id: string;
        name: string;
        color?: string;
        description?: string;
      };
  priceListPrices: {
    priceListId: string;
    price: number;
    vatRate: number;
  }[];
  recipeIds?: string[];
  tags: string[];
  status: string;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  groups: RecipeGroup[];
}

interface RecipeGroup {
  id: string;
  name: string;
  description?: string;
  type: "radio" | "checkbox" | "dropdown";
  required: boolean;
  maxSelections?: number;
  options: RecipeOption[];
  sortOrder: number;
}

interface RecipeOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

interface SelectedOption {
  groupId: string;
  optionId: string;
  price: number;
}

interface WebsiteSettings {
  customerSettings?: {
    selectedPriceListId: string;
  };
}

interface ProductModalProps {
  product: Product | null;
  recipes: Recipe[];
  websiteSettings: WebsiteSettings | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: any) => void;
}

export default function ProductModal({
  product,
  recipes,
  websiteSettings,
  isOpen,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Initialize default options when product changes
  useEffect(() => {
    if (product && recipes) {
      const defaultOptions: SelectedOption[] = [];
      const productRecipes = recipes.filter((recipe) =>
        product.recipeIds?.includes(recipe.id),
      );

      productRecipes.forEach((recipe) => {
        recipe.groups.forEach((group) => {
          group.options.forEach((option) => {
            if (option.isDefault) {
              defaultOptions.push({
                groupId: group.id,
                optionId: option.id,
                price: option.price,
              });
            }
          });
        });
      });

      setSelectedOptions(defaultOptions);
    }
  }, [product, recipes]);

  if (!isOpen || !product) return null;

  const getProductPrice = (product: Product): number => {
    const selectedPriceListId =
      websiteSettings?.customerSettings?.selectedPriceListId;

    // If we have a selected price list, use it
    if (selectedPriceListId) {
      const priceEntry = product.priceListPrices?.find(
        (p) => p.priceListId === selectedPriceListId,
      );
      if (priceEntry) return priceEntry.price;
    }

    // Fallback to first available price if no specific price list is selected
    if (product.priceListPrices && product.priceListPrices.length > 0) {
      return product.priceListPrices[0].price;
    }

    return 0;
  };

  const getProductVatRate = (product: Product): number => {
    const selectedPriceListId =
      websiteSettings?.customerSettings?.selectedPriceListId;

    // If we have a selected price list, use it
    if (selectedPriceListId) {
      const priceEntry = product.priceListPrices?.find(
        (p) => p.priceListId === selectedPriceListId,
      );
      if (priceEntry) {
        // Convert decimal to percentage (0.24 -> 24)
        const vatRate = priceEntry.vatRate || 0.24;
        return vatRate < 1 ? vatRate * 100 : vatRate;
      }
    }

    // Fallback to first available price if no specific price list is selected
    if (product.priceListPrices && product.priceListPrices.length > 0) {
      const vatRate = product.priceListPrices[0].vatRate || 0.24;
      return vatRate < 1 ? vatRate * 100 : vatRate;
    }

    return 24; // Default 24%
  };

  const handleOptionChange = (
    group: RecipeGroup,
    option: RecipeOption,
    isSelected: boolean,
  ) => {
    setSelectedOptions((prev) => {
      if (group.type === "radio") {
        // For radio buttons, replace any existing selection for this group
        const filtered = prev.filter((sel) => sel.groupId !== group.id);
        if (isSelected) {
          return [
            ...filtered,
            { groupId: group.id, optionId: option.id, price: option.price },
          ];
        }
        return filtered;
      } else if (group.type === "checkbox") {
        // For checkboxes, add or remove the option
        if (isSelected) {
          // Check max selections limit
          const currentGroupSelections = prev.filter(
            (sel) => sel.groupId === group.id,
          );
          if (
            group.maxSelections &&
            currentGroupSelections.length >= group.maxSelections
          ) {
            return prev; // Don't add if limit reached
          }
          return [
            ...prev,
            { groupId: group.id, optionId: option.id, price: option.price },
          ];
        } else {
          return prev.filter(
            (sel) => !(sel.groupId === group.id && sel.optionId === option.id),
          );
        }
      }
      return prev;
    });
  };

  const isOptionSelected = (groupId: string, optionId: string) => {
    return selectedOptions.some(
      (sel) => sel.groupId === groupId && sel.optionId === optionId,
    );
  };

  const getGroupSelectionCount = (groupId: string) => {
    return selectedOptions.filter((sel) => sel.groupId === groupId).length;
  };

  const canSelectMore = (group: RecipeGroup) => {
    if (group.type !== "checkbox" || !group.maxSelections) return true;
    return getGroupSelectionCount(group.id) < group.maxSelections;
  };

  const handleAddToCart = () => {
    const basePrice = getProductPrice(product);
    const optionsPrice = selectedOptions.reduce(
      (sum, option) => sum + option.price,
      0,
    );
    const totalPrice = (basePrice + optionsPrice) * quantity;

    // Enrich selected options with names from recipes
    const enrichedOptions = selectedOptions.map((selectedOption) => {
      const recipe = recipes.find((r) => product.recipeIds?.includes(r.id));
      if (recipe) {
        const group = recipe.groups.find(
          (g) => g.id === selectedOption.groupId,
        );
        if (group) {
          const option = group.options.find(
            (o) => o.id === selectedOption.optionId,
          );
          if (option) {
            return {
              ...selectedOption,
              name: option.name,
            };
          }
        }
      }
      return selectedOption;
    });

    const cartItem = {
      id: `${product.id}-${Date.now()}`,
      product,
      quantity,
      basePrice,
      selectedOptions: enrichedOptions,
      notes,
      totalPrice,
      vatRate: getProductVatRate(product), // Προσθήκη ΦΠΑ από τιμοκατάλογο
    };

    onAddToCart(cartItem);
    handleClose();
  };

  const handleClose = () => {
    // Reset all states when closing
    setSelectedOptions([]);
    setQuantity(1);
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-black px-4 py-3 md:px-6 md:py-4 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FaUtensils className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base md:text-xl font-bold text-white">
                  {product.name}
                </h2>
                <p className="text-gray-300 text-xs md:text-sm hidden md:block">
                  Προσαρμόστε την παραγγελία σας
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <FaTimes className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 md:p-6 pb-2 md:pb-4">
            {/* Product Info */}
            <div className="flex gap-3 md:gap-6 mb-4 md:mb-6">
              <div className="w-20 h-20 md:w-32 md:h-32 relative flex-shrink-0">
                {product.image && product.image.startsWith("data:image") ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    suppressHydrationWarning
                  />
                ) : product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    unoptimized={true}
                    className="object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
                    <FaUtensils className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="text-slate-600 text-xs md:text-base mb-2 md:mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="text-xl md:text-3xl font-bold text-[#C9AC7A]">
                    €{getProductPrice(product).toFixed(2)}
                  </div>
                  {product.tags && product.tags.length > 0 && (
                    <div className="hidden md:flex gap-2">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recipe Options */}
            {recipes.filter((recipe) => product.recipeIds?.includes(recipe.id))
              .length > 0 && (
              <div className="space-y-3 md:space-y-6">
                <h4 className="text-base md:text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  Προσαρμογές
                </h4>

                {recipes
                  .filter((recipe) => product.recipeIds?.includes(recipe.id))
                  .map((recipe) => (
                    <div key={recipe.id} className="space-y-2 md:space-y-4">
                      {recipe.name && (
                        <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                          <h5 className="text-sm md:text-base font-semibold text-gray-800">
                            {recipe.name}
                          </h5>
                          {recipe.description && (
                            <p className="text-xs md:text-sm text-gray-600 mt-1">
                              {recipe.description}
                            </p>
                          )}
                        </div>
                      )}

                      {recipe.groups
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((group) => (
                          <div
                            key={group.id}
                            className="bg-slate-50 rounded-xl p-3 md:p-4"
                          >
                            <div className="flex items-center justify-between mb-2 md:mb-3">
                              <div>
                                <h6 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
                                  {group.name}
                                  {group.required && (
                                    <span className="text-red-500 text-xs md:text-sm">
                                      *
                                    </span>
                                  )}
                                </h6>
                                {group.description && (
                                  <p className="text-xs md:text-sm text-slate-600 mt-1">
                                    {group.description}
                                  </p>
                                )}
                              </div>
                              {group.type === "checkbox" &&
                                group.maxSelections && (
                                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                                    {getGroupSelectionCount(group.id)}/
                                    {group.maxSelections}
                                  </span>
                                )}
                            </div>

                            <div className="space-y-2">
                              {group.options.map((option) => {
                                const isSelected = isOptionSelected(
                                  group.id,
                                  option.id,
                                );
                                const canSelect =
                                  canSelectMore(group) || isSelected;

                                return (
                                  <label
                                    key={option.id}
                                    className={`flex items-center justify-between p-2 md:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? "border-[#D4C1A5] bg-[#F5F0E8]"
                                        : canSelect
                                          ? "border-slate-200 bg-white hover:border-[#D9C9B0]"
                                          : "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type={
                                          group.type === "radio"
                                            ? "radio"
                                            : "checkbox"
                                        }
                                        name={
                                          group.type === "radio"
                                            ? `group-${group.id}`
                                            : undefined
                                        }
                                        checked={isSelected}
                                        disabled={!canSelect}
                                        onChange={(e) =>
                                          handleOptionChange(
                                            group,
                                            option,
                                            e.target.checked,
                                          )
                                        }
                                        className="w-4 h-4 text-[#C9AC7A] border-slate-300 rounded focus:ring-[#C9AC7A]"
                                      />
                                      <div>
                                        <span className="font-medium text-slate-800">
                                          {option.name}
                                        </span>
                                      </div>
                                    </div>
                                    {option.price > 0 && (
                                      <span className="font-semibold text-[#C9AC7A]">
                                        +€{option.price.toFixed(2)}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            )}

            {/* Notes and Quantity Section */}
            <div className="space-y-2 md:space-y-4">
              <div>
                <label className="block text-sm md:text-base font-semibold text-slate-800 mb-2">
                  Ποσότητα:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 md:p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <FaMinus className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold text-base md:text-lg">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 md:p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <FaPlus className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-base font-semibold text-slate-800 mb-2">
                  Ειδικές Οδηγίες (προαιρετικό):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-slate-200 rounded-xl focus:border-[#C9AC7A] focus:outline-none resize-none text-sm md:text-base"
                  rows={3}
                  placeholder="π.χ. Χωρίς πάγο, επιπλέον ζεστό, κτλ..."
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="mt-6 bg-[#F5F0E8] rounded-xl p-4 border border-[#D9C9B0]">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Βασική τιμή:</span>
                  <span>€{getProductPrice(product).toFixed(2)}</span>
                </div>
                {selectedOptions.reduce(
                  (sum, option) => sum + option.price,
                  0,
                ) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Προσαρμογές:</span>
                    <span>
                      +€
                      {selectedOptions
                        .reduce((sum, option) => sum + option.price, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Ποσότητα:</span>
                  <span>x{quantity}</span>
                </div>
                <div className="border-t border-[#D4C1A5] pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Σύνολο:</span>
                    <span className="text-[#9F7D41]">
                      €
                      {(
                        (getProductPrice(product) +
                          selectedOptions.reduce(
                            (sum, option) => sum + option.price,
                            0,
                          )) *
                        quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="border-t border-slate-200 p-3 md:p-6 flex-shrink-0 bg-white rounded-b-2xl">
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-black hover:bg-gray-800 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <FaShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
              Προσθήκη - €
              {(
                (getProductPrice(product) +
                  selectedOptions.reduce(
                    (sum, option) => sum + option.price,
                    0,
                  )) *
                quantity
              ).toFixed(2)}
            </button>
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 md:px-6 md:py-3 border border-gray-300 rounded-lg transition-colors text-sm md:text-base"
            >
              Ακύρωση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
