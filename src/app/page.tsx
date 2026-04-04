"use client";

import { useState, useEffect } from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import Link from "next/link";
import Image from "next/image";
import ProductModal from "@/components/customer/ProductModal";
import OrderTrackingIcon from "@/components/OrderTrackingIcon";
import {
  FaUtensils,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaStar,
  FaShoppingCart,
  FaCalendarAlt,
  FaWifi,
  FaParking,
  FaCreditCard,
  FaLeaf,
  FaTimes,
  FaCheck,
  FaInfo,
} from "react-icons/fa";

interface Product {
  id: string;
  name: string;
  description: string;
  image?: string;
  category: string;
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

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface WebsiteSettings {
  heroSection?: {
    backgroundImages: string[];
    overlayOpacity?: number;
    title: string;
    subtitle: string;
  };
  featuresSection?: {
    badge: string;
    title: string;
    description: string;
    features: {
      title: string;
      description: string;
    }[];
  };
  featuredProductsSection?: {
    badge: string;
    title: string;
    description: string;
    productIds: string[];
  };
  businessMeetingsSection?: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    ctaButtonText: string;
    ctaButtonLink: string;
    rightSideTitle: string;
    features: {
      title: string;
      description: string;
    }[];
    bottomCards: {
      title: string;
      description: string;
    }[];
  };
  contactInfo?: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  deliverySettings?: {
    weeklyHours: any;
    fee: number;
  };
  customerSettings?: {
    selectedPriceListId: string;
  };
}

export default function CustomerHomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { websiteSettings } = useWebsiteSettings();
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState<any>(null);
  const [dismissedPopups, setDismissedPopups] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Product modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    // Load all dynamic content in parallel for faster loading
    const loadAllData = async () => {
      try {
        // Start all loading operations in parallel
        const [menuPromise, popupsPromise] = [
          loadMenuData(),
          loadActivePopups(),
        ];

        // Load dismissed popups from localStorage immediately
        try {
          const dismissed = localStorage.getItem("dismissedPopups");
          if (dismissed) {
            setDismissedPopups(JSON.parse(dismissed));
          }
        } catch (e) {
          // localStorage may not be available in Safari private mode
        }

        // Wait for all data to load
        await Promise.all([menuPromise, popupsPromise]);

        // Only set loading to false after all data is loaded
        setLoading(false);
      } catch (error) {
        console.error("Error loading page data:", error);
        // Even if some data fails to load, ensure loading state is cleared
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Carousel auto-play effect
  useEffect(() => {
    if (
      websiteSettings &&
      websiteSettings.heroSection &&
      websiteSettings.heroSection.backgroundImages &&
      websiteSettings.heroSection.backgroundImages.length > 1
    ) {
      const interval = setInterval(() => {
        setCurrentImageIndex(
          (prev) =>
            (prev + 1) %
            (websiteSettings.heroSection?.backgroundImages?.length || 1),
        );
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [websiteSettings?.heroSection?.backgroundImages]);

  useEffect(() => {
    // Show first non-dismissed popup after 2 seconds
    if (popups.length > 0) {
      const availablePopups = popups.filter(
        (popup) => !dismissedPopups.includes(popup.id),
      );

      if (availablePopups.length > 0) {
        setTimeout(() => {
          setShowPopup(availablePopups[0]);
        }, 2000);
      }
    }
  }, [popups, dismissedPopups]);

  const loadMenuData = async () => {
    try {
      // Check cache first (wrapped in try-catch for Safari private mode)
      try {
        const cachedData = sessionStorage.getItem("menuData");
        const cacheTime = sessionStorage.getItem("menuDataTime");

        // Use cache if less than 1 minute old
        if (
          cachedData &&
          cacheTime &&
          Date.now() - parseInt(cacheTime) < 1 * 60 * 1000
        ) {
          const data = JSON.parse(cachedData);
          setAllProducts(data.products || []);
          setCategories(data.categories || []);
          setRecipes(data.recipes || []);
          setFeaturedProducts(data.products?.slice(0, 6) || []);
          return;
        }
      } catch (cacheError) {
        // sessionStorage may not be available in Safari private mode
      }

      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for mobile

      const response = await fetch("/api/customer/menu", {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();

        // Cache the data (wrapped in try-catch for Safari private mode)
        try {
          sessionStorage.setItem("menuData", JSON.stringify(data));
          sessionStorage.setItem("menuDataTime", Date.now().toString());
        } catch (cacheError) {
          // sessionStorage may not be available in Safari private mode
        }

        setAllProducts(data.products || []);
        setCategories(data.categories || []);
        setRecipes(data.recipes || []);
        setFeaturedProducts(data.products?.slice(0, 6) || []); // Show top 6 as featured
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Menu data request timed out, using fallback");
      } else {
        console.error("Error loading menu data:", error);
      }
      // Use empty arrays as fallback
      setAllProducts([]);
      setCategories([]);
      setRecipes([]);
      setFeaturedProducts([]);
    }
  };

  const loadActivePopups = async () => {
    try {
      const response = await fetch("/api/website/popups/active");
      if (response.ok) {
        const activePopups = await response.json();
        setPopups(activePopups);
      }
    } catch (error) {}
  };

  const closePopup = (popupId: string) => {
    setShowPopup(null);
    const newDismissed = [...dismissedPopups, popupId];
    setDismissedPopups(newDismissed);
    localStorage.setItem("dismissedPopups", JSON.stringify(newDismissed));
  };

  // Product modal functions
  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
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

  const handleAddToCart = async (cartItem: any) => {
    // Get existing cart or create new
    const existingCart = JSON.parse(
      localStorage.getItem("customerCart") || "[]",
    );

    const updatedCart = [...existingCart, cartItem];
    localStorage.setItem("customerCart", JSON.stringify(updatedCart));

    // Trigger cart update event
    window.dispatchEvent(new Event("cartUpdated"));

    // Reduce stock if product tracks stock (this is for immediate feedback)
    // Note: In a real app, stock should be reduced only when order is confirmed
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
  };

  // Helper function to convert 24h to 12h format with Greek AM/PM
  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "μμ" : "πμ";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes}${ampm}`;
  };

  const formatDeliveryHours = () => {
    if (!websiteSettings?.deliverySettings?.weeklyHours) {
      return "Δευτέρα - Κυριακή: 12:00πμ - 11:00μμ";
    }

    const dayNames = {
      monday: "Δευ",
      tuesday: "Τρι",
      wednesday: "Τετ",
      thursday: "Πεμ",
      friday: "Παρ",
      saturday: "Σαβ",
      sunday: "Κυρ",
    };

    const weeklyHours = websiteSettings.deliverySettings.weeklyHours;
    const openDays: string[] = [];
    const closedDays: string[] = [];

    Object.entries(weeklyHours).forEach(([day, hours]: [string, any]) => {
      const dayName = dayNames[day as keyof typeof dayNames];
      if (hours.isOpen) {
        const startTime = formatTime12h(hours.start);
        const endTime = formatTime12h(hours.end);
        openDays.push(`${dayName}: ${startTime}-${endTime}`);
      } else {
        closedDays.push(dayName);
      }
    });

    let result = "";
    if (openDays.length > 0) {
      result = openDays.join(", ");
    }
    if (closedDays.length > 0) {
      result +=
        closedDays.length === 7
          ? " (Κλειστά όλες τις μέρες)"
          : ` (Κλειστά: ${closedDays.join(", ")})`;
    }

    return result || "Δεν υπάρχει πρόγραμμα delivery";
  };

  // Show loading screen until all data is loaded
  if (loading || !websiteSettings) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          {/* Animated Logo/Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-[#8B7355] rounded-lg flex items-center justify-center animate-pulse shadow-lg">
              <FaUtensils className="text-white text-4xl" />
            </div>
          </div>

          {/* Loading Text */}
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-4">
            Φορτώνουμε το μενού μας...
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Παρακαλώ περιμένετε ενώ προετοιμάζουμε τις καλύτερες γεύσεις για
            εσάς
          </p>

          {/* Loading Spinner */}
          <div className="flex justify-center items-center space-x-2">
            <div className="w-3 h-3 bg-[#8B7355] rounded-full animate-bounce"></div>
            <div
              className="w-3 h-3 bg-[#A0826D] rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-3 h-3 bg-black rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8 max-w-xs mx-auto">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-[#8B7355] h-full rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[100vh] flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Background Images */}
        {websiteSettings?.heroSection?.backgroundImages &&
        websiteSettings.heroSection.backgroundImages.length > 0 ? (
          <div className="absolute inset-0">
            {websiteSettings.heroSection.backgroundImages.map(
              (image: string, index: number) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Hero background ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0} // Prioritize first image
                    quality={85}
                    sizes="100vw"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ),
            )}

            {/* Dark Overlay - Configurable opacity */}
            <div
              className="absolute inset-0 bg-black transition-opacity duration-300"
              style={{
                opacity:
                  (websiteSettings.heroSection.overlayOpacity ?? 40) / 100,
              }}
            />
          </div>
        ) : null}

        {/* Image Indicators */}
        {websiteSettings?.heroSection?.backgroundImages &&
          websiteSettings.heroSection.backgroundImages.length > 1 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
              {websiteSettings.heroSection.backgroundImages.map(
                (_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    aria-label={`Μετάβαση στην εικόνα ${index + 1}`}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      index === currentImageIndex
                        ? "bg-white/30"
                        : "bg-transparent hover:bg-white/20"
                    }`}
                  >
                    <span
                      className={`block w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentImageIndex
                          ? "bg-white scale-110"
                          : "bg-white/50"
                      }`}
                    />
                  </button>
                ),
              )}
            </div>
          )}

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 drop-shadow-lg leading-tight">
            {websiteSettings?.heroSection?.title || "Καλώς ήρθατε"}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 max-w-2xl mx-auto drop-shadow-md leading-relaxed">
            {websiteSettings?.heroSection?.subtitle ||
              "Απολαύστε αυθεντικές γεύσεις με φρέσκα υλικά και παραδοσιακές συνταγές"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-md sm:max-w-none mx-auto">
            <Link
              href="/menu"
              className="w-full sm:w-auto bg-[#8B7355] hover:bg-[#A0826D] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <FaShoppingCart />
              Παραγγείλτε Τώρα
            </Link>

            <Link
              href="/reservations"
              className="w-full sm:w-auto bg-white border-2 border-white text-black hover:bg-transparent hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <FaUtensils />
              Κλείστε Τραπέζι
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <span className="text-[#8B7355] text-sm font-bold tracking-widest uppercase">
                {websiteSettings?.featuresSection?.badge || "Η Εμπειρία μας"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 sm:mb-6">
              {websiteSettings?.featuresSection?.title ||
                "Ο Ιδανικός Χώρος για Brunch & Coffee"}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4 leading-relaxed">
              {websiteSettings?.featuresSection?.description ||
                "Απολαύστε τον πρωινό σας καφέ, ένα ξεχωριστό brunch ή ένα γρήγορο snack σε έναν χώρο που συνδυάζει άνεση, γεύση και στυλ"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
            {[
              {
                icon: FaUtensils,
                defaultTitle: "Φρέσκα Υλικά",
                defaultDesc:
                  "Επιλεγμένα προϊόντα κάθε μέρα για το πρωινό και το brunch σας",
              },
              {
                icon: FaClock,
                defaultTitle: "Ανοιχτά Όλη Μέρα",
                defaultDesc:
                  "Από το πρωινό καφέ μέχρι το απογευματινό snack, είμαστε εδώ για εσάς",
              },
              {
                icon: FaLeaf,
                defaultTitle: "Healthy Choices",
                defaultDesc:
                  "Vegan, vegetarian και gluten-free επιλογές για κάθε διατροφή",
              },
              {
                icon: FaStar,
                defaultTitle: "Cozy Atmosphere",
                defaultDesc:
                  "Χώρος σχεδιασμένος για να απολαύσετε τον καφέ σας με άνεση",
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              const featureData =
                websiteSettings?.featuresSection?.features?.[index];
              return (
                <div
                  key={index}
                  className="group text-center p-8 rounded-lg bg-white hover:bg-gray-50 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200"
                >
                  <div className="w-20 h-20 bg-[#8B7355] rounded-lg flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Icon className="text-white text-3xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-black">
                    {featureData?.title || feature.defaultTitle}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {featureData?.description || feature.defaultDesc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <span className="text-[#8B7355] text-sm font-bold tracking-widest uppercase">
                {websiteSettings?.featuredProductsSection?.badge ||
                  "Τα Αγαπημένα μας"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-4 sm:mb-6">
              {websiteSettings?.featuredProductsSection?.title ||
                "Signature Brunch & Coffee"}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4 leading-relaxed">
              {websiteSettings?.featuredProductsSection?.description ||
                "Ανακαλύψτε τις πιο δημοφιλείς επιλογές μας για ένα τέλειο πρωινό ή brunch"}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
                >
                  <div className="h-64 sm:h-72 bg-gray-300"></div>
                  <div className="p-6">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <div className="h-5 bg-gray-300 rounded mb-3 w-4/5"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2 w-full"></div>
                        <div className="h-4 bg-gray-300 rounded mb-4 w-2/3"></div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="h-5 bg-gray-300 rounded w-12"></div>
                        <div className="h-3 bg-gray-300 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
              {(() => {
                // Filter products based on selected IDs from settings
                const selectedIds =
                  websiteSettings?.featuredProductsSection?.productIds || [];
                const displayProducts =
                  selectedIds.length > 0
                    ? selectedIds
                        .map((id: string) =>
                          allProducts.find((p) => p.id === id),
                        )
                        .filter(Boolean)
                    : featuredProducts.slice(0, 4);

                return displayProducts.length > 0 ? (
                  displayProducts.slice(0, 4).map((product: Product) => {
                    const price = getProductPrice(product);
                    const productRecipes = recipes.filter((recipe) =>
                      product.recipeIds?.includes(recipe.id),
                    );

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-500 cursor-pointer group transform hover:-translate-y-2 border border-gray-200"
                        onClick={() => openProductModal(product)}
                      >
                        <div className="h-64 sm:h-72 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                          {product.image &&
                          product.image.startsWith("data:image") ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
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
                              className="object-cover group-hover:scale-110 transition-transform duration-700"
                              loading="lazy"
                              quality={85}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          ) : (
                            <FaUtensils className="text-gray-400 text-4xl sm:text-5xl" />
                          )}

                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* Customizable badge */}
                          {productRecipes.length > 0 && (
                            <div className="absolute top-4 right-4 bg-[#8B7355] text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md">
                              Προσαρμόσιμο
                            </div>
                          )}

                          {/* Quick view overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-[#8B7355] backdrop-blur-sm px-6 py-3 rounded-lg text-white font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                              Δείτε Λεπτομέρειες
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex flex-col h-full">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold mb-3 text-black leading-tight">
                                {product.name}
                              </h3>
                              <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed text-sm">
                                {product.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                              <span className="text-xl font-bold text-[#8B7355]">
                                €{price.toFixed(2)}
                              </span>
                              <div className="text-xs text-gray-500 font-medium">
                                Δείτε λεπτομέρειες
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-12">
                    <FaUtensils className="text-gray-400 text-6xl mx-auto mb-4" />
                    <p className="text-xl text-gray-600">
                      Σύντομα θα προσθέσουμε τα δημοφιλή μας πιάτα!
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              href="/menu"
              className="bg-[#8B7355] hover:bg-[#A0826D] text-white px-8 py-4 rounded-lg text-lg font-bold transition-all duration-300 inline-block shadow-lg hover:shadow-xl uppercase tracking-wide"
            >
              Δείτε Όλο το Μενού
            </Link>
          </div>
        </div>
      </section>

      {/* Reservation CTA Section */}
      <section className="py-16 sm:py-24 bg-black relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#8B7355] opacity-10 rounded-full -translate-x-32 -translate-y-32 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#A0826D] opacity-10 rounded-full translate-x-48 translate-y-48 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main CTA Card */}
          <div className="w-full">
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left Side - Content */}
                <div className="p-8 sm:p-12 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-[#8B7355] text-white px-4 py-2 rounded-lg text-sm font-bold mb-6 w-fit shadow-md">
                    <FaCalendarAlt className="text-sm" />
                    <span>
                      {websiteSettings?.businessMeetingsSection?.badge ||
                        "Κλείστε Τραπέζι Online"}
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                    {websiteSettings?.businessMeetingsSection?.title ||
                      "Ο Ιδανικός Χώρος"}
                    <span className="block text-[#8B7355]">
                      {websiteSettings?.businessMeetingsSection?.subtitle ||
                        "για Business Meetings"}
                    </span>
                  </h2>

                  <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                    {websiteSettings?.businessMeetingsSection?.description ||
                      "Κλείστε τραπέζι για την επόμενη επαγγελματική σας συνάντηση. Ήσυχος χώρος, δωρεάν WiFi και εξαιρετικός καφές για παραγωγικά meetings."}
                  </p>

                  <Link
                    href={
                      websiteSettings?.businessMeetingsSection?.ctaButtonLink ||
                      "/reservations"
                    }
                    className="group inline-flex items-center justify-center gap-3 bg-[#8B7355] hover:bg-[#A0826D] text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 uppercase tracking-wide"
                  >
                    <FaCalendarAlt className="text-xl" />
                    <span>
                      {websiteSettings?.businessMeetingsSection
                        ?.ctaButtonText || "Κλείστε Τραπέζι Τώρα"}
                    </span>
                  </Link>
                </div>

                {/* Right Side - Features */}
                <div className="p-8 sm:p-12 bg-[#8B7355] text-white flex flex-col justify-center">
                  <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                    <FaStar className="text-white" />
                    {websiteSettings?.businessMeetingsSection?.rightSideTitle ||
                      "Γιατί να μας Επιλέξετε;"}
                  </h3>

                  <div className="space-y-6">
                    {[
                      {
                        icon: FaCheck,
                        defaultTitle: "Ιδιωτικός Χώρος",
                        defaultDesc:
                          "Ήσυχα τραπέζια μακριά από το θόρυβο, ιδανικά για συζητήσεις.",
                      },
                      {
                        icon: FaClock,
                        defaultTitle: "Ευέλικτο Ωράριο",
                        defaultDesc:
                          "Από πρωινά meetings μέχρι απογευματινές συναντήσεις.",
                      },
                      {
                        icon: FaUtensils,
                        defaultTitle: "Premium Catering",
                        defaultDesc:
                          "Coffee breaks και snacks για την ομάδα σας.",
                      },
                      {
                        icon: FaPhone,
                        defaultTitle: "Επαγγελματική Εξυπηρέτηση",
                        defaultDesc:
                          "Άμεση επιβεβαίωση και dedicated service για την ομάδα σας.",
                      },
                    ].map((feature, index) => {
                      const Icon = feature.icon;
                      const featureData =
                        websiteSettings?.businessMeetingsSection?.features?.[
                          index
                        ];
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-4 group"
                        >
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                            <Icon className="text-white text-xl" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg mb-1">
                              {featureData?.title || feature.defaultTitle}
                            </h4>
                            <p className="text-white/90 text-sm">
                              {featureData?.description || feature.defaultDesc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 mt-12 w-full">
            {[
              {
                icon: FaMapMarkerAlt,
                defaultTitle: "Κεντρική Τοποθεσία",
                defaultDesc:
                  "Βρισκόμαστε στην καρδιά της πόλης με εύκολη πρόσβαση",
              },
              {
                icon: FaWifi,
                defaultTitle: "Δωρεάν WiFi",
                defaultDesc: "Απολαύστε γρήγορο internet σε όλο το χώρο μας",
              },
              {
                icon: FaParking,
                defaultTitle: "Δωρεάν Parking",
                defaultDesc: "Διαθέσιμοι χώροι στάθμευσης για τους πελάτες μας",
              },
            ].map((card, index) => {
              const Icon = card.icon;
              const cardData =
                websiteSettings?.businessMeetingsSection?.bottomCards?.[index];
              return (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 bg-[#8B7355] rounded-lg flex items-center justify-center mb-4 shadow-md">
                    <Icon className="text-white text-xl" />
                  </div>
                  <h4 className="font-bold text-white mb-2">
                    {cardData?.title || card.defaultTitle}
                  </h4>
                  <p className="text-sm text-gray-300">
                    {cardData?.description || card.defaultDesc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popup Modal - Announcement Style */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl transform animate-slideInUp">
            <div className="relative">
              {showPopup.image && (
                <div className="w-full h-56 overflow-hidden rounded-t-xl">
                  <img
                    src={showPopup.image}
                    alt={showPopup.title}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}
              <button
                onClick={() => closePopup(showPopup.id)}
                className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-gray-900 p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
              >
                <FaTimes size={16} />
              </button>
            </div>
            <div className="p-8">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-800 mb-6 leading-tight">
                  {showPopup.title}
                </h3>
                <div className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap mb-8">
                  {showPopup.content}
                </div>

                {/* Simple Close Button - Centered */}
                <button
                  onClick={() => closePopup(showPopup.id)}
                  className="bg-[#8B7355] hover:bg-[#A0826D] text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 uppercase tracking-wide"
                >
                  Εντάξει
                </button>
              </div>
            </div>
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

      {/* Order Tracking Icon - Real-time listener with auto-open */}
      <OrderTrackingIcon />
    </div>
  );
}
