"use client";

import { useEffect, useState } from "react";
import { 
    ArrowLeftIcon, 
    CubeIcon, 
    PencilIcon, 
    TagIcon, 
    BanknotesIcon, 
    ClipboardDocumentListIcon, 
    ArrowUpIcon, 
    ArrowDownIcon, 
    InformationCircleIcon,
    PhotoIcon,
    ChatBubbleLeftRightIcon,
    AdjustmentsHorizontalIcon
} from "@heroicons/react/24/outline";
import { Product, StockAdjustmentLog } from "@/store/slices/productsSlice";
import api from "@/lib/axios";

interface ProductDetailProps {
    product: Product;
    onBack: () => void;
    onEdit: (product: Product) => void;
}

export default function ProductDetail({ product, onBack, onEdit }: ProductDetailProps) {
    const totalStock = product.Variants?.reduce((sum, v) => sum + (v.Stock ?? 0), 0) ?? 0;
    const prices = product.Variants?.map(v => v.Price) ?? [];
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const variantCount = product.Variants?.length ?? 0;

    const [stockHistory, setStockHistory] = useState<Record<number, StockAdjustmentLog[]>>({});
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (!product.Variants?.length) return;
        setHistoryLoading(true);
        Promise.all(
            product.Variants.map(v =>
                api.get(`/Product/StockHistory/${v.Id}`)
                   .then(r => ({ variantId: v.Id, logs: (r.data.data ?? []) as StockAdjustmentLog[] }))
                   .catch(() => ({ variantId: v.Id, logs: [] as StockAdjustmentLog[] }))
            )
        ).then(results => {
            const map: Record<number, StockAdjustmentLog[]> = {};
            for (const r of results) map[r.variantId] = r.logs;
            setStockHistory(map);
        }).finally(() => setHistoryLoading(false));
    }, [product.Id]);

    return (
        <div className="h-full overflow-hidden flex flex-col bg-gray-50">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{product.ProductName}</h1>
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50 uppercase tracking-widest">
                                #{product.ProductCode}
                            </span>
                        </div>
                        {product.RomanUrduName && (
                            <p className="text-sm font-medium text-gray-500 mt-0.5 italic flex items-center gap-1.5">
                                <span className="text-gray-300">|</span> {product.RomanUrduName}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onEdit(product)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-95"
                >
                    <PencilIcon className="w-4 h-4 stroke-2" /> Edit Product
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Images + Description */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Product Images */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 space-y-6">
                                {/* Product Images Section */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <PhotoIcon className="w-4 h-4 text-indigo-500" />
                                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Product Images</h2>
                                    </div>
                                    {product.ProductImages && product.ProductImages.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {product.ProductImages.map((src, idx) => (
                                                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:ring-2 hover:ring-indigo-500/20 transition-all cursor-zoom-in">
                                                    <img
                                                        src={src}
                                                        alt={`${product.ProductName} ${idx + 1}`}
                                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                                            <PhotoIcon className="w-8 h-8 mb-2 text-gray-300" />
                                            <span className="text-xs font-medium italic">No images uploaded for this product</span>
                                        </div>
                                    )}
                                </div>

                                {/* Divider if Description exists */}
                                {product.Description && <div className="h-px bg-gray-100" />}

                                {/* Description Section */}
                                {product.Description && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-indigo-500" />
                                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Description</h2>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap pl-6 italic">
                                            {product.Description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Variants Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardDocumentListIcon className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    Product Variants ({variantCount})
                                </h2>
                            </div>
                            {product.Variants && product.Variants.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 font-semibold uppercase tracking-wider bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">Variant</th>
                                                <th className="px-4 py-3">Attributes</th>
                                                <th className="px-4 py-3 text-right">Price</th>
                                                <th className="px-4 py-3 text-right">Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {product.Variants.map((v, idx) => (
                                                <tr key={v.Id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-400 font-medium">
                                                        {String(idx + 1).padStart(2, '0')}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                                        {v.VariantName || `Variant #${v.Id}`}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {v.Attributes && v.Attributes.length > 0 ? (
                                                                            v.Attributes.map((a) => (
                                                                                <div
                                                                                    key={a.Id}
                                                                                    className="inline-flex items-center overflow-hidden rounded-md border border-indigo-100 shadow-sm"
                                                                                >
                                                                                    <span className="bg-indigo-600 text-[10px] font-bold text-white px-2 py-0.5 uppercase tracking-tighter">
                                                                                        {a.AttributeName}
                                                                                    </span>
                                                                                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5">
                                                                                        {a.AttributeValue}
                                                                                    </span>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs italic">Default</span>
                                                                        )}
                                                                    </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                                        Rs {Number(v.Price).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <div className="flex justify-end">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border shadow-sm ${v.Stock <= 0
                                                                    ? "bg-red-50 text-red-700 border-red-100"
                                                                    : v.Stock <= 10
                                                                        ? "bg-amber-50 text-amber-700 border-amber-100"
                                                                        : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                }`}>
                                                                {v.Stock.toLocaleString()} units
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8 text-gray-400 text-sm bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                    No variants configured.
                                </div>
                            )}
                        </div>
                        {/* Stock History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <AdjustmentsHorizontalIcon className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Stock Adjustment History</h2>
                            </div>
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                                    Loading history...
                                </div>
                            ) : product.Variants && product.Variants.length > 0 ? (
                                <div className="space-y-4">
                                    {product.Variants.map(v => {
                                        const logs = stockHistory[v.Id] ?? [];
                                        return (
                                            <div key={v.Id}>
                                                <p className="text-xs font-semibold text-gray-500 mb-2 truncate">
                                                    {v.VariantName || `Variant #${v.Id}`}
                                                </p>
                                                {logs.length === 0 ? (
                                                    <div className="text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 py-3 px-4">
                                                        No adjustments recorded.
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="text-gray-500 font-semibold uppercase tracking-wider bg-gray-50">
                                                                <tr>
                                                                    <th className="px-3 py-2">Date</th>
                                                                    <th className="px-3 py-2">Type</th>
                                                                    <th className="px-3 py-2 text-right">Qty</th>
                                                                    <th className="px-3 py-2 text-right">Before</th>
                                                                    <th className="px-3 py-2 text-right">After</th>
                                                                    <th className="px-3 py-2">Reason</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {logs.map(log => (
                                                                    <tr key={log.Id} className="hover:bg-gray-50/50 transition-colors">
                                                                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                                                                            {new Date(log.AdjustedAt).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                                                                    log.AdjustmentType === "Add"
                                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                                        : log.AdjustmentType === "Remove"
                                                                                            ? "bg-red-50 text-red-700 border-red-100"
                                                                                            : "bg-amber-50 text-amber-700 border-amber-100"
                                                                                }`}>
                                                                                    {log.AdjustmentType === "Add" && <ArrowUpIcon className="w-2.5 h-2.5 stroke-[3]" />}
                                                                                    {log.AdjustmentType === "Remove" && <ArrowDownIcon className="w-2.5 h-2.5 stroke-[3]" />}
                                                                                    {log.AdjustmentType}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                            {log.Quantity}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right text-gray-500">
                                                                            {log.PreviousStock}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                                                            {log.NewStock}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate" title={log.Reason ?? ""}>
                                                                            {log.Reason || "—"}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8 text-gray-400 text-sm bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                    No variants to show history for.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Product Info Cards */}
                    <div className="space-y-6">
                        {/* Consolidated Product & Inventory Info */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <InformationCircleIcon className="w-4 h-4 text-indigo-500" />
                                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Inventory & Details</h2>
                                </div>
                            </div>
                            
                            <div className="p-5 space-y-6">
                                {/* Core Identifiers */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</span>
                                        <span className="text-sm font-bold text-gray-900 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100/50">
                                            {product.Category || "Uncategorized"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Barcode</span>
                                        <span className="text-sm font-bold text-gray-900 font-mono tracking-tight bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                            {product.ProductBarCode || "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Variants</span>
                                        <span className="text-sm font-bold text-gray-900">{variantCount}</span>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100" />

                                {/* Pricing Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BanknotesIcon className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing Strategy</span>
                                    </div>
                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Price Range</p>
                                        <p className="text-xl font-black text-indigo-900">
                                            {prices.length > 0
                                                ? minPrice === maxPrice
                                                    ? `Rs ${minPrice.toLocaleString()}`
                                                    : `Rs ${minPrice.toLocaleString()} – ${maxPrice.toLocaleString()}`
                                                : "N/A"
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100" />

                                {/* Stock Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CubeIcon className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Inventory</span>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${
                                        totalStock <= 0 ? "bg-red-50 border-red-100" :
                                        totalStock <= 10 ? "bg-amber-50 border-amber-100" :
                                        "bg-emerald-50 border-emerald-100"
                                    }`}>
                                        <p className={`text-[10px] font-bold uppercase mb-1 ${
                                            totalStock <= 0 ? "text-red-500" :
                                            totalStock <= 10 ? "text-amber-500" :
                                            "text-emerald-500"
                                        }`}>Total Available Stock</p>
                                        <p className={`text-2xl font-black ${
                                            totalStock <= 0 ? "text-red-900" :
                                            totalStock <= 10 ? "text-amber-900" :
                                            "text-emerald-900"
                                        }`}>
                                            {totalStock.toLocaleString()} <span className="text-sm font-bold opacity-60">units</span>
                                        </p>
                                    </div>

                                    {/* Small breakdown of variants stock */}
                                    {product.Variants && product.Variants.length > 0 && (
                                        <div className="mt-4 space-y-2 px-1">
                                            {product.Variants.map((v) => (
                                                <div key={v.Id} className="flex items-center justify-between text-[11px] group">
                                                    <span className="text-gray-500 group-hover:text-gray-700 transition-colors">
                                                        {v.VariantName || `Variant #${v.Id}`}
                                                    </span>
                                                    <span className={`font-bold tabular-nums ${
                                                        v.Stock <= 0 ? "text-red-600" :
                                                        v.Stock <= 10 ? "text-amber-600" :
                                                        "text-gray-900"
                                                    }`}>
                                                        {v.Stock}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-gray-100" />

                                {/* Timestamps */}
                                <div className="space-y-2 px-1">
                                    {product.CreatedAt && (
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-400 uppercase font-bold tracking-tight">System Created</span>
                                            <span className="text-gray-600 font-semibold">{new Date(product.CreatedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                    )}
                                    {product.UpdatedAt && (
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-400 uppercase font-bold tracking-tight">Last Update</span>
                                            <span className="text-gray-600 font-semibold">{new Date(product.UpdatedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
