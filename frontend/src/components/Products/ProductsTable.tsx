import { useState } from "react";
import { CubeIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import DataTable, { Column } from "../POS/DataTable";
import { Product, Variant } from "@/store/slices/productsSlice";
import AdjustStockModal from "./AdjustStockModal";

export default function ProductsTable({
    products = [],
    onEdit,
    onView,
    onDelete,
    isLoading = false,
}: {
    products?: Product[] | null;
    onEdit: (product: Product) => void;
    onView: (product: Product) => void;
    onDelete: (product: Product) => void;
    isLoading?: boolean;
}) {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [adjustStockVariant, setAdjustStockVariant] = useState<Variant | null>(null);

    const openDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setSelectedProduct(null);
        setDeleteModalOpen(false);
    };

    const confirmDelete = () => {
        if (selectedProduct) onDelete(selectedProduct);
        closeDeleteModal();
    };

    const columns: Column<Product>[] = [
        {
            header: "Product",
            render: (p) => {
                const firstImage = p.ProductImages?.[0];
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden border border-indigo-100/50">
                            {firstImage ? (
                                <img
                                    src={firstImage}
                                    alt={p.ProductName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center text-indigo-600">
                                    <CubeIcon className="w-5 h-5 stroke-[1.5]" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 leading-tight">
                                {p.ProductName}
                            </span>
                            <span className="text-xs text-gray-400">
                                #{p.ProductCode}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            header: "Category",
            render: (p) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                    {p.Category || "Uncategorized"}
                </span>
            ),
        },
        {
            header: "Price Range",
            render: (p) => {
                const prices = p.Variants?.map(v => v.Price) ?? [];
                if (prices.length === 0) return <span className="text-gray-400">—</span>;
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                return (
                    <span className="text-sm font-semibold text-gray-900">
                        {min === max ? `Rs ${min.toFixed(0)}` : `Rs ${min.toFixed(0)} – ${max.toFixed(0)}`}
                    </span>
                );
            },
        },
        {
            header: "Stock",
            render: (p) => {
                const totalStock = p.Variants?.reduce((sum, v) => sum + (v.Stock ?? 0), 0) ?? 0;
                const isLow = totalStock > 0 && totalStock <= 10;
                const isOut = totalStock === 0;
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${isOut ? "bg-red-50 text-red-700 border border-red-100" :
                        isLow ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                        {totalStock} units
                    </span>
                );
            },
        },
        {
            header: "Variants",
            render: (p) => {
                const count = p.Variants?.length ?? 0;
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${count > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                        {count} {count === 1 ? "Variant" : "Variants"}
                    </span>
                );
            },
        },
    ];

    const actions = (p: Product) => (
        <div className="flex items-center justify-end gap-1">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onView(p);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
                View
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(p);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
                Edit
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal(p);
                }}
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
                    data={products ?? []}
                    isLoading={isLoading}
                    actions={actions}
                    rowHover
                    renderExpanded={(product) => (
                        <div className="mx-2 my-1">
                            {product.Variants && product.Variants.length > 0 ? (
                                <table className="w-full text-xs text-left">
                                    <thead className="text-gray-500 font-semibold uppercase tracking-wider bg-gray-50/60">
                                        <tr>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">Variant</th>
                                            <th className="px-3 py-2 text-right">Price</th>
                                            <th className="px-3 py-2 text-right">Stock</th>
                                            <th className="px-3 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {product.Variants.map((v, idx) => (
                                            <tr key={v.Id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-3 py-2 text-gray-400 font-medium">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-gray-900">{v.VariantName || `Variant #${v.Id}`}</span>
                                                        {v.Attributes && v.Attributes.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {v.Attributes.map((a) => (
                                                                    <span
                                                                        key={a.Id}
                                                                        className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded text-slate-600 bg-slate-100 border border-slate-200/60">
                                                                        {a.AttributeName}: {a.AttributeValue}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                                                    Rs {Number(v.Price).toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${v.Stock > 0
                                                        ? "bg-emerald-50/80 text-emerald-700 border-emerald-100"
                                                        : "bg-red-50/80 text-red-700 border-red-100"
                                                        }`}>
                                                        {v.Stock > 0 ? `${v.Stock}` : "0"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAdjustStockVariant(v);
                                                        }}
                                                        title="Adjust Stock"
                                                        className="p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800 rounded-lg transition-colors">
                                                        <AdjustmentsHorizontalIcon className="w-4 h-4 stroke-2" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex items-center justify-center py-4 text-gray-400 text-xs bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                    No variants configured.
                                </div>
                            )}
                        </div>
                    )}
                />
            </div>

            {deleteModalOpen && selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-[380px] max-w-[calc(100vw-2rem)] animate-fadeIn">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Delete Product
                        </h2>

                        <p className="text-gray-600 text-sm mb-6 mt-3">
                            Are you sure you want to delete <span className="font-bold text-gray-900">"{selectedProduct.ProductName}"</span>?
                            <br />
                            <br />
                            <span className="font-semibold text-red-600">
                                This action cannot be undone.
                            </span>
                        </p>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeDeleteModal}
                                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100">
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {adjustStockVariant && (
                <AdjustStockModal
                    isOpen={true}
                    onClose={() => setAdjustStockVariant(null)}
                    variantId={adjustStockVariant.Id}
                    variantName={adjustStockVariant.VariantName || `Variant #${adjustStockVariant.Id}`}
                    currentStock={adjustStockVariant.Stock ?? 0}
                />
            )}
        </>
    );
}
