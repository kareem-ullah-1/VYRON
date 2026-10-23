"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { adjustProductStock } from "@/store/slices/productsSlice";
import { XMarkIcon, AdjustmentsHorizontalIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    variantId: number;
    variantName: string;
    currentStock: number;
}

export default function AdjustStockModal({
    isOpen,
    onClose,
    variantId,
    variantName,
    currentStock,
}: AdjustStockModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const [adjustmentType, setAdjustmentType] = useState<"Add" | "Remove" | "Set">("Add");
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState("");
    const [adjustedAt, setAdjustedAt] = useState(() => new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const previewStock = () => {
        switch (adjustmentType) {
            case "Add": return currentStock + quantity;
            case "Remove": return Math.max(0, currentStock - quantity);
            case "Set": return quantity;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity < 0) return;
        setLoading(true);
        try {
            const result = await dispatch(
                adjustProductStock({
                    variantId,
                    adjustmentType,
                    quantity,
                    reason,
                    adjustedAt,
                })
            ).unwrap();
            toast.success(`Stock updated to ${result.newStock} units`);
            onClose();
        } catch (err: any) {
            toast.error(err || "Failed to adjust stock");
        } finally {
            setLoading(false);
        }
    };

    const preview = previewStock();
    const previewDecreased = preview < currentStock;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-xl p-2">
                            <AdjustmentsHorizontalIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Adjust Stock</h2>
                            <p className="text-indigo-200 text-xs truncate max-w-[200px]">{variantName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition"
                        disabled={loading}>
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Current Stock Info */}
                <div className="px-6 pt-5">
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <span className="text-sm text-gray-500 font-medium">Current Stock</span>
                        <span className="text-xl font-bold text-gray-900">{currentStock} units</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
                    {/* Adjustment Type */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Adjustment Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["Add", "Remove", "Set"] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setAdjustmentType(type)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${adjustmentType === type
                                            ? type === "Remove"
                                                ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200"
                                                : type === "Set"
                                                    ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200"
                                                    : "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                        }`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            {adjustmentType === "Set" ? "Set to Quantity" : "Quantity"}
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            required
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Reason <span className="text-gray-400 normal-case font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Supplier delivery, Damaged goods..."
                            className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Date of Adjustment
                        </label>
                        <input
                            type="date"
                            value={adjustedAt}
                            onChange={(e) => setAdjustedAt(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                        />
                    </div>

                    {/* Preview */}
                    <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${previewDecreased ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"
                        }`}>
                        <div className="flex items-center gap-2">
                            {previewDecreased
                                ? <ExclamationTriangleIcon className="w-4 h-4 text-rose-600" />
                                : <CheckCircleIcon className="w-4 h-4 text-emerald-600" />}
                            <span className={`text-sm font-medium ${previewDecreased ? "text-rose-700" : "text-emerald-700"}`}>
                                New Stock After Adjustment
                            </span>
                        </div>
                        <span className={`text-xl font-bold ${previewDecreased ? "text-rose-700" : "text-emerald-700"}`}>
                            {preview} units
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-70">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-70">
                            {loading ? "Saving..." : "Confirm Adjustment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
