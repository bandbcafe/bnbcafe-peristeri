import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { getQuantityUnit } from "@/constants/mydata";

interface InvoiceProfessionalPrintTemplateProps {
  invoiceData: any;
  businessInfo: any;
  onClose: () => void;
}

export default function InvoiceProfessionalPrintTemplate({
  invoiceData,
  businessInfo,
  onClose,
}: InvoiceProfessionalPrintTemplateProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateProfessionalInvoicePrint = async () => {
      try {
        setIsLoading(true);

        console.log("🖨️ Professional Invoice Data:", invoiceData);
        console.log("🏢 Business Info:", businessInfo);

        // Generate QR Code if QR URL exists
        let qrCodeDataUrl = "";
        if (invoiceData?.my_data_qr_url) {
          try {
            qrCodeDataUrl = await QRCode.toDataURL(invoiceData.my_data_qr_url, {
              width: 120,
              margin: 2,
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
        let useCurrentWindow = false;

        try {
          // First try: open in new tab
          printWindow = window.open(
            "",
            "_blank",
            "width=800,height=600,scrollbars=yes,resizable=yes"
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
            .page-break { page-break-before: always; }
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #333;
            background: white;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo {
            max-width: 150px;
            max-height: 80px;
            margin-bottom: 15px;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        
        .company-details {
            font-size: 11px;
            color: #666;
            line-height: 1.5;
        }
        
        .invoice-info {
            text-align: right;
            flex: 0 0 300px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
        }
        
        .invoice-details {
            font-size: 12px;
        }
        
        .invoice-details div {
            margin-bottom: 8px;
        }
        
        .invoice-details strong {
            color: #374151;
        }
        
        .customer-section {
            margin: 40px 0;
            display: flex;
            justify-content: space-between;
        }
        
        .customer-info {
            flex: 1;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-right: 20px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
        }
        
        .customer-details {
            font-size: 12px;
            line-height: 1.6;
        }
        
        .payment-info {
            flex: 0 0 200px;
            background: #fef3c7;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            font-size: 11px;
        }
        
        .items-table th {
            background: #2563eb;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table th:first-child { border-radius: 6px 0 0 0; }
        .items-table th:last-child { border-radius: 0 6px 0 0; }
        
        .items-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
        }
        
        .items-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .items-table tr:hover {
            background: #f3f4f6;
        }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals-section {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .totals-table .subtotal-row td {
            font-weight: normal;
            color: #6b7280;
        }
        
        .totals-table .total-row td {
            font-weight: bold;
            font-size: 16px;
            background: #2563eb;
            color: white;
            border: none;
        }
        
        .footer-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-top: 2px solid #e5e7eb;
            padding-top: 30px;
        }
        
        .mydata-section {
            text-align: center;
            flex: 0 0 200px;
        }
        
        .qr-code {
            margin: 15px 0;
        }
        
        .mydata-info {
            font-size: 10px;
            color: #6b7280;
            margin-top: 10px;
        }
        
        .notes-section {
            flex: 1;
            margin-right: 30px;
        }
        
        .notes-title {
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
        }
        
        .notes-content {
            font-size: 11px;
            color: #6b7280;
            line-height: 1.5;
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            border-left: 3px solid #10b981;
        }
        
        .print-info {
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
            margin-top: 30px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
        }
        
        .print-buttons {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .print-button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            margin: 0 10px;
            cursor: pointer;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .print-button:hover {
            background: #1d4ed8;
        }
        
        .print-button.secondary {
            background: #6b7280;
        }
        
        .print-button.secondary:hover {
            background: #4b5563;
        }
    </style>
</head>
<body>
    <div class="no-print print-buttons">
        <button class="print-button" onclick="window.print()">🖨️ Εκτύπωση</button>
        <button class="print-button secondary" onclick="window.close()">❌ Κλείσιμο</button>
    </div>
    
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                ${
                  businessInfo?.logoUrl
                    ? `<img src="${businessInfo.logoUrl}" alt="Logo" class="company-logo" />`
                    : ""
                }
                <div class="company-name">${
                  businessInfo?.storeName || "ΕΠΙΧΕΙΡΗΣΗ"
                }</div>
                <div class="company-details">
                    ${
                      businessInfo?.address
                        ? `📍 ${businessInfo.address}<br>`
                        : ""
                    }
                    ${businessInfo?.phone ? `📞 ${businessInfo.phone}<br>` : ""}
                    ${businessInfo?.email ? `📧 ${businessInfo.email}<br>` : ""}
                    ${
                      businessInfo?.vatNumber
                        ? `🏛️ ΑΦΜ: ${businessInfo.vatNumber}<br>`
                        : ""
                    }
                    ${
                      businessInfo?.taxOffice
                        ? `🏢 ΔΟΥ: ${businessInfo.taxOffice}`
                        : ""
                    }
                </div>
            </div>
            
            <div class="invoice-info">
                <div class="invoice-title">ΤΙΜΟΛΟΓΙΟ</div>
                <div class="invoice-details">
                    <div><strong>Αριθμός:</strong> ${
                      invoiceData.num || ""
                    }</div>
                    <div><strong>Σειρά:</strong> ${
                      invoiceData.series || ""
                    }</div>
                    <div><strong>Ημερομηνία:</strong> ${new Date().toLocaleDateString(
                      "el-GR"
                    )}</div>
                    <div><strong>Ώρα:</strong> ${new Date().toLocaleTimeString(
                      "el-GR",
                      { hour: "2-digit", minute: "2-digit" }
                    )}</div>
                    ${
                      invoiceData.my_data_mark
                        ? `<div><strong>MyDATA:</strong> ${invoiceData.my_data_mark}</div>`
                        : ""
                    }
                </div>
            </div>
        </div>
        
        <div class="customer-section">
            <div class="customer-info">
                <div class="section-title">Στοιχεία Πελάτη</div>
                <div class="customer-details">
                    <strong>${invoiceData.counterpart?.name || ""}</strong><br>
                    ${
                      invoiceData.counterpart?.vat
                        ? `ΑΦΜ: ${invoiceData.counterpart.vat}<br>`
                        : ""
                    }
                    ${
                      invoiceData.counterpart?.street
                        ? `${invoiceData.counterpart.street} ${
                            invoiceData.counterpart.number || ""
                          }<br>`
                        : ""
                    }
                    ${
                      invoiceData.counterpart?.city
                        ? `${invoiceData.counterpart.city} ${
                            invoiceData.counterpart.postal_code || ""
                          }<br>`
                        : ""
                    }
                    ${
                      invoiceData.counterpart?.email
                        ? `📧 ${invoiceData.counterpart.email}`
                        : ""
                    }
                </div>
            </div>
            
            <div class="payment-info">
                <div class="section-title">Πληρωμή</div>
                <div class="customer-details">
                    <strong>Τρόπος:</strong><br>
                    ${
                      invoiceData.payment_method_type === 0
                        ? "💵 Μετρητά"
                        : "💳 Κάρτα"
                    }<br><br>
                    <strong>Ποσό:</strong><br>
                    €${(invoiceData.total_amount || 0).toFixed(2)}
                </div>
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 45%;">Περιγραφή</th>
                    <th style="width: 10%;" class="text-center">Ποσότητα</th>
                    <th style="width: 12%;" class="text-right">Τιμή Μον.</th>
                    <th style="width: 8%;" class="text-center">ΦΠΑ</th>
                    <th style="width: 10%;" class="text-right">Καθαρή</th>
                    <th style="width: 10%;" class="text-right">Σύνολο</th>
                </tr>
            </thead>
            <tbody>
                ${
                  invoiceData.invoice_lines
                    ?.map(
                      (item: any, index: number) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>
                            <strong>${item.name || "Προϊόν"}</strong>
                            ${
                              item.description && item.description !== item.name
                                ? `<br><small style="color: #6b7280;">${item.description}</small>`
                                : ""
                            }
                        </td>
                        <td class="text-center">${
                          item.original_quantity || item.quantity || 1
                        } ${getQuantityUnit(item.quantity_type || 1)}</td>
                        <td class="text-right">€${(
                          item.unit_price || 0
                        ).toFixed(2)}</td>
                        <td class="text-center">${item.vat_rate || 0}%</td>
                        <td class="text-right">€${(
                          item.net_total_price || 0
                        ).toFixed(2)}</td>
                        <td class="text-right"><strong>€${(
                          item.subtotal || 0
                        ).toFixed(2)}</strong></td>
                    </tr>
                `
                    )
                    .join("") || ""
                }
            </tbody>
        </table>
        
        <div class="totals-section">
            <table class="totals-table">
                <tr class="subtotal-row">
                    <td>Καθαρή Αξία:</td>
                    <td class="text-right">€${(
                      invoiceData.net_total_amount || 0
                    ).toFixed(2)}</td>
                </tr>
                <tr class="subtotal-row">
                    <td>ΦΠΑ:</td>
                    <td class="text-right">€${(
                      invoiceData.vat_total_amount || 0
                    ).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td>ΓΕΝΙΚΟ ΣΥΝΟΛΟ:</td>
                    <td class="text-right">€${(
                      invoiceData.total_amount || 0
                    ).toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <div class="footer-section">
            ${
              invoiceData.notes
                ? `
            <div class="notes-section">
                <div class="notes-title">Σημειώσεις</div>
                <div class="notes-content">
                    ${invoiceData.notes}
                </div>
            </div>
            `
                : '<div class="notes-section"></div>'
            }
            
            ${
              qrCodeDataUrl || invoiceData.my_data_mark
                ? `
            <div class="mydata-section">
                <div class="section-title">MyDATA</div>
                ${
                  qrCodeDataUrl
                    ? `
                <div class="qr-code">
                    <img src="${qrCodeDataUrl}" alt="MyDATA QR Code" style="width: 120px; height: 120px; border: 2px solid #e5e7eb; border-radius: 8px;" />
                </div>
                `
                    : ""
                }
                <div class="mydata-info">
                    ${
                      invoiceData.my_data_mark
                        ? `<strong>Mark:</strong> ${invoiceData.my_data_mark}<br>`
                        : ""
                    }
                    Σκάνετε για επαλήθευση<br>στο myDATA
                </div>
            </div>
            `
                : ""
            }
        </div>
        
        <div class="print-info">
            Εκτυπώθηκε: ${new Date().toLocaleString("el-GR")} | 
            Τιμολόγιο δημιουργήθηκε από POS System
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
        }, 1000);
      } catch (error) {
        console.error("❌ Error generating professional invoice print:", error);
        alert(
          "Σφάλμα κατά τη δημιουργία του επαγγελματικού τιμολογίου για εκτύπωση"
        );
      } finally {
        setIsLoading(false);
        onClose();
      }
    };

    generateProfessionalInvoicePrint();
  }, [invoiceData, businessInfo, onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Προετοιμασία επαγγελματικού τιμολογίου για εκτύπωση...</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
