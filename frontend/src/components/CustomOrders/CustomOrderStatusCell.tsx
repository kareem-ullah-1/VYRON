"use client";

import { useState } from "react";
import { CheckCircleIcon, XMarkIcon, BanknotesIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { updateCustomOrderStatus, addCustomOrderPayment } from "@/Apis/CustomOrder";
import FilterSelect from "../POS/FilterSelect";

/**
 * Clickable status badge for a custom order. On Pending / Delivered it advances the order
 * one step along the lifecycle (Pending → Delivered → Complete), popping the modal that
 * collects what the step needs (a Delivered order with no balance left just confirms).
 * Complete renders as plain text.
 *
 * The deliver/collect modal here mirrors the one in CustomOrderDetail.tsx; that page keeps
 * its own copy for now — this component covers the list and customer-view surfaces.
 */

export interface StatusCellOrder {
    Id: number;
    OrderNumber: string;
    Status: string;
    RemainingBalance: number;
}

type AdvanceMode = "deliver" | "collect" | "complete";

const CHIP_COLORS: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Delivered: "bg-emerald-100 text-emerald-800",
    Complete: "bg-blue-100 text-blue-800",
};

const SIZES = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-0.5",
};

interface Props {
    order: StatusCellOrder;
    onAdvanced?: () => void;
    size?: keyof typeof SIZES;
}

export default function CustomOrderStatusCell({ order, onAdvanced, size = "sm" }: Props) {
    const [mode, setMode] = useState<AdvanceMode | null>(null);
    const [amountInput, setAmountInput] = useState("");
    const [method, setMethod] = useState("Cash");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const nextMode: AdvanceMode | null =
        order.Status === "Pending" ? "deliver"
            : order.Status === "Delivered" && order.RemainingBalance > 0 ? "collect"
                : order.Status === "Delivered" ? "complete"
                    : null;

    const chipClass = `inline-flex items-center gap-0.5 rounded-full font-semibold uppercase tracking-wide ${SIZES[size]} ${CHIP_COLORS[order.Status] || "bg-gray-100 text-gray-800"}`;

    const openModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!nextMode) return;
        setAmountInput(order.RemainingBalance > 0 ? String(order.RemainingBalance) : "0");
        setMethod("Cash");
        setNote("");
        setError("");
        setMode(nextMode);
    };

    const close = () => { setMode(null); setError(""); };

    const handleSubmit = async () => {
        const amount = Number(amountInput);
        if (mode !== "complete") {
            if (isNaN(amount) || amount < 0) { setError("Enter a valid amount."); return; }
            if (amount > order.RemainingBalance) { setError("Amount cannot exceed the remaining balance."); return; }
            if (mode === "collect" && amount <= 0) { setError("Enter an amount greater than zero."); return; }
        }

        setLoading(true);
        setError("");
        try {
            if (mode !== "complete" && amount > 0) {
                const payRes = await addCustomOrderPayment(order.Id, { Amount: amount, PaymentMethod: method, Note: note || undefined });
                if (!payRes.isSuccess) { setError(payRes.message || "Failed to record payment"); setLoading(false); return; }
            }
            if (mode === "deliver" || mode === "complete") {
                const targetStatus = mode === "deliver" ? "Delivered" : "Complete";
                const statusRes = await updateCustomOrderStatus(order.Id, { Status: targetStatus, Note: note || undefined });
                if (!statusRes.isSuccess) {
                    setError(statusRes.message || (mode === "deliver" ? "Failed to mark order as delivered" : "Failed to complete order"));
                    setLoading(false);
                    return;
                }
            }
            close();
            onAdvanced?.();
        } catch {
            setError(mode === "deliver" ? "Failed to mark order as delivered" : mode === "complete" ? "Failed to complete order" : "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    if (!nextMode) {
        return <span className={chipClass}>{order.Status}</span>;
    }

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                title={nextMode === "deliver" ? "Click to mark as delivered" : nextMode === "complete" ? "Click to mark complete" : "Click to collect payment"}
                className={`${chipClass} group cursor-pointer transition hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300`}
            >
                {order.Status}
                <ChevronRightIcon className="w-3 h-3 -mr-0.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>

            {mode && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                        {mode === "deliver" ? "Mark as Delivered" : "Complete Order"}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{order.OrderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={close}
                                className="p-1.5 -m-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3" role="alert">{error}</div>
                            )}

                            {mode === "complete" ? (
                                <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-medium text-emerald-700">
                                    This order is fully paid. Marking it complete will close it.
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label htmlFor="status-cell-amount" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount to Collect</label>
                                        {order.RemainingBalance > 0 ? (
                                            <>
                                                <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50/60 border border-indigo-100 rounded-xl focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                    <span className="text-sm font-medium text-indigo-400">Rs</span>
                                                    <input
                                                        id="status-cell-amount"
                                                        type="number"
                                                        min={0}
                                                        max={order.RemainingBalance}
                                                        step="any"
                                                        value={amountInput}
                                                        onChange={(e) => setAmountInput(e.target.value)}
                                                        className="flex-1 min-w-0 bg-transparent text-xl font-bold text-indigo-700 tabular-nums outline-none"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    Remaining balance: Rs {order.RemainingBalance.toLocaleString()}
                                                    {mode === "deliver" && " — leave as 0 to deliver on credit."}
                                                </p>
                                            </>
                                        ) : (
                                            <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-semibold text-emerald-700">
                                                Fully paid — no balance due
                                            </div>
                                        )}
                                    </div>

                                    {order.RemainingBalance > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</label>
                                            <FilterSelect
                                                value={method}
                                                onChange={setMethod}
                                                icon={<BanknotesIcon className="w-4 h-4" />}
                                                options={[
                                                    { value: "Cash", label: "Cash" },
                                                    { value: "Card", label: "Card" },
                                                    { value: "Bank Transfer", label: "Bank Transfer" },
                                                ]}
                                                className="!w-full"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="status-cell-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Note <span className="font-normal normal-case text-gray-400">(optional)</span>
                                </label>
                                <input
                                    id="status-cell-note"
                                    type="text"
                                    placeholder="Add a note..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={close}
                                className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {loading ? "Processing..." : mode === "deliver" ? "Mark as Delivered" : mode === "complete" ? "Mark Complete" : "Record Payment"}
                            </button>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={close} />
                </div>
            )}
        </>
    );
}
