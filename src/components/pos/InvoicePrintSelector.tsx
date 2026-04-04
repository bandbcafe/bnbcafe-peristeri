import React, { useState } from "react";
import {
  FaPrint,
  FaReceipt,
  FaFileInvoice,
  FaBolt,
  FaCompressAlt,
} from "react-icons/fa";
import InvoicePrintTemplate from "./InvoicePrintTemplate";
import InvoiceProfessionalPrintTemplate from "./InvoiceProfessionalPrintTemplate";
import DirectPrintInvoice from "./DirectPrintInvoice";

interface InvoicePrintSelectorProps {
  invoiceData: any;
  businessInfo: any;
  onClose: () => void;
}

export default function InvoicePrintSelector({
  invoiceData,
  businessInfo,
  onClose,
}: InvoicePrintSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
  };

  if (selectedTemplate === "thermal") {
    return (
      <InvoicePrintTemplate
        invoiceData={invoiceData}
        businessInfo={businessInfo}
        onClose={onClose}
      />
    );
  }

  if (selectedTemplate === "professional") {
    return (
      <InvoiceProfessionalPrintTemplate
        invoiceData={invoiceData}
        businessInfo={businessInfo}
        onClose={onClose}
      />
    );
  }

  if (selectedTemplate === "direct-thermal") {
    return (
      <DirectPrintInvoice
        invoiceData={invoiceData}
        businessInfo={businessInfo}
        template="thermal"
        onClose={onClose}
      />
    );
  }

  if (selectedTemplate === "direct-professional") {
    return (
      <DirectPrintInvoice
        invoiceData={invoiceData}
        businessInfo={businessInfo}
        template="professional"
        onClose={onClose}
      />
    );
  }

  if (selectedTemplate === "direct-compact-professional") {
    return (
      <DirectPrintInvoice
        invoiceData={invoiceData}
        businessInfo={businessInfo}
        template="compact-professional"
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Επιλογή Εκτύπωσης Τιμολογίου
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Επιλέξτε τον τύπο εκτύπωσης που προτιμάτε:
            </div>

            {/* Thermal Receipt Option */}
            <button
              onClick={() => handleTemplateSelect("thermal")}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <FaReceipt className="w-8 h-8 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 group-hover:text-blue-900">
                    Θερμικός Εκτυπωτής
                  </div>
                  <div className="text-sm text-gray-500 group-hover:text-blue-700">
                    Συμπαγές format για θερμικούς εκτυπωτές (80mm)
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    • Μικρό μέγεθος • Γρήγορη εκτύπωση • QR Code
                  </div>
                </div>
              </div>
            </button>

            {/* Professional A4 Invoice Option */}
            <button
              onClick={() => handleTemplateSelect("professional")}
              className="w-full p-4 border-2 border-green-300 bg-green-50 rounded-lg hover:border-green-500 hover:bg-green-100 transition-all group relative"
            >
              <div className="absolute top-2 right-2">
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  ΣΥΝΙΣΤΩΜΕΝΟ
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <FaFileInvoice className="w-8 h-8 text-green-600 group-hover:text-green-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-green-900 group-hover:text-green-900">
                    Επαγγελματικό Τιμολόγιο A4
                  </div>
                  <div className="text-sm text-green-700 group-hover:text-green-800">
                    Πλήρης σελίδα A4 - Όλα σε 1 σελίδα
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    • Πλήρες A4 layout • Logo & QR • Επαγγελματική εμφάνιση
                  </div>
                </div>
              </div>
            </button>

            {/* Direct Print Options */}
            <div className="border-t pt-4 mt-4">
              <div className="text-sm text-gray-600 mb-3 font-medium">
                ⚡ Άμεση Εκτύπωση (χωρίς νέο παράθυρο):
              </div>

              {/* Direct Thermal Print */}
              <button
                onClick={() => handleTemplateSelect("direct-thermal")}
                className="w-full p-3 mb-2 border-2 border-orange-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <FaBolt className="w-6 h-6 text-orange-600 group-hover:text-orange-700" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900 group-hover:text-orange-900">
                      Άμεση Θερμική Εκτύπωση
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-orange-700">
                      Άμεσα στον εκτυπωτή • Δεν ανοίγει νέο παράθυρο
                    </div>
                  </div>
                </div>
              </button>

              {/* Direct Professional A4 Print */}
              <button
                onClick={() => handleTemplateSelect("direct-professional")}
                className="w-full p-3 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <FaBolt className="w-6 h-6 text-purple-600 group-hover:text-purple-700" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900 group-hover:text-purple-900">
                      Άμεση A4 Εκτύπωση
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-purple-700">
                      Άμεσα στον εκτυπωτή • Πλήρες A4 • Δεν ανοίγει νέο παράθυρο
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <FaPrint className="w-3 h-3" />
                <span>
                  Τιμολόγιο: {invoiceData.series} {invoiceData.num}
                </span>
              </div>
              <div>€{(invoiceData.total_amount || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
