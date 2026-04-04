"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, ProductCategory, Recipe, PriceList } from "@/types/products";

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const productsData: Product[] = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Product)
        );
        setProducts(productsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching products:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProduct = async (productData: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    try {
      const docRef = await addDoc(collection(db, "products"), {
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding product:", err);
      throw new Error(err.message);
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const docRef = doc(db, "products", id);
      await updateDoc(docRef, {
        ...productData,
        updatedAt: new Date(),
      });
    } catch (err: any) {
      console.error("Error updating product:", err);
      throw new Error(err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err: any) {
      console.error("Error deleting product:", err);
      throw new Error(err.message);
    }
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const categoriesData: ProductCategory[] = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data(),
          } as ProductCategory)
        );
        setCategories(categoriesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching categories:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addCategory = async (categoryData: Omit<ProductCategory, "id">) => {
    try {
      const docRef = await addDoc(collection(db, "categories"), categoryData);
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding category:", err);
      throw new Error(err.message);
    }
  };

  const updateCategory = async (id: string, categoryData: Partial<ProductCategory>) => {
    try {
      const docRef = doc(db, "categories", id);
      await updateDoc(docRef, categoryData);
    } catch (err: any) {
      console.error("Error updating category:", err);
      throw new Error(err.message);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (err: any) {
      console.error("Error deleting category:", err);
      throw new Error(err.message);
    }
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const recipesData: Recipe[] = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Recipe)
        );
        setRecipes(recipesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching recipes:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addRecipe = async (recipeData: Omit<Recipe, "id" | "createdAt" | "updatedAt">) => {
    try {
      const docRef = await addDoc(collection(db, "recipes"), {
        ...recipeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding recipe:", err);
      throw new Error(err.message);
    }
  };

  const updateRecipe = async (id: string, recipeData: Partial<Recipe>) => {
    try {
      const docRef = doc(db, "recipes", id);
      await updateDoc(docRef, {
        ...recipeData,
        updatedAt: new Date(),
      });
    } catch (err: any) {
      console.error("Error updating recipe:", err);
      throw new Error(err.message);
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await deleteDoc(doc(db, "recipes", id));
    } catch (err: any) {
      console.error("Error deleting recipe:", err);
      throw new Error(err.message);
    }
  };

  return {
    recipes,
    loading,
    error,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  };
};

export const usePriceLists = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "priceLists"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const priceListsData: PriceList[] = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as PriceList)
        );
        setPriceLists(priceListsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching price lists:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addPriceList = async (priceListData: Omit<PriceList, "id" | "createdAt" | "updatedAt">) => {
    try {
      const docRef = await addDoc(collection(db, "priceLists"), {
        ...priceListData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding price list:", err);
      throw new Error(err.message);
    }
  };

  const updatePriceList = async (id: string, priceListData: Partial<PriceList>) => {
    try {
      const docRef = doc(db, "priceLists", id);
      await updateDoc(docRef, {
        ...priceListData,
        updatedAt: new Date(),
      });
    } catch (err: any) {
      console.error("Error updating price list:", err);
      throw new Error(err.message);
    }
  };

  const deletePriceList = async (id: string) => {
    try {
      await deleteDoc(doc(db, "priceLists", id));
    } catch (err: any) {
      console.error("Error deleting price list:", err);
      throw new Error(err.message);
    }
  };

  return {
    priceLists,
    loading,
    error,
    addPriceList,
    updatePriceList,
    deletePriceList,
  };
};
