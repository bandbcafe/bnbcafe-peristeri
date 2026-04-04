"use client";

import { useState, useRef } from "react";
import {
  FaDownload,
  FaUpload,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileExport,
  FaFileImport,
  FaTimes,
  FaInfoCircle,
  FaBoxes,
  FaTags,
  FaListAlt,
} from "react-icons/fa";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import type { Product, ProductCategory, PriceList } from "@/types/products";

type CatalogData = {
  version: string;
  exportDate: string;
  exportFrom: string;
  products: any[];
  categories: any[];
  priceLists: any[];
  recipes: any[];
};

type ImportStats = {
  categories: { total: number; success: number; failed: number };
  priceLists: { total: number; success: number; failed: number };
  products: { total: number; success: number; failed: number };
  recipes: { total: number; success: number; failed: number };
  errors: string[];
};

export default function ProductCatalogExportImport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<CatalogData | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<
    "idle" | "preview" | "importing" | "complete"
  >("idle");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [importCategories, setImportCategories] = useState(true);
  const [importPriceLists, setImportPriceLists] = useState(true);
  const [importProducts, setImportProducts] = useState(true);
  const [importRecipes, setImportRecipes] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== EXPORT ====================
  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);

    try {
      // Fetch all categories
      const categoriesSnap = await getDocs(collection(db, "categories"));
      const categories = categoriesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch all price lists
      const priceListsSnap = await getDocs(collection(db, "priceLists"));
      const priceLists = priceListsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          updatedAt:
            data.updatedAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
        };
      });

      // Fetch all products
      const productsSnap = await getDocs(collection(db, "products"));
      const products = productsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          updatedAt:
            data.updatedAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
        };
      });

      // Fetch all recipes
      const recipesSnap = await getDocs(collection(db, "recipes"));
      const recipes = recipesSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          updatedAt:
            data.updatedAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
        };
      });

      const catalogData: CatalogData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        exportFrom: window.location.hostname || "pos-system",
        products,
        categories,
        priceLists,
        recipes,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(catalogData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalog-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (error) {
      console.error("Export error:", error);
      alert(
        "Σφάλμα κατά την εξαγωγή: " +
          (error instanceof Error ? error.message : "Άγνωστο σφάλμα"),
      );
    } finally {
      setExporting(false);
    }
  };

  // ==================== IMPORT ====================
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportStats(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as CatalogData;

      // Support both formats: direct arrays or nested under data
      if ((data as any).data) {
        const nested = (data as any).data;
        data.categories = nested.categories || data.categories || [];
        data.priceLists = nested.priceLists || data.priceLists || [];
        data.products = nested.products || data.products || [];
        data.recipes = nested.recipes || data.recipes || [];
      }

      // Validate structure
      if (!data.products && !data.categories && !data.priceLists) {
        alert("Μη έγκυρο αρχείο καταλόγου! Λείπουν απαραίτητα πεδία.");
        resetImport();
        return;
      }

      if (!data.version) data.version = "1.0";
      if (!data.exportDate) data.exportDate = new Date().toISOString();
      if (!data.exportFrom) data.exportFrom = "unknown";
      if (!data.recipes) data.recipes = [];

      setImportData(data);
      setStep("preview");
    } catch (error) {
      console.error("Error reading file:", error);
      alert(
        "Σφάλμα κατά την ανάγνωση του αρχείου. Βεβαιωθείτε ότι είναι έγκυρο JSON.",
      );
      resetImport();
    }
  };

  const startImport = async () => {
    if (!importData) return;

    setImporting(true);
    setStep("importing");
    setProgress(0);

    const stats: ImportStats = {
      categories: { total: 0, success: 0, failed: 0 },
      priceLists: { total: 0, success: 0, failed: 0 },
      products: { total: 0, success: 0, failed: 0 },
      recipes: { total: 0, success: 0, failed: 0 },
      errors: [],
    };

    try {
      const totalItems =
        (importCategories ? importData.categories.length : 0) +
        (importPriceLists ? importData.priceLists.length : 0) +
        (importProducts ? importData.products.length : 0) +
        (importRecipes ? importData.recipes?.length || 0 : 0);
      let processedItems = 0;

      // Step 1: Delete existing data if requested
      if (deleteExisting) {
        setProgress(1);
        if (importProducts) {
          const existingProducts = await getDocs(collection(db, "products"));
          for (const docSnap of existingProducts.docs) {
            await deleteDoc(doc(db, "products", docSnap.id));
          }
        }
        if (importCategories) {
          const existingCategories = await getDocs(
            collection(db, "categories"),
          );
          for (const docSnap of existingCategories.docs) {
            await deleteDoc(doc(db, "categories", docSnap.id));
          }
        }
        if (importPriceLists) {
          const existingPriceLists = await getDocs(
            collection(db, "priceLists"),
          );
          for (const docSnap of existingPriceLists.docs) {
            await deleteDoc(doc(db, "priceLists", docSnap.id));
          }
        }
        if (importRecipes) {
          const existingRecipes = await getDocs(collection(db, "recipes"));
          for (const docSnap of existingRecipes.docs) {
            await deleteDoc(doc(db, "recipes", docSnap.id));
          }
        }
      }

      // Step 2: Import categories
      if (importCategories && importData.categories.length > 0) {
        stats.categories.total = importData.categories.length;
        for (const category of importData.categories) {
          try {
            const { id, ...categoryData } = category;
            await setDoc(doc(db, "categories", id), categoryData);
            stats.categories.success++;
          } catch (error: any) {
            stats.categories.failed++;
            stats.errors.push(`Κατηγορία "${category.name}": ${error.message}`);
          }
          processedItems++;
          setProgress(Math.round((processedItems / totalItems) * 100));
        }
      }

      // Step 3: Import price lists
      if (importPriceLists && importData.priceLists.length > 0) {
        stats.priceLists.total = importData.priceLists.length;
        for (const priceList of importData.priceLists) {
          try {
            const { id, ...priceListData } = priceList;
            if (priceListData.createdAt)
              priceListData.createdAt = new Date(priceListData.createdAt);
            if (priceListData.updatedAt)
              priceListData.updatedAt = new Date(priceListData.updatedAt);
            await setDoc(doc(db, "priceLists", id), priceListData);
            stats.priceLists.success++;
          } catch (error: any) {
            stats.priceLists.failed++;
            stats.errors.push(
              `Τιμοκατάλογος "${priceList.name}": ${error.message}`,
            );
          }
          processedItems++;
          setProgress(Math.round((processedItems / totalItems) * 100));
        }
      }

      // Step 4: Import products
      if (importProducts && importData.products.length > 0) {
        stats.products.total = importData.products.length;
        for (const product of importData.products) {
          try {
            const { id, ...productData } = product;
            if (productData.createdAt)
              productData.createdAt = new Date(productData.createdAt);
            if (productData.updatedAt)
              productData.updatedAt = new Date(productData.updatedAt);
            await setDoc(doc(db, "products", id), productData);
            stats.products.success++;
          } catch (error: any) {
            stats.products.failed++;
            stats.errors.push(`Προϊόν "${product.name}": ${error.message}`);
          }
          processedItems++;
          setProgress(Math.round((processedItems / totalItems) * 100));
        }
      }

      // Step 5: Import recipes
      if (
        importRecipes &&
        importData.recipes &&
        importData.recipes.length > 0
      ) {
        stats.recipes.total = importData.recipes.length;
        for (const recipe of importData.recipes) {
          try {
            const { id, ...recipeData } = recipe;
            if (recipeData.createdAt)
              recipeData.createdAt = new Date(recipeData.createdAt);
            if (recipeData.updatedAt)
              recipeData.updatedAt = new Date(recipeData.updatedAt);
            await setDoc(doc(db, "recipes", id), recipeData);
            stats.recipes.success++;
          } catch (error: any) {
            stats.recipes.failed++;
            stats.errors.push(`Συνταγή "${recipe.name}": ${error.message}`);
          }
          processedItems++;
          setProgress(Math.round((processedItems / totalItems) * 100));
        }
      }
    } catch (error: any) {
      stats.errors.push(`Γενικό σφάλμα: ${error.message}`);
    }

    setImportStats(stats);
    setImporting(false);
    setStep("complete");
  };

  const resetImport = () => {
    setImportFile(null);
    setImportData(null);
    setImportStats(null);
    setStep("idle");
    setProgress(0);
    setDeleteExisting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      {/* Export Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-3 rounded-lg">
            <FaFileExport className="text-green-600 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Εξαγωγή Καταλόγου
            </h3>
            <p className="text-sm text-gray-600">
              Εξαγωγή όλων των προϊόντων, κατηγοριών, τιμοκαταλόγων, συνταγών
              και εικόνων σε αρχείο JSON
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-700 mb-1">
                Τι περιλαμβάνει η εξαγωγή:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Όλα τα προϊόντα (με φωτογραφίες base64, variants, tags)</li>
                <li>Κατηγορίες (με εικόνες και χρώματα)</li>
                <li>Τιμοκαταλόγους (τιμές και ΦΠΑ ανά τιμοκατάλογο)</li>
                <li>Συνταγές (recipes με groups και options)</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-semibold transition-colors"
        >
          {exporting ? (
            <>
              <FaSpinner className="animate-spin" />
              Εξαγωγή σε εξέλιξη...
            </>
          ) : (
            <>
              <FaDownload />
              Εξαγωγή Καταλόγου (.json)
            </>
          )}
        </button>

        {exportSuccess && (
          <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-100 px-4 py-2 rounded-lg">
            <FaCheckCircle />
            <span className="font-medium">
              Η εξαγωγή ολοκληρώθηκε επιτυχώς!
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">ή</span>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <FaFileImport className="text-blue-600 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Εισαγωγή Καταλόγου
            </h3>
            <p className="text-sm text-gray-600">
              Εισαγωγή καταλόγου από αρχείο JSON που εξάχθηκε από άλλο POS
            </p>
          </div>
        </div>

        {step === "idle" && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <FaUpload />
              Επιλογή Αρχείου JSON
            </button>
          </div>
        )}

        {step === "preview" && importData && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">
                  Προεπισκόπηση Αρχείου
                </h4>
                <button
                  onClick={resetImport}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <FaTags className="text-amber-600 mx-auto mb-1" />
                  <p className="font-bold text-lg text-gray-800">
                    {importData.categories.length}
                  </p>
                  <p className="text-gray-600">Κατηγορίες</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <FaListAlt className="text-purple-600 mx-auto mb-1" />
                  <p className="font-bold text-lg text-gray-800">
                    {importData.priceLists.length}
                  </p>
                  <p className="text-gray-600">Τιμοκατάλογοι</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <FaBoxes className="text-blue-600 mx-auto mb-1" />
                  <p className="font-bold text-lg text-gray-800">
                    {importData.products.length}
                  </p>
                  <p className="text-gray-600">Προϊόντα</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <FaListAlt className="text-green-600 mx-auto mb-1" />
                  <p className="font-bold text-lg text-gray-800">
                    {importData.recipes?.length || 0}
                  </p>
                  <p className="text-gray-600">Συνταγές</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                <p>
                  Εξαγωγή:{" "}
                  {new Date(importData.exportDate).toLocaleString("el-GR")}
                </p>
                <p>Πηγή: {importData.exportFrom}</p>
                <p>Έκδοση: {importData.version}</p>
              </div>
            </div>

            {/* Import Options */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h4 className="font-semibold text-gray-800 mb-3">
                Επιλογές Εισαγωγής
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importCategories}
                    onChange={(e) => setImportCategories(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-sm">
                    Κατηγορίες ({importData.categories.length})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importPriceLists}
                    onChange={(e) => setImportPriceLists(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-sm">
                    Τιμοκατάλογοι ({importData.priceLists.length})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importProducts}
                    onChange={(e) => setImportProducts(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-sm">
                    Προϊόντα ({importData.products.length})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importRecipes}
                    onChange={(e) => setImportRecipes(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-sm">
                    Συνταγές ({importData.recipes?.length || 0})
                  </span>
                </label>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteExisting}
                    onChange={(e) => setDeleteExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600"
                  />
                  <span className="text-sm text-red-600 font-medium">
                    Διαγραφή υπαρχόντων δεδομένων πριν την εισαγωγή
                  </span>
                </label>
                {deleteExisting && (
                  <p className="text-xs text-red-500 mt-1 ml-6">
                    Όλα τα υπάρχοντα δεδομένα (στις επιλεγμένες κατηγορίες) θα
                    διαγραφούν πριν την εισαγωγή!
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={startImport}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <FaUpload />
                Έναρξη Εισαγωγής
              </button>
              <button
                onClick={resetImport}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                <FaTimes />
                Ακύρωση
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <FaSpinner className="animate-spin text-blue-600 text-xl" />
                <h4 className="font-semibold text-gray-800">
                  Εισαγωγή σε εξέλιξη...
                </h4>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                {progress}%
              </p>
            </div>
          </div>
        )}

        {step === "complete" && importStats && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <FaCheckCircle className="text-green-600 text-xl" />
                <h4 className="font-semibold text-gray-800">
                  Η εισαγωγή ολοκληρώθηκε!
                </h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                {importStats.categories.total > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-bold text-green-600">
                      {importStats.categories.success}/
                      {importStats.categories.total}
                    </p>
                    <p className="text-gray-600">Κατηγορίες</p>
                  </div>
                )}
                {importStats.priceLists.total > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-bold text-green-600">
                      {importStats.priceLists.success}/
                      {importStats.priceLists.total}
                    </p>
                    <p className="text-gray-600">Τιμοκατάλογοι</p>
                  </div>
                )}
                {importStats.products.total > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-bold text-green-600">
                      {importStats.products.success}/
                      {importStats.products.total}
                    </p>
                    <p className="text-gray-600">Προϊόντα</p>
                  </div>
                )}
                {importStats.recipes.total > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-bold text-green-600">
                      {importStats.recipes.success}/{importStats.recipes.total}
                    </p>
                    <p className="text-gray-600">Συνταγές</p>
                  </div>
                )}
              </div>

              {importStats.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaExclamationTriangle className="text-red-500" />
                    <span className="font-semibold text-red-700">
                      {importStats.errors.length} σφάλματα
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto text-sm text-red-600 space-y-1">
                    {importStats.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetImport}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              <FaTimes />
              Κλείσιμο
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
