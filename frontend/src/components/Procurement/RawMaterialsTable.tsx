"use client";

import { useState } from "react";
import DataTable, { Column } from "../POS/DataTable";
import { RawMaterial } from "@/store/slices/rawMaterialSlice";
import Modal from "../POS/Modal";

interface RawMaterialsTableProps {
    materials: RawMaterial[];
    onEdit: (material: RawMaterial) => void;
    onDelete: (material: RawMaterial) => void;
}

export default function RawMaterialsTable({ materials, onEdit, onDelete }: RawMaterialsTableProps) {
    const [viewMaterial, setViewMaterial] = useState<RawMaterial | null>(null);

    const columns: Column<RawMaterial>[] = [
        {
            header: "Material",
            render: (r) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-700">
                        <span className="text-xs font-bold">
                            {r.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 leading-tight">{r.name}</span>
                        {r.attributesJson && (
                            <span className="text-xs font-medium text-indigo-500">Has Attributes</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "Unit",
            render: (r) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                    {r.unitOfMeasure || "—"}
                </span>
            ),
        },
        {
            header: "Stock",
            render: (r) => {
                const stock = r.currentStockQuantity ?? 0;
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${stock > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                        {stock > 0 ? `${stock} In Stock` : "Out of Stock"}
                    </span>
                );
            },
        },
        {
            header: "Description",
            render: (r) => (
                <span className="text-sm text-gray-500 truncate max-w-[200px] block">{r.description || "—"}</span>
            ),
        },
    ];

    const actions = (r: RawMaterial) => (
        <div className="flex items-center justify-end gap-1">
            <button
                onClick={(e) => { e.stopPropagation(); setViewMaterial(r); }}
                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
                View
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
                Edit
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(r); }}
                className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
                Delete
            </button>
        </div>
    );

    // Parse attributes JSON for the modal
    const parseAttributes = (json?: string) => {
        if (!json) return null;
        try {
            return JSON.parse(json);
        } catch {
            return null;
        }
    };

    return (
        <>
            <div className="h-full flex flex-col">
                <DataTable
                    columns={columns}
                    data={materials ?? []}
                    actions={actions}
                    onRowClick={(r) => setViewMaterial(r)}
                    rowHover
                    pageSizeOptions={[25, 50, 100]}
                    noDataTitle="No raw materials found"
                    noDataIcon="📦"
                />
            </div>

            {/* View Raw Material Modal */}
            <Modal
                isOpen={!!viewMaterial}
                title="Raw Material Details"
                onClose={() => setViewMaterial(null)}
                size="md"
            >
                {viewMaterial && (() => {
                    const attrs = parseAttributes(viewMaterial.attributesJson);
                    const stock = viewMaterial.currentStockQuantity ?? 0;
                    return (
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-200 flex items-center justify-center text-amber-700">
                                    <span className="text-xl font-bold">
                                        {viewMaterial.name?.[0]?.toUpperCase() ?? "?"}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{viewMaterial.name}</h3>
                                    <span className="text-xs text-gray-400">Material ID: #{viewMaterial.id}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unit of Measure</span>
                                    <p className="mt-1 font-medium text-gray-900">{viewMaterial.unitOfMeasure || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Stock</span>
                                    <p className={`mt-1 font-bold ${stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                        {stock > 0 ? `${stock} ${viewMaterial.unitOfMeasure || "units"}` : "Out of Stock"}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                                    <p className="mt-1 font-medium text-gray-900">{viewMaterial.description || "—"}</p>
                                </div>
                                {viewMaterial.createdAt && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</span>
                                        <p className="mt-1 text-gray-700">{new Date(viewMaterial.createdAt).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {viewMaterial.updatedAt && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Updated</span>
                                        <p className="mt-1 text-gray-700">{new Date(viewMaterial.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>

                            {/* Attributes Section */}
                            {attrs && (
                                <div className="pt-3 border-t border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Attributes</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Array.isArray(attrs) ? (
                                            attrs.map((attr: { Name?: string; Values?: string[] }, i: number) => (
                                                <div key={i}>
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{attr.Name || `Attr ${i + 1}`}</span>
                                                    <p className="mt-1 font-medium text-gray-900">{attr.Values?.join(", ") || "—"}</p>
                                                </div>
                                            ))
                                        ) : typeof attrs === "object" && attrs !== null ? (
                                            Object.entries(attrs).map(([key, value]) => (
                                                <div key={key}>
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{key}</span>
                                                    <p className="mt-1 font-medium text-gray-900">{String(value)}</p>
                                                </div>
                                            ))
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </>
    );
}
