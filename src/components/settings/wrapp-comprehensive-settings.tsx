'use client';

import React from 'react';
import { 
  FaFileInvoice, 
  FaUser, 
  FaPlus, 
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync,
  FaSave 
} from 'react-icons/fa';
import { wrappLogin, wrappUserDetails, wrappVatExemptions, wrappBillingBooks, wrappCreateBillingBook, wrappUpdateBillingBook, wrappDeleteBillingBook, invoiceTypeLabels, paymentMethodLabels, classificationCategories, classificationTypes, classificationCategoryDescriptions, classificationTypeDescriptions } from '@/lib/wrapp';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PriceList } from '@/types/products';

interface WrappComprehensiveSettingsProps {
  credentials?: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
}

interface UserDetails {
  wrapp_user_id: string;
  partner_user_id: string;
  issue_invoice_status: boolean;
  email: string;
  has_plan: boolean;
}

interface VatExemption {
  [key: string]: string;
}

interface BillingBook {
  id: string;
  name: string;
  series: string;
  invoice_type_code: string;
  number: number;
}

export default function WrappComprehensiveSettings({ credentials }: WrappComprehensiveSettingsProps) {
  
  // State
  const [loading, setLoading] = React.useState(false);
  const [userDetails, setUserDetails] = React.useState<UserDetails | null>(null);
  const [vatExemptions, setVatExemptions] = React.useState<VatExemption[]>([]);
  const [billingBooks, setBillingBooks] = React.useState<BillingBook[]>([]);
  const [enabledBooks, setEnabledBooks] = React.useState<string[]>([]);
  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Default settings state
  const [defaultSettings, setDefaultSettings] = React.useState({
    defaultBillingBookId: '',
    defaultInvoiceType: '11.1',
    defaultPaymentMethod: 0,
    defaultVatRate: 24,
    defaultVatExemption: '',
    defaultClassificationCategory: 'category1_1',
    defaultClassificationType: 'E3_561_003'
  });

  // New billing book form
  const [newBookForm, setNewBookForm] = React.useState({
    name: '',
    series: '',
    number: 1,
    invoice_type_code: '11.1',
    setAsDefault: false
  });
  const [showNewBookForm, setShowNewBookForm] = React.useState(false);

  // Load all WRAPP data
  const loadWrappData = async () => {
    if (!credentials?.email || !credentials?.apiKey) {
      setMessage({
        type: 'error',
        text: 'Παρακαλώ συμπληρώστε τα διαπιστευτήρια WRAPP'
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      // 1. Login
      const loginResult = await wrappLogin(
        credentials.email,
        credentials.apiKey,
        credentials.baseUrl
      );
      
      const jwt = loginResult.data?.attributes?.jwt;
      if (!jwt) {
        throw new Error('No JWT token received from login');
      }
      // JWT is session-based, no need to store permanently

      // 2. Load user details
      const userResponse = await fetch('/api/wrapp/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserDetails(userData);
      }

      // 3. Load VAT exemptions
      const vatResponse = await fetch(`/api/wrapp/vat-exemptions?baseUrl=${encodeURIComponent(credentials.baseUrl)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      });
      
      if (vatResponse.ok) {
        const vatData = await vatResponse.json();
        setVatExemptions(vatData);
      }

      // 4. Load billing books
      console.log('🔍 Loading billing books...');
      const booksResponse = await fetch(`/api/wrapp/billing-books?baseUrl=${encodeURIComponent(credentials.baseUrl)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      });
      
      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        console.log('📚 Billing books loaded:', booksData);
        setBillingBooks(booksData);
      } else {
        console.error('❌ Failed to load billing books:', booksResponse.status, booksResponse.statusText);
        const errorText = await booksResponse.text();
        console.error('Error details:', errorText);
      }

      // 5. Load user defaults and enabled books from Firestore (Global)
      try {
        console.log('⚙️ Loading user defaults from Firestore...');
        const wrappDocRef = doc(db, "config", "wrapp");
        const wrappDocSnap = await getDoc(wrappDocRef);
        
        if (wrappDocSnap.exists()) {
          const wrappData = wrappDocSnap.data();
          
          // Load default settings
          if (wrappData.default_settings) {
            setDefaultSettings(prevDefaults => ({
              ...prevDefaults,
              ...wrappData.default_settings
            }));
            console.log('✅ User defaults loaded from Firestore:', wrappData.default_settings);
          }

          // Load enabled books
          if (wrappData.enabled_billing_books) {
            setEnabledBooks(wrappData.enabled_billing_books);
            console.log('✅ Enabled books loaded from Firestore:', wrappData.enabled_billing_books);
          }
        } else {
          console.log('⚠️ No wrapp config found in Firestore, using defaults');
        }
      } catch (error) {
        console.error('⚠️ Could not load user defaults from Firestore:', error);
        // Continue without failing - defaults will use initial values
      }

      setMessage({
        type: 'success',
        text: 'Τα στοιχεία φορτώθηκαν επιτυχώς από το WRAPP'
      });
      
    } catch (error: any) {
      console.error('Error loading WRAPP data:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα φόρτωσης στοιχείων από WRAPP'
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new billing book
  const createBillingBook = async () => {
    if (!newBookForm.name || !newBookForm.series) {
      setMessage({
        type: 'error',
        text: 'Παρακαλώ συμπληρώστε όνομα και σειρά'
      });
      return;
    }

    try {
      const { setAsDefault, ...bookData } = newBookForm;
      const result = await wrappCreateBillingBook(bookData, credentials?.baseUrl);
      
      // If user wants to enable this book, add it to enabled books
      if (setAsDefault && result?.id) {
        const newEnabledBooks = [...enabledBooks, result.id];
        setEnabledBooks(newEnabledBooks);
        
        // Save to Firestore (Global)
        try {
          await setDoc(doc(db, "config", "wrapp"), {
            enabled_billing_books: newEnabledBooks
          }, { merge: true });
          console.log('✅ Enabled books saved to Firestore (Global)');
        } catch (error) {
          console.error('❌ Failed to save enabled books to Firestore:', error);
        }
      }
      
      setMessage({
        type: 'success',
        text: 'Νέο βιβλίο δημιουργήθηκε επιτυχώς'
      });
      setNewBookForm({ name: '', series: '', number: 1, invoice_type_code: '11.1', setAsDefault: false });
      setShowNewBookForm(false);
      loadWrappData(); // Reload data
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα δημιουργίας βιβλίου'
      });
    }
  };

  // Update billing book number
  const updateBookNumber = async (bookId: string, newNumber: number) => {
    try {
      const result = await wrappUpdateBillingBook(bookId, { number: newNumber }, credentials?.baseUrl);
      setMessage({
        type: 'success',
        text: 'Αριθμός βιβλίου ενημερώθηκε επιτυχώς'
      });
      loadWrappData(); // Reload data
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα ενημέρωσης αριθμού'
      });
    }
  };

  // Update billing book series
  const updateBookSeries = async (bookId: string, newSeries: string) => {
    try {
      const result = await wrappUpdateBillingBook(bookId, { series: newSeries }, credentials?.baseUrl);
      setMessage({
        type: 'success',
        text: 'Σειρά βιβλίου ενημερώθηκε επιτυχώς'
      });
      loadWrappData(); // Reload data
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα ενημέρωσης σειράς'
      });
    }
  };

  // Update billing book invoice type
  const updateBookInvoiceType = async (bookId: string, newInvoiceType: string) => {
    try {
      const result = await wrappUpdateBillingBook(bookId, { invoice_type_code: newInvoiceType }, credentials?.baseUrl);
      setMessage({
        type: 'success',
        text: 'Τύπος παραστατικού ενημερώθηκε επιτυχώς'
      });
      loadWrappData(); // Reload data
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα ενημέρωσης τύπου παραστατικού'
      });
    }
  };

  // Delete billing book
  const deleteBillingBook = async (bookId: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το βιβλίο;')) {
      return;
    }
    
    try {
      const result = await wrappDeleteBillingBook(bookId, credentials?.baseUrl);
      setMessage({
        type: 'success',
        text: 'Βιβλίο διαγράφηκε επιτυχώς'
      });
      loadWrappData(); // Reload data
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα διαγραφής βιβλίου'
      });
    }
  };

  // Helper function to save settings to Firestore (Global)
  const saveSettingsToFirestore = async (settings: any) => {
    try {
      await setDoc(doc(db, "config", "wrapp"), {
        default_settings: settings
      }, { merge: true });
      console.log('✅ Settings auto-saved to Firestore (Global):', settings);
      
      setMessage({
        type: 'success',
        text: 'Οι προεπιλεγμένες ρυθμίσεις αποθηκεύτηκαν'
      });
    } catch (error) {
      console.error('❌ Failed to auto-save settings to Firestore:', error);
      setMessage({
        type: 'error',
        text: 'Σφάλμα αποθήκευσης ρυθμίσεων'
      });
    }
  };

  // Helper function to save enabled books to Firestore (Global)
  const saveEnabledBooksToFirestore = async (books: string[]) => {
    try {
      await setDoc(doc(db, "config", "wrapp"), {
        enabled_billing_books: books
      }, { merge: true });
      console.log('✅ Enabled books auto-saved to Firestore (Global)');
    } catch (error) {
      console.error('❌ Failed to auto-save enabled books to Firestore:', error);
    }
  };

  // Save default settings
  const saveDefaultSettings = async () => {
    try {
      setLoading(true);
      
      // Save to Firestore (Global)
      await saveSettingsToFirestore(defaultSettings);
      
      setMessage({
        type: 'success',
        text: 'Προεπιλεγμένες ρυθμίσεις αποθηκεύτηκαν επιτυχώς στο Firestore (Global)'
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Σφάλμα αποθήκευσης ρυθμίσεων στο Firestore'
      });
    } finally {
      setLoading(false);
    }
  };

  // Default enabled books logic is now handled in loadWrappData from Firestore

  // Load price lists from Firestore
  const loadPriceLists = async () => {
    try {
      const priceListsSnapshot = await getDocs(collection(db, 'priceLists'));
      const loadedPriceLists: PriceList[] = [];
      
      priceListsSnapshot.forEach((doc) => {
        loadedPriceLists.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as PriceList);
      });
      
      setPriceLists(loadedPriceLists);
      console.log('✅ Loaded price lists:', loadedPriceLists.length);
    } catch (error) {
      console.error('❌ Error loading price lists:', error);
    }
  };

  // Update price list classifications
  const updatePriceListClassifications = async (
    priceListId: string, 
    category?: string, 
    type?: string
  ) => {
    try {
      const priceListRef = doc(db, 'priceLists', priceListId);
      
      // Build update object - use deleteField() for empty values
      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (category) {
        updateData.myDataClassificationCategory = category;
      } else {
        updateData.myDataClassificationCategory = deleteField();
      }
      
      if (type) {
        updateData.myDataClassificationType = type;
      } else {
        updateData.myDataClassificationType = deleteField();
      }
      
      await updateDoc(priceListRef, updateData);

      // Update local state
      setPriceLists(prev => prev.map(pl => 
        pl.id === priceListId 
          ? { 
              ...pl, 
              myDataClassificationCategory: category || undefined, 
              myDataClassificationType: type || undefined 
            }
          : pl
      ));

      setMessage({
        type: 'success',
        text: 'Οι ταξινομήσεις του τιμοκαταλόγου ενημερώθηκαν'
      });

      console.log(`✅ Updated classifications for price list ${priceListId}:`, { category, type });
    } catch (error: any) {
      console.error('❌ Error updating price list classifications:', error);
      setMessage({
        type: 'error',
        text: 'Σφάλμα ενημέρωσης ταξινομήσεων'
      });
    }
  };

  // Auto-load data when credentials change
  React.useEffect(() => {
    if (credentials?.email && credentials?.apiKey) {
      loadWrappData();
    }
    // Also load price lists
    loadPriceLists();
  }, [credentials?.email, credentials?.apiKey, credentials?.baseUrl]);

  // Auto-clear messages
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaFileInvoice className="text-blue-600" />
          Ρυθμίσεις WRAPP API
        </h3>
        <button
          onClick={loadWrappData}
          disabled={loading || !credentials?.email || !credentials?.apiKey}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              Φόρτωση...
            </>
          ) : (
            <>
              <FaSync />
              Ανανέωση Στοιχείων
            </>
          )}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* User Details Section */}
      {userDetails && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaUser className="text-green-600" />
            Στοιχεία Χρήστη WRAPP
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">WRAPP User ID:</span>
              <p className="text-gray-600">{userDetails.wrapp_user_id}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <p className="text-gray-600">{userDetails.email}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Κατάσταση Έκδοσης:</span>
              <p className={`${userDetails.issue_invoice_status ? 'text-green-600' : 'text-red-600'}`}>
                {userDetails.issue_invoice_status ? 'Ενεργή' : 'Ανενεργή'}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Πλάνο:</span>
              <p className={`${userDetails.has_plan ? 'text-green-600' : 'text-red-600'}`}>
                {userDetails.has_plan ? 'Ενεργό' : 'Ανενεργό'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Default Settings Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-800 mb-4">
          Προεπιλεγμένες Ρυθμίσεις Παραστατικών
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default Billing Book */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Προεπιλεγμένο Βιβλίο
            </label>
            <select
              value={defaultSettings.defaultBillingBookId}
              onChange={(e) => setDefaultSettings({...defaultSettings, defaultBillingBookId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Επιλέξτε βιβλίο</option>
              {billingBooks.map(book => (
                <option key={book.id} value={book.id}>
                  {book.series} - {book.name} ({book.invoice_type_code})
                </option>
              ))}
            </select>
          </div>

          {/* Default Invoice Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Τύπος Παραστατικού
            </label>
            <select
              value={defaultSettings.defaultInvoiceType}
              onChange={async (e) => {
                const newSettings = {...defaultSettings, defaultInvoiceType: e.target.value};
                setDefaultSettings(newSettings);
                
                // Auto-save to Firestore (Global)
                saveSettingsToFirestore(newSettings);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(invoiceTypeLabels).map(([code, label]) => (
                <option key={code} value={code}>{code} - {label}</option>
              ))}
            </select>
          </div>

          {/* Default Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Μέθοδος Πληρωμής
            </label>
            <select
              value={defaultSettings.defaultPaymentMethod}
              onChange={async (e) => {
                const newValue = Number(e.target.value);
                const newSettings = {...defaultSettings, defaultPaymentMethod: newValue};
                setDefaultSettings(newSettings);
                
                // Auto-save to Firestore (Global)
                saveSettingsToFirestore(newSettings);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(paymentMethodLabels).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>

          {/* Default VAT Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Συντελεστής ΦΠΑ (%)
            </label>
            <select
              value={defaultSettings.defaultVatRate}
              onChange={async (e) => {
                const newValue = Number(e.target.value);
                const newSettings = {...defaultSettings, defaultVatRate: newValue};
                setDefaultSettings(newSettings);
                
                // Auto-save to Firestore (Global)
                saveSettingsToFirestore(newSettings);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={24}>24% - Κανονικός συντελεστής</option>
              <option value={13}>13% - Μειωμένος συντελεστής</option>
              <option value={6}>6% - Υπερμειωμένος συντελεστής</option>
              <option value={0}>0% - Μηδενικός συντελεστής</option>
            </select>
          </div>

          {/* VAT Exemption */}
          {vatExemptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Απαλλαγή ΦΠΑ
              </label>
              <select
                value={defaultSettings.defaultVatExemption}
                onChange={(e) => setDefaultSettings({...defaultSettings, defaultVatExemption: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Χωρίς απαλλαγή</option>
                {vatExemptions.map((exemption, index) => {
                  const [code, description] = Object.entries(exemption)[0];
                  return (
                    <option key={index} value={code}>{code} - {description}</option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Classification Category */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Κατηγορία Ταξινόμησης (MyDATA)
            </label>
            <select
              value={defaultSettings.defaultClassificationCategory}
              onChange={async (e) => {
                const newSettings = {...defaultSettings, defaultClassificationCategory: e.target.value};
                setDefaultSettings(newSettings);
                // Auto-save to Firestore (Global)
                saveSettingsToFirestore(newSettings);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(classificationCategories).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            {/* Description for selected category */}
            {defaultSettings.defaultClassificationCategory && classificationCategoryDescriptions[defaultSettings.defaultClassificationCategory] && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">💡 Επεξήγηση:</span> {classificationCategoryDescriptions[defaultSettings.defaultClassificationCategory]}
                </p>
              </div>
            )}
          </div>

          {/* Classification Type */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Τύπος Ταξινόμησης (MyDATA)
            </label>
            <select
              value={defaultSettings.defaultClassificationType}
              onChange={async (e) => {
                const newSettings = {...defaultSettings, defaultClassificationType: e.target.value};
                setDefaultSettings(newSettings);
                // Auto-save to Firestore (Global)
                saveSettingsToFirestore(newSettings);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(classificationTypes).map(([code, label]) => (
                <option key={code} value={code}>{code} - {label}</option>
              ))}
            </select>
            {/* Description for selected type */}
            {defaultSettings.defaultClassificationType && classificationTypeDescriptions[defaultSettings.defaultClassificationType] && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">💡 Επεξήγηση:</span> {classificationTypeDescriptions[defaultSettings.defaultClassificationType]}
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="md:col-span-2">
            <hr className="my-6 border-gray-300" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-md font-semibold text-gray-800">
                  Ταξινομήσεις MyDATA ανά Τιμοκατάλογο
                </h5>
                <p className="text-sm text-gray-600 mt-1">
                  Ορίστε διαφορετικές ταξινομήσεις για κάθε τιμοκατάλογο. Αν δεν οριστούν, θα χρησιμοποιηθούν οι παραπάνω προεπιλογές.
                </p>
              </div>
              <button
                onClick={loadPriceLists}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Ανανέωση
              </button>
            </div>
          </div>

          {/* Price Lists Classifications */}
          <div className="md:col-span-2">
            {priceLists.length > 0 ? (
              <div className="space-y-4">
                {priceLists.map((priceList) => (
                  <div key={priceList.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h6 className="font-semibold text-gray-800">{priceList.name}</h6>
                        {priceList.description && (
                          <p className="text-sm text-gray-600">{priceList.description}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        priceList.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {priceList.isActive ? 'Ενεργός' : 'Ανενεργός'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Classification Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Κατηγορία Ταξινόμησης
                        </label>
                        <select
                          value={priceList.myDataClassificationCategory || ''}
                          onChange={(e) => updatePriceListClassifications(
                            priceList.id,
                            e.target.value || undefined,
                            priceList.myDataClassificationType
                          )}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">Χρήση προεπιλογής</option>
                          {Object.entries(classificationCategories).map(([code, label]) => (
                            <option key={code} value={code}>{label}</option>
                          ))}
                        </select>
                        {priceList.myDataClassificationCategory && classificationCategoryDescriptions[priceList.myDataClassificationCategory] && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            💡 {classificationCategoryDescriptions[priceList.myDataClassificationCategory]}
                          </div>
                        )}
                      </div>

                      {/* Classification Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Τύπος Ταξινόμησης
                        </label>
                        <select
                          value={priceList.myDataClassificationType || ''}
                          onChange={(e) => updatePriceListClassifications(
                            priceList.id,
                            priceList.myDataClassificationCategory,
                            e.target.value || undefined
                          )}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">Χρήση προεπιλογής</option>
                          {Object.entries(classificationTypes).map(([code, label]) => (
                            <option key={code} value={code}>{code} - {label}</option>
                          ))}
                        </select>
                        {priceList.myDataClassificationType && classificationTypeDescriptions[priceList.myDataClassificationType] && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                            💡 {classificationTypeDescriptions[priceList.myDataClassificationType]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm">Δεν βρέθηκαν τιμοκατάλογοι</p>
                <p className="text-xs mt-1">Δημιουργήστε τιμοκαταλόγους από τη σελίδα Προϊόντα</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Books Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-800">
            Διαχείριση Βιβλίων Τιμολόγησης
          </h4>
          <button
            onClick={() => setShowNewBookForm(!showNewBookForm)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaPlus />
            Νέο Βιβλίο
          </button>
        </div>

        {/* New Book Form - WRAPP Style */}
        {showNewBookForm && (
          <div className="mb-4 border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              {/* Όνομα */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Όνομα*</label>
                <input
                  type="text"
                  value={newBookForm.name}
                  onChange={(e) => setNewBookForm({...newBookForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. Τιμολόγιο Παροχής"
                />
              </div>

              {/* Τύπος Παραστατικών */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Τύπος Παραστατικών</label>
                <select
                  value={newBookForm.invoice_type_code}
                  onChange={(e) => setNewBookForm({...newBookForm, invoice_type_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(invoiceTypeLabels).map(([code, label]) => (
                    <option key={code} value={code}>{code} - {label}</option>
                  ))}
                </select>
              </div>

              {/* Σειρά */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Σειρά*</label>
                <input
                  type="text"
                  value={newBookForm.series}
                  onChange={(e) => setNewBookForm({...newBookForm, series: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="π.χ. ΕΤΤΠΑ"
                />
              </div>

              {/* Επόμενος Αριθμός */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Επόμενος Αριθμός*</label>
                <input
                  type="number"
                  min="1"
                  value={newBookForm.number}
                  onChange={(e) => setNewBookForm({...newBookForm, number: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Ορισμός Προεπιλογής + Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="new-book-enabled"
                    checked={newBookForm.setAsDefault || false}
                    onChange={(e) => setNewBookForm({...newBookForm, setAsDefault: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="new-book-enabled" className="ml-2 text-xs font-medium text-gray-700">
                    Ορισμός<br />Προεπιλογής
                  </label>
                </div>
                <button
                  onClick={() => setShowNewBookForm(false)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setShowNewBookForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Ακύρωση
              </button>
              <button
                onClick={createBillingBook}
                disabled={loading || !newBookForm.name || !newBookForm.series}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? 'Δημιουργία...' : 'Δημιουργία'}
              </button>
            </div>
          </div>
        )}

        {/* Existing Books List - WRAPP Style */}
        {billingBooks.length > 0 ? (
          <div className="space-y-4">
            {billingBooks.map(book => (
              <div key={book.id} className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Όνομα */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Όνομα*</label>
                    <div className="bg-blue-100 px-3 py-2 rounded text-sm font-medium text-blue-800">
                      {book.series}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{book.name}</div>
                  </div>

                  {/* Τύπος Παραστατικών */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Τύπος Παραστατικών</label>
                    <select 
                      defaultValue={book.invoice_type_code}
                      onChange={(e) => updateBookInvoiceType(book.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {/* Show current type if not in predefined list */}
                      {book.invoice_type_code && !invoiceTypeLabels[book.invoice_type_code] && (
                        <option key={book.invoice_type_code} value={book.invoice_type_code}>
                          {book.invoice_type_code} - Άγνωστος τύπος (από WRAPP)
                        </option>
                      )}
                      {Object.entries(invoiceTypeLabels).map(([code, label]) => (
                        <option key={code} value={code}>{code} - {label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Σειρά */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Σειρά*</label>
                    <input
                      type="text"
                      defaultValue={book.series}
                      onBlur={(e) => {
                        if (e.target.value !== book.series && e.target.value.trim()) {
                          updateBookSeries(book.id, e.target.value.trim());
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="π.χ. ΕΤΤΠΑ"
                    />
                  </div>

                  {/* Επόμενος Αριθμός */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Επόμενος Αριθμός*</label>
                    <input
                      type="number"
                      min="1"
                      defaultValue={book.number}
                      onBlur={(e) => {
                        const newNumber = Number(e.target.value);
                        if (newNumber !== book.number && newNumber > 0) {
                          updateBookNumber(book.id, newNumber);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Ορισμός Προεπιλογής + Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`enabled-${book.id}`}
                        checked={enabledBooks.includes(book.id)}
                        onChange={async (e) => {
                          let newEnabledBooks;
                          if (e.target.checked) {
                            // Add book to enabled list
                            newEnabledBooks = [...enabledBooks, book.id];
                          } else {
                            // Remove book from enabled list
                            newEnabledBooks = enabledBooks.filter(id => id !== book.id);
                          }
                          
                          setEnabledBooks(newEnabledBooks);
                          
                          // Auto-save to Firestore (Global)
                          saveEnabledBooksToFirestore(newEnabledBooks);
                          setMessage({
                            type: 'success',
                            text: e.target.checked ? 'Βιβλίο ενεργοποιήθηκε' : 'Βιβλίο απενεργοποιήθηκε'
                          });
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`enabled-${book.id}`} className="ml-2 text-xs font-medium text-gray-700">
                        Ορισμός<br />Προεπιλογής
                      </label>
                    </div>
                    <button
                      onClick={() => deleteBillingBook(book.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Διαγραφή βιβλίου"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FaFileInvoice className="mx-auto text-4xl mb-3 text-gray-300" />
            <p className="text-lg font-medium">Δεν βρέθηκαν βιβλία τιμολόγησης</p>
            <p className="text-sm">Πατήστε "Ανανέωση Στοιχείων" για να φορτώσετε τα δεδομένα από το WRAPP</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveDefaultSettings}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <FaSave />
          {loading ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
        </button>
      </div>
    </div>
  );
}
