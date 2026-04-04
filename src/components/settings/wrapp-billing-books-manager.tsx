'use client';

import React from 'react';
import { FaSpinner, FaSyncAlt, FaSave, FaFileInvoice, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { wrappLogin, wrappBillingBooks, invoiceTypeLabels } from '@/lib/wrapp';
import { getWrappConfig, setWrappConfig } from '@/lib/firebase';

interface BillingBook {
  id: string;
  name: string;
  series: string;
  invoice_type_code: string;
  number: number;
}

interface WrappBillingBooksManagerProps {
  onBooksLoaded?: (books: BillingBook[]) => void;
  onEnabledBooksChanged?: (enabledBooks: string[]) => void;
  credentials?: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
}

export default function WrappBillingBooksManager({ 
  onBooksLoaded, 
  onEnabledBooksChanged,
  credentials
}: WrappBillingBooksManagerProps) {
  
  // State
  const [books, setBooks] = React.useState<BillingBook[]>([]);
  const [enabledBooks, setEnabledBooks] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * ΒΗΜΑ 1: Φόρτωση Billing Books
   * Ροή: Get credentials → Login → Fetch books → Load enabled from Firebase
   */
  const loadBillingBooks = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // 1. Check credentials από props
      if (!credentials?.email || !credentials?.apiKey) {
        setMessage({
          type: 'error',
          text: 'Παρακαλώ συμπληρώστε τα διαπιστευτήρια Wrapp στις ρυθμίσεις'
        });
        return;
      }

      // 2. Login στο Wrapp API
      console.log('🔐 Logging in to Wrapp...');
      const loginResult = await wrappLogin(
        credentials.email,
        credentials.apiKey,
        credentials.baseUrl
      );
      
      // 3. Αποθήκευση JWT (διάρκεια: 24 ώρες)
      const jwt = loginResult.data?.attributes?.jwt;
      if (!jwt) {
        throw new Error('No JWT token received from login');
      }
      // JWT is session-based, no need to store permanently
      console.log('✅ JWT received, session-based');

      // 4. Fetch billing books με το JWT που μόλις πήραμε
      console.log('📚 Fetching billing books...');
      const response = await fetch(`/api/wrapp/billing-books?baseUrl=${encodeURIComponent(credentials.baseUrl)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch billing books: ${errorText}`);
      }

      const booksList = await response.json();
      setBooks(booksList);
      console.log(`✅ Loaded ${booksList.length} billing books`);

      // 5. Load enabled books από Firebase
      const config = await getWrappConfig();
      const enabledIds = config?.enabled_billing_books || [];
      setEnabledBooks(new Set(enabledIds));
      console.log(`📋 ${enabledIds.length} books are currently enabled`);
      

      setMessage({
        type: 'success',
        text: `Φορτώθηκαν ${booksList.length} παραστατικά επιτυχώς`
      });

      // Notify parent component
      if (onBooksLoaded) {
        onBooksLoaded(booksList);
      }
      if (onEnabledBooksChanged) {
        onEnabledBooksChanged(enabledIds);
      }
      
    } catch (error: any) {
      console.error('❌ Load billing books error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Αποτυχία φόρτωσης παραστατικών'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * ΒΗΜΑ 2: Toggle Enable/Disable
   * Προσθήκη/αφαίρεση book ID από το Set
   */
  const toggleBook = (bookId: string) => {
    setEnabledBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
        console.log(`❌ Disabled book: ${bookId}`);
      } else {
        newSet.add(bookId);
        console.log(`✅ Enabled book: ${bookId}`);
      }
      return newSet;
    });
  };

  /**
   * ΒΗΜΑ 3: Αποθήκευση στο Firebase
   * Αποθήκευση enabled books στο config/wrapp collection
   */
  const saveEnabledBooks = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const enabledArray = Array.from(enabledBooks);
      await setWrappConfig({
        enabled_billing_books: enabledArray
      });
      
      console.log('✅ Enabled books saved to Firebase');
      console.log('Enabled IDs:', enabledArray);
      
      setMessage({
        type: 'success',
        text: 'Οι αλλαγές αποθηκεύτηκαν επιτυχώς'
      });

      // Notify parent component
      if (onEnabledBooksChanged) {
        onEnabledBooksChanged(enabledArray);
      }
    } catch (error: any) {
      console.error('❌ Save error:', error);
      setMessage({
        type: 'error',
        text: 'Αποτυχία αποθήκευσης αλλαγών'
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-clear messages after 5 seconds
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 border-l-4 border-l-green-500">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FaFileInvoice className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Διαθέσιμα Παραστατικά
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Επιλέξτε ποια παραστατικά θα είναι διαθέσιμα για έκδοση. 
              Τα ενεργά παραστατικά θα εμφανίζονται στη φόρμα έκδοσης.
            </p>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={loadBillingBooks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <FaSpinner className="h-4 w-4 animate-spin" />
            ) : (
              <FaSyncAlt className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Ανανέωση</span>
          </button>
        </div>
      </div>
      
      {/* CONTENT */}
      <div>
        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <FaCheckCircle className="w-4 h-4" />
            ) : (
              <FaTimesCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {loading ? (
          // LOADING STATE
          <div className="flex items-center justify-center p-8">
            <FaSpinner className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2">Φόρτωση παραστατικών...</span>
          </div>
        ) : books.length === 0 ? (
          // EMPTY STATE
          <div className="text-center p-8 text-gray-500">
            <FaFileInvoice className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">Δεν βρέθηκαν billing books</p>
            <p className="text-sm mt-2">
              Πατήστε το κουμπί ανανέωσης για φόρτωση από το Wrapp API.
            </p>
            <p className="text-xs mt-1 text-gray-400">
              Βεβαιωθείτε ότι έχετε ρυθμίσει σωστά τα διαπιστευτήρια API.
            </p>
          </div>
        ) : (
          // BOOKS LIST
          <>
            <div className="space-y-2 mb-6">
              {books.map(book => (
                <div
                  key={book.id}
                  className={`flex items-start space-x-3 p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    enabledBooks.has(book.id)
                      ? 'border-green-500 bg-green-50/50 shadow-sm'  // Enabled: Green
                      : 'border-gray-200 bg-white hover:border-gray-300'  // Disabled: Gray
                  }`}
                  onClick={() => toggleBook(book.id)}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    id={`book-${book.id}`}
                    checked={enabledBooks.has(book.id)}
                    onChange={() => toggleBook(book.id)}
                    className="mt-1 rounded text-green-600 focus:ring-green-500"
                  />
                  
                  {/* Book Info */}
                  <div className="flex-1">
                    {/* Header: Badge + Name */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        {book.invoice_type_code}
                      </span>
                      <span className="font-medium text-gray-900">
                        {invoiceTypeLabels[book.invoice_type_code] || book.name}
                      </span>
                      {enabledBooks.has(book.id) && (
                        <FaCheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    
                    {/* Details: Series + Next Number */}
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="text-gray-500">Σειρά:</span>
                        <span className="font-mono font-semibold text-gray-900">
                          {book.series}
                        </span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1">
                        <span className="text-gray-500">Επόμενος:</span>
                        <span className="font-mono text-gray-900">
                          {book.number}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-900">
                  💡 <strong>{enabledBooks.size}</strong> από <strong>{books.length}</strong> παραστατικά ενεργοποιημένα
                </span>
                <span className="text-blue-700">
                  Μόνο τα ενεργοποιημένα θα εμφανίζονται στη φόρμα έκδοσης
                </span>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveEnabledBooks}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <FaSpinner className="h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <FaSave className="h-4 w-4" />
                  Αποθήκευση Ρυθμίσεων ({enabledBooks.size} ενεργά)
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
