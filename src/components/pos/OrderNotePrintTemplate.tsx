import React from "react";
import QRCode from "qrcode";
import { formatQuantityForReceipt } from "@/constants/mydata";

interface OrderNotePrintTemplateProps {
  invoiceData: any;
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

const OrderNotePrintTemplate: React.FC<OrderNotePrintTemplateProps> = ({
  invoiceData,
  cart,
  businessInfo,
}) => {
  const currentDate = new Date().toLocaleDateString("el-GR");
  const currentTime = new Date().toLocaleTimeString("el-GR");

  // Use global print data if available (from fresh order note creation)
  const globalPrintData = (window as any).printData;
  const printInvoiceData = globalPrintData?.invoiceData || invoiceData;
  const printCart = globalPrintData?.cart || cart;

  // Calculate totals for Order Note
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
    const vatRate = item.vatRate || 24;
    const vatRateDecimal = vatRate / 100;
    const itemVatAmount =
      item.totalPrice - item.totalPrice / (1 + vatRateDecimal);
    acc[vatRate] = (acc[vatRate] || 0) + itemVatAmount;
    return acc;
  }, {} as Record<number, number>);

  const printOrderNote = async (directData?: any) => {
    // Use direct data if provided, otherwise use global data (priority) or component props
    let dataToUse = directData ||
      globalPrintData || {
        invoiceData: printInvoiceData,
        cart: printCart,
        businessInfo,
        currentUser: (window as any).currentUserForPrint || "Χρήστης POS",
      };

    // Get recipes data for option name lookup
    const recipesData =
      directData?.recipes || (window as any).recipesDataForPrint || [];

    // Get discount data from direct data or global data
    const appliedDiscount =
      directData?.appliedDiscount ||
      (window as any).appliedDiscountForPrint ||
      null;

    // If no cart data, try to load from Firestore
    if (!dataToUse.cart || dataToUse.cart.length === 0) {
      console.log(
        "⚠️ No cart data in memory, attempting to load from Firestore..."
      );

      try {
        const { db } = await import("@/lib/firebase");
        const { doc, getDoc } = await import("firebase/firestore");

        const orderNoteId = dataToUse.invoiceData?.id || printInvoiceData?.id;

        if (orderNoteId) {
          console.log(
            `🔍 Loading order note data from Firestore: ${orderNoteId}`
          );
          const orderNoteDoc = await getDoc(
            doc(db, "order_notes_data", orderNoteId)
          );

          if (orderNoteDoc.exists()) {
            const firestoreData = orderNoteDoc.data();
            console.log(
              "✅ Order note data loaded from Firestore:",
              firestoreData
            );

            dataToUse = {
              invoiceData: dataToUse.invoiceData,
              cart: firestoreData.cart,
              businessInfo: firestoreData.businessInfo || businessInfo,
              currentUser: firestoreData.createdBy || "Χρήστης POS",
            };
          } else {
            console.error("❌ Order note data not found in Firestore");
          }
        }
      } catch (firestoreError) {
        console.error(
          "❌ Failed to load order note data from Firestore:",
          firestoreError
        );
      }
    }

    if (!dataToUse.cart || dataToUse.cart.length === 0) {
      console.error("❌ Cannot print Order Note - no cart data available!");
      alert("Σφάλμα: Δεν υπάρχουν δεδομένα για εκτύπωση δελτίου παραγγελίας");
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
        console.error("❌ Error generating QR code for Order Note:", error);
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("❌ Could not open print window - popup blocked?");
      alert("Σφάλμα: Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης");
      return;
    }

    const orderNoteHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Δελτίο Παραγγελίας Εστίασης</title>
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
          .order-note-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
          }
          .payment-method {
            font-weight: bold;
            color: #000;
            text-align: center;
            margin: 5px 0;
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
          .recipe-options {
            font-size: 9px;
            color: #666;
            margin-left: 10px;
            margin-top: 2px;
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

        <div class="order-note-title">ΔΕΛΤΙΟ ΠΑΡΑΓΓΕΛΙΑΣ ΕΣΤΙΑΣΗΣ</div>

        <div class="invoice-info">
          <div>Αρ. Σειράς: ${dataToUse.invoiceData?.series || "ΔΠΕ"}-${
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

        <div class="payment-method">ΠΛΗΡΩΜΗ: ΠΙΣΤΩΣΗ</div>

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

              // Apply discount to item price if discount exists
              const discountRatio =
                appliedDiscount && appliedDiscount.amount
                  ? (originalTotal - appliedDiscount.amount) / originalTotal
                  : 1;
              const itemPriceWithDiscount = item.totalPrice * discountRatio;

              return `
            <div class="item${isTaxItem ? " tax-item" : ""}">
              <div class="item-name">
                ${item.product.name}${isTaxItem ? " (ΦΠΑ 24%)" : ""}
                ${
                  showQuantity
                    ? `<br/><span style="font-size: 10px; color: #666;">${formatQuantityForReceipt(
                        item.quantity,
                        quantityType
                      )}</span>`
                    : ""
                }
                ${
                  appliedDiscount
                    ? `<br/><span style="font-size: 9px; color: #d32f2f;">Με έκπτωση ${
                        appliedDiscount.type === "percentage"
                          ? `${appliedDiscount.value}%`
                          : `€${appliedDiscount.value}`
                      }</span>`
                    : ""
                }
              </div>
              <div class="item-details">€${itemPriceWithDiscount.toFixed(
                2
              )}</div>
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

                          const selectedOptions = (
                            Array.isArray(optionIds) ? optionIds : [optionIds]
                          )
                            .map((optionId: string) => {
                              const option = group.options.find(
                                (o: any) => o.id === optionId
                              );
                              return option ? option.name : "";
                            })
                            .filter(Boolean)
                            .join(", ");

                          return selectedOptions
                            ? `${group.name}: ${selectedOptions}`
                            : "";
                        })
                        .filter(Boolean)
                        .join(" | ");

                      return optionsDisplay;
                    })
                    .filter(Boolean)
                    .join(" | ")}
                </div>`
                : ""
            }
          `;
            })
            .join("")}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Υποσύνολο:</span>
            <span>€${originalSubtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>ΦΠΑ (24%):</span>
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

        ${
          qrCodeDataUrl
            ? `
        <div class="qr-info">
          <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 80px; height: 80px;">
          <div>Σκανάρετε για πληροφορίες myDATA</div>
        </div>`
            : ""
        }

        <div class="footer">
          <div>Εκδόθηκε από: ${dataToUse.currentUser}</div>
          <div>Ευχαριστούμε για την προτίμησή σας!</div>
          <div style="margin-top: 10px; font-size: 9px;">
            ** ΔΕΛΤΙΟ ΠΑΡΑΓΓΕΛΙΑΣ - ΔΕΝ ΑΠΟΤΕΛΕΙ ΦΟΡΟΛΟΓΙΚΟ ΣΤΟΙΧΕΙΟ **
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(orderNoteHTML);
    printWindow.document.close();
  };

  // Expose print function globally and listen for print events
  React.useEffect(() => {
    // Expose function that accepts direct data (like receipt printing)
    (window as any).printOrderNoteFunction = (directData?: any) => {
      console.log(
        "📋 printOrderNoteFunction called with data:",
        directData ? "YES" : "NO"
      );
      printOrderNote(directData);
    };

    // Listen for custom print events specifically for Order Notes (fallback)
    const handleOrderNotePrintEvent = () => {
      console.log("📋 Order note print event received");
      printOrderNote();
    };

    window.addEventListener("triggerOrderNotePrint", handleOrderNotePrintEvent);

    // Cleanup
    return () => {
      window.removeEventListener(
        "triggerOrderNotePrint",
        handleOrderNotePrintEvent
      );
    };
  }, []);

  return (
    <div>
      <button
        onClick={() => printOrderNote()}
        className="hidden"
        id="print-order-note-button"
      >
        Print Order Note
      </button>
    </div>
  );
};

export default OrderNotePrintTemplate;
