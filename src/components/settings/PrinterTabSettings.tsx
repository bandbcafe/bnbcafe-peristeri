"use client";

import { useState } from "react";
import { 
  FaPrint, 
  FaSearch, 
  FaSpinner, 
  FaWifi,
  FaDesktop,
  FaTag
} from "react-icons/fa";

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

interface PrinterTabSettingsProps {
  technicalSettings: TechnicalSettings;
  setTechnicalSettings: (settings: TechnicalSettings) => void;
  scanningPrinters: boolean;
  discoveredPrinters: string[];
  onScanPrinters: () => void;
  onTestPrint: (printerIP: string, printerName: string) => void;
}

export default function PrinterTabSettings({
  technicalSettings,
  setTechnicalSettings,
  scanningPrinters,
  discoveredPrinters,
  onScanPrinters,
  onTestPrint,
}: PrinterTabSettingsProps) {
  const printerTypes = [
    { key: 'printerKitchen', label: 'Εκτυπωτής Κουζίνας', icon: FaWifi },
    { key: 'printerBar', label: 'Εκτυπωτής Bar', icon: FaWifi },
    { key: 'receiptPrinter', label: 'Εκτυπωτής Αποδείξεων', icon: FaPrint },
    { key: 'labelPrinter', label: 'Εκτυπωτής Ετικετών', icon: FaTag },
    { key: 'backupPrinter', label: 'Εκτυπωτής Αντίγραφου', icon: FaDesktop },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaPrint className="text-amber-500" />
          Ρυθμίσεις Εκτυπωτών
        </h3>
        
        {/* Printer Discovery */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-800">Ανίχνευση Εκτυπωτών Δικτύου</h4>
              <p className="text-sm text-gray-600">Αυτόματος εντοπισμός εκτυπωτών στο τοπικό δίκτυο</p>
            </div>
            <button
              onClick={onScanPrinters}
              disabled={scanningPrinters}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {scanningPrinters ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Ανίχνευση...
                </>
              ) : (
                <>
                  <FaSearch />
                  Έναρξη Ανίχνευσης
                </>
              )}
            </button>
          </div>

          {/* Discovered Printers */}
          {discoveredPrinters.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Βρέθηκαν Εκτυπωτές:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {discoveredPrinters.map((printer, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-300 rounded">
                    <span className="text-sm text-gray-700">{printer}</span>
                    <button
                      onClick={() => {
                        const ipMatch = printer.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
                        if (ipMatch) {
                          onTestPrint(ipMatch[1], printer);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Test
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Printer Configuration */}
        <div className="space-y-4">
          {printerTypes.map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Icon className="text-gray-500" size={14} />
                {label}
              </label>
              <select
                value={String(technicalSettings[key as keyof TechnicalSettings] || '')}
                onChange={(e) =>
                  setTechnicalSettings({
                    ...technicalSettings,
                    [key]: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Επιλογή εκτυπωτή</option>
                {discoveredPrinters.map((printer, index) => {
                  const ipMatch = printer.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
                  const ip = ipMatch ? ipMatch[1] : printer;
                  return (
                    <option key={index} value={ip}>
                      {printer}
                    </option>
                  );
                })}
                <option value="manual">Χειροκίνητη Προσθήκη...</option>
              </select>
              
              {/* Manual IP input when "manual" is selected */}
              {technicalSettings[key as keyof TechnicalSettings] === 'manual' && (
                <input
                  type="text"
                  placeholder="Εισάγετε IP εκτυπωτή (π.χ. 192.168.1.100)"
                  className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  onChange={(e) => {
                    const ip = e.target.value;
                    if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                      setTechnicalSettings({
                        ...technicalSettings,
                        [key]: ip,
                      });
                    }
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Printer Test Section */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-800 mb-2">Δοκιμή Εκτυπωτών</h4>
          <p className="text-sm text-amber-700 mb-3">
            Πατήστε το κουμπί "Test" δίπλα σε κάθε εκτυπωτή για να εκτυπώσετε μια σελίδα δοκιμής
          </p>
          <div className="text-xs text-amber-600">
            <p>• Βεβαιωθείτε ότι οι εκτυπωτές είναι ενεργοποιημένοι και συνδεδεμένοι στο δίκτυο</p>
            <p>• Οι εκτυπωτές ESC/POS πρέπει να υποστηρίζουν θύρα 9100 (WebSocket)</p>
            <p>• Για εκτυπωτές δικτύου, βεβαιωθείτε ότι είναι προσβάσιμοι από το σύστημα</p>
          </div>
        </div>
      </div>
    </div>
  );
}
