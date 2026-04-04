"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FaUsers,
  FaPlus,
  FaSearch,
  FaFilter,
  FaEdit,
  FaTrash,
  FaEye,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBuilding,
  FaSpinner,
} from "react-icons/fa";
import { Customer, CustomerFilters, CustomerStats } from "@/types/customer";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import NewCustomerModal from "@/components/customers/NewCustomerModal";
import ViewCustomerModal from "@/components/customers/ViewCustomerModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<CustomerFilters>({
    isActive: undefined,
    hasVatNumber: undefined,
    city: "",
    tags: [],
  });

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "customers"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const customersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Customer[];

      setCustomers(customersData);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          customer.firstName.toLowerCase().includes(search) ||
          customer.lastName.toLowerCase().includes(search) ||
          customer.companyName?.toLowerCase().includes(search) ||
          customer.vatNumber.includes(search) ||
          customer.email?.toLowerCase().includes(search) ||
          customer.phone?.includes(search) ||
          customer.mobile?.includes(search);

        if (!matchesSearch) return false;
      }

      // Active filter
      if (
        filters.isActive !== undefined &&
        customer.isActive !== filters.isActive
      ) {
        return false;
      }

      // VAT number filter
      if (filters.hasVatNumber !== undefined) {
        const hasVat = customer.vatNumber && customer.vatNumber.length > 0;
        if (hasVat !== filters.hasVatNumber) return false;
      }

      // City filter
      if (filters.city) {
        const hasMatchingCity = customer.addresses?.some(
          (addr) => addr.city === filters.city
        );
        if (!hasMatchingCity) return false;
      }

      return true;
    });
  }, [customers, searchTerm, filters]);

  // Calculate stats
  const stats: CustomerStats = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter((c) => c.isActive).length,
      inactive: customers.filter((c) => !c.isActive).length,
      withVatNumber: customers.filter(
        (c) => c.vatNumber && c.vatNumber.length > 0
      ).length,
      withoutVatNumber: customers.filter(
        (c) => !c.vatNumber || c.vatNumber.length === 0
      ).length,
    };
  }, [customers]);

  // Get unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities = customers
      .flatMap((c) => c.addresses?.map((addr) => addr.city) || [])
      .filter(Boolean)
      .filter((city, index, arr) => arr.indexOf(city) === index);
    return cities.sort();
  }, [customers]);

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setShowNewModal(false);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "customers", customerId));
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Σφάλμα κατά τη διαγραφή του πελάτη");
    }
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-4xl text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaUsers className="mr-3 text-teal-600" />
            Πελάτες
          </h1>
          <p className="text-gray-600 mt-1">
            Διαχείριση πελατών και στοιχείων επικοινωνίας
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
        >
          <FaPlus className="mr-2" />
          Νέος Πελάτης
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-600">Σύνολο</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {stats.active}
          </div>
          <div className="text-sm text-gray-600">Ενεργοί</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {stats.inactive}
          </div>
          <div className="text-sm text-gray-600">Ανενεργοί</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {stats.withVatNumber}
          </div>
          <div className="text-sm text-gray-600">Με ΑΦΜ</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">
            {stats.withoutVatNumber}
          </div>
          <div className="text-sm text-gray-600">Χωρίς ΑΦΜ</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Αναζήτηση πελατών..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Active Filter */}
          <select
            value={
              filters.isActive === undefined ? "" : filters.isActive.toString()
            }
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                isActive:
                  e.target.value === "" ? undefined : e.target.value === "true",
              }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Όλοι</option>
            <option value="true">Ενεργοί</option>
            <option value="false">Ανενεργοί</option>
          </select>

          {/* VAT Filter */}
          <select
            value={
              filters.hasVatNumber === undefined
                ? ""
                : filters.hasVatNumber.toString()
            }
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                hasVatNumber:
                  e.target.value === "" ? undefined : e.target.value === "true",
              }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Όλοι</option>
            <option value="true">Με ΑΦΜ</option>
            <option value="false">Χωρίς ΑΦΜ</option>
          </select>

          {/* City Filter */}
          <select
            value={filters.city || ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, city: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Όλες οι πόλεις</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FaUsers className="mx-auto text-4xl mb-4 text-gray-300" />
            <p>Δεν βρέθηκαν πελάτες</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Πελάτης
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ΑΦΜ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Επικοινωνία
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Τοποθεσία
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Κατάσταση
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ενέργειες
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-teal-600 font-semibold">
                            {customer.firstName.charAt(0)}
                            {customer.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          {customer.companyName && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <FaBuilding className="mr-1" />
                              {customer.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.vatNumber}
                      </div>
                      {customer.taxOffice && (
                        <div className="text-sm text-gray-500">
                          {customer.taxOffice}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="text-sm text-gray-900 flex items-center">
                            <FaEnvelope className="mr-2 text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <FaPhone className="mr-2 text-gray-400" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.addresses && customer.addresses.length > 0 && (
                        <div className="text-sm text-gray-900 flex items-center">
                          <FaMapMarkerAlt className="mr-2 text-gray-400" />
                          {customer.addresses[0].city}
                          {customer.addresses[0].postalCode &&
                            ` ${customer.addresses[0].postalCode}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {customer.isActive ? "Ενεργός" : "Ανενεργός"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Προβολή"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Επεξεργασία"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Διαγραφή"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Customer Modal */}
      <NewCustomerModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* View Customer Modal */}
      {selectedCustomer && (
        <ViewCustomerModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />
      )}

      {/* Edit Customer Modal */}
      {selectedCustomer && (
        <NewCustomerModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          mode="edit"
          onCustomerUpdated={handleCustomerUpdated}
        />
      )}
    </div>
  );
}
