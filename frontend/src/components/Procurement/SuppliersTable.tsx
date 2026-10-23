"use client";

import { useEffect, useState } from "react";
import DataTable, { Column } from "../POS/DataTable";
import { Supplier } from "@/store/slices/supplierSlice";
import Modal from "../POS/Modal";
import api from "@/lib/axios";
import { ArrowPathIcon, CalendarIcon, DocumentTextIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

interface PurchaseItem {
    id: number;
    rawMaterialName: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
}

interface Purchase {
    id: number;
    purchaseDate: string;
    totalAmount: number;
    status: string;
    invoiceNumber: string | null;
    items: PurchaseItem[];
}

interface DetailedSupplier extends Supplier {
    purchases: Purchase[];
}

interface SuppliersTableProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplier: Supplier) => void;
}

export default function SuppliersTable({ suppliers, onEdit, onDelete }: SuppliersTableProps) {
    const [viewSupplierId, setViewSupplierId] = useState<number | null>(null);
    const [detailedSupplier, setDetailedSupplier] = useState<DetailedSupplier | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (viewSupplierId) {
            fetchSupplierDetails(viewSupplierId);
        } else {
            setDetailedSupplier(null);
        }
    }, [viewSupplierId]);

    const fetchSupplierDetails = async (id: number) => {
        setLoadingDetails(true);
        try {
            const response = await api.get(`/Supplier/GetSupplier/${id}`);
            if (response.data.isSuccess) {
                setDetailedSupplier(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch supplier details:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const columns: Column<Supplier>[] = [
        {
            header: "Supplier",
            render: (s) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 flex items-center justify-center flex-shrink-0 text-indigo-700">
                        <span className="text-xs font-bold">
                            {s.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 leading-tight">{s.name}</span>
                        <span className="text-xs text-gray-400">ID: #{s.id}</span>
                    </div>
                </div>
            ),
        },
        // ... (rest of simple columns unchanged)
        {
            header: "Email",
            render: (s) => (
                <span className="text-sm text-gray-600">{s.email || "—"}</span>
            ),
        },
        {
            header: "Phone",
            render: (s) => (
                <span className="text-sm text-gray-600">{s.phone || "—"}</span>
            ),
        },
        {
            header: "Address",
            render: (s) => (
                <span className="text-sm text-gray-500 truncate max-w-[200px] block">{s.address || "—"}</span>
            ),
        },
    ];

    const actions = (s: Supplier) => (
        <div className="flex items-center justify-end gap-1">
            <button
                onClick={(e) => { e.stopPropagation(); setViewSupplierId(s.id); }}
                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
                View
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
                Edit
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(s); }}
                className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
                Delete
            </button>
        </div>
    );

    return (
        <>
            <div className="h-full flex flex-col">
                <DataTable
                    columns={columns}
                    data={suppliers ?? []}
                    actions={actions}
                    onRowClick={(s) => setViewSupplierId(s.id)}
                    rowHover
                    pageSizeOptions={[25, 50, 100]}
                    noDataTitle="No suppliers found"
                    noDataIcon="🚛"
                />
            </div>

            {/* View Supplier Modal */}
            <Modal
                isOpen={!!viewSupplierId}
                title="Supplier Profile & History"
                onClose={() => setViewSupplierId(null)}
                size="xl"
            >
                <div className="flex flex-col max-h-[85vh]">
                    {loadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">Loading supplier records...</p>
                        </div>
                    ) : detailedSupplier ? (
                        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Detailed Info Card */}
                            <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-100 flex items-center justify-center text-white">
                                    <span className="text-2xl font-bold">
                                        {detailedSupplier.name?.[0]?.toUpperCase() ?? "?"}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{detailedSupplier.name}</h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">ID: #{detailedSupplier.id}</span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            Partner since {detailedSupplier.createdAt ? new Date(detailedSupplier.createdAt).toLocaleDateString() : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</span>
                                    <p className="text-sm font-semibold text-gray-900">{detailedSupplier.email || "No email provided"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</span>
                                    <p className="text-sm font-semibold text-gray-900">{detailedSupplier.phone || "No phone provided"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Address</span>
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{detailedSupplier.address || "No address recorded"}</p>
                                </div>
                            </div>

                            {/* Purchase History Section */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <ShoppingBagIcon className="w-4 h-4 text-gray-400" />
                                        Purchase History
                                        <span className="text-xs font-normal text-gray-400 ml-1">({detailedSupplier.purchases?.length || 0} orders)</span>
                                    </h4>
                                </div>

                                {!detailedSupplier.purchases || detailedSupplier.purchases.length === 0 ? (
                                    <div className="py-12 bg-white border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                                        <DocumentTextIcon className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-xs font-medium">No purchase records found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 pb-4">
                                        {detailedSupplier.purchases.map((purchase) => (
                                            <div key={purchase.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-200 transition-colors">
                                                {/* Order Header */}
                                                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 border-b border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-indigo-600">ORD-{purchase.id}</span>
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            {new Date(purchase.purchaseDate).toLocaleDateString(undefined, {
                                                                year: 'numeric', month: 'short', day: 'numeric'
                                                            })}
                                                        </span>
                                                        {purchase.invoiceNumber && (
                                                            <span className="text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 border border-gray-100 rounded">
                                                                INV: {purchase.invoiceNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-bold text-gray-900">Rs {purchase.totalAmount.toLocaleString()}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                            {purchase.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Item List */}
                                                <div className="p-3 bg-white">
                                                    <div className="space-y-1.5">
                                                        {purchase.items?.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between text-[11px]">
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <span className="w-5 h-5 flex items-center justify-center bg-gray-50 text-gray-500 rounded font-bold text-[9px] border border-gray-100">
                                                                        {item.quantity}
                                                                    </span>
                                                                    <span className="font-semibold text-gray-700">{item.rawMaterialName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-gray-400">
                                                                    <span>@{item.unitPrice.toLocaleString()}</span>
                                                                    <span className="w-20 text-right font-bold text-gray-900">Rs {item.subTotal.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-gray-500">Could not load supplier data.</div>
                    )}
                </div>
            </Modal>
        </>
    );
}
