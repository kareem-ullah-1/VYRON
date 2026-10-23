"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import DataTable, { Column } from "../POS/DataTable";
import { Purchase } from "@/store/slices/purchaseSlice";
import { useState } from "react";

interface PurchasesTableProps {
    purchases: Purchase[];
    isLoading?: boolean;
}

export default function PurchasesTable({ purchases, isLoading = false }: PurchasesTableProps) {
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    const columns: Column<Purchase>[] = [
        {
            header: "Invoice #",
            render: (p) => (
                <span className="text-sm font-semibold text-gray-900">{p.invoiceNumber || "—"}</span>
            ),
        },
        {
            header: "Supplier",
            render: (p) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 flex items-center justify-center flex-shrink-0 text-indigo-700 shadow-sm">
                        <span className="text-xs font-bold">
                            {p.supplierName?.[0]?.toUpperCase() ?? "?"}
                        </span>
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{p.supplierName}</span>
                </div>
            ),
        },
        {
            header: "Date",
            render: (p) => (
                <span className="text-sm text-gray-600">
                    {new Date(p.purchaseDate).toLocaleDateString()}
                </span>
            ),
        },
        {
            header: "Total Amount",
            render: (p) => (
                <span className="text-sm font-semibold text-gray-900">
                    Rs {p.totalAmount.toFixed(2)}
                </span>
            ),
        },
        {
            header: "Status",
            render: (p) => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${p.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : p.status === "Pending"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>
                    {p.status}
                </span>
            ),
        },
    ];

    const actions = (p: Purchase) => (
        <div className="flex items-center justify-end gap-1">
            <button
                onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }}
                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
                View
            </button>
        </div>
    );

    return (
        <>
            <div className="h-full flex flex-col">
                <DataTable
                    columns={columns}
                    data={purchases ?? []}
                    actions={actions}
                    isLoading={isLoading}
                    rowHover
                    pageSizeOptions={[25, 50, 100]}
                    noDataTitle="No purchases found"
                    noDataIcon="🧾"
                />
            </div>

            {/* View Details Modal */}
            {selectedPurchase && (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-[700px] max-w-[calc(100vw-2rem)]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Purchase Details (Inv: {selectedPurchase.invoiceNumber || "N/A"})</h2>
                            <button onClick={() => setSelectedPurchase(null)} className="text-gray-500 hover:text-gray-800">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><span className="text-gray-500 text-sm block">Supplier</span><span className="font-semibold">{selectedPurchase.supplierName}</span></div>
                            <div><span className="text-gray-500 text-sm block">Date</span><span className="font-semibold">{new Date(selectedPurchase.purchaseDate).toLocaleDateString()}</span></div>
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {selectedPurchase.purchaseDetails?.map((d) => {
                                        let snapshotName = d.rawMaterialName;
                                        try {
                                            if (d.itemSnapshotJson) {
                                                const snap = JSON.parse(d.itemSnapshotJson);
                                                if (snap.Name) snapshotName = snap.Name;
                                            }
                                        } catch { }
                                        return (
                                            <tr key={d.id}>
                                                <td className="px-4 py-2 text-sm">{snapshotName}</td>
                                                <td className="px-4 py-2 text-sm text-right">{d.quantity}</td>
                                                <td className="px-4 py-2 text-sm text-right">Rs {d.unitPrice.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-sm text-right font-medium">Rs {d.subTotal.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50">
                                        <td colSpan={3} className="px-4 py-3 text-right font-bold">Total</td>
                                        <td className="px-4 py-3 text-right font-bold text-lg">Rs {selectedPurchase.totalAmount.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
