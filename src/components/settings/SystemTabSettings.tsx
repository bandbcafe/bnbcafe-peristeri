"use client";

import { useState } from "react";
import { FaCog, FaDatabase, FaClock, FaShieldAlt } from "react-icons/fa";

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

interface SystemTabSettingsProps {
  technicalSettings: TechnicalSettings;
  setTechnicalSettings: (settings: TechnicalSettings) => void;
}

export default function SystemTabSettings({
  technicalSettings,
  setTechnicalSettings,
}: SystemTabSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaCog className="text-amber-500" />
          Ρυθμίσεις Συστήματος
        </h3>
        
        <div className="space-y-6">
          {/* Backup Settings */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
              <FaDatabase className="text-blue-600" />
              Ρυθμίσεις Αντιγράφων Ασφαλείας
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={technicalSettings.autoBackup}
                  onChange={(e) =>
                    setTechnicalSettings({
                      ...technicalSettings,
                      autoBackup: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Ενεργοποίηση αυτόματου backup
                </span>
              </div>

              {technicalSettings.autoBackup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaClock className="inline mr-1" size={12} />
                    Διάστημα backup (ώρες)
                  </label>
                  <input
                    type="number"
                    value={technicalSettings.backupInterval}
                    onChange={(e) =>
                      setTechnicalSettings({
                        ...technicalSettings,
                        backupInterval: parseInt(e.target.value) || 24,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="1"
                    max="168"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Προτείνεται: 6 ώρες για ενεργά συστήματα, 24 ώρες για κανονική χρήση
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
              <FaDatabase className="text-green-600" />
              Διαχείριση Δεδομένων
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Διατήρηση Δεδομένων (ημέρες)
                </label>
                <input
                  type="number"
                  value={technicalSettings.dataRetention}
                  onChange={(e) =>
                    setTechnicalSettings({
                      ...technicalSettings,
                      dataRetention: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  min="7"
                  max="365"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Τα παλαιότερα δεδομένα θα διαγράφονται αυτόματα μετά από αυτό το διάστημα
                </p>
              </div>
            </div>
          </div>

          {/* Logging Settings */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
              <FaShieldAlt className="text-amber-600" />
              Ρυθμίσεις Καταγραφής
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Επίπεδο Καταγραφής
                </label>
                <select
                  value={technicalSettings.logLevel}
                  onChange={(e) =>
                    setTechnicalSettings({
                      ...technicalSettings,
                      logLevel: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="error">Μόνο Σφάλματα</option>
                  <option value="warn">Σφάλματα &amp; Προειδοποιήσεις</option>
                  <option value="info">Πλήρης Καταγραφή (Προτεινόμενο)</option>
                  <option value="debug">Λεπτομερής Debug</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  • Error: Καταγράφει μόνο κρίσιμα σφάλματα
                  • Warn: Σφάλματα και προειδοποιήσεις
                  • Info: Πλήρης καταγραφή ενεργειών
                  • Debug: Λεπτομερείς πληροφορίες για ανάπτυξη
                </p>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Πληροφορίες Συστήματος</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Έκδοση:</span>
                <span className="ml-2 text-gray-800">WebAlly OrderPOS v1.0</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Αποθήκευση:</span>
                <span className="ml-2 text-gray-800">Firebase Firestore</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">API:</span>
                <span className="ml-2 text-gray-800">WRAPP Integration</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <span className="ml-2 text-green-600">🟢 Λειτουργικό</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
