"use client";

import React, { useState } from "react";
import { FiX, FiShoppingCart, FiPlus, FiMinus, FiCheck, FiInfo } from "react-icons/fi";
import Image from "next/image";
import { Product, Recipe, RecipeGroup, RecipeOption } from "@/types/products";
import ActionButton from "./ui/ActionButton";

interface ProductPreviewModalProps {
  product: Product;
  recipes: Recipe[];
  onClose: () => void;
}

interface SelectedOption {
  groupId: string;
  optionId: string;
  price: number;
}

const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ 
  product, 
  recipes, 
  onClose 
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Get recipes associated with this product
  const productRecipes = recipes.filter(recipe => 
    product.recipeIds?.includes(recipe.id)
  );

  // Initialize selected options with default values
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>(() => {
    const defaultOptions: SelectedOption[] = [];
    
    productRecipes.forEach(recipe => {
      recipe.groups.forEach(group => {
        group.options.forEach(option => {
          if (option.isDefault) {
            defaultOptions.push({
              groupId: group.id,
              optionId: option.id,
              price: option.price
            });
          }
        });
      });
    });
    
    return defaultOptions;
  });

  // Calculate total price
  const basePrice = product.priceListPrices?.[0]?.price || 0;
  const optionsPrice = selectedOptions.reduce((sum, option) => sum + option.price, 0);
  const totalPrice = (basePrice + optionsPrice) * quantity;

  const handleOptionChange = (group: RecipeGroup, option: RecipeOption, isSelected: boolean) => {
    setSelectedOptions(prev => {
      if (group.type === "radio") {
        // For radio buttons, replace any existing selection for this group
        const filtered = prev.filter(sel => sel.groupId !== group.id);
        if (isSelected) {
          return [...filtered, { groupId: group.id, optionId: option.id, price: option.price }];
        }
        return filtered;
      } else if (group.type === "checkbox") {
        // For checkboxes, add or remove the option
        if (isSelected) {
          // Check max selections limit
          const currentGroupSelections = prev.filter(sel => sel.groupId === group.id);
          if (group.maxSelections && currentGroupSelections.length >= group.maxSelections) {
            return prev; // Don't add if limit reached
          }
          return [...prev, { groupId: group.id, optionId: option.id, price: option.price }];
        } else {
          return prev.filter(sel => !(sel.groupId === group.id && sel.optionId === option.id));
        }
      }
      return prev;
    });
  };

  const isOptionSelected = (groupId: string, optionId: string) => {
    return selectedOptions.some(sel => sel.groupId === groupId && sel.optionId === optionId);
  };

  const getGroupSelectionCount = (groupId: string) => {
    return selectedOptions.filter(sel => sel.groupId === groupId).length;
  };

  const canSelectMore = (group: RecipeGroup) => {
    if (group.type !== "checkbox" || !group.maxSelections) return true;
    return getGroupSelectionCount(group.id) < group.maxSelections;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FiShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Προεπισκόπηση Προϊόντος
                </h2>
                <p className="text-green-100 text-sm">
                  Πώς θα φαίνεται στην παραγγελία
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pb-4">
            {/* Product Info */}
            <div className="flex gap-6 mb-6">
              <div className="w-32 h-32 relative flex-shrink-0">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
                    <FiInfo className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  {product.name}
                </h3>
                <p className="text-slate-600 mb-4">
                  {product.description}
                </p>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-green-600">
                    €{basePrice.toFixed(2)}
                  </div>
                  {product.tags.length > 0 && (
                    <div className="flex gap-2">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
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
            {productRecipes.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  Προσαρμογές
                </h4>
                
                {productRecipes.map((recipe) => (
                  <div key={recipe.id} className="space-y-4">
                    {recipe.name && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <h5 className="font-semibold text-purple-800">{recipe.name}</h5>
                        {recipe.description && (
                          <p className="text-sm text-purple-600 mt-1">{recipe.description}</p>
                        )}
                      </div>
                    )}
                    
                    {recipe.groups
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((group) => (
                        <div key={group.id} className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h6 className="font-semibold text-slate-800 flex items-center gap-2">
                                {group.name}
                                {group.required && (
                                  <span className="text-red-500 text-sm">*</span>
                                )}
                              </h6>
                              {group.description && (
                                <p className="text-sm text-slate-600 mt-1">{group.description}</p>
                              )}
                            </div>
                            {group.type === "checkbox" && group.maxSelections && (
                              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                                {getGroupSelectionCount(group.id)}/{group.maxSelections}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {group.options.map((option) => {
                              const isSelected = isOptionSelected(group.id, option.id);
                              const canSelect = canSelectMore(group) || isSelected;
                              
                              return (
                                <label
                                  key={option.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-green-300 bg-green-50"
                                      : canSelect
                                      ? "border-slate-200 bg-white hover:border-green-200"
                                      : "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type={group.type === "radio" ? "radio" : "checkbox"}
                                      name={group.type === "radio" ? `group-${group.id}` : undefined}
                                      checked={isSelected}
                                      disabled={!canSelect}
                                      onChange={(e) => handleOptionChange(group, option, e.target.checked)}
                                      className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                                    />
                                    <div>
                                      <span className="font-medium text-slate-800">
                                        {option.name}
                                      </span>
                                    </div>
                                  </div>
                                  {option.price > 0 && (
                                    <span className="font-semibold text-green-600">
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

            {/* Quantity and Notes */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-semibold text-slate-800">Ποσότητα:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <FiMinus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-2">
                  Ειδικές Οδηγίες (προαιρετικό):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="π.χ. Χωρίς πάγο, επιπλέον ζεστό, κτλ..."
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="mt-6 bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Βασική τιμή:</span>
                  <span>€{basePrice.toFixed(2)}</span>
                </div>
                {optionsPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Προσαρμογές:</span>
                    <span>+€{optionsPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Ποσότητα:</span>
                  <span>x{quantity}</span>
                </div>
                <div className="border-t border-green-300 pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Σύνολο:</span>
                    <span className="text-green-700">€{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="border-t border-slate-200 p-6 flex-shrink-0 bg-white rounded-b-2xl">
          <div className="flex gap-3">
            <ActionButton onClick={onClose} variant="secondary" className="flex-1">
              Κλείσιμο
            </ActionButton>
            <ActionButton 
              icon={FiShoppingCart} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Προσθήκη στο Καλάθι - €{totalPrice.toFixed(2)}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;
