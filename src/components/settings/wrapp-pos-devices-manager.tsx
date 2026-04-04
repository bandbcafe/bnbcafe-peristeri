"use client";

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCreditCard, FaSpinner, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';

interface POSDevice {
  id: string;
  name: string;
  pos_type: 'viva' | 'epay' | 'worldline' | 'nbg' | 'cosmote' | 'jcc' | 'attica' | 'pancreta' | 'tora' | 'pbt' | 'mypos' | 'nexi-mellon' | 'nexi';
  terminal_id: string;
  merchant_id?: string;
  authorization_code?: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

interface WrappPOSDevicesManagerProps {
  credentials: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
}

const WrappPOSDevicesManager: React.FC<WrappPOSDevicesManagerProps> = ({ credentials }) => {
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<POSDevice | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Form state
  type FormData = {
    name: string;
    pos_type: POSDevice['pos_type'];
    terminal_id: string;
    merchant_id: string;
    authorization_code: string;
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    pos_type: 'viva',
    terminal_id: '',
    merchant_id: '',
    authorization_code: ''
  });

  const deviceTypeLabels = {
    viva: 'Viva POS',
    epay: 'Epay POS',
    worldline: 'Worldline POS',
    nbg: 'NBG POS',
    cosmote: 'Cosmote POS',
    jcc: 'JCC POS',
    attica: 'Attica POS',
    pancreta: 'Pancreta POS',
    tora: 'Tora POS',
    pbt: 'PBT POS',
    mypos: 'MyPOS',
    'nexi-mellon': 'Nexi-Mellon POS',
    nexi: 'Nexi POS'
  };


  const deviceTypeRequirements = {
    viva: 'merchant_id',
    epay: 'authorization_code',
    worldline: 'authorization_code',
    nbg: 'authorization_code',
    cosmote: 'authorization_code',
    jcc: 'authorization_code',
    attica: 'authorization_code',
    pancreta: 'authorization_code',
    tora: 'authorization_code',
    pbt: 'authorization_code',
    mypos: 'authorization_code',
    'nexi-mellon': 'authorization_code',
    nexi: 'authorization_code'
  };

  // Load POS devices from Firestore
  const loadPOSDevices = async () => {
    setLoading(true);
    setStatusMessage({ type: 'info', message: 'Φόρτωση POS devices...' });

    try {
      const devicesCollection = collection(db, 'pos_devices');
      const devicesSnapshot = await getDocs(devicesCollection);
      
      const devicesList: POSDevice[] = [];
      devicesSnapshot.forEach((doc) => {
        devicesList.push({
          id: doc.id,
          ...doc.data()
        } as POSDevice);
      });

      setDevices(devicesList);
      setStatusMessage({ type: 'success', message: `Φορτώθηκαν ${devicesList.length} POS devices` });

    } catch (error) {
      console.error('Error loading POS devices:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Σφάλμα φόρτωσης POS devices' 
      });
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };


  // Create new POS device
  const createPOSDevice = async () => {
    // Validation
    if (!formData.name.trim()) {
      setStatusMessage({ type: 'error', message: 'Το όνομα του device είναι υποχρεωτικό' });
      return;
    }

    const requiredField = deviceTypeRequirements[formData.pos_type];
    if (!formData.terminal_id.trim()) {
      setStatusMessage({ type: 'error', message: 'Το Terminal ID είναι υποχρεωτικό' });
      return;
    }
    if (requiredField === 'merchant_id' && !formData.merchant_id.trim()) {
      setStatusMessage({ type: 'error', message: 'Το Merchant ID είναι υποχρεωτικό για Viva POS' });
      return;
    }
    if (requiredField === 'authorization_code' && !formData.authorization_code.trim()) {
      setStatusMessage({ type: 'error', message: 'Ο Authorization Code είναι υποχρεωτικός για αυτό το device' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'info', message: 'Αποθήκευση POS device...' });

    try {
      // Create device object
      const newDevice: Omit<POSDevice, 'id'> = {
        name: formData.name.trim(),
        pos_type: formData.pos_type,
        terminal_id: formData.terminal_id.trim(),
        status: 'active',
        created_at: new Date().toISOString()
      };

      if (formData.pos_type === 'viva') {
        newDevice.merchant_id = formData.merchant_id.trim();
      } else {
        newDevice.authorization_code = formData.authorization_code.trim();
      }

      // Save to Firestore
      const devicesCollection = collection(db, 'pos_devices');
      const docRef = await addDoc(devicesCollection, newDevice);

      const savedDevice: POSDevice = {
        id: docRef.id,
        ...newDevice
      };

      setDevices(prev => [...prev, savedDevice]);
      setStatusMessage({ type: 'success', message: 'Το POS device αποθηκεύτηκε επιτυχώς!' });
      
      // Reset form
      setFormData({
        name: '',
        pos_type: 'viva',
        terminal_id: '',
        merchant_id: '',
        authorization_code: ''
      });
      setShowCreateForm(false);

    } catch (error) {
      console.error('Error creating POS device:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Σφάλμα αποθήκευσης POS device' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete POS device
  const deletePOSDevice = async (deviceId: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το POS device;')) {
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'info', message: 'Διαγραφή POS device...' });

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'pos_devices', deviceId));

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      setStatusMessage({ type: 'success', message: 'Το POS device διαγράφηκε επιτυχώς!' });

    } catch (error) {
      console.error('Error deleting POS device:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Σφάλμα διαγραφής POS device' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Test WRAPP API with current device
  const testWrappAPI = async () => {
    if (!credentials.email || !credentials.apiKey || !credentials.baseUrl) {
      setStatusMessage({ type: 'error', message: 'Παρακαλώ συμπληρώστε πρώτα τα διαπιστευτήρια WRAPP' });
      return;
    }

    if (!formData.name.trim() || !formData.terminal_id.trim()) {
      setStatusMessage({ type: 'error', message: 'Παρακαλώ συμπληρώστε όνομα και terminal ID για τη δοκιμή' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'info', message: 'Δοκιμή WRAPP API...' });

    try {
      // Login first
      console.log('🔐 WRAPP Login attempt with:', {
        email: credentials.email,
        baseUrl: credentials.baseUrl
      });

      const loginResponse = await fetch('/api/wrapp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          api_key: credentials.apiKey,
          baseUrl: credentials.baseUrl
        })
      });

      console.log('🔐 Login response status:', loginResponse.status);
      
      if (!loginResponse.ok) {
        const loginError = await loginResponse.text();
        console.log('❌ Login failed:', loginError);
        throw new Error('Αποτυχία σύνδεσης με WRAPP API');
      }

      const loginData = await loginResponse.json();
      const jwt = loginData.data?.attributes?.jwt;
      console.log('✅ JWT received:', jwt ? 'Yes' : 'No');

      // Prepare test payload
      const testPayload: any = {
        name: formData.name.trim(),
        pos_type: formData.pos_type,
        terminal_id: formData.terminal_id.trim()
      };

      if (formData.pos_type === 'viva') {
        testPayload.merchant_id = formData.merchant_id.trim();
      } else {
        testPayload.authorization_code = formData.authorization_code.trim();
      }

      console.log('📱 Test POS Device payload:', testPayload);

      // Test POS device creation via API route (avoids CORS)
      const testResponse = await fetch('/api/wrapp/pos-devices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...testPayload,
          baseUrl: credentials.baseUrl
        })
      });

      console.log('📱 WRAPP API response status:', testResponse.status);
      console.log('📱 Response headers:', Object.fromEntries(testResponse.headers.entries()));

      if (testResponse.ok) {
        const responseData = await testResponse.json();
        console.log('✅ WRAPP API Success Response:', responseData);
        setStatusMessage({ type: 'success', message: 'Δοκιμή WRAPP API επιτυχής! Δείτε το console για λεπτομέρειες.' });
      } else {
        const errorText = await testResponse.text();
        console.log('❌ WRAPP API Error Response:', errorText);
        setStatusMessage({ type: 'error', message: `WRAPP API Error (${testResponse.status}): Δείτε το console για λεπτομέρειες` });
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Σφάλμα δοκιμής WRAPP API' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Load devices on component mount
  useEffect(() => {
    loadPOSDevices();
  }, []);

  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">POS Devices Configuration</h3>
          <p className="text-sm text-gray-600">Διαχείριση συσκευών πληρωμής με κάρτα</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPOSDevices}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
            Ανανέωση
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={loading}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <FaPlus />
            Νέο Device
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          statusMessage.type === 'success' ? 'bg-green-100 text-green-800' :
          statusMessage.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {statusMessage.type === 'success' && <FaCheck />}
          {statusMessage.type === 'error' && <FaExclamationTriangle />}
          {statusMessage.type === 'info' && <FaSpinner className="animate-spin" />}
          {statusMessage.message}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h4 className="text-lg font-medium mb-4">Δημιουργία Νέου POS Device</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Όνομα Device *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. Κεντρικό POS"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Τύπος Device *
              </label>
              <select
                value={formData.pos_type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  pos_type: e.target.value as POSDevice['pos_type'],
                  merchant_id: '',
                  authorization_code: ''
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(deviceTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terminal ID *
              </label>
              <input
                type="text"
                value={formData.terminal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, terminal_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="π.χ. 160xxxxx"
              />
            </div>

            {formData.pos_type === 'viva' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merchant ID *
                </label>
                <input
                  type="text"
                  value={formData.merchant_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchant_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Merchant ID από Viva"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorization Code *
                </label>
                <input
                  type="text"
                  value={formData.authorization_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, authorization_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Authorization Code από τον πάροχο"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={createPOSDevice}
              disabled={loading}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
              Αποθήκευση
            </button>
            <button
              onClick={testWrappAPI}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
              Δοκιμή WRAPP API
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setFormData({
                  name: '',
                  pos_type: 'viva',
                  terminal_id: '',
                  merchant_id: '',
                  authorization_code: ''
                });
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Ακύρωση
            </button>
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h4 className="text-lg font-medium">Καταχωρημένα POS Devices ({devices.length})</h4>
        </div>
        
        {devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FaCreditCard className="mx-auto text-4xl mb-4 opacity-50" />
            <p>Δεν υπάρχουν καταχωρημένα POS devices</p>
            <p className="text-sm">Κάντε κλικ στο "Νέο Device" για να προσθέσετε το πρώτο σας</p>
          </div>
        ) : (
          <div className="divide-y">
            {devices.map((device) => (
              <div key={device.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FaCreditCard className="text-blue-500" />
                      <div>
                        <h5 className="font-medium text-gray-900">{device.name}</h5>
                        <p className="text-sm text-gray-600">
                          {deviceTypeLabels[device.pos_type as keyof typeof deviceTypeLabels]}
                          {device.terminal_id && ` • Terminal ID: ${device.terminal_id}`}
                          {device.merchant_id && ` • Merchant ID: ${device.merchant_id}`}
                          {device.authorization_code && ` • Auth Code: ${device.authorization_code.substring(0, 8)}...`}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      device.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {device.status === 'active' ? 'Ενεργό' : 'Ανενεργό'}
                    </span>
                    
                    <button
                      onClick={() => deletePOSDevice(device.id)}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Διαγραφή"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Πληροφορίες POS Devices</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Viva POS:</strong> Χρειάζεται Merchant ID + Terminal ID από το Viva portal</li>
          <li>• <strong>Άλλα POS:</strong> Χρειάζονται Authorization Code + Terminal ID από τον αντίστοιχο πάροχο</li>
          <li>• <strong>Terminal ID:</strong> Βρίσκεται στο dashboard του παρόχου ή στη φυσική συσκευή</li>
          <li>• Τα devices αποθηκεύονται τοπικά και χρησιμοποιούνται για δοκιμές WRAPP API</li>
          <li>• Χρησιμοποιήστε το κουμπί "Δοκιμή WRAPP API" για να ελέγξετε τα credentials</li>
        </ul>
      </div>
    </div>
  );
};

export default WrappPOSDevicesManager;
