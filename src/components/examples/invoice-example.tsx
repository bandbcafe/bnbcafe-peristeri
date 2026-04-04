'use client';

import React from 'react';
import { FaPlus, FaTrash, FaCalculator } from 'react-icons/fa';
import InvoiceIssuer from '@/components/wrapp/invoice-issuer';
import { classificationCategories, classificationTypes } from '@/lib/wrapp';

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  classification_category: string;
  classification_type: string;
}

export default function InvoiceExample() {
  const [customer, setCustomer] = React.useState({
    name: '',
    vat: '',
    country_code: 'GR',
    city: '',
    street: '',
    number: '',
    postal_code: '',
    email: ''
  });

  const [lines, setLines] = React.useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState(0); // Μετρητά
  const [notes, setNotes] = React.useState('');
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addLine = () => {
    const newLine: LineItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 24,
      classification_category: 'category1_3',
      classification_type: 'E3_561_001'
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  // Calculate line totals
  const calculateLineTotal = (line: LineItem) => {
    const netTotal = line.quantity * line.unit_price;
    const vatTotal = netTotal * (line.vat_rate / 100);
    const subtotal = netTotal + vatTotal;
    
    return {
      net_total_price: Number(netTotal.toFixed(2)),
      vat_total: Number(vatTotal.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2))
    };
  };

  // Convert lines to invoice format
  const invoiceLines = lines.map((line, index) => {
    const totals = calculateLineTotal(line);
    return {
      line_number: index + 1,
      name: line.name,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      vat_rate: line.vat_rate,
      classification_category: line.classification_category,
      classification_type: line.classification_type,
      ...totals
    };
  });

  const invoiceData = {
    customer,
    lines: invoiceLines,
    payment_method_type: paymentMethod,
    notes
  };

  const handleInvoiceIssued = (result: any) => {
    setMessage({
      type: 'success',
      text: `Παραστατικό εκδόθηκε επιτυχώς! Σειρά: ${result.series}-${result.num}`
    });
    
    // Clear form after successful issuance
    setTimeout(() => {
      setLines([]);
      setCustomer({
        name: '',
        vat: '',
        country_code: 'GR',
        city: '',
        street: '',
        number: '',
        postal_code: '',
        email: ''
      });
      setNotes('');
    }, 3000);
  };

  const handleError = (error: string) => {
    setMessage({
      type: 'error',
      text: error
    });
  };

  // Auto-clear messages
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FaCalculator className="text-blue-600" />
          Παράδειγμα Έκδοσης Παραστατικού
        </h1>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Customer Information */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Στοιχεία Πελάτη</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Όνομα/Επωνυμία *
              </label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({...customer, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Όνομα πελάτη"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ΑΦΜ (προαιρετικό)
              </label>
              <input
                type="text"
                value={customer.vat}
                onChange={(e) => setCustomer({...customer, vat: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Πόλη
              </label>
              <input
                type="text"
                value={customer.city}
                onChange={(e) => setCustomer({...customer, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Αθήνα"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({...customer, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="customer@example.com"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Μέθοδος Πληρωμής
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={0}>Μετρητά</option>
            <option value={1}>Πίστωση</option>
            <option value={3}>Κάρτα</option>
          </select>
        </div>

        {/* Invoice Lines */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Γραμμές Παραστατικού</h2>
            <button
              onClick={addLine}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
              Προσθήκη Γραμμής
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={line.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">Γραμμή {index + 1}</span>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Προϊόν/Υπηρεσία *
                    </label>
                    <input
                      type="text"
                      value={line.name}
                      onChange={(e) => updateLine(line.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Όνομα προϊόντος"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ποσότητα *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Τιμή Μονάδας (€) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(line.id, 'unit_price', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ΦΠΑ (%)
                    </label>
                    <select
                      value={line.vat_rate}
                      onChange={(e) => updateLine(line.id, 'vat_rate', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={24}>24%</option>
                      <option value={13}>13%</option>
                      <option value={6}>6%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Κατηγορία
                    </label>
                    <select
                      value={line.classification_category}
                      onChange={(e) => updateLine(line.id, 'classification_category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(classificationCategories).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Τύπος
                    </label>
                    <select
                      value={line.classification_type}
                      onChange={(e) => updateLine(line.id, 'classification_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(classificationTypes).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Line Total */}
                {line.name && line.quantity > 0 && line.unit_price > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                    {(() => {
                      const totals = calculateLineTotal(line);
                      return (
                        <div className="flex justify-between">
                          <span>Καθαρό: €{totals.net_total_price.toFixed(2)}</span>
                          <span>ΦΠΑ: €{totals.vat_total.toFixed(2)}</span>
                          <span className="font-medium">Σύνολο: €{totals.subtotal.toFixed(2)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Σημειώσεις
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Προαιρετικές σημειώσεις..."
          />
        </div>

        {/* Invoice Issuer */}
        <InvoiceIssuer
          invoiceData={invoiceData}
          onInvoiceIssued={handleInvoiceIssued}
          onError={handleError}
          disabled={!customer.name || lines.length === 0}
          credentials={{
            email: "demo@example.com", // Replace with actual credentials
            apiKey: "demo-api-key", // Replace with actual API key
            baseUrl: "https://staging.wrapp.ai/api/v1" // Replace with actual base URL
          }}
        />
      </div>
    </div>
  );
}
