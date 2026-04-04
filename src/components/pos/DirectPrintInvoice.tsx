import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { getQuantityUnit } from "@/constants/mydata";

interface DirectPrintInvoiceProps {
  invoiceData: any;
  businessInfo: any;
  template: "thermal" | "professional" | "compact-professional";
  onClose: () => void;
}

export default function DirectPrintInvoice({
  invoiceData,
  businessInfo,
  template,
  onClose,
}: DirectPrintInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDirectPrint = async () => {
      try {
        // Generate QR Code if available
        let qrCodeDataUrl = "";
        if (invoiceData?.my_data_qr_url) {
          try {
            qrCodeDataUrl = await QRCode.toDataURL(invoiceData.my_data_qr_url, {
              width:
                template === "thermal"
                  ? 100
                  : template === "compact-professional"
                  ? 80
                  : 120,
              margin:
                template === "thermal"
                  ? 1
                  : template === "compact-professional"
                  ? 1
                  : 2,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });
          } catch (error) {
            console.error("❌ Error generating QR code:", error);
          }
        }

        // Wait a bit for the component to render
        setTimeout(() => {
          window.print();
          // Close after printing
          setTimeout(() => {
            onClose();
          }, 500);
        }, 100);
      } catch (error) {
        console.error("❌ Error in direct print:", error);
        onClose();
      }
    };

    handleDirectPrint();
  }, [invoiceData, businessInfo, template, onClose]);

  const thermalStyles = `
    @media print {
      body { margin: 0; font-family: 'Courier New', monospace; }
      .no-print { display: none; }
      .print-content { width: 80mm; font-size: 12px; }
    }
    @media screen {
      .print-content { 
        width: 300px; 
        margin: 20px auto; 
        font-family: 'Courier New', monospace;
        font-size: 12px;
        border: 1px solid #ccc;
        padding: 10px;
      }
    }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
    .business-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
    .invoice-title { font-weight: bold; font-size: 13px; margin: 10px 0; text-decoration: underline; }
    .section { margin: 10px 0; padding: 5px 0; }
    .section-title { font-weight: bold; margin-bottom: 5px; text-decoration: underline; }
    .line-item { display: flex; justify-content: space-between; margin: 2px 0; }
    .item-name { flex: 1; margin-right: 10px; }
    .item-details { text-align: right; white-space: nowrap; }
    .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
    .total-line { display: flex; justify-content: space-between; margin: 2px 0; font-weight: bold; }
    .footer { text-align: center; border-top: 1px dashed #000; padding-top: 10px; margin-top: 15px; font-size: 10px; }
    .qr-code { text-align: center; margin: 10px 0; }
    .mydata-info { font-size: 10px; text-align: center; margin: 5px 0; }
  `;

  const professionalStyles = `
    @media print {
      body { margin: 0; font-family: Arial, sans-serif; }
      .no-print { display: none; }
      .print-content { max-width: 210mm; font-size: 12px; }
    }
    @media screen {
      .print-content { 
        max-width: 800px; 
        margin: 20px auto; 
        font-family: Arial, sans-serif;
        font-size: 12px;
        border: 1px solid #ccc;
        padding: 20px;
      }
    }
    .invoice-container { background: white; padding: 30px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .company-info { flex: 1; }
    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
    .company-details { font-size: 11px; color: #666; line-height: 1.5; }
    .invoice-info { text-align: right; flex: 0 0 300px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 15px; }
    .customer-section { margin: 40px 0; display: flex; justify-content: space-between; }
    .customer-info { flex: 1; background: #f9fafb; padding: 20px; border-radius: 8px; margin-right: 20px; }
    .payment-info { flex: 0 0 200px; background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; }
    .section-title { font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 11px; }
    .items-table th { background: #2563eb; color: white; padding: 12px 8px; text-align: left; font-weight: bold; text-transform: uppercase; }
    .items-table td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; }
    .items-table tr:nth-child(even) { background: #f9fafb; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-section { margin-top: 30px; display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; border-collapse: collapse; font-size: 12px; }
    .totals-table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    .totals-table .total-row td { font-weight: bold; font-size: 16px; background: #2563eb; color: white; border: none; }
    .footer-section { margin-top: 50px; display: flex; justify-content: space-between; border-top: 2px solid #e5e7eb; padding-top: 30px; }
    .mydata-section { text-align: center; flex: 0 0 200px; }
    .notes-section { flex: 1; margin-right: 30px; }
  `;

  const compactProfessionalStyles = `
    @media print {
      body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
      .no-print { display: none; }
      .print-content { max-width: 210mm; font-size: 10px; }
    }
    @media screen {
      .print-content { 
        max-width: 800px; 
        margin: 20px auto; 
        font-family: 'Segoe UI', sans-serif;
        font-size: 10px;
        border: 1px solid #ccc;
        padding: 15px;
      }
    }
    .invoice-container { background: white; padding: 0; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
    .company-info { flex: 1; padding-right: 20px; }
    .company-name { font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
    .company-details { font-size: 8px; color: #666; line-height: 1.3; }
    .invoice-info { text-align: right; flex: 0 0 200px; background: #f8fafc; padding: 12px; border-radius: 4px; border-left: 3px solid #2563eb; }
    .invoice-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 8px; }
    .customer-payment-section { display: flex; justify-content: space-between; margin: 15px 0; gap: 15px; }
    .customer-info { flex: 1; background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #10b981; }
    .payment-info { flex: 0 0 150px; background: #fef3c7; padding: 12px; border-radius: 4px; border-left: 3px solid #f59e0b; }
    .section-title { font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .customer-details, .payment-details { font-size: 8px; line-height: 1.4; }
    .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 8px; }
    .items-table th { background: #2563eb; color: white; padding: 6px 4px; text-align: left; font-weight: bold; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
    .items-table td { padding: 5px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 8px; }
    .items-table tr:nth-child(even) { background: #f9fafb; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-section { display: flex; justify-content: flex-end; margin-top: 15px; }
    .totals-table { width: 200px; border-collapse: collapse; font-size: 9px; }
    .totals-table td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
    .totals-table .total-row td { font-weight: bold; font-size: 11px; background: #2563eb; color: white; border: none; }
    .footer-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    .mydata-section { text-align: center; flex: 0 0 120px; }
    .notes-section { flex: 1; margin-right: 20px; }
    .notes-title { font-size: 9px; font-weight: bold; color: #374151; margin-bottom: 5px; }
    .notes-content { font-size: 8px; color: #6b7280; line-height: 1.4; background: #f9fafb; padding: 8px; border-radius: 3px; border-left: 2px solid #10b981; }
    .mydata-info { font-size: 7px; color: #6b7280; margin-top: 5px; line-height: 1.2; }
  `;

  return (
    <>
      <style>
        {template === "thermal"
          ? thermalStyles
          : template === "compact-professional"
          ? compactProfessionalStyles
          : professionalStyles}
      </style>
      <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Προετοιμασία για εκτύπωση...</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Ακύρωση
            </button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="print-content">
        {template === "thermal" ? (
          // Thermal Template
          <div>
            <div className="header">
              <div className="business-name">
                {businessInfo?.storeName || "ΕΠΙΧΕΙΡΗΣΗ"}
              </div>
              {businessInfo?.address && <div>{businessInfo.address}</div>}
              {businessInfo?.phone && <div>Τηλ: {businessInfo.phone}</div>}
              {businessInfo?.vatNumber && (
                <div>ΑΦΜ: {businessInfo.vatNumber}</div>
              )}

              <div className="invoice-title">ΤΙΜΟΛΟΓΙΟ ΠΩΛΗΣΗΣ</div>
              <div>
                Αρ. {invoiceData.num || ""} / Σειρά: {invoiceData.series || ""}
              </div>
              <div>
                {new Date().toLocaleDateString("el-GR")}{" "}
                {new Date().toLocaleTimeString("el-GR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {invoiceData.counterpart && (
              <div className="section">
                <div className="section-title">ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ:</div>
                <div>{invoiceData.counterpart.name || ""}</div>
                {invoiceData.counterpart.vat && (
                  <div>ΑΦΜ: {invoiceData.counterpart.vat}</div>
                )}
                {invoiceData.counterpart.city && (
                  <div>
                    {invoiceData.counterpart.city}{" "}
                    {invoiceData.counterpart.postal_code || ""}
                  </div>
                )}
              </div>
            )}

            <div className="section">
              <div className="section-title">ΠΡΟΪΟΝΤΑ:</div>
              {invoiceData.invoice_lines?.map((item: any) => (
                <div key={item.line_number} className="line-item">
                  <div className="item-name">
                    {item.name || "Προϊόν"}
                    <br />
                    <small>
                      {item.original_quantity || item.quantity || 1}{" "}
                      {getQuantityUnit(item.quantity_type || 1)} x €
                      {(item.unit_price || 0).toFixed(2)}
                    </small>
                  </div>
                  <div className="item-details">
                    €{(item.subtotal || 0).toFixed(2)}
                    <br />
                    <small>ΦΠΑ {item.vat_rate || 0}%</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="totals">
              <div className="total-line">
                <span>Καθαρή Αξία:</span>
                <span>€{(invoiceData.net_total_amount || 0).toFixed(2)}</span>
              </div>
              <div className="total-line">
                <span>ΦΠΑ:</span>
                <span>€{(invoiceData.vat_total_amount || 0).toFixed(2)}</span>
              </div>
              <div
                className="total-line"
                style={{
                  fontSize: "14px",
                  borderTop: "1px solid #000",
                  paddingTop: "5px",
                }}
              >
                <span>ΣΥΝΟΛΟ:</span>
                <span>€{(invoiceData.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="section">
              <div>
                <strong>Τρόπος Πληρωμής:</strong>{" "}
                {invoiceData.payment_method_type === 0 ? "Μετρητά" : "Κάρτα"}
              </div>
            </div>

            {invoiceData.my_data_mark && (
              <div className="mydata-info">
                <strong>MyDATA Mark:</strong> {invoiceData.my_data_mark}
              </div>
            )}

            <div className="footer">
              <div>Ευχαριστούμε για την προτίμησή σας!</div>
              <div style={{ marginTop: "5px" }}>
                Εκτυπώθηκε: {new Date().toLocaleString("el-GR")}
              </div>
            </div>
          </div>
        ) : template === "compact-professional" ? (
          // Compact Professional Template
          <div className="invoice-container">
            <div className="header">
              <div className="company-info">
                {businessInfo?.logoUrl && (
                  <img
                    src={businessInfo.logoUrl}
                    alt="Logo"
                    style={{
                      maxWidth: "100px",
                      maxHeight: "50px",
                      marginBottom: "8px",
                    }}
                  />
                )}
                <div className="company-name">
                  {businessInfo?.storeName || "ΕΠΙΧΕΙΡΗΣΗ"}
                </div>
                <div className="company-details">
                  {businessInfo?.address && (
                    <div>📍 {businessInfo.address}</div>
                  )}
                  {businessInfo?.phone && <div>📞 {businessInfo.phone}</div>}
                  {businessInfo?.email && <div>📧 {businessInfo.email}</div>}
                  {businessInfo?.vatNumber && (
                    <div>🏛️ ΑΦΜ: {businessInfo.vatNumber}</div>
                  )}
                </div>
              </div>

              <div className="invoice-info">
                <div className="invoice-title">ΤΙΜΟΛΟΓΙΟ</div>
                <div>
                  <strong>Αριθμός:</strong> {invoiceData.num || ""}
                </div>
                <div>
                  <strong>Σειρά:</strong> {invoiceData.series || ""}
                </div>
                <div>
                  <strong>Ημερομηνία:</strong>{" "}
                  {new Date().toLocaleDateString("el-GR")}
                </div>
                <div>
                  <strong>Ώρα:</strong>{" "}
                  {new Date().toLocaleTimeString("el-GR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {invoiceData.my_data_mark && (
                  <div>
                    <strong>MyDATA:</strong> {invoiceData.my_data_mark}
                  </div>
                )}
              </div>
            </div>

            <div className="customer-payment-section">
              <div className="customer-info">
                <div className="section-title">Στοιχεία Πελάτη</div>
                <div className="customer-details">
                  <strong>{invoiceData.counterpart?.name || ""}</strong>
                  <br />
                  {invoiceData.counterpart?.vat && (
                    <div>ΑΦΜ: {invoiceData.counterpart.vat}</div>
                  )}
                  {invoiceData.counterpart?.street && (
                    <div>
                      {invoiceData.counterpart.street}{" "}
                      {invoiceData.counterpart.number || ""}
                    </div>
                  )}
                  {invoiceData.counterpart?.city && (
                    <div>
                      {invoiceData.counterpart.city}{" "}
                      {invoiceData.counterpart.postal_code || ""}
                    </div>
                  )}
                </div>
              </div>

              <div className="payment-info">
                <div className="section-title">Πληρωμή</div>
                <div className="payment-details">
                  <strong>Τρόπος:</strong>
                  <br />
                  {invoiceData.payment_method_type === 0
                    ? "💵 Μετρητά"
                    : "💳 Κάρτα"}
                  <br />
                  <br />
                  <strong>Ποσό:</strong>
                  <br />
                  <span style={{ fontSize: "10px", fontWeight: "bold" }}>
                    €{(invoiceData.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: "4%" }}>#</th>
                  <th style={{ width: "40%" }}>Περιγραφή</th>
                  <th style={{ width: "12%" }} className="text-center">
                    Ποσότητα
                  </th>
                  <th style={{ width: "12%" }} className="text-right">
                    Τιμή Μον.
                  </th>
                  <th style={{ width: "8%" }} className="text-center">
                    ΦΠΑ
                  </th>
                  <th style={{ width: "12%" }} className="text-right">
                    Καθαρή
                  </th>
                  <th style={{ width: "12%" }} className="text-right">
                    Σύνολο
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.invoice_lines?.map((item: any, index: number) => (
                  <tr key={item.line_number}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <strong>{item.name || "Προϊόν"}</strong>
                    </td>
                    <td className="text-center">
                      {item.original_quantity || item.quantity || 1}{" "}
                      {getQuantityUnit(item.quantity_type || 1)}
                    </td>
                    <td className="text-right">
                      €{(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="text-center">{item.vat_rate || 0}%</td>
                    <td className="text-right">
                      €{(item.net_total_price || 0).toFixed(2)}
                    </td>
                    <td className="text-right">
                      <strong>€{(item.subtotal || 0).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals-section">
              <table className="totals-table">
                <tr>
                  <td>Καθαρή Αξία:</td>
                  <td className="text-right">
                    €{(invoiceData.net_total_amount || 0).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td>ΦΠΑ:</td>
                  <td className="text-right">
                    €{(invoiceData.vat_total_amount || 0).toFixed(2)}
                  </td>
                </tr>
                <tr className="total-row">
                  <td>ΓΕΝΙΚΟ ΣΥΝΟΛΟ:</td>
                  <td className="text-right">
                    €{(invoiceData.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>

            <div className="footer-section">
              {invoiceData.notes && (
                <div className="notes-section">
                  <div className="notes-title">Σημειώσεις</div>
                  <div className="notes-content">{invoiceData.notes}</div>
                </div>
              )}

              {invoiceData.my_data_mark && (
                <div className="mydata-section">
                  <div className="section-title">MyDATA</div>
                  <div className="mydata-info">
                    <strong>Mark:</strong> {invoiceData.my_data_mark}
                    <br />
                    Σκάνετε για επαλήθευση
                    <br />
                    στο myDATA
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Standard Professional Template
          <div className="invoice-container">
            <div className="header">
              <div className="company-info">
                {businessInfo?.logoUrl && (
                  <img
                    src={businessInfo.logoUrl}
                    alt="Logo"
                    style={{
                      maxWidth: "150px",
                      maxHeight: "80px",
                      marginBottom: "15px",
                    }}
                  />
                )}
                <div className="company-name">
                  {businessInfo?.storeName || "ΕΠΙΧΕΙΡΗΣΗ"}
                </div>
                <div className="company-details">
                  {businessInfo?.address && (
                    <div>📍 {businessInfo.address}</div>
                  )}
                  {businessInfo?.phone && <div>📞 {businessInfo.phone}</div>}
                  {businessInfo?.email && <div>📧 {businessInfo.email}</div>}
                  {businessInfo?.vatNumber && (
                    <div>🏛️ ΑΦΜ: {businessInfo.vatNumber}</div>
                  )}
                </div>
              </div>

              <div className="invoice-info">
                <div className="invoice-title">ΤΙΜΟΛΟΓΙΟ</div>
                <div>
                  <strong>Αριθμός:</strong> {invoiceData.num || ""}
                </div>
                <div>
                  <strong>Σειρά:</strong> {invoiceData.series || ""}
                </div>
                <div>
                  <strong>Ημερομηνία:</strong>{" "}
                  {new Date().toLocaleDateString("el-GR")}
                </div>
                <div>
                  <strong>Ώρα:</strong>{" "}
                  {new Date().toLocaleTimeString("el-GR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {invoiceData.my_data_mark && (
                  <div>
                    <strong>MyDATA:</strong> {invoiceData.my_data_mark}
                  </div>
                )}
              </div>
            </div>

            <div className="customer-section">
              <div className="customer-info">
                <div className="section-title">Στοιχεία Πελάτη</div>
                <div>
                  <strong>{invoiceData.counterpart?.name || ""}</strong>
                  <br />
                  {invoiceData.counterpart?.vat && (
                    <div>ΑΦΜ: {invoiceData.counterpart.vat}</div>
                  )}
                  {invoiceData.counterpart?.street && (
                    <div>
                      {invoiceData.counterpart.street}{" "}
                      {invoiceData.counterpart.number || ""}
                    </div>
                  )}
                  {invoiceData.counterpart?.city && (
                    <div>
                      {invoiceData.counterpart.city}{" "}
                      {invoiceData.counterpart.postal_code || ""}
                    </div>
                  )}
                </div>
              </div>

              <div className="payment-info">
                <div className="section-title">Πληρωμή</div>
                <div>
                  <strong>Τρόπος:</strong>
                  <br />
                  {invoiceData.payment_method_type === 0
                    ? "💵 Μετρητά"
                    : "💳 Κάρτα"}
                  <br />
                  <br />
                  <strong>Ποσό:</strong>
                  <br />€{(invoiceData.total_amount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>#</th>
                  <th style={{ width: "45%" }}>Περιγραφή</th>
                  <th style={{ width: "10%" }} className="text-center">
                    Ποσότητα
                  </th>
                  <th style={{ width: "12%" }} className="text-right">
                    Τιμή Μον.
                  </th>
                  <th style={{ width: "8%" }} className="text-center">
                    ΦΠΑ
                  </th>
                  <th style={{ width: "10%" }} className="text-right">
                    Καθαρή
                  </th>
                  <th style={{ width: "10%" }} className="text-right">
                    Σύνολο
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.invoice_lines?.map((item: any, index: number) => (
                  <tr key={item.line_number}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <strong>{item.name || "Προϊόν"}</strong>
                    </td>
                    <td className="text-center">
                      {item.original_quantity || item.quantity || 1}{" "}
                      {getQuantityUnit(item.quantity_type || 1)}
                    </td>
                    <td className="text-right">
                      €{(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="text-center">{item.vat_rate || 0}%</td>
                    <td className="text-right">
                      €{(item.net_total_price || 0).toFixed(2)}
                    </td>
                    <td className="text-right">
                      <strong>€{(item.subtotal || 0).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals-section">
              <table className="totals-table">
                <tr>
                  <td>Καθαρή Αξία:</td>
                  <td className="text-right">
                    €{(invoiceData.net_total_amount || 0).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td>ΦΠΑ:</td>
                  <td className="text-right">
                    €{(invoiceData.vat_total_amount || 0).toFixed(2)}
                  </td>
                </tr>
                <tr className="total-row">
                  <td>ΓΕΝΙΚΟ ΣΥΝΟΛΟ:</td>
                  <td className="text-right">
                    €{(invoiceData.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
