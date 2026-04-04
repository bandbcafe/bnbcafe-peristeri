"use client";

import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  FaCalculator,
  FaEuroSign,
  FaUsers,
  FaBox,
  FaTrash,
  FaPlus,
  FaEdit,
  FaSave,
  FaDownload,
  FaChartLine,
  FaHome,
  FaBolt,
  FaTint,
  FaUserTie,
  FaPhone,
  FaBullhorn,
  FaReceipt,
  FaChartPie,
  FaInfoCircle,
  FaPercentage,
} from "react-icons/fa";
import { getQuantityUnit } from "@/constants/mydata";

type StoreData = {
  storeName: string;
  rent: number;
  electricity: number;
  water: number;
  accountant: number;
  phoneInternet: number;
  marketing: number;
  extraExpenses: { name: string; cost: number }[];
};

type StaffMember = {
  name: string;
  salary: number;
};

type Product = {
  name: string;
  purchasePrice: number;
  vat: number;
  dailyUnits: number;
};

type Result = {
  Όνομα: string;
  "Τιμή Αγοράς (Χωρίς ΦΠΑ)": string;
  "Τιμή Αγοράς (Με ΦΠΑ)": string;
  "Πακέτο Χωρίς ΦΠΑ"?: string; // Προαιρετικά για την πρώτη λειτουργία
  "Πακέτο Με ΦΠΑ"?: string;
  "Σερβιριστό Χωρίς ΦΠΑ"?: string;
  "Σερβιριστό Με ΦΠΑ"?: string;
  "Τιμή Πώλησης Μόνο με Αγορά (Χωρίς ΦΠΑ)"?: string; // Νέα πεδία
  "Τιμή Πώλησης Μόνο με Αγορά (Με ΦΠΑ)"?: string;
  "Προτεινόμενα Τεμάχια/Ημέρα"?: number;
  "Τεμάχια/Ημέρα"?: number;
};

export default function FoodCostPage() {
  const [storeData, setStoreData] = useState<StoreData>({
    storeName: "",
    rent: 0,
    electricity: 0,
    water: 0,
    accountant: 0,
    phoneInternet: 0,
    marketing: 0,
    extraExpenses: [],
  });

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Ανάκτηση από το localStorage μόνο στον client
  useEffect(() => {
    try {
      const savedStoreData = localStorage.getItem("storeData");
      const savedStaff = localStorage.getItem("staff");
      const savedProducts = localStorage.getItem("products");

      console.log("Ανάκτηση από localStorage:", {
        savedStoreData,
        savedStaff,
        savedProducts,
      });

      if (savedStoreData) {
        setStoreData(JSON.parse(savedStoreData));
      } else {
        console.warn(
          "Δεν βρέθηκαν δεδομένα στο localStorage για το storeData."
        );
      }

      if (savedStaff) {
        setStaff(JSON.parse(savedStaff));
      } else {
        console.warn("Δεν βρέθηκαν δεδομένα στο localStorage για το staff.");
      }

      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        console.warn("Δεν βρέθηκαν δεδομένα στο localStorage για τα products.");
      }
    } catch (error) {
      console.error("Σφάλμα κατά την ανάκτηση από το localStorage:", error);
    }
  }, []);

  // Αποθήκευση στο localStorage όταν τα δεδομένα αλλάζουν
  useEffect(() => {
    try {
      console.log("Αποθήκευση στο localStorage:", {
        storeData,
        staff,
        products,
      });

      if (storeData) {
        localStorage.setItem("storeData", JSON.stringify(storeData));
      }
      if (staff) {
        localStorage.setItem("staff", JSON.stringify(staff));
      }
      if (products) {
        localStorage.setItem("products", JSON.stringify(products));
      }
    } catch (error) {
      console.error("Σφάλμα κατά την αποθήκευση στο localStorage:", error);
    }
  }, [storeData, staff, products]);

  const [profitMargin, setProfitMargin] = useState<number>(20); // Τρέχον ποσοστό κέρδους
  const [isEditingMargin, setIsEditingMargin] = useState<boolean>(false); // Κατάσταση επεξεργασίας

  const handleMarginSave = (
    e:
      | React.KeyboardEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement>
  ) => {
    if (
      e.type === "blur" ||
      (e.type === "keydown" && (e as React.KeyboardEvent).key === "Enter")
    ) {
      setIsEditingMargin(false); // Κλείσιμο της επεξεργασίας
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.startsWith("extraExpense_")) {
      const index = parseInt(name.split("_")[1], 10);
      const newExtraExpenses = [...storeData.extraExpenses];
      newExtraExpenses[index].cost = parseFloat(value) || 0;
      setStoreData({ ...storeData, extraExpenses: newExtraExpenses });
    } else {
      setStoreData({
        ...storeData,
        [name]: name === "storeName" ? value : parseFloat(value) || 0,
      });
    }
  };

  const addExtraExpense = () => {
    setStoreData({
      ...storeData,
      extraExpenses: [...storeData.extraExpenses, { name: "", cost: 0 }],
    });
  };

  const handleExtraExpenseNameChange = (index: number, newName: string) => {
    const newExtraExpenses = [...storeData.extraExpenses];
    newExtraExpenses[index].name = newName;
    setStoreData({ ...storeData, extraExpenses: newExtraExpenses });
  };

  const addStaffMember = (name: string, salary: number) => {
    setStaff([...staff, { name, salary }]);
  };

  const addProduct = (
    name: string,
    purchasePrice: number,
    vat: number,
    dailyUnits: number
  ) => {
    setProducts([...products, { name, purchasePrice, vat, dailyUnits }]);
  };

  const calculateDailyOperatingCost = (): number => {
    const fixedExpenses =
      storeData.rent +
      storeData.electricity +
      storeData.water +
      storeData.accountant +
      storeData.phoneInternet +
      storeData.marketing +
      staff.reduce((sum, member) => sum + member.salary, 0);

    const extraExpensesTotal = storeData.extraExpenses.reduce(
      (sum, expense) => sum + expense.cost,
      0
    );

    return (fixedExpenses + extraExpensesTotal) / 30; // Διαίρεση στα 30 ημερών
  };

  const calculateSellingPrice = (
    purchasePrice: number,
    dailyOperatingCost: number,
    dailyUnits: number,
    profitMargin: number,
    totalDailyUnits: number
  ): { priceWithoutVAT: string; priceWithVAT: string } => {
    const proportionalOperatingCost =
      (dailyOperatingCost * dailyUnits) / (totalDailyUnits || 1);

    const sellingPrice = purchasePrice + proportionalOperatingCost;
    const priceWithMargin = sellingPrice * (1 + profitMargin / 100);

    return {
      priceWithoutVAT: priceWithMargin.toFixed(2),
      priceWithVAT: (priceWithMargin * 1.24).toFixed(2),
    };
  };

  const calculateResults = (profitMargin: number): Result[] => {
    const dailyOperatingCost = calculateDailyOperatingCost();
    const totalDailyUnits = products.reduce(
      (sum, product) => sum + product.dailyUnits,
      0
    );

    return products.map((product) => {
      // Υπολογισμός κόστους λειτουργίας ανά μονάδα
      const operationalCostPerUnit =
        dailyOperatingCost / (totalDailyUnits || 1); // Το κόστος ανά μονάδα μειώνεται με περισσότερες μονάδες

      // Νέα τιμή πώλησης πακέτου (μειώνεται αν αυξηθούν οι μονάδες)
      const packagedBaseCost = product.purchasePrice + operationalCostPerUnit;
      const packagedSellingPrice = packagedBaseCost * (1 + profitMargin / 100);

      // Νέα τιμή πώλησης σερβιριστού (με μεγαλύτερο περιθώριο κέρδους)
      const servedSellingPrice =
        packagedBaseCost * (1 + (profitMargin + 20) / 100);

      // Υπολογισμός τιμής αγοράς με ΦΠΑ
      const purchasePriceWithVAT = (
        product.purchasePrice *
        (1 + product.vat / 100)
      ).toFixed(2);

      return {
        Όνομα: product.name,
        "Τιμή Αγοράς (Χωρίς ΦΠΑ)": product.purchasePrice.toFixed(2),
        "Τιμή Αγοράς (Με ΦΠΑ)": purchasePriceWithVAT,
        "Πακέτο Χωρίς ΦΠΑ": packagedSellingPrice.toFixed(2),
        "Πακέτο Με ΦΠΑ": (packagedSellingPrice * 1.24).toFixed(2),
        "Σερβιριστό Χωρίς ΦΠΑ": servedSellingPrice.toFixed(2),
        "Σερβιριστό Με ΦΠΑ": (servedSellingPrice * 1.24).toFixed(2),
        "Προτεινόμενα Τεμάχια/Ημέρα": product.dailyUnits,
      };
    });
  };

  const calculateProfitabilityResults = (profitMargin: number): Result[] => {
    const dailyOperatingCost = calculateDailyOperatingCost(); // Καθημερινά λειτουργικά έξοδα

    return products.map((product) => {
      const sellingPriceWithVAT =
        product.purchasePrice * (1 + profitMargin / 100) * 1.24; // Τιμή πώλησης με ΦΠΑ
      const totalCostWithProfit = dailyOperatingCost * 1.5; // Συνολικό κόστος + 50% κέρδος

      // Υπολογισμός προτεινόμενων τεμαχίων/ημέρα
      const suggestedDailyUnits =
        sellingPriceWithVAT > 0
          ? Math.ceil(totalCostWithProfit / sellingPriceWithVAT)
          : 0;

      const purchasePriceWithVAT = (
        product.purchasePrice *
        (1 + product.vat / 100)
      ).toFixed(2);

      return {
        Όνομα: product.name,
        "Τιμή Αγοράς (Χωρίς ΦΠΑ)": product.purchasePrice.toFixed(2),
        "Τιμή Αγοράς (Με ΦΠΑ)": purchasePriceWithVAT,
        "Τιμή Πώλησης Μόνο με Αγορά (Χωρίς ΦΠΑ)": (
          product.purchasePrice *
          (1 + profitMargin / 100)
        ).toFixed(2),
        "Τιμή Πώλησης Μόνο με Αγορά (Με ΦΠΑ)": sellingPriceWithVAT.toFixed(2),
        "Προτεινόμενα Τεμάχια/Ημέρα": suggestedDailyUnits,
      };
    });
  };

  const exportToExcel = () => {
    // Υπολογισμός δεδομένων για τους δύο πίνακες
    const results1 = calculateResults(profitMargin); // Δεδομένα για τον πρώτο πίνακα
    const results2 = calculateProfitabilityResults(profitMargin); // Δεδομένα για τον δεύτερο πίνακα

    // Δημιουργία τίτλων
    const title1 = [["Αποτελέσματα Τιμή Πώλησης ανα Ημέρα"]];
    const title2 = [["Αποτελέσματα Υπολογισμού Μόνο με Τιμή Αγοράς"]];

    // Δημιουργία φύλλων Excel
    const worksheet1 = XLSX.utils.json_to_sheet(results1); // Φύλλο για τον πρώτο πίνακα
    const worksheet2 = XLSX.utils.json_to_sheet(results2); // Φύλλο για τον δεύτερο πίνακα

    // Προσθήκη τίτλων
    XLSX.utils.sheet_add_aoa(worksheet1, title1, { origin: "A1" }); // Προσθήκη τίτλου στο πρώτο φύλλο
    XLSX.utils.sheet_add_aoa(worksheet2, title2, { origin: "A1" }); // Προσθήκη τίτλου στο δεύτερο φύλλο

    // Δημιουργία βιβλίου εργασίας (workbook)
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet1,
      "Αποτελέσματα Τιμή Πώλησης"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet2,
      "Αποτελέσματα Τιμή Αγοράς"
    );

    // Μετατροπή σε αρχείο και αποθήκευση
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Αποτελέσματα_${profitMargin}%.xlsx`);
  };

  const updateDailyUnits = (index: number, newUnits: number) => {
    const updatedProducts = products.map((product, idx) =>
      idx === index ? { ...product, dailyUnits: newUnits } : product
    );
    setProducts(updatedProducts);
  };

  const [newStaff, setNewStaff] = useState({ name: "", salary: 0 });
  const [newProduct, setNewProduct] = useState({
    name: "",
    purchasePrice: 0,
    vat: 0,
    dailyUnits: 0,
  });

  const calculateSuggestedQuantity = (productName: string): number => {
    const product = products.find((p) => p.name === productName);
    if (!product) return 0;

    const dailyOperatingCost = calculateDailyOperatingCost();
    const totalDailyUnits = products.reduce((sum, p) => sum + p.dailyUnits, 0);

    // Υποθέτουμε ότι κάθε προϊόν πρέπει να καλύπτει το μερίδιο του λειτουργικού κόστους
    const operationalCostPerUnit = dailyOperatingCost / (totalDailyUnits || 1);

    // Υπολογισμός προτεινόμενης ποσότητας πώλησης
    const suggestedQuantity = Math.ceil(
      dailyOperatingCost / (product.purchasePrice + operationalCostPerUnit)
    );

    return suggestedQuantity;
  };

  const removeExtraExpense = (indexToRemove: number) => {
    const updatedExtraExpenses = storeData.extraExpenses.filter(
      (_, index) => index !== indexToRemove
    );
    setStoreData((prevData) => ({
      ...prevData,
      extraExpenses: updatedExtraExpenses,
    }));
  };

  const dailyOperatingCost = calculateDailyOperatingCost();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 space-y-6">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <FaCalculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Υπολογισμός Food Cost
              </h1>
              <p className="text-slate-600 mt-1 text-sm">Ακριβής υπολογισμός τιμών πώλησης με όλα τα έξοδα</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                <FaEuroSign className="text-sm" />
                <span className="text-xs font-medium">Μηνιαία Έξοδα</span>
              </div>
              <p className="text-lg font-bold text-blue-700">
                €{(dailyOperatingCost * 30).toFixed(0)}
              </p>
              <p className="text-xs text-blue-500">Σύνολο μήνα</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                <FaChartLine className="text-sm" />
                <span className="text-xs font-medium">Ημερήσια Έξοδα</span>
              </div>
              <p className="text-lg font-bold text-orange-700">
                €{dailyOperatingCost.toFixed(2)}
              </p>
              <p className="text-xs text-orange-500">Ανά ημέρα</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                <FaBox className="text-sm" />
                <span className="text-xs font-medium">Προϊόντα</span>
              </div>
              <p className="text-lg font-bold text-green-700">
                {products.length}
              </p>
              <p className="text-xs text-green-500">Καταχωρημένα</p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Info Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaHome className="text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Πληροφορίες Καταστήματος</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Όνομα Καταστήματος
            </label>
            <input
              type="text"
              name="storeName"
              value={storeData.storeName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Εισάγετε όνομα καταστήματος"
            />
          </div>
        </div>
      </div>

      {/* Monthly Expenses Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaReceipt className="text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Μηνιαία Λειτουργικά Έξοδα</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FaHome className="text-slate-400" />
              Ενοίκιο
            </label>
            <input
              type="number"
              name="rent"
              value={storeData.rent}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FaBolt className="text-slate-400" />
              Ρεύμα
            </label>
            <input
              type="number"
              name="electricity"
              value={storeData.electricity}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FaTint className="text-slate-400" />
              Νερό
            </label>
            <input
              type="number"
              name="water"
              value={storeData.water}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FaUserTie className="text-slate-400" />
              Λογιστής
            </label>
            <input
              type="number"
              name="accountant"
              value={storeData.accountant}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FaPhone className="text-slate-400" />
              Τηλέφωνο/Internet
            </label>
            <input
              type="number"
              name="phoneInternet"
              value={storeData.phoneInternet}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FaBullhorn className="text-slate-400" />
              Marketing
            </label>
            <input
              type="number"
              name="marketing"
              value={storeData.marketing}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {/* Extra Expenses */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-slate-700">Επιπλέον Έξοδα</h3>
            <button
              onClick={addExtraExpense}
              className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors duration-200"
            >
              <FaPlus size={12} />
              <span className="text-sm">Προσθήκη</span>
            </button>
          </div>
          
          <div className="space-y-2">
            {storeData.extraExpenses.map((expense, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Όνομα εξόδου"
                  value={expense.name}
                  onChange={(e) =>
                    handleExtraExpenseNameChange(index, e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Κόστος (€)"
                  name={`extraExpense_${index}`}
                  value={expense.cost}
                  onChange={handleInputChange}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  onClick={() => removeExtraExpense(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaUsers className="text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Προσωπικό (Μηνιαίοι Μισθοί)</h2>
        </div>
        
        <div className="space-y-2 mb-4">
          {staff.map((member, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {member.name.charAt(0)}
                </div>
                <span className="font-medium text-slate-800">{member.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">€{member.salary}</span>
                <button
                  onClick={() => {
                    const updatedStaff = staff.filter((_, i) => i !== index);
                    setStaff(updatedStaff);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Όνομα υπαλλήλου"
            value={newStaff.name}
            onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Μισθός (€)"
            value={newStaff.salary}
            onChange={(e) =>
              setNewStaff({
                ...newStaff,
                salary: parseFloat(e.target.value) || 0,
              })
            }
            className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              if (newStaff.name && newStaff.salary > 0) {
                addStaffMember(newStaff.name, newStaff.salary);
                setNewStaff({ name: "", salary: 0 });
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            <FaPlus size={14} />
          </button>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaBox className="text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Προϊόντα</h2>
        </div>
        
        <div className="space-y-3 mb-4">
          {products.map((product, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{product.name}</h4>
                    <p className="text-sm text-slate-600">
                      Αγορά: €{product.purchasePrice.toFixed(2)} | 
                      ΦΠΑ: {product.vat}% | 
                      Με ΦΠΑ: €{(product.purchasePrice * (1 + product.vat / 100)).toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updatedProducts = products.filter((_, i) => i !== index);
                    setProducts(updatedProducts);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <FaTrash size={14} />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Τεμάχια/ημέρα:</label>
                <input
                  type="number"
                  value={product.dailyUnits}
                  onChange={(e) => {
                    const newUnits = parseInt(e.target.value) || 0;
                    const updatedProducts = products.map((p, i) =>
                      i === index ? { ...p, dailyUnits: newUnits } : p
                    );
                    setProducts(updatedProducts);
                  }}
                  className="w-20 px-2 py-1 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Add New Product Form */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h3 className="text-md font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <FaPlus size={14} />
            Προσθήκη Νέου Προϊόντος
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                📝 Όνομα Προϊόντος
              </label>
              <input
                type="text"
                placeholder="π.χ. Καφές Espresso"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Το όνομα του προϊόντος που πουλάτε</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                💰 Τιμή Αγοράς (€)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="π.χ. 1.50"
                value={newProduct.purchasePrice}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    purchasePrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Πόσο το αγοράζετε (χωρίς ΦΠΑ)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                📊 ΦΠΑ (%)
              </label>
              <input
                type="number"
                placeholder="π.χ. 24"
                value={newProduct.vat}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    vat: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Ποσοστό ΦΠΑ (συνήθως 13% ή 24%)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                📦 Τεμάχια/Ημέρα
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="π.χ. 50"
                  value={newProduct.dailyUnits}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      dailyUnits: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    if (newProduct.name && newProduct.purchasePrice > 0) {
                      addProduct(
                        newProduct.name,
                        newProduct.purchasePrice,
                        newProduct.vat,
                        newProduct.dailyUnits
                      );
                      setNewProduct({
                        name: "",
                        purchasePrice: 0,
                        vat: 0,
                        dailyUnits: 0,
                      });
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                  title="Προσθήκη προϊόντος"
                >
                  <FaPlus size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Πόσα πουλάτε ημερησίως</p>
            </div>
          </div>
          
          {/* Help Section */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FaInfoCircle size={12} />
              Οδηγίες Συμπλήρωσης
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700">
              <div>
                <strong>Τιμή Αγοράς:</strong> Η τιμή που πληρώνετε στον προμηθευτή (χωρίς ΦΠΑ)
              </div>
              <div>
                <strong>ΦΠΑ:</strong> 13% για βασικά είδη, 24% για πολυτελείας
              </div>
              <div>
                <strong>Τεμάχια/Ημέρα:</strong> Εκτίμηση πωλήσεων ανά ημέρα
              </div>
              <div>
                <strong>Παράδειγμα:</strong> Καφές → €1.50 → 24% ΦΠΑ → 50 τεμάχια/ημέρα
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {products.length > 0 && (
        <>
          {/* Profit Margin Editor */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaPercentage className="text-amber-600" />
                <h2 className="text-lg font-semibold text-slate-800">Ποσοστό Κέρδους</h2>
              </div>
              <div className="flex items-center gap-3">
                {isEditingMargin ? (
                  <input
                    type="number"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                    onBlur={handleMarginSave}
                    onKeyDown={handleMarginSave}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingMargin(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors duration-200"
                  >
                    <FaEdit size={14} />
                    <span>{profitMargin}%</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Full Cost Calculation */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Τιμές Πώλησης (με Λειτουργικά Έξοδα)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-medium text-slate-700">Προϊόν</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-700">Πακέτο</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-700">Σερβιριστό</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateResults(profitMargin).map((result, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-2 px-2 font-medium">{result["Όνομα"]}</td>
                        <td className="py-2 px-2 text-right">
                          <div>
                            <div className="text-slate-800">€{result["Πακέτο Με ΦΠΑ"]}</div>
                            <div className="text-xs text-slate-500">€{result["Πακέτο Χωρίς ΦΠΑ"]}</div>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div>
                            <div className="text-slate-800">€{result["Σερβιριστό Με ΦΠΑ"]}</div>
                            <div className="text-xs text-slate-500">€{result["Σερβιριστό Χωρίς ΦΠΑ"]}</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Only Calculation */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Τιμές Πώλησης (Μόνο με Κόστος Αγοράς)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-medium text-slate-700">Προϊόν</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-700">Τιμή Πώλησης</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-700">Προτεινόμενα</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateProfitabilityResults(profitMargin).map((result, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-2 px-2 font-medium">{result["Όνομα"]}</td>
                        <td className="py-2 px-2 text-right">
                          <div>
                            <div className="text-slate-800">€{result["Τιμή Πώλησης Μόνο με Αγορά (Με ΦΠΑ)"]}</div>
                            <div className="text-xs text-slate-500">€{result["Τιμή Πώλησης Μόνο με Αγορά (Χωρίς ΦΠΑ)"]}</div>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                            {result["Προτεινόμενα Τεμάχια/Ημέρα"]}/ημέρα
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-center">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-200"
            >
              <FaDownload size={16} />
              <span>Εξαγωγή σε Excel</span>
            </button>
          </div>
        </>
      )}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <FaInfoCircle className="text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-800">Πώς Λειτουργεί ο Υπολογισμός</h3>
        </div>
        
        <div className="space-y-4 text-sm text-slate-600">
          <div>
            <h4 className="font-semibold text-slate-800 mb-1">📊 Υπολογισμός Λειτουργικών Εξόδων</h4>
            <p>Όλα τα μηνιαία έξοδα (ενοίκιο, ρεύμα, μισθοί κ.λπ.) αθροίζονται και διαιρούνται με 30 ημέρες για το καθημερινό κόστος.</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-800 mb-1">🎯 Υπολογισμός Τιμών Πώλησης</h4>
            <ul className="space-y-1 ml-4">
              <li>• <strong>Πακέτο:</strong> Κόστος αγοράς + Αναλογικό λειτουργικό κόστος + {profitMargin}% κέρδος</li>
              <li>• <strong>Σερβιριστό:</strong> Ίδιο με πακέτο + επιπλέον 20% για υπηρεσία</li>
              <li>• <strong>Μόνο Αγορά:</strong> Κόστος αγοράς + {profitMargin}% κέρδος (χωρίς λειτουργικά έξοδα)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-800 mb-1">💰 ΦΠΑ Υπολογισμός</h4>
            <p>Όλες οι τελικές τιμές περιλαμβάνουν ΦΠΑ 24% για ακριβή υπολογισμό λιανικής.</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-800 mb-1">📈 Προτεινόμενα Τεμάχια</h4>
            <p>Υπολογίζεται ο ελάχιστος αριθμός πωλήσεων ανά ημέρα για κάλυψη εξόδων και επίτευξη κέρδους.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
