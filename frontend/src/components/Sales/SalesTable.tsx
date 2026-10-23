"use client";

import { useState } from "react";
import { format } from "date-fns";
import DataTable, { Column } from "../POS/DataTable";
import { Sale } from "@/store/slices/salesSlice";
import { EyeIcon } from "@heroicons/react/24/outline";
import Modal from "../POS/Modal";

interface SalesTableProps {
    sales: Sale[];
    loading?: boolean;
}

export default function SalesTable({
    sales,
    loading = false,
}: SalesTableProps) {
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const getPaymentMethodColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case "completed":
                return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "pending":
                return "bg-amber-50 text-amber-700 border-amber-100";
            case "failed":
                return "bg-rose-50 text-rose-700 border-rose-100";
            default:
                return "bg-slate-50 text-slate-700 border-slate-200";
        }
    };

    const columns: Column<Sale>[] = [
        {
            header: "Sale ID",
            render: (s) => (
                <span className="text-sm font-bold text-indigo-600">#{s.Id}</span>
            )
        },
        {
            header: "Customer",
            render: (s) => (
                <span className="text-sm font-medium text-gray-900">
                    {s.CustomerName ?? "Walk-in"}
                </span>
            )
        },
        {
            header: "Items",
            render: (s) => {
                const itemCount = s.SaleItems?.length ?? 0;
                const totalQty = s.SaleItems?.reduce((sum, i) => sum + i.Quantity, 0) ?? 0;
                return (
                    <span className="text-sm text-gray-700">
                        {itemCount} {itemCount !== 1 ? "items" : "item"} &middot; <span className="text-gray-500">Qty {totalQty}</span>
                    </span>
                );
            },
        },
        {
            header: "Gross Amount",
            render: (s) => {
                const gross = s.SaleItems?.reduce((sum, i) => sum + (i.UnitPrice ?? 0) * i.Quantity, 0) ?? 0;
                return <span className="font-semibold text-gray-700">Rs {gross.toFixed(2)}</span>;
            },
        },
        {
            header: "Discount",
            render: (s) => {
                const itemDiscounts = s.SaleItems?.reduce((sum, i) => sum + (i.DiscountAmount ?? 0), 0) ?? 0;
                const saleDiscount = s.DiscountAmount ?? 0;
                const total = itemDiscounts + saleDiscount;
                return total > 0
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50 shadow-sm">-Rs {total.toFixed(2)}</span>
                    : <span className="text-gray-400">—</span>;
            },
        },
        {
            header: "Final Amount",
            render: (s) => (
                <span className="font-bold text-gray-900 text-base">
                    Rs {(s.FinalAmount ?? 0).toFixed(2)}
                </span>
            ),
        },
        {
            header: "Status",
            render: (s) => (
                <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-md border shadow-sm ${getPaymentMethodColor(
                        s.Status
                    )}`}>
                    {s.Status ?? "N/A"}
                </span>
            ),
        },
        {
            header: "Sale Date",
            render: (s) =>
                <span className="text-sm text-gray-600 font-medium">
                    {s.SaleDate ? format(new Date(s.SaleDate), "MMM dd, yyyy hh:mm a") : "-"}
                </span>,
        },
        {
            header: "Actions",
            render: (s) => (
                <div className="flex justify-end pr-2">
                    <button
                        className="p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors duration-200"
                        title="View Details"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(s);
                        }}>
                        <EyeIcon className="w-5 h-5 stroke-2" />
                    </button>
                </div>
            ),
        },
    ];



    return (
        <div className="h-full flex flex-col">
            <DataTable
                columns={columns}
                data={sales ?? []}
                isLoading={loading}
                rowHover
                pageSizeOptions={[25, 50, 100]}
                noDataTitle="No sales found"
                noDataIcon="🧾"
            />

            {/* Use your reusable Modal */}
            <Modal
                isOpen={!!selectedSale}
                title="Sale Details"
                onClose={() => setSelectedSale(null)}
                size="lg">
                {selectedSale && (() => {
                    const itemDiscounts = selectedSale.SaleItems?.reduce((sum, i) => sum + (i.DiscountAmount ?? 0), 0) ?? 0;
                    const totalDiscount = itemDiscounts + (selectedSale.DiscountAmount ?? 0);
                    return (
                        <div className="space-y-4 text-sm">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
                                <div><span className="text-gray-500">Sale #</span> <span className="font-semibold">{selectedSale.Id}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentMethodColor(selectedSale.Status)}`}>{selectedSale.Status}</span></div>
                                <div><span className="text-gray-500">Customer:</span> <span className="font-medium ml-1">{selectedSale.CustomerName ?? "Walk-in"}</span></div>
                                <div><span className="text-gray-500">Phone:</span> <span className="ml-1">{selectedSale.CustomerNumber ?? "—"}</span></div>
                                <div className="col-span-2"><span className="text-gray-500">Date:</span> <span className="ml-1">{selectedSale.SaleDate ? format(new Date(selectedSale.SaleDate), "MMM dd, yyyy hh:mm a") : "—"}</span></div>
                            </div>

                            {/* Items Breakdown */}
                            {selectedSale.SaleItems?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Items Sold</h4>
                                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-3 py-2">Item</th>
                                                <th className="text-center px-2 py-2">Qty</th>
                                                <th className="text-right px-2 py-2">Unit Price</th>
                                                <th className="text-right px-2 py-2">Sold At</th>
                                                <th className="text-right px-3 py-2">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSale.SaleItems.map((item) => {
                                                const hasDiscount = (item.DiscountAmount ?? 0) > 0;
                                                const discountPerUnit = hasDiscount ? (item.DiscountAmount ?? 0) / item.Quantity : 0;
                                                const soldAt = (item.UnitPrice ?? 0) - discountPerUnit;
                                                return (
                                                    <tr key={item.Id} className="border-t border-gray-100">
                                                        <td className="px-3 py-2">{item.ProductVariantName || `#${item.ProductVariantId}`}</td>
                                                        <td className="text-center px-2 py-2">{item.Quantity}</td>
                                                        <td className="text-right px-2 py-2">
                                                            <span style={hasDiscount ? { textDecoration: "line-through", color: "#9ca3af" } : {}}>
                                                                Rs {(item.UnitPrice ?? 0).toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="text-right px-2 py-2" style={{ color: hasDiscount ? "#16a34a" : undefined, fontWeight: hasDiscount ? 600 : undefined }}>
                                                            Rs {soldAt.toFixed(2)}
                                                        </td>
                                                        <td className="text-right px-3 py-2 font-medium">Rs {(item.TotalPrice ?? 0).toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Totals Summary */}
                            <div className="border-t pt-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Gross Amount</span>
                                    <span>Rs {(selectedSale.SaleItems?.reduce((sum, i) => sum + (i.UnitPrice ?? 0) * i.Quantity, 0) ?? 0).toFixed(2)}</span>
                                </div>
                                {totalDiscount > 0 && <div className="flex justify-between"><span className="text-gray-500">Total Discount</span><span className="text-green-600 font-medium">-Rs {totalDiscount.toFixed(2)}</span></div>}
                                {/* <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>Rs {(selectedSale.TaxAmount ?? 0).toFixed(2)}</span></div> */}
                                <div className="flex justify-between text-base font-bold border-t pt-2 mt-1"><span>Final Amount</span><span>Rs {(selectedSale.FinalAmount ?? 0).toFixed(2)}</span></div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
