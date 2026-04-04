"use client";

import React, { useState } from "react";
import { FiX, FiPlus, FiTrash2, FiSave, FiMove } from "react-icons/fi";
import { Recipe, RecipeGroup, RecipeOption, RecipeOptionType } from "@/types/products";
import ActionButton from "./ui/ActionButton";

interface RecipeModalProps {
  recipe?: Recipe;
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, "id" | "createdAt" | "updatedAt">) => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: recipe?.name || "",
    description: recipe?.description || "",
    groups: recipe?.groups || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Το όνομα της συνταγής είναι υποχρεωτικό";
    }

    formData.groups.forEach((group, groupIndex) => {
      if (!group.name.trim()) {
        newErrors[`group_${groupIndex}_name`] = "Το όνομα της ομάδας είναι υποχρεωτικό";
      }

      if (group.options.length === 0) {
        newErrors[`group_${groupIndex}_options`] = "Η ομάδα πρέπει να έχει τουλάχιστον μία επιλογή";
      }

      group.options.forEach((option, optionIndex) => {
        if (!option.name.trim()) {
          newErrors[`group_${groupIndex}_option_${optionIndex}_name`] = "Το όνομα της επιλογής είναι υποχρεωτικό";
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const addGroup = () => {
    const newGroup: RecipeGroup = {
      id: `group_${Date.now()}`,
      name: "",
      description: "",
      type: "radio",
      required: false,
      options: [],
      sortOrder: formData.groups.length,
    };
    setFormData({
      ...formData,
      groups: [...formData.groups, newGroup],
    });
  };

  const updateGroup = (groupIndex: number, updates: Partial<RecipeGroup>) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], ...updates };
    setFormData({ ...formData, groups: updatedGroups });
  };

  const removeGroup = (groupIndex: number) => {
    const updatedGroups = formData.groups.filter((_, index) => index !== groupIndex);
    setFormData({ ...formData, groups: updatedGroups });
  };

  const addOption = (groupIndex: number) => {
    const newOption: RecipeOption = {
      id: `option_${Date.now()}`,
      name: "",
      price: 0,
      isDefault: false,
    };
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex].options.push(newOption);
    setFormData({ ...formData, groups: updatedGroups });
  };

  const updateOption = (groupIndex: number, optionIndex: number, updates: Partial<RecipeOption>) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex].options[optionIndex] = {
      ...updatedGroups[groupIndex].options[optionIndex],
      ...updates,
    };
    setFormData({ ...formData, groups: updatedGroups });
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const updatedGroups = [...formData.groups];
    updatedGroups[groupIndex].options = updatedGroups[groupIndex].options.filter(
      (_, index) => index !== optionIndex
    );
    setFormData({ ...formData, groups: updatedGroups });
  };

  const moveGroup = (groupIndex: number, direction: "up" | "down") => {
    const updatedGroups = [...formData.groups];
    const targetIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < updatedGroups.length) {
      [updatedGroups[groupIndex], updatedGroups[targetIndex]] = 
      [updatedGroups[targetIndex], updatedGroups[groupIndex]];
      
      // Update sort order
      updatedGroups.forEach((group, index) => {
        group.sortOrder = index;
      });
      
      setFormData({ ...formData, groups: updatedGroups });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiSave className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {recipe ? "Επεξεργασία Συνταγής" : "Νέα Συνταγή"}
                </h2>
                <p className="text-purple-100 text-sm">
                  Δημιουργία επιλογών για προσαρμογή προϊόντων
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="p-8">
            {/* Basic Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Βασικά Στοιχεία</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Όνομα Συνταγής *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.name ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                    }`}
                    placeholder="π.χ. Επιλογές Καφέ"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Περιγραφή
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Προαιρετική περιγραφή"
                  />
                </div>
              </div>
            </div>

            {/* Recipe Groups */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Ομάδες Επιλογών</h3>
                <ActionButton onClick={addGroup} icon={FiPlus} size="sm">
                  Προσθήκη Ομάδας
                </ActionButton>
              </div>

              <div className="space-y-6">
                {formData.groups.map((group, groupIndex) => (
                  <div key={group.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-slate-800">Ομάδα {groupIndex + 1}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveGroup(groupIndex, "up")}
                          disabled={groupIndex === 0}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-50"
                        >
                          <FiMove className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGroup(groupIndex, "down")}
                          disabled={groupIndex === formData.groups.length - 1}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-50"
                        >
                          <FiMove className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(groupIndex)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Όνομα Ομάδας *
                        </label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors ${
                            errors[`group_${groupIndex}_name`] ? "border-red-300" : "border-slate-200 focus:border-blue-500"
                          }`}
                          placeholder="π.χ. Γλυκό"
                        />
                        {errors[`group_${groupIndex}_name`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`group_${groupIndex}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Τύπος Επιλογής
                        </label>
                        <select
                          value={group.type}
                          onChange={(e) => updateGroup(groupIndex, { type: e.target.value as RecipeOptionType })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                          <option value="radio">Μονή επιλογή (Radio)</option>
                          <option value="checkbox">Πολλαπλές επιλογές (Checkbox)</option>
                          <option value="dropdown">Λίστα επιλογών (Dropdown)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Υποχρεωτικό
                        </label>
                        <div className="flex items-center h-10">
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) => updateGroup(groupIndex, { required: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-slate-600">Απαιτείται επιλογή</span>
                        </div>
                      </div>
                      {group.type === "checkbox" && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Μέγιστες Επιλογές
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={group.maxSelections || ""}
                            onChange={(e) => updateGroup(groupIndex, { 
                              maxSelections: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                            placeholder="Χωρίς όριο"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Περιγραφή
                      </label>
                      <input
                        type="text"
                        value={group.description || ""}
                        onChange={(e) => updateGroup(groupIndex, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Προαιρετική περιγραφή"
                      />
                    </div>

                    {/* Options */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-slate-700">Επιλογές</label>
                        <button
                          type="button"
                          onClick={() => addOption(groupIndex)}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <FiPlus className="w-3 h-3" />
                          Προσθήκη Επιλογής
                        </button>
                      </div>
                      
                      {errors[`group_${groupIndex}_options`] && (
                        <p className="text-red-500 text-sm mb-2">{errors[`group_${groupIndex}_options`]}</p>
                      )}

                      <div className="space-y-2">
                        {group.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => updateOption(groupIndex, optionIndex, { name: e.target.value })}
                                className={`w-full px-3 py-2 border rounded focus:outline-none transition-colors ${
                                  errors[`group_${groupIndex}_option_${optionIndex}_name`] ? "border-red-300" : "border-slate-200 focus:border-blue-500"
                                }`}
                                placeholder="Όνομα επιλογής"
                              />
                              {errors[`group_${groupIndex}_option_${optionIndex}_name`] && (
                                <p className="text-red-500 text-xs mt-1">{errors[`group_${groupIndex}_option_${optionIndex}_name`]}</p>
                              )}
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                step="0.01"
                                value={option.price}
                                onChange={(e) => updateOption(groupIndex, optionIndex, { 
                                  price: parseFloat(e.target.value) || 0 
                                })}
                                className="w-full px-2 py-2 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-sm"
                                placeholder="€0.00"
                              />
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={option.isDefault || false}
                                onChange={(e) => updateOption(groupIndex, optionIndex, { isDefault: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-1 text-xs text-slate-600">Προεπιλογή</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOption(groupIndex, optionIndex)}
                              className="p-1 hover:bg-red-100 text-red-600 rounded"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.groups.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <p className="text-slate-600">Δεν υπάρχουν ομάδες επιλογών</p>
                  <p className="text-slate-500 text-sm mt-1">Προσθέστε μια ομάδα για να ξεκινήσετε</p>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <ActionButton onClick={onClose} variant="secondary" className="flex-1">
                Ακύρωση
              </ActionButton>
              <ActionButton type="submit" icon={FiSave} className="flex-1">
                {recipe ? "Ενημέρωση Συνταγής" : "Αποθήκευση Συνταγής"}
              </ActionButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
