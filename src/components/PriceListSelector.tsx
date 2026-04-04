"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PriceList {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface PriceListSelectorProps {
  selectedPriceListId: string;
  onPriceListChange: (priceListId: string) => void;
}

export default function PriceListSelector({
  selectedPriceListId,
  onPriceListChange,
}: PriceListSelectorProps) {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriceLists();
  }, []);

  const loadPriceLists = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "priceLists"));
      const priceListsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PriceList[];

      setPriceLists(priceListsData.filter((pl) => pl.isActive));
    } catch (error) {
      console.error("Error loading price lists:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
        <span className="ml-2 text-gray-600">Φόρτωση τιμοκαταλόγων...</span>
      </div>
    );
  }

  if (priceLists.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Δεν βρέθηκαν ενεργοί τιμοκατάλογοι. Παρακαλώ δημιουργήστε έναν
          τιμοκατάλογο πρώτα.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={selectedPriceListId}
        onChange={(e) => onPriceListChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      >
        <option value="">Επιλέξτε τιμοκατάλογο</option>
        {priceLists.map((priceList) => (
          <option key={priceList.id} value={priceList.id}>
            {priceList.name}
            {priceList.description && ` - ${priceList.description}`}
          </option>
        ))}
      </select>

      {selectedPriceListId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-800 text-sm">
            ✅ Επιλεγμένος τιμοκατάλογος:{" "}
            {priceLists.find((pl) => pl.id === selectedPriceListId)?.name}
          </p>
        </div>
      )}
    </div>
  );
}
