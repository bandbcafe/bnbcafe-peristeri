"use client";

import React, { useState, useMemo } from "react";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiDollarSign,
  FiTag,
  FiGrid,
  FiList,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiImage,
  FiEye,
  FiEyeOff,
  FiBook,
  FiSave,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiMove,
} from "react-icons/fi";
import Image from "next/image";
import {
  useProducts,
  useCategories,
  useRecipes,
  usePriceLists,
} from "@/hooks/useProducts";
import {
  Product,
  ProductCategory,
  Recipe,
  PriceList,
  ProductStats,
} from "@/types/products";
import ActionButton from "@/components/ui/ActionButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RecipeModal from "@/components/RecipeModal";
import PriceListModal from "@/components/PriceListModal";
import StockModal from "@/components/StockModal";
import ProductPreviewModal from "@/components/ProductPreviewModal";
import ImageUpload from "@/components/ui/ImageUpload";
import DisplayOrderModal from "@/components/DisplayOrderModal";
import {
  VAT_RATES,
  QUANTITY_TYPES,
  CLASSIFICATION_CATEGORIES,
  CLASSIFICATION_TYPES,
  VAT_EXEMPTION_CATEGORIES,
  DEFAULT_PRODUCT_CLASSIFICATIONS,
} from "@/constants/mydata";

// Helper function to get product price (from first price list or 0)
const getProductPrice = (product: Product) => {
  return product.priceListPrices?.[0]?.price || 0;
};

const ProductsPage: React.FC = () => {
  // Firestore hooks
  const {
    products,
    loading: productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();
  const {
    categories,
    loading: categoriesLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const {
    recipes,
    loading: recipesLoading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  } = useRecipes();
  const {
    priceLists,
    loading: priceListsLoading,
    addPriceList,
    updatePriceList,
    deletePriceList,
  } = usePriceLists();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [showAddPriceList, setShowAddPriceList] = useState(false);
  const [showDisplayOrder, setShowDisplayOrder] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategory | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(
    null
  );
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(
    null
  );
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<
    "recipes" | "priceLists" | "categories" | null
  >(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "product" | "category" | "recipe" | "priceList";
    id: string;
    name: string;
  } | null>(null);

  // Computed stats
  const stats: ProductStats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter(
      (p) => p.trackStock && p.stock <= p.minStock && p.stock > 0
    ).length;
    const outOfStock = products.filter(
      (p) => p.trackStock && p.stock === 0 && !p.neverOutOfStock
    ).length;
    const totalValue = products.reduce(
      (sum, p) => sum + getProductPrice(p) * p.stock,
      0
    );

    return {
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      totalValue,
    };
  }, [products]);

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === "all" || product.category.id === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // First sort by category displayOrder
      const categoryOrderA = a.category.displayOrder || 0;
      const categoryOrderB = b.category.displayOrder || 0;
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      // Then sort by product displayOrder within the same category
      const productOrderA = a.displayOrder || 0;
      const productOrderB = b.displayOrder || 0;
      if (productOrderA !== productOrderB) {
        return productOrderA - productOrderB;
      }

      // Finally sort by name as fallback
      return a.name.localeCompare(b.name, "el");
    });

  // Group products by category when "all" is selected
  const groupedProducts = React.useMemo(() => {
    if (selectedCategory === "all") {
      return categories
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .reduce((acc, category) => {
          const categoryProducts = filteredProducts.filter(
            (product) => product.category.id === category.id
          );
          if (categoryProducts.length > 0) {
            acc[category.id] = {
              category,
              products: categoryProducts,
            };
          }
          return acc;
        }, {} as Record<string, { category: ProductCategory; products: Product[] }>);
    }
    return null;
  }, [filteredProducts, selectedCategory, categories]);

  // Handler functions
  const handleAddProduct = async (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      console.log("Adding product with data:", productData);
      await addProduct(productData);
      setShowAddProduct(false);
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const handleUpdateProduct = async (
    id: string,
    productData: Partial<Product>
  ) => {
    try {
      console.log("Updating product with data:", productData);
      await updateProduct(id, productData);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleAddCategory = async (
    categoryData: Omit<ProductCategory, "id">
  ) => {
    try {
      await addCategory(categoryData);
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleUpdateCategory = async (
    id: string,
    categoryData: Partial<ProductCategory>
  ) => {
    try {
      await updateCategory(id, categoryData);
      setEditingCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleAddRecipe = async (
    recipeData: Omit<Recipe, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      await addRecipe(recipeData);
      setShowAddRecipe(false);
    } catch (error) {
      console.error("Error adding recipe:", error);
    }
  };

  const handleUpdateRecipe = async (
    id: string,
    recipeData: Partial<Recipe>
  ) => {
    try {
      await updateRecipe(id, recipeData);
      setEditingRecipe(null);
    } catch (error) {
      console.error("Error updating recipe:", error);
    }
  };

  const handleAddPriceList = async (
    priceListData: Omit<PriceList, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      await addPriceList(priceListData);
      setShowAddPriceList(false);
    } catch (error) {
      console.error("Error adding price list:", error);
    }
  };

  const handleUpdatePriceList = async (
    id: string,
    priceListData: Partial<PriceList>
  ) => {
    try {
      await updatePriceList(id, priceListData);
      setEditingPriceList(null);
    } catch (error) {
      console.error("Error updating price list:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      switch (deleteConfirm.type) {
        case "product":
          await deleteProduct(deleteConfirm.id);
          break;
        case "category":
          await deleteCategory(deleteConfirm.id);
          break;
        case "recipe":
          await deleteRecipe(deleteConfirm.id);
          break;
        case "priceList":
          await deletePriceList(deleteConfirm.id);
          break;
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error(`Error deleting ${deleteConfirm.type}:`, error);
    }
  };

  const toggleProductStatus = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newStatus = product.status === "active" ? "inactive" : "active";
      handleUpdateProduct(productId, { status: newStatus });
    }
  };

  const updateStock = (productId: string, newStock: number) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      handleUpdateProduct(productId, { stock: newStock });
    }
  };

  const getStockStatus = (product: Product) => {
    if (!product.trackStock) return { text: "N/A", color: "gray" };
    if (product.stock === 0 && !product.neverOutOfStock)
      return { text: "Εξαντλημένο", color: "red" };
    if (product.stock === 0 && product.neverOutOfStock)
      return { text: "Διαθέσιμο", color: "emerald" };
    if (product.stock <= product.minStock)
      return { text: "Χαμηλό", color: "amber" };
    return { text: "Διαθέσιμο", color: "emerald" };
  };

  const toggleTab = (tab: "recipes" | "priceLists" | "categories") => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
                Διαχείριση Προϊόντων
              </h1>
              <p className="text-slate-600">
                Πλήρης έλεγχος του καταλόγου προϊόντων σας
              </p>
            </div>
            <div className="flex gap-3">
              <ActionButton
                onClick={() => setShowAddRecipe(true)}
                icon={FiBook}
                variant="success"
                size="sm"
              >
                Συνταγές
              </ActionButton>
              <ActionButton
                onClick={() => setShowAddPriceList(true)}
                icon={FiDollarSign}
                variant="success"
                size="sm"
              >
                Τιμοκατάλογοι
              </ActionButton>
              <ActionButton
                onClick={() => setShowAddCategory(true)}
                icon={FiTag}
                variant="warning"
                size="sm"
              >
                Κατηγορία
              </ActionButton>

              <ActionButton
                onClick={() => setShowAddProduct(true)}
                icon={FiPlus}
                variant="primary"
              >
                Νέο Προϊόν
              </ActionButton>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiPackage className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">
                  {stats.totalProducts}
                </div>
                <div className="text-xs text-slate-600 font-medium">Σύνολο</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FiCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">
                  {stats.activeProducts}
                </div>
                <div className="text-xs text-slate-600 font-medium">Ενεργά</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-amber-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">
                  {stats.lowStock}
                </div>
                <div className="text-xs text-slate-600 font-medium">Χαμηλό</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-red-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FiX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">
                  {stats.outOfStock}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Εξαντλημένα
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-purple-200/50 shadow-sm hover:shadow-md transition-all duration-200 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">€</span>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">
                  €{stats.totalValue.toFixed(2)}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Αξία Αποθέματος
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Management Tabs Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-white/20 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => toggleTab("recipes")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "recipes"
                  ? "bg-purple-50 text-purple-700 border-b-2 border-purple-500"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <FiBook className="w-4 h-4" />
              Συνταγές ({recipes.length})
              {activeTab === "recipes" ? (
                <FiChevronUp className="w-4 h-4" />
              ) : (
                <FiChevronDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => toggleTab("priceLists")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "priceLists"
                  ? "bg-green-50 text-green-700 border-b-2 border-green-500"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <FiDollarSign className="w-4 h-4" />
              Τιμοκατάλογοι ({priceLists.length})
              {activeTab === "priceLists" ? (
                <FiChevronUp className="w-4 h-4" />
              ) : (
                <FiChevronDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => toggleTab("categories")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "categories"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <FiTag className="w-4 h-4" />
              Κατηγορίες ({categories.length})
              {activeTab === "categories" ? (
                <FiChevronUp className="w-4 h-4" />
              ) : (
                <FiChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab ? (
            <div className="p-6 animate-in slide-in-from-top-2 duration-200">
              {/* Recipes Tab */}
              {activeTab === "recipes" && (
                <div>
                  {recipes.length > 0 ? (
                    <div className="space-y-4">
                      {recipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                <FiBook className="w-4 h-4 text-purple-600" />
                                {recipe.name}
                              </h4>
                              {recipe.description && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {recipe.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span>
                                  {recipe.groups.length} ομάδες επιλογών
                                </span>
                                <span>
                                  {recipe.createdAt.toLocaleDateString("el-GR")}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => setEditingRecipe(recipe)}
                                className="p-2 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                                title="Επεξεργασία"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: "recipe",
                                    id: recipe.id,
                                    name: recipe.name,
                                  })
                                }
                                className="p-2 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                title="Διαγραφή"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {recipe.groups.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex flex-wrap gap-2">
                                {recipe.groups.map((group) => (
                                  <span
                                    key={group.id}
                                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                                  >
                                    {group.name} ({group.options.length}{" "}
                                    επιλογές)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiBook className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium">
                        Δεν υπάρχουν συνταγές
                      </p>
                      <p className="text-slate-500 text-sm mt-2">
                        Δημιουργήστε τη πρώτη σας συνταγή για προσαρμογή
                        προϊόντων
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Price Lists Tab */}
              {activeTab === "priceLists" && (
                <div>
                  {priceLists.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {priceLists.map((priceList) => (
                        <div
                          key={priceList.id}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                            priceList.isActive
                              ? "border-green-200 bg-green-50"
                              : "border-slate-200 bg-slate-50 opacity-75"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                {priceList.name}
                                {priceList.isActive && (
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                )}
                              </h4>
                              {priceList.description && (
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                  {priceList.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => setEditingPriceList(priceList)}
                                className="p-1 hover:bg-green-200 text-green-700 rounded transition-colors"
                                title="Επεξεργασία"
                              >
                                <FiEdit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: "priceList",
                                    id: priceList.id,
                                    name: priceList.name,
                                  })
                                }
                                className="p-1 hover:bg-red-200 text-red-700 rounded transition-colors"
                                title="Διαγραφή"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>
                              {priceList.createdAt.toLocaleDateString("el-GR")}
                            </span>
                            <span
                              className={
                                priceList.isActive
                                  ? "text-green-600"
                                  : "text-slate-500"
                              }
                            >
                              {priceList.isActive ? "Ενεργός" : "Ανενεργός"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiDollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium">
                        Δεν υπάρχουν τιμοκατάλογοι
                      </p>
                      <p className="text-slate-500 text-sm mt-2">
                        Δημιουργήστε τον πρώτο σας τιμοκατάλογο
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === "categories" && (
                <div>
                  {categories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                <FiTag className="w-4 h-4 text-blue-600" />
                                {category.name}
                              </h4>
                              {category.description && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {category.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => setEditingCategory(category)}
                                className="p-2 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                title="Επεξεργασία"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: "category",
                                    id: category.id,
                                    name: category.name,
                                  })
                                }
                                className="p-2 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                title="Διαγραφή"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {
                              products.filter(
                                (p) => p.category.id === category.id
                              ).length
                            }{" "}
                            προϊόντα
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiTag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium">
                        Δεν υπάρχουν κατηγορίες
                      </p>
                      <p className="text-slate-500 text-sm mt-2">
                        Δημιουργήστε την πρώτη σας κατηγορία προϊόντων
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-slate-500">
                Επιλέξτε ένα tab για να δείτε το περιεχόμενο
              </p>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Αναζήτηση προϊόντος, SKU ή tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="all">Όλες οι Κατηγορίες</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowDisplayOrder(true)}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium flex items-center gap-2"
              >
                <FiMove className="w-4 h-4" />
                Σειρά Εμφάνισης
              </button>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid" ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list" ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Display */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-white/20">
          {viewMode === "grid" ? (
            <div>
              {selectedCategory === "all" && groupedProducts ? (
                // Display grouped by category
                Object.values(groupedProducts).map(
                  ({ category, products: categoryProducts }) => (
                    <div key={category.id} className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        {category.name}
                        <span className="text-sm text-gray-500">
                          ({categoryProducts.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {categoryProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onEdit={setEditingProduct}
                            onDelete={(productId) =>
                              setDeleteConfirm({
                                type: "product",
                                id: productId,
                                name:
                                  products.find((p) => p.id === productId)
                                    ?.name || "",
                              })
                            }
                            onToggleStatus={toggleProductStatus}
                            onUpdateStock={updateStock}
                            onOpenStockModal={setStockModalProduct}
                            onPreview={setPreviewProduct}
                            getStockStatus={getStockStatus}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )
              ) : (
                // Display flat list
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={setEditingProduct}
                      onDelete={(productId) =>
                        setDeleteConfirm({
                          type: "product",
                          id: productId,
                          name:
                            products.find((p) => p.id === productId)?.name ||
                            "",
                        })
                      }
                      onToggleStatus={toggleProductStatus}
                      onUpdateStock={updateStock}
                      onOpenStockModal={setStockModalProduct}
                      onPreview={setPreviewProduct}
                      getStockStatus={getStockStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Εικόνα
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Προϊόν
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      SKU
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Κατηγορία
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Τιμή
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Απόθεμα
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Κατάσταση
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">
                      Ενέργειες
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategory === "all" && groupedProducts
                    ? // Display grouped by category
                      Object.values(groupedProducts).map(
                        ({ category, products: categoryProducts }) => (
                          <React.Fragment key={category.id}>
                            <tr className="bg-amber-50">
                              <td colSpan={8} className="py-3 px-4">
                                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                  {category.name}
                                  <span className="text-sm text-gray-500">
                                    ({categoryProducts.length})
                                  </span>
                                </h3>
                              </td>
                            </tr>
                            {categoryProducts.map((product) => (
                              <ProductTableRow
                                key={product.id}
                                product={product}
                                onEdit={setEditingProduct}
                                onDelete={(productId) =>
                                  setDeleteConfirm({
                                    type: "product",
                                    id: productId,
                                    name:
                                      products.find((p) => p.id === productId)
                                        ?.name || "",
                                  })
                                }
                                onToggleStatus={toggleProductStatus}
                                onUpdateStock={updateStock}
                                onOpenStockModal={setStockModalProduct}
                                onPreview={setPreviewProduct}
                                getStockStatus={getStockStatus}
                              />
                            ))}
                          </React.Fragment>
                        )
                      )
                    : // Display flat list
                      filteredProducts.map((product) => (
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          onEdit={setEditingProduct}
                          onDelete={(productId) =>
                            setDeleteConfirm({
                              type: "product",
                              id: productId,
                              name:
                                products.find((p) => p.id === productId)
                                  ?.name || "",
                            })
                          }
                          onToggleStatus={toggleProductStatus}
                          onUpdateStock={updateStock}
                          onOpenStockModal={setStockModalProduct}
                          onPreview={setPreviewProduct}
                          getStockStatus={getStockStatus}
                        />
                      ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">
                Δεν βρέθηκαν προϊόντα
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης
              </p>
            </div>
          )}
        </div>

        {/* Modals */}
        {showAddProduct && (
          <ProductModal
            categories={categories}
            priceLists={priceLists}
            recipes={recipes}
            onClose={() => setShowAddProduct(false)}
            onSave={(productData) => {
              if (
                productData.category &&
                productData.name &&
                productData.description
              ) {
                handleAddProduct(
                  productData as Omit<Product, "id" | "createdAt" | "updatedAt">
                );
              }
            }}
          />
        )}

        {editingProduct && (
          <ProductModal
            categories={categories}
            priceLists={priceLists}
            recipes={recipes}
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={(productData) => {
              if (editingProduct.id) {
                handleUpdateProduct(editingProduct.id, productData);
              }
            }}
          />
        )}

        {showAddCategory && (
          <CategoryModal
            onClose={() => setShowAddCategory(false)}
            onSave={(categoryData) => {
              if (categoryData.name) {
                handleAddCategory(categoryData as Omit<ProductCategory, "id">);
              }
            }}
          />
        )}

        {editingCategory && (
          <CategoryModal
            category={editingCategory}
            onClose={() => setEditingCategory(null)}
            onSave={(categoryData) => {
              if (editingCategory.id) {
                handleUpdateCategory(editingCategory.id, categoryData);
              }
            }}
          />
        )}

        {/* Recipe Modals */}
        {showAddRecipe && (
          <RecipeModal
            onClose={() => setShowAddRecipe(false)}
            onSave={handleAddRecipe}
          />
        )}

        {editingRecipe && (
          <RecipeModal
            recipe={editingRecipe}
            onClose={() => setEditingRecipe(null)}
            onSave={(recipeData) =>
              handleUpdateRecipe(editingRecipe.id, recipeData)
            }
          />
        )}

        {/* Price List Modals */}
        {showAddPriceList && (
          <PriceListModal
            onClose={() => setShowAddPriceList(false)}
            onSave={handleAddPriceList}
          />
        )}

        {editingPriceList && (
          <PriceListModal
            priceList={editingPriceList}
            onClose={() => setEditingPriceList(null)}
            onSave={(priceListData) =>
              handleUpdatePriceList(editingPriceList.id, priceListData)
            }
          />
        )}

        {/* Display Order Modal */}
        <DisplayOrderModal
          isOpen={showDisplayOrder}
          onClose={() => setShowDisplayOrder(false)}
        />

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <ConfirmDialog
            isOpen={true}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={handleDelete}
            title={`Διαγραφή ${
              deleteConfirm.type === "product"
                ? "Προϊόντος"
                : deleteConfirm.type === "category"
                ? "Κατηγορίας"
                : deleteConfirm.type === "recipe"
                ? "Συνταγής"
                : "Τιμοκαταλόγου"
            }`}
            message={`Θέλετε σίγουρα να διαγράψετε το "${deleteConfirm.name}";`}
            variant="danger"
          />
        )}

        {/* Stock Modal */}
        {stockModalProduct && (
          <StockModal
            product={stockModalProduct}
            onClose={() => setStockModalProduct(null)}
            onSave={updateStock}
          />
        )}

        {/* Product Preview Modal */}
        {previewProduct && (
          <ProductPreviewModal
            product={previewProduct}
            recipes={recipes}
            onClose={() => setPreviewProduct(null)}
          />
        )}
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleStatus: (productId: string) => void;
  onUpdateStock: (productId: string, stock: number) => void;
  onOpenStockModal: (product: Product) => void;
  onPreview: (product: Product) => void;
  getStockStatus: (product: Product) => { text: string; color: string };
}> = ({
  product,
  onEdit,
  onDelete,
  onToggleStatus,
  onUpdateStock,
  onOpenStockModal,
  onPreview,
  getStockStatus,
}) => {
  const stockStatus = getStockStatus(product);

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
        product.status === "active"
          ? "border-white/20"
          : "border-slate-200 opacity-75"
      }`}
    >
      <div className="relative h-48 w-full">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            style={{ objectFit: "cover" }}
            className="rounded-t-2xl"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 rounded-t-2xl flex items-center justify-center">
            <FiImage className="w-12 h-12 text-slate-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${
              stockStatus.color === "emerald"
                ? "from-emerald-500 to-green-600"
                : stockStatus.color === "amber"
                ? "from-amber-500 to-orange-600"
                : "from-red-500 to-rose-600"
            }`}
          >
            {stockStatus.text}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3
            className="font-bold text-lg text-slate-800 hover:text-blue-600 cursor-pointer transition-colors"
            onClick={() => onPreview(product)}
            title="Κλικ για προεπισκόπηση"
          >
            {product.name}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">
            €{getProductPrice(product).toFixed(2)}
          </span>
          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {product.sku}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            {product.category.name}
          </span>
          {product.recipeIds && product.recipeIds.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1">
              <FiBook className="w-3 h-3" />
              {product.recipeIds.length} συνταγές
            </span>
          )}
          {product.neverOutOfStock && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
              <FiCheck className="w-3 h-3" />
              Πάντα διαθέσιμο
            </span>
          )}
          {product.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {product.trackStock && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Απόθεμα:</span>
            <span className="font-semibold text-slate-800">
              {product.stock}
            </span>
            <span className="text-xs text-slate-500">
              / {product.minStock} min
            </span>
          </div>
        )}

        {/* Buttons Area - always at bottom */}
        <div className="flex flex-col gap-2 mt-auto flex-shrink-0">
          {/* Primary Action Button */}
          <button
            onClick={() => onEdit(product)}
            className="w-full px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <FiEdit2 className="w-4 h-4" />
            Επεξεργασία
          </button>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {product.trackStock && (
              <button
                onClick={() => onOpenStockModal(product)}
                className="px-2 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                title="Διαχείριση Αποθέματος"
              >
                <FiPackage className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleStatus(product.id)}
              className={`px-2 py-2 rounded-lg transition-colors text-xs font-medium flex items-center justify-center gap-1 ${
                product.status === "active"
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
              title={product.status === "active" ? "Απόκρυψη" : "Εμφάνιση"}
            >
              {product.status === "active" ? (
                <FiEyeOff className="w-4 h-4" />
              ) : (
                <FiEye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="px-2 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium flex items-center justify-center gap-1"
              title="Διαγραφή"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Product Table Row Component
const ProductTableRow: React.FC<{
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleStatus: (productId: string) => void;
  onUpdateStock: (productId: string, stock: number) => void;
  onOpenStockModal: (product: Product) => void;
  onPreview: (product: Product) => void;
  getStockStatus: (product: Product) => { text: string; color: string };
}> = ({
  product,
  onEdit,
  onDelete,
  onToggleStatus,
  onUpdateStock,
  onOpenStockModal,
  onPreview,
  getStockStatus,
}) => {
  const stockStatus = getStockStatus(product);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4">
        <div className="w-12 h-12 relative">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
              <FiImage className="w-6 h-6 text-slate-400" />
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div>
          <p
            className="font-medium text-slate-800 hover:text-blue-600 cursor-pointer transition-colors"
            onClick={() => onPreview(product)}
            title="Κλικ για προεπισκόπηση"
          >
            {product.name}
          </p>
          <p className="text-sm text-slate-600 line-clamp-1">
            {product.description}
          </p>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {product.sku}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
          {product.category.name}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="font-bold text-blue-600">
          €{getProductPrice(product).toFixed(2)}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {product.trackStock ? (
            <>
              <span className="font-semibold text-slate-800">
                {product.stock}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${
                  stockStatus.color === "emerald"
                    ? "bg-emerald-100 text-emerald-700"
                    : stockStatus.color === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {stockStatus.text}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-500">N/A</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className={`text-xs px-2 py-1 rounded font-medium ${
            product.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {product.status === "active" ? "Ενεργό" : "Ανενεργό"}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => onEdit(product)}
            className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Επεξεργασία"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          {product.trackStock && (
            <button
              onClick={() => onOpenStockModal(product)}
              className="p-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              title="Διαχείριση Αποθέματος"
            >
              <FiPackage className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onToggleStatus(product.id)}
            className={`p-1 rounded transition-colors ${
              product.status === "active"
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            }`}
            title={
              product.status === "active" ? "Απενεργοποίηση" : "Ενεργοποίηση"
            }
          >
            {product.status === "active" ? (
              <FiEyeOff className="w-4 h-4" />
            ) : (
              <FiEye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            title="Διαγραφή"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Product Modal Component
const ProductModal: React.FC<{
  categories: ProductCategory[];
  priceLists: PriceList[];
  recipes: Recipe[];
  product?: Product;
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
}> = ({ categories, priceLists, recipes, product, onClose, onSave }) => {
  // Helper function to suggest myDATA defaults based on category name
  const getDefaultClassificationForCategory = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (
      name.includes("φαγητό") ||
      name.includes("φαγητά") ||
      name.includes("φαγ") ||
      name.includes("εστίαση")
    ) {
      return DEFAULT_PRODUCT_CLASSIFICATIONS.FOOD;
    } else if (
      name.includes("ποτό") ||
      name.includes("ποτά") ||
      name.includes("καφέ") ||
      name.includes("αναψυκτικό")
    ) {
      return DEFAULT_PRODUCT_CLASSIFICATIONS.BEVERAGE;
    } else if (name.includes("υπηρεσία") || name.includes("υπηρεσίες")) {
      return DEFAULT_PRODUCT_CLASSIFICATIONS.SERVICE;
    } else {
      return DEFAULT_PRODUCT_CLASSIFICATIONS.RETAIL_GOODS;
    }
  };

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    priceListPrices: product?.priceListPrices || [],
    costPrice: product?.costPrice || 0,
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    categoryId: product?.category.id || categories[0]?.id || "",
    stock: product?.stock || 0,
    minStock: product?.minStock || 0,
    trackStock: product?.trackStock ?? true,
    neverOutOfStock: product?.neverOutOfStock ?? false,
    status: product?.status || "active",
    tags: product?.tags.join(", ") || "",
    image: product?.image || "",
    quantityType: product?.quantityType || 1, // Default to τεμάχια
    recipeIds: product?.recipeIds || [], // Επιλεγμένες συνταγές
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      alert("Παρακαλώ εισάγετε όνομα προϊόντος.");
      return;
    }

    if (!formData.description.trim()) {
      alert("Παρακαλώ εισάγετε περιγραφή προϊόντος.");
      return;
    }

    // Validation: Check if at least one price list is selected
    if (formData.priceListPrices.length === 0) {
      alert("Παρακαλώ επιλέξτε τουλάχιστον έναν τιμοκατάλογο και ορίστε τιμή.");
      return;
    }

    // Validation: Check if all selected price lists have prices > 0
    const invalidPrices = formData.priceListPrices.filter((p) => p.price <= 0);
    if (invalidPrices.length > 0) {
      alert(
        "Παρακαλώ ορίστε έγκυρες τιμές (μεγαλύτερες από 0) για όλους τους επιλεγμένους τιμοκαταλόγους."
      );
      return;
    }

    const selectedCategory = categories.find(
      (c) => c.id === formData.categoryId
    );

    if (!selectedCategory) {
      alert("Παρακαλώ επιλέξτε μια έγκυρη κατηγορία.");
      return;
    }

    // Remove categoryId from formData and add category object
    const { categoryId, ...restFormData } = formData;

    const productData = {
      ...restFormData,
      category: selectedCategory,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
      ...(product && { id: product.id }),
    };

    console.log("ProductModal sending data:", productData);
    onSave(productData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {product ? "Επεξεργασία Προϊόντος" : "Νέο Προϊόν"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Image - First */}
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Εικόνα Προϊόντος
            </label>
            <ImageUpload
              value={formData.image}
              onChange={(image) =>
                setFormData({ ...formData, image: image || "" })
              }
              placeholder="Ανεβάστε εικόνα προϊόντος"
              maxWidth={800}
              maxHeight={600}
              quality={0.8}
            />
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
              Βασικά Στοιχεία
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Όνομα Προϊόντος *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Περιγραφή
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Κατηγορία *
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Inventory & Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
              Απόθεμα & Ρυθμίσεις
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Τιμή Κόστους
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Απόθεμα
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ελάχιστο Απόθεμα
                </label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Κατάσταση
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive" | "draft",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Ενεργό</option>
                  <option value="inactive">Ανενεργό</option>
                  <option value="draft">Πρόχειρο</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Τύπος Ποσότητας *
                </label>
                <select
                  required
                  value={formData.quantityType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityType: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {QUANTITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tags (διαχωρισμένα με κόμμα)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="π.χ. καφές, ζεστό, ελληνικός"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trackStock"
                  checked={formData.trackStock}
                  onChange={(e) =>
                    setFormData({ ...formData, trackStock: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
                />
                <label htmlFor="trackStock" className="text-sm text-slate-700">
                  Παρακολούθηση αποθέματος
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="neverOutOfStock"
                  checked={formData.neverOutOfStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      neverOutOfStock: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-600 border-slate-200 rounded focus:ring-orange-500"
                />
                <label
                  htmlFor="neverOutOfStock"
                  className="text-sm text-slate-700"
                >
                  Όχι Εξαντλημένο
                </label>
              </div>
            </div>

            {formData.neverOutOfStock && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>Σημείωση:</strong> Αυτό το προϊόν δεν θα εμφανίζεται
                  ποτέ ως εξαντλημένο, ακόμα και όταν το απόθεμα είναι 0. Θα
                  συνεχίζει να πουλιέται κανονικά.
                </p>
              </div>
            )}
          </div>

          {/* Recipes Section */}
          {recipes.length > 0 && (
            <div className="border-2 border-purple-200 bg-purple-50 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FiBook className="w-5 h-5 text-purple-600" />
                Συνταγές Προϊόντος
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Επιλέξτε τις συνταγές που θα χρησιμοποιούνται για την προσαρμογή
                αυτού του προϊόντος
              </p>

              <div className="space-y-3">
                {recipes.map((recipe) => {
                  const isSelected = formData.recipeIds.includes(recipe.id);

                  return (
                    <div
                      key={recipe.id}
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg transition-all ${
                        isSelected
                          ? "border-purple-400 bg-purple-50"
                          : "border-slate-200 bg-white hover:border-purple-200"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`recipe-${recipe.id}`}
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Add recipe
                              setFormData((prev) => ({
                                ...prev,
                                recipeIds: [...prev.recipeIds, recipe.id],
                              }));
                            } else {
                              // Remove recipe
                              setFormData((prev) => ({
                                ...prev,
                                recipeIds: prev.recipeIds.filter(
                                  (id) => id !== recipe.id
                                ),
                              }));
                            }
                          }}
                          className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                        />
                      </div>

                      <div className="flex-1">
                        <label
                          htmlFor={`recipe-${recipe.id}`}
                          className="block text-base font-semibold text-slate-800 cursor-pointer"
                        >
                          {recipe.name}
                        </label>
                        {recipe.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {recipe.groups.map((group) => (
                            <span
                              key={group.id}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                            >
                              {group.name} ({group.options.length} επιλογές)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price Lists Section - Moved to the end */}
          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="w-5 h-5 text-green-600" />
              Τιμές ανά Τιμοκατάλογο *
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              <strong>Σημαντικό:</strong> Επιλέξτε τουλάχιστον έναν τιμοκατάλογο
              και ορίστε τιμή
            </p>

            {priceLists.filter((pl) => pl.isActive).length === 0 && (
              <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <FiAlertTriangle className="w-5 h-5" />
                  <strong>Προσοχή!</strong>
                </div>
                <p className="text-amber-700 mt-1">
                  Δεν υπάρχουν ενεργοί τιμοκατάλογοι. Πρέπει να δημιουργήσετε
                  πρώτα τιμοκαταλόγους από το κουμπί "Τιμοκατάλογοι" στην κορυφή
                  της σελίδας.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {priceLists
                .filter((pl) => pl.isActive)
                .map((priceList) => {
                  const currentPrice = formData.priceListPrices.find(
                    (p) => p.priceListId === priceList.id
                  );
                  const isSelected = !!currentPrice;

                  return (
                    <div
                      key={priceList.id}
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-all ${
                        isSelected
                          ? "border-green-400 bg-green-50"
                          : "border-slate-200 bg-white hover:border-green-200"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`priceList-${priceList.id}`}
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Add price list with default price and VAT
                              setFormData((prev) => ({
                                ...prev,
                                priceListPrices: [
                                  ...prev.priceListPrices,
                                  {
                                    priceListId: priceList.id,
                                    price: 0,
                                    vatRate: 24,
                                  },
                                ],
                              }));
                            } else {
                              // Remove price list
                              setFormData((prev) => ({
                                ...prev,
                                priceListPrices: prev.priceListPrices.filter(
                                  (p) => p.priceListId !== priceList.id
                                ),
                              }));
                            }
                          }}
                          className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                        />
                        <label
                          htmlFor={`priceList-${priceList.id}`}
                          className="ml-3 text-base font-semibold text-slate-800"
                        >
                          {priceList.name}
                        </label>
                      </div>

                      {isSelected && (
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Τιμή
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-semibold text-green-600">
                                €
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={currentPrice?.price || ""}
                                onChange={(e) => {
                                  const newPrice =
                                    parseFloat(e.target.value) || 0;
                                  setFormData((prev) => ({
                                    ...prev,
                                    priceListPrices: prev.priceListPrices.map(
                                      (p) =>
                                        p.priceListId === priceList.id
                                          ? { ...p, price: newPrice }
                                          : p
                                    ),
                                  }));
                                }}
                                className="flex-1 px-3 py-2 border-2 border-green-300 rounded-lg focus:border-green-500 focus:outline-none font-semibold"
                                placeholder="0.00"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              ΦΠΑ
                            </label>
                            <select
                              value={currentPrice?.vatRate || 24}
                              onChange={(e) => {
                                const newVatRate = parseInt(e.target.value);
                                setFormData((prev) => ({
                                  ...prev,
                                  priceListPrices: prev.priceListPrices.map(
                                    (p) =>
                                      p.priceListId === priceList.id
                                        ? { ...p, vatRate: newVatRate }
                                        : p
                                  ),
                                }));
                              }}
                              className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:border-green-500 focus:outline-none font-semibold"
                            >
                              {VAT_RATES.map((rate) => (
                                <option key={rate.value} value={rate.value}>
                                  {rate.value}%
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {priceList.description && (
                        <div className="text-xs text-slate-500 max-w-xs">
                          {priceList.description}
                        </div>
                      )}
                    </div>
                  );
                })}

              {priceLists.filter((pl) => pl.isActive).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <FiDollarSign className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>Δεν υπάρχουν ενεργοί τιμοκατάλογοι</p>
                  <p className="text-sm">
                    Δημιουργήστε πρώτα τιμοκαταλόγους από το κουμπί
                    "Τιμοκατάλογοι"
                  </p>
                </div>
              )}
            </div>

            {/* Summary of selected price lists */}
            {formData.priceListPrices.length > 0 && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  Επιλεγμένοι Τιμοκατάλογοι ({formData.priceListPrices.length})
                </h4>
                <div className="space-y-1">
                  {formData.priceListPrices.map((priceItem) => {
                    const priceList = priceLists.find(
                      (pl) => pl.id === priceItem.priceListId
                    );
                    return (
                      <div
                        key={priceItem.priceListId}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-green-700 font-medium">
                          {priceList?.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-800 font-bold">
                            €{priceItem.price.toFixed(2)}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            ΦΠΑ {priceItem.vatRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center justify-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {product ? "Ενημέρωση" : "Αποθήκευση"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Category Modal Component
const CategoryModal: React.FC<{
  category?: ProductCategory;
  onClose: () => void;
  onSave: (category: Partial<ProductCategory>) => void;
}> = ({ category, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    color: category?.color || "gray",
    image: category?.image || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      ...(category && { id: category.id }),
    });
  };

  const colors = [
    { value: "gray", label: "Γκρι", class: "bg-gray-500" },
    { value: "blue", label: "Μπλε", class: "bg-blue-500" },
    { value: "green", label: "Πράσινο", class: "bg-green-500" },
    { value: "purple", label: "Μωβ", class: "bg-purple-500" },
    { value: "amber", label: "Κίτρινο", class: "bg-amber-500" },
    { value: "red", label: "Κόκκινο", class: "bg-red-500" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {category ? "Επεξεργασία Κατηγορίας" : "Νέα Κατηγορία"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Όνομα Κατηγορίας *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Περιγραφή
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Εικόνα Κατηγορίας
            </label>
            <ImageUpload
              value={formData.image}
              onChange={(image) =>
                setFormData({ ...formData, image: image || "" })
              }
              placeholder="Ανεβάστε εικόνα κατηγορίας"
              maxWidth={400}
              maxHeight={300}
              quality={0.8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Χρώμα
            </label>
            <div className="grid grid-cols-3 gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, color: color.value })
                  }
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.color === color.value
                      ? "border-blue-500 shadow-md"
                      : "border-slate-200"
                  }`}
                >
                  <div className={`w-full h-6 rounded ${color.class}`} />
                  <span className="text-xs text-slate-600 mt-1">
                    {color.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 font-medium flex items-center justify-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {category ? "Ενημέρωση" : "Αποθήκευση"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductsPage;
