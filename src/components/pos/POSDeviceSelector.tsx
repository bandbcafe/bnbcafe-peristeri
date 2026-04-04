"use client";

import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

interface POSDevice {
  id: string;
  name: string;
  device_type: 'viva' | 'epay' | 'worldline' | 'nbg' | 'cosmote';
  merchant_id?: string;
  authorization_code?: string;
  status: 'active' | 'inactive';
}

interface POSDeviceSelectorProps {
  credentials: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
  selectedDeviceId?: string;
  onDeviceSelect: (deviceId: string | null) => void;
  disabled?: boolean;
}

const POSDeviceSelector: React.FC<POSDeviceSelectorProps> = ({
  credentials,
  selectedDeviceId,
  onDeviceSelect,
  disabled = false
}) => {
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceTypeLabels = {
    viva: 'Viva POS',
    epay: 'Epay POS',
    worldline: 'Worldline POS',
    nbg: 'NBG POS',
    cosmote: 'Cosmote POS'
  };

  // Load POS devices
  const loadDevices = async () => {
    if (!credentials.email || !credentials.apiKey || !credentials.baseUrl) {
      setError('Παρακαλώ ρυθμίστε πρώτα τα διαπιστευτήρια WRAPP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Login to get JWT
      const loginResponse = await fetch('/api/wrapp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          api_key: credentials.apiKey,
          baseUrl: credentials.baseUrl
        })
      });

      if (!loginResponse.ok) {
        throw new Error('Αποτυχία σύνδεσης με WRAPP API');
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;

      if (!jwt) {
        throw new Error('Δεν ελήφθη JWT token');
      }

      // Get POS devices
      const devicesResponse = await fetch(`/api/wrapp/pos-devices?baseUrl=${encodeURIComponent(credentials.baseUrl)}`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });

      if (!devicesResponse.ok) {
        throw new Error('Αποτυχία φόρτωσης POS devices');
      }

      const devicesData = await devicesResponse.json();
      const activeDevices = Array.isArray(devicesData) 
        ? devicesData.filter(device => device.status === 'active')
        : [];
      
      setDevices(activeDevices);

      // Auto-select first device if none selected and devices available
      if (!selectedDeviceId && activeDevices.length > 0) {
        onDeviceSelect(activeDevices[0].id);
      }

    } catch (error) {
      console.error('Error loading POS devices:', error);
      setError(error instanceof Error ? error.message : 'Σφάλμα φόρτωσης POS devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  // Load devices when credentials change
  useEffect(() => {
    loadDevices();
  }, [credentials]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <FaSpinner className="animate-spin" />
        <span className="text-sm">Φόρτωση POS devices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <FaExclamationTriangle />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-sm text-gray-600">
        Δεν υπάρχουν ενεργά POS devices. Προσθέστε ένα στις ρυθμίσεις WRAPP.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        POS Device για Πληρωμές με Κάρτα
      </label>
      
      <select
        value={selectedDeviceId || ''}
        onChange={(e) => onDeviceSelect(e.target.value || null)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Χωρίς POS Device (μόνο μετρητά)</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name} ({deviceTypeLabels[device.device_type]})
          </option>
        ))}
      </select>

      {selectedDeviceId && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <FaCreditCard />
          <span>Πληρωμές με κάρτα ενεργοποιημένες</span>
        </div>
      )}
    </div>
  );
};

export default POSDeviceSelector;
