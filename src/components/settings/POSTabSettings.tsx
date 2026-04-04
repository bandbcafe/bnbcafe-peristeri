"use client";

import { useState, useEffect } from "react";
import { FaCashRegister, FaTable, FaCog, FaListAlt } from "react-icons/fa";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, setDoc } from "firebase/firestore";

interface TechnicalSettings {
  printerKitchen: string;
  printerBar: string;
  receiptPrinter: string;
  labelPrinter: string;
  backupPrinter: string;
  enableNotifications: boolean;
  notificationSound: string;
  autoBackup: boolean;
  backupInterval: number;
  dataRetention: number;
  logLevel: string;
}

interface PriceList {
  id: string;
  name: string;
  isActive: boolean;
}

interface BillingBook {
  id: string;
  name: string;
  series: string;
  invoice_type_code: string;
  number?: number;
}

interface POSTabSettingsProps {
  technicalSettings: TechnicalSettings;
  setTechnicalSettings: (settings: TechnicalSettings) => void;
  onOpenRestaurantLayout: () => void;
}

export default function POSTabSettings({
  technicalSettings,
  setTechnicalSettings,
  onOpenRestaurantLayout,
}: POSTabSettingsProps) {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [billingBooks, setBillingBooks] = useState<BillingBook[]>([]);
  const [defaultPriceListId, setDefaultPriceListId] = useState<string>("");
  const [defaultBillingBookId, setDefaultBillingBookId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingBillingBooks, setLoadingBillingBooks] = useState(false);

  // Load price lists and billing books from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load price lists
        const priceListsSnapshot = await getDocs(collection(db, "priceLists"));
        const lists = priceListsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          isActive: doc.data().isActive || false,
        }));
        setPriceLists(lists);

        // Load billing books from WRAPP settings
        setLoadingBillingBooks(true);
        const wrappDoc = await getDoc(doc(db, "config", "wrapp"));
        if (wrappDoc.exists()) {
          const wrappData = wrappDoc.data();
          
          // Get WRAPP credentials
          if (wrappData.email && wrappData.apiKey && wrappData.baseUrl) {
            try {
              // Login to WRAPP
              const loginResponse = await fetch('/api/wrapp/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: wrappData.email,
                  api_key: wrappData.apiKey,
                  baseUrl: wrappData.baseUrl
                }),
              });

              if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                const jwt = loginData.data?.attributes?.jwt;

                if (jwt) {
                  // Fetch billing books
                  const booksResponse = await fetch(`/api/wrapp/billing-books?baseUrl=${encodeURIComponent(wrappData.baseUrl)}`, {
                    headers: { 'Authorization': `Bearer ${jwt}` }
                  });

                  if (booksResponse.ok) {
                    const booksData = await booksResponse.json();
                    setBillingBooks(booksData || []);
                  }
                }
              }
            } catch (error) {
              console.error("Error loading billing books:", error);
            }
          }
        }
        setLoadingBillingBooks(false);

        // Load default settings from Firestore (same path as POS page)
        const userDoc = await getDoc(doc(db, "users", "default", "settings", "pos"));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.defaultPriceListId) {
            setDefaultPriceListId(data.defaultPriceListId);
            console.log("✅ Loaded default price list:", data.defaultPriceListId);
          }
          if (data.defaultBillingBookId) {
            setDefaultBillingBookId(data.defaultBillingBookId);
            console.log("✅ Loaded default billing book:", data.defaultBillingBookId);
          }
        } else if (lists.length > 0) {
          // Set first active price list as default
          const activeList = lists.find((pl) => pl.isActive) || lists[0];
          setDefaultPriceListId(activeList.id);
        }
      } catch (error) {
        console.error("❌ Error loading data:", error);
        setLoadingBillingBooks(false);
      }
    };

    loadData();
  }, []);

  // Save default price list to Firestore (same path as POS page reads from)
  const handlePriceListChange = async (priceListId: string) => {
    setDefaultPriceListId(priceListId);
    setLoading(true);

    try {
      const docRef = doc(db, "users", "default", "settings", "pos");
      await setDoc(
        docRef,
        {
          defaultPriceListId: priceListId,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      console.log("✅ Default price list saved to Firestore:", priceListId);
      console.log("📍 Path: users/default/settings/pos");
      
      // Verify it was saved
      const verifyDoc = await getDoc(docRef);
      if (verifyDoc.exists()) {
        console.log("✅ Verified saved data:", verifyDoc.data());
      }
    } catch (error) {
      console.error("❌ Error saving default price list:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save default billing book to Firestore (same path as POS page reads from)
  const handleBillingBookChange = async (billingBookId: string) => {
    setDefaultBillingBookId(billingBookId);
    setLoading(true);

    try {
      const docRef = doc(db, "users", "default", "settings", "pos");
      await setDoc(
        docRef,
        {
          defaultBillingBookId: billingBookId,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      console.log("✅ Default billing book saved to Firestore:", billingBookId);
      console.log("📍 Path: users/default/settings/pos");
      
      // Verify it was saved
      const verifyDoc = await getDoc(docRef);
      if (verifyDoc.exists()) {
        console.log("✅ Verified saved data:", verifyDoc.data());
      }
    } catch (error) {
      console.error("❌ Error saving default billing book:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaCashRegister className="text-amber-500" />
          Ρυθμίσεις POS
        </h3>
        
        <div className="space-y-4">
          {/* Default Price List Selection */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
              <FaListAlt className="text-green-600" />
              Προεπιλεγμένος Τιμοκατάλογος
            </h4>
            <p className="text-green-700 text-sm mb-3">
              Επιλέξτε τον τιμοκατάλογο που θα φορτώνεται αυτόματα στο POS. Η ρύθμιση αυτή δεν επηρεάζει τους τιμοκαταλόγους που έχετε ορίσει για τα τραπέζια στη Σάλα Εστιατορίου.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Τιμοκατάλογος
              </label>
              <select
                value={defaultPriceListId}
                onChange={(e) => handlePriceListChange(e.target.value)}
                disabled={loading || priceLists.length === 0}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {priceLists.length === 0 ? (
                  <option value="">Δεν υπάρχουν τιμοκατάλογοι</option>
                ) : (
                  <>
                    <option value="">Επιλέξτε τιμοκατάλογο</option>
                    {priceLists.map((priceList) => (
                      <option key={priceList.id} value={priceList.id}>
                        {priceList.name} {priceList.isActive ? "✓" : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {loading && (
                <p className="text-xs text-green-600 mt-1">Αποθήκευση...</p>
              )}
            </div>
          </div>

          {/* Default Billing Book Selection */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-3">
              <FaCog className="text-purple-600" />
              Προεπιλεγμένο Παραστατικό
            </h4>
            <p className="text-purple-700 text-sm mb-3">
              Επιλέξτε το παραστατικό που θα φορτώνεται αυτόματα στο POS. Η ρύθμιση αυτή δεν επηρεάζει την αυτόματη επιλογή "Δελτίο Παραγγελίας Εστίασης" όταν χρησιμοποιείτε τη Σάλα.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Παραστατικό
              </label>
              <select
                value={defaultBillingBookId}
                onChange={(e) => handleBillingBookChange(e.target.value)}
                disabled={loading || loadingBillingBooks || billingBooks.length === 0}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {loadingBillingBooks ? (
                  <option value="">Φόρτωση παραστατικών...</option>
                ) : billingBooks.length === 0 ? (
                  <option value="">Δεν υπάρχουν παραστατικά</option>
                ) : (
                  <>
                    <option value="">Επιλέξτε παραστατικό</option>
                    {billingBooks.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.name} ({book.series})
                        {book.number && ` - Επόμενος: ${book.number}`}
                        {book.invoice_type_code === '8.6' && ' 🍽️'}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {loading && (
                <p className="text-xs text-purple-600 mt-1">Αποθήκευση...</p>
              )}
              {loadingBillingBooks && (
                <p className="text-xs text-purple-600 mt-1">Φόρτωση παραστατικών από WRAPP...</p>
              )}
            </div>
          </div>

          {/* Restaurant Layout Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                  <FaTable className="text-blue-600" />
                  Διαμόρφωση Σάλας Εστιατορίου
                </h4>
                <p className="text-blue-700 text-sm mt-1">
                  Διαχειριστείτε τη διάταξη των τραπεζιών και τους τιμοκαταλόγους ανά τραπέζι
                </p>
              </div>
              <button
                onClick={onOpenRestaurantLayout}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaCog />
                Άνοιγμα
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
