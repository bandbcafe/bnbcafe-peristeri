import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { formatQuantityForReceipt } from "@/constants/mydata";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface ReceiptPrintTemplateProps {
  invoiceData: any;
  paymentMethod: string;
  cart: any[];
  businessInfo: {
    storeName: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
    email: string;
    vatNumber: string;
  };
}

const ReceiptPrintTemplate: React.FC<ReceiptPrintTemplateProps> = ({
  invoiceData,
  paymentMethod,
  cart,
  businessInfo,
}) => {
  const currentDate = new Date().toLocaleDateString("el-GR");
  const currentTime = new Date().toLocaleTimeString("el-GR");

  // Business info state - loaded from Firestore (same as POS)
  const [businessInfoFromFirestore, setBusinessInfoFromFirestore] = useState({
    storeName: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    vatNumber: "",
  });

  // Load business info from Firestore on component mount
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        // Load from the same path as POS system
        const settingsDoc = await getDoc(doc(db, "config", "settings"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const businessData = data.businessInfo;
          if (businessData) {
            setBusinessInfoFromFirestore({
              storeName: businessData.storeName || "",
              address: businessData.address || "",
              city: businessData.city || "",
              postalCode: businessData.postalCode || "",
              phone: businessData.phone || "",
              email: businessData.email || "",
              vatNumber: businessData.taxId || "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading business info from Firestore:", error);
      }
    };

    loadBusinessInfo();
  }, []);

  // Use global print data if available (from fresh payment)
  const globalPrintData = (window as any).printData;
  const printInvoiceData = globalPrintData?.invoiceData || invoiceData;
  const printCart = globalPrintData?.cart || cart;

  // Use cart data (what we sent) with WRAPP verification
  const subtotal = printCart.reduce((sum: number, item: any) => {
    const vatRateDecimal = (item.vatRate || 24) / 100;
    return sum + item.totalPrice / (1 + vatRateDecimal);
  }, 0);

  const totalVat = printCart.reduce((sum: number, item: any) => {
    const vatRateDecimal = (item.vatRate || 24) / 100;
    return sum + (item.totalPrice - item.totalPrice / (1 + vatRateDecimal));
  }, 0);

  const total = printCart.reduce(
    (sum: number, item: any) => sum + item.totalPrice,
    0
  );

  // Calculate VAT breakdown by rate
  const vatBreakdown = cart.reduce((acc, item) => {
    const vatRate = item.vatRate || 24; // Now as percentage
    const vatRateDecimal = vatRate / 100;
    const itemVatAmount =
      item.totalPrice - item.totalPrice / (1 + vatRateDecimal);
    acc[vatRate] = (acc[vatRate] || 0) + itemVatAmount;
    return acc;
  }, {} as Record<number, number>);

  const printReceipt = async (directData?: any) => {
    // Use direct data if provided, otherwise use component props and global data
    const dataToUse = directData || {
      invoiceData: printInvoiceData || invoiceData,
      cart: printCart.length > 0 ? printCart : cart,
      paymentMethod,
      businessInfo: businessInfoFromFirestore.storeName
        ? businessInfoFromFirestore
        : businessInfo,
      currentUser: (window as any).currentUserForPrint || "Χρήστης POS",
    };

    // Get recipes data for option name lookup
    const recipesData =
      directData?.recipes || (window as any).recipesDataForPrint || [];

    // Get discount data from global data
    const appliedDiscount =
      directData?.appliedDiscount ||
      (window as any).appliedDiscountForPrint ||
      null;

    if (!dataToUse.cart || dataToUse.cart.length === 0) {
      alert("Σφάλμα: Δεν υπάρχουν δεδομένα για εκτύπωση");
      return;
    }

    // Recalculate totals with actual cart data
    const originalSubtotal = dataToUse.cart.reduce((sum: number, item: any) => {
      const vatRateDecimal = (item.vatRate || 24) / 100;
      return sum + item.totalPrice / (1 + vatRateDecimal);
    }, 0);

    const originalTotalVat = dataToUse.cart.reduce((sum: number, item: any) => {
      const vatRateDecimal = (item.vatRate || 24) / 100;
      return sum + (item.totalPrice - item.totalPrice / (1 + vatRateDecimal));
    }, 0);

    const originalTotal = dataToUse.cart.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0
    );

    // Calculate VAT breakdown by rate (for multiple VAT rates)
    const vatBreakdown = dataToUse.cart.reduce(
      (acc: Record<number, number>, item: any) => {
        const vatRate = item.vatRate || 24;
        const vatRateDecimal = vatRate / 100;
        const itemVatAmount =
          item.totalPrice - item.totalPrice / (1 + vatRateDecimal);
        acc[vatRate] = (acc[vatRate] || 0) + itemVatAmount;
        return acc;
      },
      {} as Record<number, number>
    );

    // Apply discount if present
    let actualSubtotal = originalSubtotal;
    let actualTotalVat = originalTotalVat;
    let actualTotal = originalTotal;
    let discountAmount = 0;
    let vatBreakdownAfterDiscount = { ...vatBreakdown };

    if (appliedDiscount) {
      discountAmount = appliedDiscount.amount;
      const finalTotal = Math.max(0, originalTotal - discountAmount);

      // Proportionally reduce subtotal and VAT to maintain the same ratio
      const discountRatio = finalTotal / originalTotal;
      actualSubtotal = originalSubtotal * discountRatio;
      actualTotalVat = originalTotalVat * discountRatio;
      actualTotal = finalTotal;

      // Apply discount to VAT breakdown
      vatBreakdownAfterDiscount = Object.keys(vatBreakdown).reduce(
        (acc: Record<number, number>, rate) => {
          acc[Number(rate)] = vatBreakdown[Number(rate)] * discountRatio;
          return acc;
        },
        {} as Record<number, number>
      );
    }

    // Generate QR Code if QR URL exists
    let qrCodeDataUrl = "";
    if (dataToUse.invoiceData?.my_data_qr_url) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(
          dataToUse.invoiceData.my_data_qr_url,
          {
            width: 100,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          }
        );
      } catch (error) {
        console.error("❌ Error generating QR code:", error);
      }
    }

    // Check if running in Electron
    const isElectron = typeof window !== "undefined" && window.api;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="electron-print" content="${isElectron ? "true" : "false"}">
        <title>Απόδειξη Πώλησης</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 6mm;
          }
          body {
            font-family: 'Courier New', monospace;
            width: 100%;
            margin: 0;
            padding: 0;
            font-size: 11px;
            font-weight: 700;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .store-name {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 5px;
          }
          .store-address {
            font-size: 11px;
            margin-bottom: 3px;
          }
          .invoice-info {
            margin: 10px 0;
            font-size: 11px;
          }
          .items {
            margin: 15px 0;
          }
          .item {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
          }
          .item-name {
            flex: 1;
            margin-right: 10px;
            font-weight: 800;
          }
          .item-details {
            text-align: right;
            width: 78px;
          }
          .tax-item {
            background-color: #f9f9f9;
            padding: 4px 0;
            border-top: 1px dashed #ccc;
            border-bottom: 1px dashed #ccc;
            margin: 6px 0;
          }
          .recipe-options {
            font-size: 11px;
            color: #000;
            margin-left: 10px;
            margin-top: 5px;
            margin-bottom: 8px;
            font-weight: 900;
            line-height: 1.6;
            background: #f0f0f0;
            padding: 5px;
            border-left: 3px solid #000;
          }
          .totals {
            border-top: 2px dashed #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-final {
            font-weight: 900;
            font-size: 15px;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .payment-info {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #000;
          }
          .qr-info {
            margin: 15px 0;
            text-align: center;
            font-size: 10px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            padding-bottom: 0;
            margin-bottom: 0;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 6mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
            }
            body { 
              margin: 0; 
              padding: 0;
              width: 100%;
            }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${dataToUse.businessInfo.storeName}</div>
          <div class="store-address">${dataToUse.businessInfo.address}, ${
      dataToUse.businessInfo.city
    } ${dataToUse.businessInfo.postalCode}</div>
          <div class="store-address">ΑΦΜ: ${
            dataToUse.businessInfo.vatNumber
          }</div>
          <div class="store-address">Τηλ: ${dataToUse.businessInfo.phone}</div>
        </div>

        <div class="invoice-info">
          <div><strong>ΑΠΟΔΕΙΞΗ ΛΙΑΝΙΚΗΣ ΠΩΛΗΣΗΣ</strong></div>
          <div>Αρ. Σειράς: ${dataToUse.invoiceData?.series || "ΑΛΠ"}-${
      dataToUse.invoiceData?.num || "001"
    }</div>
          <div>Ημερομηνία: ${currentDate}</div>
          <div>Ώρα: ${currentTime}</div>
          ${
            dataToUse.invoiceData?.my_data_mark
              ? `<div>MARK: ${dataToUse.invoiceData.my_data_mark}</div>`
              : ""
          }
        </div>

        <div class="items">
          ${dataToUse.cart
            .map((item: any) => {
              // Check if this is a tax item
              const isTaxItem =
                item.product.sku === "999.999.998" ||
                item.product.sku === "999.999.999";

              // Show quantity with unit for weight/volume products or when quantity > 1
              const quantityType = item.product.quantityType || 1;
              const showQuantity = quantityType !== 1 || item.quantity > 1;

              return `
            <div class="item${isTaxItem ? " tax-item" : ""}">
              <div class="item-name">
                ${item.product.name}
                ${
                  showQuantity
                    ? `<br/><span style="font-size: 10px; color: #666;">${formatQuantityForReceipt(
                        item.quantity,
                        quantityType
                      )}</span>`
                    : ""
                }
              </div>
              <div class="item-details">
                <span>€${item.totalPrice.toFixed(2)}</span>
              </div>
            </div>
            ${
              item.selectedRecipes && item.selectedRecipes.length > 0
                ? `
            <div class="recipe-options">
              ${item.selectedRecipes
                .map((selectedRecipe: any) => {
                  // Find the recipe to get group and option names
                  const recipe = recipesData.find(
                    (r: any) => r.id === selectedRecipe.recipeId
                  );
                  if (!recipe) return "";

                  const optionsDisplay = Object.entries(
                    selectedRecipe.selectedOptions || {}
                  )
                    .map(([groupId, optionIds]: [string, any]) => {
                      const group = recipe.groups.find(
                        (g: any) => g.id === groupId
                      );
                      if (!group) return "";

                      const optionNames = (
                        Array.isArray(optionIds) ? optionIds : [optionIds]
                      )
                        .map((optionId: string) => {
                          const option = group.options.find(
                            (o: any) => o.id === optionId
                          );
                          return option ? option.name : "";
                        })
                        .filter(Boolean);

                      return optionNames.length > 0
                        ? `• ${group.name}: ${optionNames.join(", ")}`
                        : "";
                    })
                    .filter(Boolean);

                  return optionsDisplay.length > 0
                    ? optionsDisplay.join("<br>")
                    : "";
                })
                .filter(Boolean)
                .join("<br>")}
            </div>
            `
                : ""
            }
          `;
            })
            .join("")}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>ΥΠΟΣΥΝΟΛΟ:</span>
            <span>€${actualSubtotal.toFixed(2)}</span>
          </div>
          ${(Object.entries(vatBreakdownAfterDiscount) as [string, number][])
            .map(
              ([rate, amount]) => `
          <div class="total-row">
            <span>ΦΠΑ (${rate}%):</span>
            <span>€${amount.toFixed(2)}</span>
          </div>`
            )
            .join("")}
          ${
            appliedDiscount
              ? `
          <div class="total-row" style="color: #d32f2f;">
            <span>ΕΚΠΤΩΣΗ (${
              appliedDiscount.type === "percentage"
                ? `${appliedDiscount.value}%`
                : `€${appliedDiscount.value}`
            }):</span>
            <span>-€${discountAmount.toFixed(2)}</span>
          </div>
          `
              : ""
          }
          <div class="total-row total-final">
            <span>ΣΥΝΟΛΟ:</span>
            <span>€${actualTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div><strong>ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ:</strong></div>
          <div>${
            dataToUse.paymentMethod === "cash"
              ? "ΜΕΤΡΗΤΑ"
              : dataToUse.paymentMethod === "card"
              ? "ΚΑΡΤΑ"
              : dataToUse.paymentMethod?.toUpperCase() || "ΜΕΤΡΗΤΑ"
          }</div>
          <div>ΠΛΗΡΩΘΕΝ: €${actualTotal.toFixed(2)}</div>
        </div>

        ${
          dataToUse.invoiceData?.my_data_qr_url
            ? `
        <div class="qr-info">
          <div><strong>ΣΤΟΙΧΕΙΑ ΑΑΔΕ</strong></div>
          <div>Αναγνωριστικό: ${
            dataToUse.invoiceData.my_data_mark || "N/A"
          }</div>
          <div>Μοναδικός Κωδικός: ${
            dataToUse.invoiceData.my_data_uid || "N/A"
          }</div>
          ${
            qrCodeDataUrl
              ? `
          <div style="text-align: center; margin: 10px 0;">
            <img src="${qrCodeDataUrl}" alt="QR Code ΑΑΔΕ" style="width: 100px; height: 100px;" />
            <div style="font-size: 10px;">QR Code ΑΑΔΕ</div>
          </div>
          `
              : ""
          }
        </div>
        `
            : ""
        }

        <div class="footer">
          <div>Ευχαριστούμε για την προτίμησή σας!</div>
          <div>${dataToUse.businessInfo.storeName}</div>
          <div style="margin-top: 10px; font-size: 9px; color: #666;">
            Εξυπηρέτηση: ${dataToUse.currentUser || "Χρήστης POS"}
          </div>
        </div>

        <script>
          window.onload = function() {
            // Detect if running in Electron via meta tag
            const electronMeta = document.querySelector('meta[name="electron-print"]');
            const isElectron = electronMeta && electronMeta.content === 'true';
            
            if (isElectron) {
              // Electron: Wait much longer before closing (hidden window, no rush)
              setTimeout(function() {
                window.close();
              }, 15000);
            } else {
              // Browser: Normal print dialog
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          }
        </script>
      </body>
      </html>
    `;

    if (isElectron) {
      // Electron: Send HTML to main process for hidden window printing
      if (window.api && (window.api as any).printSilent) {
        (window.api as any).printSilent(receiptHTML);
      }
    } else {
      // Browser: Open popup window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        console.error("❌ Could not open print window - popup blocked?");
        alert("Σφάλμα: Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης");
        return;
      }

      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    }
  };

  // Expose print function globally
  React.useEffect(() => {
    (window as any).printReceiptFunction = printReceipt;
  }, []);

  return (
    <div>
      <button
        onClick={() => printReceipt()}
        className="hidden"
        id="print-receipt-button"
      >
        Print Receipt
      </button>
    </div>
  );
};

export default ReceiptPrintTemplate;
