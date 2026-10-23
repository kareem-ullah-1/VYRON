"use client";

import { FC, useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";

interface ReceiptModalProps {
    sale: any;
    onClose: () => void;
}

const ReceiptModal: FC<ReceiptModalProps> = ({ sale, onClose }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const { products } = useSelector((s: RootState) => s.products);

    const getDisplayName = (item: any) => {
        let displayName = item.ProductVariantName || `Item #${item.ProductVariantId}`;
        let pagesInfo = "";

        const product = products.find(p => p.Variants?.some(v => v.Id === item.ProductVariantId));
        if (product) {
            const variant = product.Variants?.find(v => v.Id === item.ProductVariantId);
            if (variant) {
                // Get name with language logic
                const isUrdu = variant.Attributes?.some((a: any) => a.AttributeName?.toLowerCase() === "language" && a.AttributeValue?.toLowerCase() === "urdu");
                const mainName = isUrdu && product.RomanUrduName ? product.RomanUrduName : product.ProductName;
                
                // Get Pages attribute
                const pagesAttr = variant.Attributes?.find((a: any) => a.AttributeName?.toLowerCase() === "pages");
                pagesInfo = pagesAttr ? ` ${pagesAttr.AttributeValue} Pages` : "";

                // Overwrite display name (excluding VariantName entirely to meet "display name and the pages attribute , nothing else")
                displayName = `${mainName}${pagesInfo}`;
            }
        }
        return displayName;
    };

    useEffect(() => {
        if (!iframeRef.current) return;

        const MIN_ROWS = 15;
        const itemRows = sale.SaleItems.map((item: any) => `
          <tr>
            <td class="td-qty">${item.Quantity}</td>
            <td class="td-desc">${getDisplayName(item)}</td>
            <td class="td-rate">${(item.UnitPrice ?? 0).toFixed(0)}</td>
            <td class="td-val">${(item.TotalPrice ?? 0).toFixed(0)}</td>
          </tr>`).join("");
        const fillerCount = Math.max(0, MIN_ROWS - sale.SaleItems.length);
        const fillerRows = Array(fillerCount).fill(`
          <tr class="filler-row">
            <td class="td-qty">&nbsp;</td>
            <td class="td-desc"></td>
            <td class="td-rate"></td>
            <td class="td-val"></td>
          </tr>`).join("");

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${sale.Id}</title>
  <style>
    @page { margin: 0; size: 5.5in 6.5in; }
    * { box-sizing: border-box; }
    html, body {
      width: 5.5in;
      height: 6.5in;
      margin: 0;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
    }
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .ref-date { font-size: 10px; line-height: 1.8; }
    .ref-date span { font-weight: bold; }
    .company-header { text-align: right; }
    .company-name { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #7a2a2a; }
    .company-sub { font-size: 11px; color: #555; }
    .company-addr { font-size: 10px; color: #444; }
    .banner {
      background-color: #c0392b;
      color: #fff;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      padding: 3px 0;
      margin: 4px 0;
      letter-spacing: 0.5px;
    }
    .contact-row {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #444;
      margin-bottom: 4px;
    }
    .buyer-row {
      font-size: 10px;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .table-wrap { flex: 1; display: flex; flex-direction: column; }
    table {
      width: 100%;
      border-collapse: collapse;
      flex: 1;
    }
    thead tr th {
      border: 1px solid #7a2a2a;
      background-color: #f9f0f0;
      text-align: center;
      padding: 4px 3px;
      font-size: 10px;
      font-weight: bold;
      color: #7a2a2a;
    }
    tbody tr td {
      border-left: 1px solid #bbb;
      border-right: 1px solid #bbb;
      border-bottom: 1px solid #eee;
      padding: 3px 4px;
      vertical-align: top;
    }
    .filler-row td { height: 18px; border-bottom: 1px solid #f0f0f0; }
    .td-qty  { width: 10%; text-align: center; }
    .td-desc { width: 50%; }
    .td-rate { width: 20%; text-align: right; }
    .td-val  { width: 20%; text-align: right; border-right: 1px solid #bbb; }
    .total-row td {
      border: 1px solid #7a2a2a;
      font-weight: bold;
      padding: 4px;
    }
    .total-label { text-align: right; font-size: 11px; }
    .total-amount { text-align: right; font-size: 11px; }
    .sig-line { border-top: 1px solid #000; width: 120px; padding-top: 2px; margin-top: 8px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="top-row">
    <div class="ref-date">
      <div>Ref No. <span>${sale.Id}</span></div>
      <div>Date: <span>${new Date(sale.SaleDate).toLocaleDateString("en-PK")}</span></div>
    </div>
    <div class="company-header">
      <div class="company-name">SHAHEEN</div>
      <div class="company-sub">EDUCATIONAL PUBLISHERS</div>
      <div class="company-addr">Gole Aminpur Bazar, Faisalabad, 041-2628472</div>
    </div>
  </div>

  <div class="banner">Educational Stationers &amp; Printers</div>

  <div class="contact-row">
    <span>shaheeneducationalpublishers@gmail.com</span>
    <span>&#128241; 0331-6505134</span>
  </div>

  <div class="buyer-row">
    Buyer's Name &amp; Address: ${sale.CustomerName || "Walk-in Customer"}
    ${sale.CustomerNumber ? ` &nbsp;|&nbsp; ${sale.CustomerNumber}` : ""}
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="td-qty">Qty.</th>
          <th class="td-desc">DESCRIPTION</th>
          <th class="td-rate">RATE</th>
          <th class="td-val">VALUE OF<br>GOODS</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${fillerRows}
        <tr class="total-row">
          <td colspan="3" class="total-label">TOTAL</td>
          <td class="total-amount td-val">Rs ${(sale.FinalAmount ?? 0).toFixed(0)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="sig-line">Signature</div>
</body>
</html>`;

        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        iframeRef.current.src = url;
        return () => URL.revokeObjectURL(url);
    }, [sale, products]);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <PrinterIcon className="w-6 h-6" />
                            <div>
                                <h2 className="text-xl font-bold">Receipt Preview</h2>
                                <p className="text-xs opacity-90">Sale #{sale.Id}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                            aria-label="Close receipt">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
                    <div
                        className="bg-white rounded-lg shadow-sm border border-gray-200 text-xs"
                        style={{ fontFamily: "Arial, sans-serif", padding: "12px 14px" }}>

                        {/* Top row: Ref/Date + Company */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] leading-5">
                                <div>Ref No. <span className="font-bold">{sale.Id}</span></div>
                                <div>Date: <span className="font-bold">{new Date(sale.SaleDate).toLocaleDateString("en-PK")}</span></div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-lg tracking-wide" style={{ color: "#7a2a2a" }}>SHAHEEN</div>
                                <div className="text-[10px] text-gray-500">EDUCATIONAL PUBLISHERS</div>
                                <div className="text-[9px] text-gray-400">Gole Aminpur Bazar, Faisalabad, 041-2628472</div>
                            </div>
                        </div>

                        {/* Banner */}
                        <div className="text-center text-[10px] font-bold text-white py-0.5 mb-2 rounded" style={{ backgroundColor: "#c0392b" }}>
                            Educational Stationers &amp; Printers
                        </div>

                        {/* Contact */}
                        <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                            <span>shaheeneducationalpublishers@gmail.com</span>
                            <span>📱 0331-6505134</span>
                        </div>

                        {/* Buyer */}
                        <div className="text-[10px] border-b border-gray-400 pb-1 mb-2">
                            Buyer&apos;s Name &amp; Address: <span className="font-medium">{sale.CustomerName || "Walk-in Customer"}{sale.CustomerNumber ? ` | ${sale.CustomerNumber}` : ""}</span>
                        </div>

                        {/* Items Table */}
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr>
                                    <th className="border text-center py-1 px-1 font-bold" style={{ borderColor: "#7a2a2a", backgroundColor: "#f9f0f0", color: "#7a2a2a", width: "10%" }}>Qty.</th>
                                    <th className="border text-center py-1 px-1 font-bold" style={{ borderColor: "#7a2a2a", backgroundColor: "#f9f0f0", color: "#7a2a2a", width: "50%" }}>DESCRIPTION</th>
                                    <th className="border text-center py-1 px-1 font-bold" style={{ borderColor: "#7a2a2a", backgroundColor: "#f9f0f0", color: "#7a2a2a", width: "20%" }}>RATE</th>
                                    <th className="border text-center py-1 px-1 font-bold" style={{ borderColor: "#7a2a2a", backgroundColor: "#f9f0f0", color: "#7a2a2a", width: "20%" }}>VALUE OF GOODS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.SaleItems.map((item: any) => (
                                    <tr key={item.Id}>
                                        <td className="border-x border-b border-gray-300 text-center py-1 px-1">{item.Quantity}</td>
                                        <td className="border-x border-b border-gray-300 py-1 px-1">{getDisplayName(item)}</td>
                                        <td className="border-x border-b border-gray-300 text-right py-1 px-1">{(item.UnitPrice ?? 0).toFixed(0)}</td>
                                        <td className="border-x border-b border-gray-300 text-right py-1 px-1">{(item.TotalPrice ?? 0).toFixed(0)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={3} className="border text-right font-bold py-1 px-2" style={{ borderColor: "#7a2a2a" }}>TOTAL</td>
                                    <td className="border text-right font-bold py-1 px-1" style={{ borderColor: "#7a2a2a" }}>Rs {(sale.FinalAmount ?? 0).toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Signature */}
                        <div className="mt-4 text-[10px]">
                            <div className="border-t border-gray-600 w-24 pt-0.5">Signature</div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-5 bg-white border-t border-gray-200 flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg">
                        <PrinterIcon className="w-5 h-5" />
                        Print Receipt
                    </button>

                    <button
                        onClick={() => setShowConfirm(true)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all">
                        Close
                    </button>
                </div>
            </div>

            {/* Hidden iframe — invoice HTML loads here, printed directly */}
            <iframe ref={iframeRef} title="print-frame" style={{ display: "none" }} />

            {showConfirm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
                        <h3 className="text-lg font-semibold mb-2">
                            Are you sure you don&apos;t want to print the receipt?
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Once closed, you will not be able to reprint this from here.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">
                                Cancel
                            </button>

                            <button
                                onClick={onClose}
                                className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition">
                                Close Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceiptModal;
