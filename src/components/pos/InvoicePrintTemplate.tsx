import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { formatQuantityForReceipt, getQuantityUnit } from "@/constants/mydata";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface InvoicePrintTemplateProps {
  invoiceData: any;
  businessInfo: any;
  onClose: () => void;
}

export default function InvoicePrintTemplate({
  invoiceData,
  businessInfo,
  onClose,
}: InvoicePrintTemplateProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateInvoicePrint = async () => {
      try {
        setIsLoading(true);

        // Generate QR Code if QR URL exists
        let qrCodeDataUrl = "";
        if (invoiceData?.my_data_qr_url) {
          try {
            qrCodeDataUrl = await QRCode.toDataURL(invoiceData.my_data_qr_url, {
              width: 100,
              margin: 1,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });
          } catch (error) {
            console.error("❌ Error generating QR code:", error);
          }
        }

        // Try multiple approaches to handle popup blockers
        let printWindow = null;

        try {
          // First try: open in new tab
          printWindow = window.open(
            "",
            "_blank",
            "width=400,height=600,scrollbars=yes,resizable=yes"
          );

          if (
            !printWindow ||
            printWindow.closed ||
            typeof printWindow.closed == "undefined"
          ) {
            // Popup blocked, try alternative approach
            console.warn("Popup blocked, trying alternative approach");

            // Create a temporary iframe for printing
            const iframe = document.createElement("iframe");
            iframe.style.position = "absolute";
            iframe.style.width = "0px";
            iframe.style.height = "0px";
            iframe.style.border = "none";
            document.body.appendChild(iframe);

            printWindow = iframe.contentWindow;

            // Clean up after printing
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          }
        } catch (error) {
          console.error("Error opening print window:", error);
          alert(
            "Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης. Παρακαλώ επιτρέψτε τα popup για αυτή τη σελίδα."
          );
          return;
        }

        if (!printWindow) {
          alert(
            "Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης. Παρακαλώ επιτρέψτε τα popup για αυτή τη σελίδα."
          );
          return;
        }

        const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Τιμολόγιο ${invoiceData.series || ""} ${
          invoiceData.num || ""
        }</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 10px;
            width: 80mm;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        
        .business-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .invoice-title {
            font-weight: bold;
            font-size: 13px;
            margin: 10px 0;
            text-decoration: underline;
        }
        
        .section {
            margin: 10px 0;
            padding: 5px 0;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            text-decoration: underline;
        }
        
        .line-item {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            padding: 1px 0;
        }
        
        .item-name {
            flex: 1;
            margin-right: 10px;
        }
        
        .item-details {
            text-align: right;
            white-space: nowrap;
        }
        
        .totals {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 10px;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 15px;
            font-size: 10px;
        }
        
        .qr-code {
            text-align: center;
            margin: 10px 0;
        }
        
        .mydata-info {
            font-size: 10px;
            text-align: center;
            margin: 5px 0;
        }
        
        .print-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 10px;
            cursor: pointer;
            border-radius: 5px;
        }
        
        .print-button:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="print-button" onclick="window.print()">🖨️ Εκτύπωση</button>
        <button class="print-button" onclick="window.close()">❌ Κλείσιμο</button>
    </div>
    
    <div class="header">
        <div class="business-name">${
          businessInfo?.storeName || "ΕΠΙΧΕΙΡΗΣΗ"
        }</div>
        ${businessInfo?.address ? `<div>${businessInfo.address}</div>` : ""}
        ${businessInfo?.phone ? `<div>Τηλ: ${businessInfo.phone}</div>` : ""}
        ${
          businessInfo?.vatNumber
            ? `<div>ΑΦΜ: ${businessInfo.vatNumber}</div>`
            : ""
        }
        
        <div class="invoice-title">ΤΙΜΟΛΟΓΙΟ ΠΩΛΗΣΗΣ</div>
        <div>Αρ. ${invoiceData.num || ""} / Σειρά: ${
          invoiceData.series || ""
        }</div>
        <div>${new Date().toLocaleDateString(
          "el-GR"
        )} ${new Date().toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
        })}</div>
    </div>
    
    ${
      invoiceData.counterpart
        ? `
    <div class="section">
        <div class="section-title">ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ:</div>
        <div>${invoiceData.counterpart.name || ""}</div>
        ${
          invoiceData.counterpart.vat
            ? `<div>ΑΦΜ: ${invoiceData.counterpart.vat}</div>`
            : ""
        }
        ${
          invoiceData.counterpart.address
            ? `<div>${invoiceData.counterpart.address}</div>`
            : ""
        }
        ${
          invoiceData.counterpart.city
            ? `<div>${invoiceData.counterpart.city} ${
                invoiceData.counterpart.postal_code || ""
              }</div>`
            : ""
        }
    </div>
    `
        : ""
    }
    
    <div class="section">
        <div class="section-title">ΠΡΟΪΟΝΤΑ:</div>
        ${
          invoiceData.invoice_lines
            ?.map(
              (item: any) => `
            <div class="line-item">
                <div class="item-name">
                    ${item.name || "Προϊόν"}
                    <br><small>${
                      item.original_quantity || item.quantity || 1
                    } ${getQuantityUnit(item.quantity_type || 1)} x €${(
                item.unit_price || 0
              ).toFixed(2)}</small>
                </div>
                <div class="item-details">
                    €${(item.subtotal || 0).toFixed(2)}
                    <br><small>ΦΠΑ ${item.vat_rate || 0}%</small>
                </div>
            </div>
        `
            )
            .join("") || ""
        }
    </div>
    
    <div class="totals">
        <div class="total-line">
            <span>Καθαρή Αξία:</span>
            <span>€${(invoiceData.net_total_amount || 0).toFixed(2)}</span>
        </div>
        <div class="total-line">
            <span>ΦΠΑ:</span>
            <span>€${(invoiceData.vat_total_amount || 0).toFixed(2)}</span>
        </div>
        <div class="total-line" style="font-size: 14px; border-top: 1px solid #000; padding-top: 5px;">
            <span>ΣΥΝΟΛΟ:</span>
            <span>€${(invoiceData.total_amount || 0).toFixed(2)}</span>
        </div>
    </div>
    
    <div class="section">
        <div><strong>Τρόπος Πληρωμής:</strong> ${
          invoiceData.payment_method_type === 0 ? "Μετρητά" : "Κάρτα"
        }</div>
    </div>
    
    ${
      invoiceData.my_data_mark
        ? `
    <div class="mydata-info">
        <strong>MyDATA Mark:</strong> ${invoiceData.my_data_mark}
    </div>
    `
        : ""
    }
    
    ${
      qrCodeDataUrl
        ? `
    <div class="qr-code">
        <img src="${qrCodeDataUrl}" alt="MyDATA QR Code" style="width: 100px; height: 100px;" />
        <div class="mydata-info">Σκάνετε για επαλήθευση στο myDATA</div>
    </div>
    `
        : ""
    }
    
    <div class="footer">
        <div>Ευχαριστούμε για την προτίμησή σας!</div>
        <div style="margin-top: 5px;">
            Εκτυπώθηκε: ${new Date().toLocaleString("el-GR")}
        </div>
    </div>
</body>
</html>
        `;

        printWindow.document.write(invoiceHTML);
        printWindow.document.close();

        // Auto-focus the print window
        printWindow.focus();

        // Optional: Auto-print after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } catch (error) {
        console.error("❌ Error generating invoice print:", error);
        alert("Σφάλμα κατά τη δημιουργία του τιμολογίου για εκτύπωση");
      } finally {
        setIsLoading(false);
        onClose();
      }
    };

    generateInvoicePrint();
  }, [invoiceData, businessInfo, onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Προετοιμασία τιμολογίου για εκτύπωση...</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
