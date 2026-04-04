'use client';

import React from 'react';
import { FaReceipt, FaSpinner, FaCheckCircle, FaTimesCircle, FaEye, FaDownload } from 'react-icons/fa';
import { wrappLogin, wrappCreateInvoice, wrappGeneratePdf, paymentMethodLabels } from '@/lib/wrapp';
import DocumentTypeSelector from './document-type-selector';

interface InvoiceLineItem {
  line_number: number;
  name: string;
  description?: string;
  quantity: number;
  quantity_type?: number; // Quantity type for the line item
  unit_price: number;
  net_total_price: number;
  vat_rate: number;
  vat_total: number;
  subtotal: number;
  classification_category: string;
  classification_type: string;
}

interface CustomerInfo {
  name: string;
  vat?: string;
  country_code?: string;
  city?: string;
  street?: string;
  number?: string;
  postal_code?: string;
  email?: string;
}

interface InvoiceData {
  customer: CustomerInfo;
  lines: InvoiceLineItem[];
  payment_method_type: number;
  notes?: string;
}

interface InvoiceIssuerProps {
  invoiceData: InvoiceData;
  onInvoiceIssued?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  credentials?: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
}

interface BillingBook {
  id: string;
  name: string;
  series: string;
  invoice_type_code: string;
  number: number;
}

export default function InvoiceIssuer({
  invoiceData,
  onInvoiceIssued,
  onError,
  className = "",
  disabled = false,
  credentials
}: InvoiceIssuerProps) {
  
  const [selectedBookId, setSelectedBookId] = React.useState<string>('');
  const [selectedBook, setSelectedBook] = React.useState<BillingBook | null>(null);
  const [selectedInvoiceType, setSelectedInvoiceType] = React.useState<string>('');
  const [issuing, setIssuing] = React.useState(false);
  const [issuedInvoice, setIssuedInvoice] = React.useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = React.useState(false);

  // Calculate totals
  const totals = React.useMemo(() => {
    const netTotal = invoiceData.lines.reduce((sum, line) => sum + line.net_total_price, 0);
    const vatTotal = invoiceData.lines.reduce((sum, line) => sum + line.vat_total, 0);
    const total = netTotal + vatTotal;
    
    return {
      netTotal: Number(netTotal.toFixed(2)),
      vatTotal: Number(vatTotal.toFixed(2)),
      total: Number(total.toFixed(2))
    };
  }, [invoiceData.lines]);

  const handleBookChange = (bookId: string, book: BillingBook) => {
    setSelectedBookId(bookId);
    setSelectedBook(book);
  };

  const handleInvoiceTypeChange = (invoiceType: string) => {
    setSelectedInvoiceType(invoiceType);
  };

  const issueInvoice = async () => {
    if (!selectedBookId || !selectedBook || !selectedInvoiceType) {
      onError?.('Παρακαλώ επιλέξτε τύπο παραστατικού και βιβλίο τιμολόγησης');
      return;
    }

    setIssuing(true);
    
    try {
      // 1. Check credentials από props
      if (!credentials?.email || !credentials?.apiKey) {
        throw new Error('Παρακαλώ ρυθμίστε τα διαπιστευτήρια WRAPP στις ρυθμίσεις');
      }

      // 2. Ensure we have a valid JWT
      let jwt = localStorage.getItem('wrapp_jwt');
      if (!jwt) {
        const loginResult = await wrappLogin(
          credentials.email,
          credentials.apiKey,
          credentials.baseUrl
        );
        jwt = loginResult.data?.attributes?.jwt;
        if (!jwt) {
          throw new Error('No JWT token received from login');
        }
        // JWT is session-based, no need to store permanently
      }

      // 3. Build invoice payload according to WRAPP API specification
      const payload = {
        invoice_type_code: selectedInvoiceType,
        billing_book_id: selectedBookId,
        payment_method_type: invoiceData.payment_method_type,
        net_total_amount: totals.netTotal,
        vat_total_amount: totals.vatTotal,
        total_amount: totals.total,
        payable_total_amount: totals.total,
        notes: invoiceData.notes || '',
        
        // Customer information
        counterpart: {
          name: invoiceData.customer.name,
          ...(invoiceData.customer.vat && {
            vat: invoiceData.customer.vat,
            country_code: invoiceData.customer.country_code || 'GR',
            city: invoiceData.customer.city || '',
            street: invoiceData.customer.street || '',
            number: invoiceData.customer.number || '',
            postal_code: invoiceData.customer.postal_code || '',
          }),
          ...(invoiceData.customer.email && { email: invoiceData.customer.email })
        },
        
        // Invoice lines
        invoice_lines: invoiceData.lines.map(line => ({
          line_number: line.line_number,
          name: line.name,
          description: line.description || '',
          quantity: line.quantity,
          quantity_type: line.quantity_type || 1, // Use line's quantity type or default to pieces
          unit_price: line.unit_price,
          net_total_price: line.net_total_price,
          vat_rate: line.vat_rate,
          vat_total: line.vat_total,
          subtotal: line.subtotal,
          classification_category: line.classification_category,
          classification_type: line.classification_type
        }))
      };

      console.log('📄 Issuing invoice with payload:', payload);

      // 4. Create invoice
      const result = await wrappCreateInvoice(payload, credentials.baseUrl);
      
      console.log('✅ Invoice issued successfully:', result);
      setIssuedInvoice(result);
      onInvoiceIssued?.(result);
      
    } catch (error: any) {
      console.error('❌ Invoice issuance error:', error);
      onError?.(error.message || 'Σφάλμα έκδοσης παραστατικού');
    } finally {
      setIssuing(false);
    }
  };

  const generatePdf = async () => {
    if (!issuedInvoice?.id) return;
    
    setGeneratingPdf(true);
    
    try {
      const result = await wrappGeneratePdf(issuedInvoice.id, 'el');
      console.log('📄 PDF generation requested:', result);
      
      // The PDF generation is async, so we just notify the user
      alert('Η δημιουργία PDF ξεκίνησε. Θα λάβετε ειδοποίηση όταν ολοκληρωθεί.');
      
    } catch (error: any) {
      console.error('❌ PDF generation error:', error);
      onError?.(error.message || 'Σφάλμα δημιουργίας PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const canIssue = selectedBookId && selectedInvoiceType && invoiceData.lines.length > 0 && !disabled;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Document Type Selector */}
      <DocumentTypeSelector
        selectedBookId={selectedBookId}
        selectedInvoiceType={selectedInvoiceType}
        onBookChange={handleBookChange}
        onInvoiceTypeChange={handleInvoiceTypeChange}
        disabled={disabled || issuing}
        credentials={credentials}
      />

      {/* Invoice Summary */}
      {invoiceData.lines.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FaReceipt className="text-gray-600" />
            Περίληψη Παραστατικού
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Πελάτης:</strong> {invoiceData.customer.name}</p>
              {invoiceData.customer.vat && (
                <p><strong>ΑΦΜ:</strong> {invoiceData.customer.vat}</p>
              )}
              <p><strong>Μέθοδος Πληρωμής:</strong> {paymentMethodLabels[invoiceData.payment_method_type]}</p>
            </div>
            <div>
              <p><strong>Γραμμές:</strong> {invoiceData.lines.length}</p>
              <p><strong>Καθαρό Σύνολο:</strong> €{totals.netTotal.toFixed(2)}</p>
              <p><strong>ΦΠΑ:</strong> €{totals.vatTotal.toFixed(2)}</p>
              <p><strong>Σύνολο:</strong> €{totals.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Issue Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={issueInvoice}
          disabled={!canIssue || issuing}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {issuing ? (
            <>
              <FaSpinner className="animate-spin" />
              Έκδοση σε εξέλιξη...
            </>
          ) : (
            <>
              <FaReceipt />
              Έκδοση Παραστατικού
            </>
          )}
        </button>

        {issuedInvoice && (
          <button
            onClick={generatePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {generatingPdf ? (
              <>
                <FaSpinner className="animate-spin" />
                Δημιουργία PDF...
              </>
            ) : (
              <>
                <FaDownload />
                Δημιουργία PDF
              </>
            )}
          </button>
        )}
      </div>

      {/* Success Message */}
      {issuedInvoice && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaCheckCircle className="text-green-600" />
            <span className="font-medium text-green-900">Παραστατικό εκδόθηκε επιτυχώς!</span>
          </div>
          
          <div className="text-sm text-green-800 space-y-1">
            <p><strong>Σειρά-Αριθμός:</strong> {issuedInvoice.series}-{issuedInvoice.num}</p>
            <p><strong>myDATA Mark:</strong> {issuedInvoice.my_data_mark}</p>
            <p><strong>myDATA UID:</strong> {issuedInvoice.my_data_uid}</p>
            
            {issuedInvoice.my_data_qr_url && (
              <div className="mt-2">
                <a
                  href={issuedInvoice.my_data_qr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 underline"
                >
                  <FaEye />
                  Προβολή στο myDATA
                </a>
              </div>
            )}
            
            {issuedInvoice.wrapp_invoice_url && (
              <div>
                <a
                  href={issuedInvoice.wrapp_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 underline"
                >
                  <FaEye />
                  Προβολή στο Wrapp
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
