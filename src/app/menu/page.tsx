"use client";

import { useState, useEffect, useRef } from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import {
  FaUtensils,
  FaSearch,
  FaFilter,
  FaShoppingCart,
  FaSpinner,
  FaCheck,
  FaArrowLeft,
  FaPlus,
  FaMinus,
  FaStar,
  FaHeart,
  FaRegHeart,
  FaEye,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import ProductModal from "@/components/customer/ProductModal";

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
  trackStock?: boolean;
  currentStock?: number;
  neverOutOfStock?: boolean;
  displayOrder?: number;
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

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  displayOrder?: number;
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
  pageHeaders?: {
    menu?: string;
    reservations?: string;
    contact?: string;
  };
}

export default function CustomerMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { websiteSettings } = useWebsiteSettings();
  const [menuWebsiteSettings, setMenuWebsiteSettings] =
    useState<WebsiteSettings | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Product modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Enhanced UI states
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refs for scroll functionality
  const categoryRefs = useRef<Record<string, HTMLDivElement>>({});

  useEffect(() => {
    loadMenuData();
    updateCartCount();
    loadFavorites();
  }, []);

  // Update cart count when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      updateCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loadMenuData = async () => {
    try {
      // Check cache first (wrapped in try-catch for Safari private mode)
      try {
        const cachedData = sessionStorage.getItem("menuData");
        const cacheTime = sessionStorage.getItem("menuDataTime");

        // Use cache if less than 1 minute old (reduced for faster updates)
        if (
          cachedData &&
          cacheTime &&
          Date.now() - parseInt(cacheTime) < 1 * 60 * 1000
        ) {
          const data = JSON.parse(cachedData);
          setProducts(data.products || []);
          setCategories(data.categories || []);
          setRecipes(data.recipes || []);
          setMenuWebsiteSettings(data.websiteSettings || {});
          setLoading(false);
          return;
        }
      } catch (cacheError) {
        // sessionStorage may not be available in Safari private mode
      }

      const response = await fetch("/api/customer/menu", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();

        // Cache the data (wrapped in try-catch for Safari private mode)
        try {
          sessionStorage.setItem("menuData", JSON.stringify(data));
          sessionStorage.setItem("menuDataTime", Date.now().toString());
        } catch (cacheError) {
          // sessionStorage may not be available in Safari private mode
        }

        setProducts(data.products || []);
        setCategories(data.categories || []);
        setRecipes(data.recipes || []);
        setMenuWebsiteSettings(data.websiteSettings || {});
      }
    } catch (error) {
      console.error("Error loading menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("customerCart") || "[]");
      const totalItems = cart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
      );
      setCartItemCount(totalItems);
    } catch (e) {
      // localStorage may not be available in Safari private mode
    }
  };

  const loadFavorites = () => {
    try {
      const savedFavorites = localStorage.getItem("customerFavorites");
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (e) {
      // localStorage may not be available in Safari private mode
    }
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = favorites.includes(productId)
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId];

    setFavorites(newFavorites);
    try {
      localStorage.setItem("customerFavorites", JSON.stringify(newFavorites));
    } catch (e) {
      // localStorage may not be available in Safari private mode
    }
  };

  const quickAddToCart = async (product: Product) => {
    const basePrice = getProductPrice(product);
    const totalPrice = basePrice;

    const cartItem = {
      id: `${product.id}-${Date.now()}`,
      product,
      quantity: 1,
      basePrice,
      selectedOptions: [],
      notes: "",
      totalPrice,
      vatRate: getProductVatRate(product),
    };

    await handleAddToCart(cartItem);
  };

  const getProductVatRate = (product: Product): number => {
    const selectedPriceListId =
      websiteSettings?.customerSettings?.selectedPriceListId;

    if (selectedPriceListId) {
      const priceEntry = product.priceListPrices?.find(
        (p) => p.priceListId === selectedPriceListId,
      );
      if (priceEntry) {
        const vatRate = priceEntry.vatRate || 0.24;
        return vatRate < 1 ? vatRate * 100 : vatRate;
      }
    }

    if (product.priceListPrices && product.priceListPrices.length > 0) {
      const vatRate = product.priceListPrices[0].vatRate || 0.24;
      return vatRate < 1 ? vatRate * 100 : vatRate;
    }

    return 24;
  };

  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const yOffset = -120; // Account for sticky header
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

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

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = async (cartItem: any) => {
    // Get existing cart or create new
    let existingCart: any[] = [];
    try {
      existingCart = JSON.parse(localStorage.getItem("customerCart") || "[]");
    } catch (e) {
      // localStorage may not be available in Safari private mode
    }

    const updatedCart = [...existingCart, cartItem];
    try {
      localStorage.setItem("customerCart", JSON.stringify(updatedCart));
    } catch (e) {
      // localStorage may not be available in Safari private mode
    }

    // Trigger custom event for header update
    window.dispatchEvent(new Event("cartUpdated"));

    // Reduce stock if product tracks stock
    try {
      await fetch("/api/orders/reduce-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderItems: [
            {
              productId: cartItem.product.id,
              quantity: cartItem.quantity,
            },
          ],
        }),
      });
    } catch (error) {}

    updateCartCount();
  };

  const filteredProducts = products.filter((product) => {
    const productCategoryId =
      typeof product.category === "string"
        ? product.category
        : product.category?.id;
    const matchesCategory =
      selectedCategory === "all" || productCategoryId === selectedCategory;
    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedProducts = categories
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .reduce(
      (acc, category) => {
        const categoryProducts = filteredProducts
          .filter((product) => {
            const productCategoryId =
              typeof product.category === "string"
                ? product.category
                : product.category?.id;
            return productCategoryId === category.id;
          })
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        if (categoryProducts.length > 0) {
          acc[category.id] = {
            category,
            products: categoryProducts,
          };
        }
        return acc;
      },
      {} as Record<string, { category: Category; products: Product[] }>,
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-[#8B7355] mx-auto mb-4" />
          <p className="text-xl text-gray-600">Φορτώνουμε το μενού...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Custom Header Image */}
      <div
        className="relative bg-black text-white"
        style={{
          backgroundImage: websiteSettings?.pageHeaders?.menu
            ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${websiteSettings.pageHeaders.menu})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto px-4 py-28 md:py-36">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Το Μενού μας
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              Ανακαλύψτε τις νόστιμες επιλογές μας και παραγγείλτε εύκολα
            </p>

            {/* Enhanced Search */}
            <div className="max-w-2xl mx-auto relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Αναζητήστε το αγαπημένο σας προϊόν..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 text-lg border-0 rounded-lg shadow-lg focus:ring-2 focus:ring-[#8B7355] focus:outline-none text-gray-800 placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 min-h-screen">
        <div className="flex min-h-screen mx-auto w-[100%] md:w-[80%]">
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-6 left-4 z-50 bg-[#8B7355] hover:bg-[#A0826D] p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110"
          >
            {sidebarOpen ? (
              <FaTimes className="text-white text-lg" />
            ) : (
              <FaBars className="text-white text-lg" />
            )}
          </button>

          {/* Sidebar */}
          <div
            className={`fixed lg:relative lg:mt-8 left-0 z-40 w-80 bg-white shadow-xl rounded-lg lg:rounded-lg transform transition-transform duration-300 ease-in-out ${
              sidebarOpen
                ? "translate-x-0 inset-y-0"
                : "-translate-x-full lg:translate-x-0 lg:inset-y-auto"
            }`}
          >
            <div className="h-full lg:h-auto overflow-y-auto p-6">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <FaFilter className="text-[#8B7355] text-xl" />
                  <h2 className="text-xl font-bold text-gray-800">Φίλτρα</h2>
                </div>
                {cartItemCount > 0 && (
                  <Link
                    href="/checkout"
                    className="flex items-center gap-2 bg-[#8B7355] hover:bg-[#A0826D] text-white px-4 py-2 rounded-lg transition-colors shadow-md"
                  >
                    <FaShoppingCart className="text-sm" />
                    <span className="font-semibold">{cartItemCount}</span>
                  </Link>
                )}
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Κατηγορίες
                </h3>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
                    selectedCategory === "all"
                      ? "bg-[#8B7355] text-white shadow-md"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <FaUtensils className="text-lg" />
                    <span>Όλα τα προϊόντα</span>
                  </span>
                </button>
                {categories
                  .filter(
                    (category) =>
                      typeof category === "object" &&
                      category.id &&
                      products.some(
                        (product) =>
                          typeof product.category === "object" &&
                          product.category.id === category.id,
                      ),
                  )
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
                        selectedCategory === category.id
                          ? "bg-[#8B7355] text-white shadow-md"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span>{category.name}</span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 lg:ml-0 p-4 lg:p-8 max-w-full">
            {/* Products by Category */}
            {selectedCategory === "all"
              ? // Show all categories
                Object.values(groupedProducts).map(({ category, products }) => (
                  <div
                    key={category.id}
                    className="mb-16"
                    ref={(el) => {
                      if (el) categoryRefs.current[category.id] = el;
                    }}
                  >
                    <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h2 className="text-xl font-bold text-gray-800">
                              {category.name}
                            </h2>
                            {category.description && (
                              <p className="text-gray-600 mt-1 text-sm">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {products.length} προϊόντα
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {products.map((product, index) => {
                        const price = getProductPrice(product);
                        const productRecipes = recipes.filter((recipe) =>
                          product.recipeIds?.includes(recipe.id),
                        );
                        const isFavorite = favorites.includes(product.id);

                        return (
                          <div
                            key={product.id}
                            onClick={() => openProductModal(product)}
                            className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 group relative flex overflow-hidden h-32 md:h-44 cursor-pointer border border-gray-200"
                            style={{
                              animationDelay: `${index * 50}ms`,
                            }}
                          >
                            {/* Product Image */}
                            <div className="h-28 w-28 md:h-full md:w-32 flex-shrink-0 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                              {product.image &&
                              product.image.startsWith("data:image") ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <FaUtensils className="text-gray-400 text-5xl" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="p-3 md:p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1 line-clamp-2">
                                  {product.name}
                                </h3>
                                <p className="text-gray-500 text-xs line-clamp-2 mb-2">
                                  {product.description}
                                </p>
                              </div>

                              {/* Price and Actions */}
                              <div className="flex items-center justify-between mt-auto">
                                <div className="text-lg md:text-xl font-bold text-[#8B7355]">
                                  €{price.toFixed(2)}
                                </div>
                                {/* Add button - visual indicator */}
                                <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg bg-[#8B7355] text-white shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                                  <FaPlus className="text-xs md:text-sm" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              : // Show selected category only
                groupedProducts[selectedCategory] && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupedProducts[selectedCategory].products.map(
                      (product, index) => {
                        const price = getProductPrice(product);
                        const productRecipes = recipes.filter((recipe) =>
                          product.recipeIds?.includes(recipe.id),
                        );
                        const isFavorite = favorites.includes(product.id);

                        return (
                          <div
                            key={product.id}
                            onClick={() => openProductModal(product)}
                            className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 group relative flex overflow-hidden h-32 md:h-44 cursor-pointer border border-gray-200"
                            style={{
                              animationDelay: `${index * 50}ms`,
                            }}
                          >
                            {/* Product Image */}
                            <div className="h-28 w-28 md:h-full md:w-32 flex-shrink-0 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                              {product.image &&
                              product.image.startsWith("data:image") ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <FaUtensils className="text-gray-400 text-5xl" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="p-3 md:p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1 line-clamp-2">
                                  {product.name}
                                </h3>
                                <p className="text-gray-500 text-xs line-clamp-2 mb-2">
                                  {product.description}
                                </p>
                              </div>

                              {/* Price and Actions */}
                              <div className="flex items-center justify-between mt-auto">
                                <div className="text-lg md:text-xl font-bold text-[#8B7355]">
                                  €{price.toFixed(2)}
                                </div>
                                {/* Add button - visual indicator */}
                                <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg bg-[#8B7355] text-white shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                                  <FaPlus className="text-xs md:text-sm" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

            {/* No Products Message */}
            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="bg-white rounded-lg shadow-lg p-12 max-w-md mx-auto border border-gray-200">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <FaUtensils className="text-[#8B7355] text-3xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    Δεν βρέθηκαν προϊόντα
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης ή επιλέξτε μια
                    διαφορετική κατηγορία
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                    }}
                    className="bg-[#8B7355] hover:bg-[#A0826D] text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-md uppercase tracking-wide"
                  >
                    Εμφάνιση όλων των προϊόντων
                  </button>
                </div>
              </div>
            )}

            {/* Product Modal */}
            <ProductModal
              product={selectedProduct}
              recipes={recipes}
              websiteSettings={websiteSettings}
              isOpen={!!selectedProduct}
              onClose={closeProductModal}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>

        {/* Custom CSS for animations */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fadeIn 0.5s ease-out;
          }

          .animate-slide-in-up {
            animation: slideInUp 0.6s ease-out forwards;
          }

          .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    </div>
  );
}
