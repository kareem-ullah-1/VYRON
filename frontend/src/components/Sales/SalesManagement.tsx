"use client";

import { useState, useEffect, useMemo } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchSales, deleteSale, Sale } from "@/store/slices/salesSlice";
import { format } from "date-fns";
import { toast } from "sonner";
import Modal from "../POS/Modal";
import DataTable, { Column } from "../POS/DataTable";
import FilterSelect from "../POS/FilterSelect";
import ReceiptModal from "../POS/ReceiptModal";
import { PrinterIcon, TrashIcon } from "@heroicons/react/24/outline";

const STATUS_COLORS: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    failed: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function SalesManagement() {
    const dispatch = useDispatch<AppDispatch>();
    const { sales, loadingSales } = useSelector((state: RootState) => state.sales);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [printSale, setPrintSale] = useState<Sale | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

    const filteredSales = useMemo(() => {
        let result = sales;

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((s) => new Date(s.SaleDate) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((s) => new Date(s.SaleDate) <= end);
        }

        if (statusFilter !== "All") {
            result = result.filter(s => s.Status?.toLowerCase() === statusFilter.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(s =>
                s.Id.toString().includes(q) ||
                s.OrderNumber?.toLowerCase().includes(q) ||
                s.CustomerName?.toLowerCase().includes(q) ||
                s.CustomerNumber?.toLowerCase().includes(q) ||
                s.SaleItems?.some(i => i.ProductVariantName?.toLowerCase().includes(q))
            );
        }

        return result;
    }, [sales, startDate, endDate, statusFilter, searchQuery]);

    useEffect(() => {
        dispatch(fetchSales());
    }, [dispatch]);

    const hasFilters = !!(startDate || endDate || searchQuery || statusFilter !== "All");

    const columns: Column<Sale>[] = [
        {
            header: "Sale #",
            render: (sale) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-indigo-700">
                        {sale.Source === "CustomOrder" ? sale.OrderNumber ?? `#${sale.Id}` : `#${sale.Id}`}
                    </span>
                    {sale.Source === "CustomOrder" && (
                        <span className="w-fit text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
                            Custom Order
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Customer",
            render: (sale) => (
                <div>
                    <div className="font-medium text-gray-900">{sale.CustomerName ?? "Walk-in"}</div>
                    {sale.CustomerNumber && (
                        <div className="text-xs text-gray-400">{sale.CustomerNumber}</div>
                    )}
                </div>
            ),
        },
        {
            header: "Items",
            render: (sale) => {
                const items = sale.SaleItems ?? [];
                const shown = items.slice(0, 2);
                const overflow = items.length - shown.length;
                return (
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                        {shown.map((item) => (
                            <span key={item.Id} className="text-xs text-gray-700 truncate">
                                <span className="font-medium text-gray-500 mr-1">×{item.Quantity}</span>
                                {item.ProductVariantName || `#${item.ProductVariantId}`}
                            </span>
                        ))}
                        {overflow > 0 && (
                            <span className="text-xs text-indigo-500 font-medium">+{overflow} more</span>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Gross",
            className: "text-right",
            render: (sale) => {
                const gross = sale.SaleItems?.reduce((sum, i) => sum + (i.UnitPrice ?? 0) * i.Quantity, 0) ?? 0;
                return <span className="font-semibold text-gray-700">Rs {gross.toFixed(2)}</span>;
            },
        },
        {
            header: "Discount",
            className: "text-right",
            render: (sale) => {
                const itemDiscounts = sale.SaleItems?.reduce((sum, i) => sum + (i.DiscountAmount ?? 0), 0) ?? 0;
                const totalDiscount = itemDiscounts + (sale.DiscountAmount ?? 0);
                return totalDiscount > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                        -Rs {totalDiscount.toFixed(2)}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                );
            },
        },
        {
            header: "Final",
            className: "text-right",
            render: (sale) => (
                <span className="font-bold text-gray-900">Rs {(sale.FinalAmount ?? 0).toFixed(2)}</span>
            ),
        },
        {
            header: "Status",
            render: (sale) => {
                const statusColor = STATUS_COLORS[sale.Status?.toLowerCase() ?? ""] || "bg-slate-50 text-slate-700 border-slate-200";
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                        {sale.Status ?? "N/A"}
                    </span>
                );
            },
        },
        {
            header: "Date",
            render: (sale) => (
                <span className="text-xs text-gray-500">
                    {sale.SaleDate ? format(new Date(sale.SaleDate), "MMM dd, yyyy hh:mm a") : "—"}
                </span>
            ),
        },
    ];

    const actions = (sale: Sale) => {
        // Custom Orders are shown read-only here: they aren't Sale rows (no SaleItem→ProductVariant
        // link to print a POS receipt from, and DeleteSale/:id would hit the wrong table/row), so the
        // actual delete/edit flow for them stays on the Custom Orders page.
        const isCustomOrder = sale.Source === "CustomOrder";
        return (
            <div className="flex items-center justify-end gap-1.5">
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedSale(sale); }}
                    className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                    View
                </button>
                {!isCustomOrder && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setPrintSale(sale); }}
                        className="p-1.5 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Print Invoice"
                    >
                        <PrinterIcon className="w-4 h-4" />
                    </button>
                )}
                {!isCustomOrder && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setSaleToDelete(sale); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Sale"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales History</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage all your past transactions.</p>
                </div>
            </div>

            {/* Filters & Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-[26rem] md:min-h-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-gray-50/30">
                    <div className="flex flex-1 w-full gap-3 flex-col sm:flex-row items-center">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search ID, customer, item..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                            />
                        </div>
                        <FilterSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "All", label: "All Statuses" },
                                { value: "Completed", label: "Completed", dot: "bg-emerald-500" },
                                { value: "Pending", label: "Pending", dot: "bg-amber-500" },
                                { value: "Failed", label: "Failed", dot: "bg-rose-500" },
                            ]}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                            <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-gray-500 px-2 whitespace-nowrap">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                max={endDate}
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    setStartDate(newStart);
                                    if (endDate && newStart > endDate) setEndDate("");
                                }}
                                className="bg-transparent text-gray-800 text-sm py-1.5 outline-none w-full sm:w-[130px] cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                            <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-gray-500 px-2 whitespace-nowrap">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-gray-800 text-sm py-1.5 outline-none w-full sm:w-[130px] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Results count indicator */}
                {hasFilters && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>Showing {filteredSales.length} sale{filteredSales.length !== 1 ? "s" : ""}</span>
                        <button
                            onClick={() => { setSearchQuery(""); setStatusFilter("All"); setStartDate(""); setEndDate(""); }}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filteredSales}
                    actions={actions}
                    onRowClick={(sale) => setSelectedSale(sale)}
                    isLoading={loadingSales}
                    noDataTitle="No sales found"
                    pageSizeOptions={[25, 50, 100]}
                />
            </div>

            {/* Delete Confirmation Modal */}
            {saleToDelete && (
                <Modal isOpen onClose={() => setSaleToDelete(null)} title="Delete Sale">
                    <div className="p-2 space-y-4">
                        <p className="text-sm text-gray-600">
                            Delete <span className="font-semibold">Sale #{saleToDelete.Id}</span>? Stock for all items will be restored. This cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setSaleToDelete(null)}
                                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await dispatch(deleteSale(saleToDelete.Id)).unwrap();
                                        toast.success("Sale deleted successfully");
                                    } catch (err: any) {
                                        toast.error(err || "Failed to delete sale");
                                    } finally {
                                        setSaleToDelete(null);
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Print Invoice Modal */}
            {printSale && (
                <ReceiptModal
                    sale={printSale}
                    onClose={() => setPrintSale(null)}
                />
            )}

            {/* View Sale Modal */}
            <Modal
                isOpen={!!selectedSale}
                title="Sale Details"
                onClose={() => setSelectedSale(null)}
                size="lg"
            >
                {selectedSale && (() => {
                    const itemDiscounts = selectedSale.SaleItems?.reduce((sum, i) => sum + (i.DiscountAmount ?? 0), 0) ?? 0;
                    const totalDiscount = itemDiscounts + (selectedSale.DiscountAmount ?? 0);
                    const statusColor = STATUS_COLORS[selectedSale.Status?.toLowerCase() ?? ""] || "bg-slate-50 text-slate-700 border-slate-200";
                    return (
                        <div className="space-y-4 text-sm">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
                                <div><span className="text-gray-500">Sale #</span> <span className="font-semibold">{selectedSale.Id}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor}`}>{selectedSale.Status}</span></div>
                                <div><span className="text-gray-500">Customer:</span> <span className="font-medium ml-1">{selectedSale.CustomerName ?? "Walk-in"}</span></div>
                                <div><span className="text-gray-500">Phone:</span> <span className="ml-1">{selectedSale.CustomerNumber ?? "—"}</span></div>
                                <div className="col-span-2"><span className="text-gray-500">Date:</span> <span className="ml-1">{selectedSale.SaleDate ? format(new Date(selectedSale.SaleDate), "MMM dd, yyyy hh:mm a") : "—"}</span></div>
                            </div>

                            {/* Items Breakdown */}
                            {selectedSale.SaleItems?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Items Sold</h4>
                                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                        <thead className="bg-gray-100">
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
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Discount</span>
                                        <span className="text-green-600 font-medium">-Rs {totalDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                {/* <div className="flex justify-between">
                                    <span className="text-gray-500">Tax</span>
                                    <span>Rs {(selectedSale.TaxAmount ?? 0).toFixed(2)}</span>
                                </div> */}
                                <div className="flex justify-between text-base font-bold border-t pt-2 mt-1">
                                    <span>Final Amount</span>
                                    <span>Rs {(selectedSale.FinalAmount ?? 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div >
    );
}
