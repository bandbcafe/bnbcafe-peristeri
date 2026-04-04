'use client';

import React from 'react';
import { FaFileInvoice, FaSpinner } from 'react-icons/fa';
import { wrappLogin, wrappBillingBooks, invoiceTypeLabels } from '@/lib/wrapp';
import { getWrappConfig } from '@/lib/firebase';

interface BillingBook {
  id: string;
  name: string;
  series: string;
  invoice_type_code: string;
  number: number;
}

interface DocumentTypeSelectorProps {
  selectedBookId?: string;
  selectedInvoiceType?: string;
  onBookChange?: (bookId: string, book: BillingBook) => void;
  onInvoiceTypeChange?: (invoiceType: string) => void;
  className?: string;
  disabled?: boolean;
  credentials?: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
}

export default function DocumentTypeSelector({
  selectedBookId,
  selectedInvoiceType,
  onBookChange,
  onInvoiceTypeChange,
  className = "",
  disabled = false,
  credentials
}: DocumentTypeSelectorProps) {
  
  const [availableBooks, setAvailableBooks] = React.useState<BillingBook[]>([]);
  const [enabledBooks, setEnabledBooks] = React.useState<BillingBook[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load enabled billing books on component mount
  React.useEffect(() => {
    loadEnabledBooks();
  }, []);

  // Auto-select billing book when invoice type changes
  React.useEffect(() => {
    if (selectedInvoiceType && enabledBooks.length > 0) {
      const matchingBook = enabledBooks.find(book => 
        book.invoice_type_code === selectedInvoiceType
      );
      
      if (matchingBook && matchingBook.id !== selectedBookId) {
        onBookChange?.(matchingBook.id, matchingBook);
      }
    }
  }, [selectedInvoiceType, enabledBooks, selectedBookId, onBookChange]);

  const loadEnabledBooks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Check credentials από props
      if (!credentials?.email || !credentials?.apiKey) {
        setError('Παρακαλώ ρυθμίστε τα διαπιστευτήρια WRAPP στις ρυθμίσεις');
        return;
      }

      // 2. Login to WRAPP API
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

      // 3. Fetch all billing books με το JWT που μόλις πήραμε
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

      const allBooks = await response.json();
      setAvailableBooks(allBooks);

      // 4. Get enabled books from configuration
      const config = await getWrappConfig();
      const enabledBookIds = config?.enabled_billing_books || [];
      
      // 5. Filter only enabled books
      const filteredBooks = allBooks.filter((book: any) => 
        enabledBookIds.includes(book.id)
      );
      
      setEnabledBooks(filteredBooks);
      
      // 6. Auto-select first book if none selected
      if (!selectedBookId && filteredBooks.length > 0) {
        const firstBook = filteredBooks[0];
        onBookChange?.(firstBook.id, firstBook);
        onInvoiceTypeChange?.(firstBook.invoice_type_code);
      }
      
    } catch (error: any) {
      console.error('Error loading billing books:', error);
      setError(error.message || 'Σφάλμα φόρτωσης παραστατικών');
    } finally {
      setLoading(false);
    }
  };

  // Get unique invoice types from enabled books
  const availableInvoiceTypes = React.useMemo(() => {
    const types = new Set(enabledBooks.map(book => book.invoice_type_code));
    return Array.from(types).sort();
  }, [enabledBooks]);

  // Get books for selected invoice type
  const booksForSelectedType = React.useMemo(() => {
    if (!selectedInvoiceType) return enabledBooks;
    return enabledBooks.filter(book => book.invoice_type_code === selectedInvoiceType);
  }, [enabledBooks, selectedInvoiceType]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-4 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <FaSpinner className="animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">Φόρτωση παραστατικών...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <FaFileInvoice className="text-red-600" />
          <span className="text-sm font-medium">Σφάλμα</span>
        </div>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        <button
          onClick={loadEnabledBooks}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Δοκιμή ξανά
        </button>
      </div>
    );
  }

  if (enabledBooks.length === 0) {
    return (
      <div className={`p-4 border border-yellow-200 rounded-lg bg-yellow-50 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-800">
          <FaFileInvoice className="text-yellow-600" />
          <span className="text-sm font-medium">Δεν υπάρχουν ενεργά παραστατικά</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Παρακαλώ ενεργοποιήστε παραστατικά στις ρυθμίσεις WRAPP.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Invoice Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Τύπος Παραστατικού
        </label>
        <select
          value={selectedInvoiceType || ''}
          onChange={(e) => onInvoiceTypeChange?.(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Επιλέξτε τύπο παραστατικού</option>
          {availableInvoiceTypes.map(type => (
            <option key={type} value={type}>
              {type} - {invoiceTypeLabels[type] || 'Άγνωστος τύπος'}
            </option>
          ))}
        </select>
      </div>

      {/* Billing Book Selection */}
      {selectedInvoiceType && booksForSelectedType.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Βιβλίο Τιμολόγησης
          </label>
          <select
            value={selectedBookId || ''}
            onChange={(e) => {
              const book = booksForSelectedType.find(b => b.id === e.target.value);
              if (book) {
                onBookChange?.(book.id, book);
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Επιλέξτε βιβλίο</option>
            {booksForSelectedType.map(book => (
              <option key={book.id} value={book.id}>
                {book.series} - {book.name} (Επόμενος: {book.number})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Book Info */}
      {selectedBookId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FaFileInvoice className="text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Επιλεγμένο Παραστατικό</span>
          </div>
          {(() => {
            const selectedBook = enabledBooks.find(book => book.id === selectedBookId);
            return selectedBook ? (
              <div className="text-sm text-blue-800">
                <p><strong>Τύπος:</strong> {selectedBook.invoice_type_code} - {invoiceTypeLabels[selectedBook.invoice_type_code]}</p>
                <p><strong>Σειρά:</strong> {selectedBook.series}</p>
                <p><strong>Επόμενος αριθμός:</strong> {selectedBook.number}</p>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Statistics */}
      <div className="text-xs text-gray-500">
        Διαθέσιμα: {enabledBooks.length} από {availableBooks.length} παραστατικά
      </div>
    </div>
  );
}
