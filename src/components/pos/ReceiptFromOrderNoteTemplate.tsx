import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { formatQuantityForReceipt } from "@/constants/mydata";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface ReceiptFromOrderNoteTemplateProps {
  receiptData: any; // NEW: Contains the receipt data with its own MARK, UID, QR URL
  cartData: any[]; // NEW: Contains the cart data from the original order note
  paymentMethod: string;
  paymentDetails?: any;
  table: any;
  businessInfo?: {
    // Optional - template loads dynamically from Firestore
    storeName: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
    email: string;
    vatNumber: string;
  };
}

const ReceiptFromOrderNoteTemplate: React.FC<
  ReceiptFromOrderNoteTemplateProps
> = ({
  receiptData,
  cartData,
  paymentMethod,
  paymentDetails,
  table,
  businessInfo = {
    storeName: "Restaurant",
    address: "Address",
    city: "City",
    postalCode: "12345",
    phone: "2101234567",
    email: "info@restaurant.gr",
    vatNumber: "123456789",
  },
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

  // Auto-print when business info is loaded
  useEffect(() => {
    // Only print if business info is loaded and we have receipt data
    if (businessInfoFromFirestore.storeName && receiptData) {
      printReceipt();
    }
  }, [businessInfoFromFirestore, receiptData]);

  // Use global print data if available (from fresh payment)
  const globalPrintData = (window as any).printData;
  const printInvoiceData = globalPrintData?.invoiceData || {};
  const printCart = globalPrintData?.cart || cartData;

  // Use cart data (what we sent) with WRAPP verification
  const subtotal = printCart.reduce((sum: number, item: any) => {
    const vatRateDecimal = (item.vatRate || 24) / 100;
    return sum + (item.totalPrice || item.subtotal || 0) / (1 + vatRateDecimal);
  }, 0);

  const totalVat = printCart.reduce((sum: number, item: any) => {
    const vatRateDecimal = (item.vatRate || 24) / 100;
    const itemTotal = item.totalPrice || item.subtotal || 0;
    return sum + (itemTotal - itemTotal / (1 + vatRateDecimal));
  }, 0);

  const total = printCart.reduce(
    (sum: number, item: any) => sum + (item.totalPrice || item.subtotal || 0),
    0
  );

  // Get payment method text
  const getPaymentMethodText = () => {
    switch (paymentMethod) {
      case "cash":
        return "ΜΕΤΡΗΤΑ";
      case "card":
        return "ΚΑΡΤΑ";
      case "mixed":
        return `ΜΙΚΤΟ (ΜΕΤΡΗΤΑ: €${
          paymentDetails?.cash?.toFixed(2) || "0.00"
        } / ΚΑΡΤΑ: €${paymentDetails?.card?.toFixed(2) || "0.00"})`;
      default:
        return "ΜΕΤΡΗΤΑ";
    }
  };

  const printReceipt = async (directData?: any) => {
    // Use direct data if provided, otherwise use component props with receipt data
    const dataToUse = directData || {
      invoiceData: receiptData, // NEW: Use receipt data which contains the receipt's own MARK/UID/QR
      cart: cartData, // NEW: Use cart data from original order note
      paymentMethod,
      businessInfo: businessInfoFromFirestore, // Use dynamically loaded business info from Firestore
      currentUser: (window as any).currentUserForPrint || "Χρήστης POS",
      table,
    };

    // Get recipes data for option name lookup
    const recipesData =
      directData?.recipes || (window as any).recipesDataForPrint || [];

    // Load discount from original order note if available
    let appliedDiscount = null;
    try {
      // Try to find the original order note in invoices collection to get the discount
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );

      // Search for order note with same table and similar timestamp
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("tableId", "==", table?.id),
        where("isOrderNote", "==", true)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);

      // Find the most recent order note for this table that has discount
      let mostRecentOrderNote: any = null;
      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (
          data.appliedDiscount &&
          (!mostRecentOrderNote ||
            data.timestamp > mostRecentOrderNote.timestamp)
        ) {
          mostRecentOrderNote = data;
        }
      });

      if (mostRecentOrderNote?.appliedDiscount) {
        appliedDiscount = mostRecentOrderNote.appliedDiscount;
        console.log("📋 Found discount from order note:", appliedDiscount);
      }
    } catch (error) {
      console.error("⚠️ Error loading discount from order note:", error);
    }

    if (!dataToUse.cart || dataToUse.cart.length === 0) {
      console.error("❌ Cannot print - no cart data available!");
      alert("Σφάλμα: Δεν υπάρχουν δεδομένα για εκτύπωση");
      return;
    }

    // Recalculate totals with actual cart data
    const originalSubtotal = dataToUse.cart.reduce((sum: number, item: any) => {
      const vatRateDecimal = (item.vatRate || 24) / 100;
      return (
        sum + (item.totalPrice || item.subtotal || 0) / (1 + vatRateDecimal)
      );
    }, 0);

    const originalTotalVat = dataToUse.cart.reduce((sum: number, item: any) => {
      const vatRateDecimal = (item.vatRate || 24) / 100;
      const itemTotal = item.totalPrice || item.subtotal || 0;
      return sum + (itemTotal - itemTotal / (1 + vatRateDecimal));
    }, 0);

    const originalTotal = dataToUse.cart.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || item.subtotal || 0),
      0
    );

    // Apply discount if present
    let actualSubtotal = originalSubtotal;
    let actualTotalVat = originalTotalVat;
    let actualTotal = originalTotal;
    let discountAmount = 0;

    if (appliedDiscount) {
      discountAmount = appliedDiscount.amount;
      const finalTotal = Math.max(0, originalTotal - discountAmount);

      // Proportionally reduce subtotal and VAT to maintain the same ratio
      const discountRatio = finalTotal / originalTotal;
      actualSubtotal = originalSubtotal * discountRatio;
      actualTotalVat = originalTotalVat * discountRatio;
      actualTotal = finalTotal;
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

    // Create iframe for printing (bypasses popup blockers)
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.left = "-9999px";
    printFrame.style.top = "-9999px";
    printFrame.style.width = "300px";
    printFrame.style.height = "auto";
    document.body.appendChild(printFrame);

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Απόδειξη Πώλησης</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 300px;
            margin: 0;
            padding: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
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
          }
          .item-details {
            text-align: right;
            width: 80px;
          }
          .tax-item {
            background-color: #f9f9f9;
            padding: 4px 0;
            border-top: 1px dashed #ccc;
            border-bottom: 1px dashed #ccc;
            margin: 6px 0;
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
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
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
          }
          @media print {
            body { margin: 0; padding: 10px; }
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
            dataToUse.table?.name
              ? `<div>Τραπέζι: ${dataToUse.table.name}</div>`
              : ""
          }
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
                item.product?.sku === "999.999.998" ||
                item.product?.sku === "999.999.999";

              // Get item name from various possible fields
              const itemName =
                item.product?.name ||
                item.description ||
                item.product_name ||
                "Προϊόν";

              // Get quantity and unit info
              const quantity = item.quantity || 1;
              const quantityType = item.product?.quantityType || 1;
              const showQuantity = quantityType !== 1 || quantity > 1;

              return `
            <div class="item${isTaxItem ? " tax-item" : ""}">
              <div class="item-name">
                ${itemName}${isTaxItem ? " (ΦΠΑ 24%)" : ""}
                ${
                  showQuantity
                    ? `<br/><span style="font-size: 10px; color: #666;">${formatQuantityForReceipt(
                        quantity,
                        quantityType
                      )}</span>`
                    : ""
                }
              </div>
              ${
                item.selectedRecipes && item.selectedRecipes.length > 0
                  ? `
                <div class="recipe-options" style="font-size: 9px; color: #666; margin-left: 10px; margin-top: 2px;">
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
                            ? `${group.name}: ${optionNames.join(", ")}`
                            : "";
                        })
                        .filter(Boolean);

                      return optionsDisplay.length > 0
                        ? `• ${optionsDisplay.join(" | ")}`
                        : "";
                    })
                    .filter(Boolean)
                    .join("<br>")}
                </div>
              `
                  : ""
              }
              <div class="item-details">
                <span>€${(item.totalPrice || item.subtotal || 0).toFixed(
                  2
                )}</span>
              </div>
            </div>
          `;
            })
            .join("")}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>ΥΠΟΣΥΝΟΛΟ:</span>
            <span>€${originalSubtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>ΦΠΑ:</span>
            <span>€${originalTotalVat.toFixed(2)}</span>
          </div>
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
          <div>ΡΕΣΤΟ: €0.00</div>
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
            window.print();
            // Signal parent to remove iframe after printing
            window.parent.postMessage('print-complete', '*');
          }
        </script>
      </body>
      </html>
    `;

    // Write HTML to iframe and trigger print
    const frameDoc =
      printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(receiptHTML);
      frameDoc.close();

      console.log("✅ Print iframe created successfully");

      // Listen for print completion and cleanup
      const handleMessage = (event: MessageEvent) => {
        if (event.data === "print-complete") {
          console.log("🖨️ Print dialog opened, cleaning up iframe");
          document.body.removeChild(printFrame);
          window.removeEventListener("message", handleMessage);
        }
      };
      window.addEventListener("message", handleMessage);

      // Fallback cleanup after 10 seconds
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          console.log("⏰ Cleaning up print iframe (fallback)");
          document.body.removeChild(printFrame);
          window.removeEventListener("message", handleMessage);
        }
      }, 10000);
    } else {
      console.error("❌ Could not access iframe document");
      document.body.removeChild(printFrame);
    }
  };

  // This component doesn't render anything visible - it just triggers printing
  return null;
};

export default ReceiptFromOrderNoteTemplate;
