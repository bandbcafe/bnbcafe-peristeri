"use client";

import { Customer } from "@/types/customer";
import {
  FaTimes,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBuilding,
  FaIdCard,
} from "react-icons/fa";

interface ViewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

export default function ViewCustomerModal({
  isOpen,
  onClose,
  customer,
}: ViewCustomerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Στοιχεία Πελάτη
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaUser className="mr-2 text-teal-600" />
              Βασικά Στοιχεία
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Όνομα
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {customer.firstName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Επώνυμο
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {customer.lastName}
                </p>
              </div>
              {customer.companyName && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Εταιρεία
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {customer.companyName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FaEnvelope className="mr-2 text-teal-600" />
              Στοιχεία Επικοινωνίας
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Τηλέφωνο
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
                </div>
              )}
              {customer.mobile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Κινητό
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {customer.mobile}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-teal-600" />
                Διευθύνσεις
              </h3>
              <div className="space-y-4">
                {customer.addresses.map((address, index) => (
                  <div key={address.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {address.label}
                      </h4>
                      {address.isDefault && (
                        <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">
                          Προεπιλογή
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{address.street}</p>
                      <p>
                        {address.city} {address.postalCode}
                      </p>
                      <p>{address.country}</p>
                      {address.floor && <p>Όροφος: {address.floor}</p>}
                      {address.doorbell && <p>Κουδούνι: {address.doorbell}</p>}
                      {address.notes && <p>Σημειώσεις: {address.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax Info */}
          {(customer.vatNumber || customer.taxOffice) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FaIdCard className="mr-2 text-teal-600" />
                Φορολογικά Στοιχεία
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.vatNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ΑΦΜ
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.vatNumber}
                    </p>
                  </div>
                )}
                {customer.taxOffice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ΔΟΥ
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.taxOffice}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professional Info */}
          {(customer.profession || customer.activity) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FaBuilding className="mr-2 text-teal-600" />
                Επαγγελματικά Στοιχεία
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.profession && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Επάγγελμα
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.profession}
                    </p>
                  </div>
                )}
                {customer.activity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Δραστηριότητα
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.activity}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Σημειώσεις
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}
