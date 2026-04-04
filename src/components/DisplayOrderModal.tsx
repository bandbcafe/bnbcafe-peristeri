"use client";

import React, { useState, useEffect } from "react";
import {
  FiX,
  FiMove,
  FiChevronUp,
  FiChevronDown,
  FiSave,
  FiGrid,
  FiPackage,
} from "react-icons/fi";
import { Product, ProductCategory } from "@/types/products";
import { useProducts, useCategories } from "@/hooks/useProducts";

interface DisplayOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderItem {
  id: string;
  name: string;
  type: "category" | "product";
  categoryId?: string;
  displayOrder: number;
}

const DisplayOrderModal: React.FC<DisplayOrderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, updateProduct } = useProducts();
  const { categories, updateCategory } = useCategories();

  const [activeTab, setActiveTab] = useState<"categories" | "products">(
    "categories"
  );
  const [categoryItems, setCategoryItems] = useState<OrderItem[]>([]);
  const [productItems, setProductItems] = useState<OrderItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  // Initialize items when modal opens
  useEffect(() => {
    if (isOpen) {
      // Initialize categories
      const catItems = categories
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          type: "category" as const,
          displayOrder: cat.displayOrder || 0,
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
      setCategoryItems(catItems);

      // Initialize products
      const prodItems = products
        .map((prod) => ({
          id: prod.id,
          name: prod.name,
          type: "product" as const,
          categoryId:
            typeof prod.category === "string"
              ? prod.category
              : prod.category?.id,
          displayOrder: prod.displayOrder || 0,
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
      setProductItems(prodItems);
    }
  }, [isOpen, categories, products]);

  const moveItem = (
    items: OrderItem[],
    setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>,
    index: number,
    direction: "up" | "down"
  ) => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [
        newItems[targetIndex],
        newItems[index],
      ];

      // Update display orders
      newItems.forEach((item, idx) => {
        item.displayOrder = idx;
      });

      setItems(newItems);
    }
  };

  const getFilteredProducts = () => {
    if (selectedCategoryId === "all") {
      return productItems;
    }
    return productItems.filter(
      (item) => item.categoryId === selectedCategoryId
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save categories
      for (const item of categoryItems) {
        const category = categories.find((cat) => cat.id === item.id);
        if (category && category.displayOrder !== item.displayOrder) {
          await updateCategory(item.id, { displayOrder: item.displayOrder });
        }
      }

      // Save products
      for (const item of productItems) {
        const product = products.find((prod) => prod.id === item.id);
        if (product && product.displayOrder !== item.displayOrder) {
          await updateProduct(item.id, { displayOrder: item.displayOrder });
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving display order:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiMove className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Σειρά Εμφάνισης
              </h2>
              <p className="text-sm text-gray-600">
                Καθορίστε τη σειρά εμφάνισης κατηγοριών και προϊόντων
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FiGrid className="w-4 h-4" />
              Κατηγορίες ({categoryItems.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "products"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FiPackage className="w-4 h-4" />
              Προϊόντα ({productItems.length})
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === "categories" ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Σειρά Κατηγοριών
              </h3>
              {categoryItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-500">Κατηγορία</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        moveItem(categoryItems, setCategoryItems, index, "up")
                      }
                      disabled={index === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronUp className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() =>
                        moveItem(categoryItems, setCategoryItems, index, "down")
                      }
                      disabled={index === categoryItems.length - 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Σειρά Προϊόντων
                </h3>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Όλες οι κατηγορίες</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {getFilteredProducts().map((item, index) => {
                  const globalIndex = productItems.findIndex(
                    (p) => p.id === item.id
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold text-green-600">
                            {item.displayOrder + 1}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">
                            {item.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {categories.find(
                              (cat) => cat.id === item.categoryId
                            )?.name || "Χωρίς κατηγορία"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            moveItem(
                              productItems,
                              setProductItems,
                              globalIndex,
                              "up"
                            )
                          }
                          disabled={globalIndex === 0}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiChevronUp className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() =>
                            moveItem(
                              productItems,
                              setProductItems,
                              globalIndex,
                              "down"
                            )
                          }
                          disabled={globalIndex === productItems.length - 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Ακύρωση
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            {saving ? "Αποθήκευση..." : "Αποθήκευση"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisplayOrderModal;
