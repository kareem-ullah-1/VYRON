"use client";

import { useState, useEffect } from "react";
import { ArrowLeftIcon, CheckCircleIcon, XMarkIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { useProgressRouter } from "@/components/Navigation";
import { AppDispatch, RootState } from "@/store/store";
import { fetchCustomOrderDetail, clearSelectedOrder } from "@/store/slices/customOrderSlice";
import { updateCustomOrderStatus, addCustomOrderPayment } from "@/Apis/CustomOrder";
import FilterSelect from "../POS/FilterSelect";

const STATUS_COLORS: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Complete: "bg-blue-100 text-blue-800 border-blue-200",
};

const TIMELINE_DOT_COLORS: Record<string, string> = {
    Pending: "bg-yellow-500",
    Delivered: "bg-emerald-500",
    Complete: "bg-blue-500",
};

interface Props {
    orderId: number;
}

export default function CustomOrderDetail({ orderId }: Props) {
    const dispatch = useDispatch<AppDispatch>();
    const router = useProgressRouter();
    const { selectedOrder, loading } = useSelector((state: RootState) => state.customOrders);

    const [paymentModal, setPaymentModal] = useState<null | "deliver" | "collect" | "complete">(null);
    const [paymentMethodInput, setPaymentMethodInput] = useState("Cash");
    const [paymentNote, setPaymentNote] = useState("");
    const [amountInput, setAmountInput] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");
    const [reorderModalOpen, setReorderModalOpen] = useState(false);
    const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set());

    useEffect(() => {
        dispatch(fetchCustomOrderDetail(orderId));
        return () => { dispatch(clearSelectedOrder()); };
    }, [dispatch, orderId]);

    const openPaymentModal = (mode: "deliver" | "collect" | "complete") => {
        if (!selectedOrder) return;
        setPaymentMethodInput("Cash");
        setPaymentNote("");
        setAmountInput(selectedOrder.RemainingBalance > 0 ? String(selectedOrder.RemainingBalance) : "0");
        setActionError("");
        setPaymentModal(mode);
    };

    const handleSubmitPayment = async () => {
        if (!selectedOrder) return;
        const mode = paymentModal;
        const amount = Number(amountInput);
        if (mode !== "complete") {
            if (isNaN(amount) || amount < 0) {
                setActionError("Enter a valid amount.");
                return;
            }
            if (amount > selectedOrder.RemainingBalance) {
                setActionError("Amount cannot exceed the remaining balance.");
                return;
            }
            if (mode === "collect" && amount <= 0) {
                setActionError("Enter an amount greater than zero.");
                return;
            }
        }

        setActionLoading(true);
        setActionError("");
        try {
            if (mode !== "complete" && amount > 0) {
                const payRes = await addCustomOrderPayment(orderId, { Amount: amount, PaymentMethod: paymentMethodInput, Note: paymentNote || undefined });
                if (!payRes.isSuccess) {
                    setActionError(payRes.message || "Failed to record payment");
                    setActionLoading(false);
                    return;
                }
            }
            if (mode === "deliver" || mode === "complete") {
                const targetStatus = mode === "deliver" ? "Delivered" : "Complete";
                const statusRes = await updateCustomOrderStatus(orderId, { Status: targetStatus, Note: paymentNote || undefined });
                if (!statusRes.isSuccess) {
                    setActionError(statusRes.message || (mode === "deliver" ? "Failed to mark order as delivered" : "Failed to complete order"));
                    setActionLoading(false);
                    return;
                }
            }
            setPaymentModal(null);
            dispatch(fetchCustomOrderDetail(orderId));
        } catch {
            setActionError(mode === "deliver" ? "Failed to mark order as delivered" : mode === "complete" ? "Failed to complete order" : "Failed to record payment");
        } finally {
            setActionLoading(false);
        }
    };

    const openReorderModal = () => {
        if (!selectedOrder) return;
        // Default: every block selected — reordering the whole order is the common case here.
        setSelectedBlocks(new Set(selectedOrder.Blocks.map((_, i) => i)));
        setReorderModalOpen(true);
    };

    const toggleReorderBlock = (index: number) => {
        setSelectedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    const confirmReorder = () => {
        if (!selectedOrder || selectedBlocks.size === 0) return;
        localStorage.setItem("reorderCustomOrderId", JSON.stringify({
            orderId: selectedOrder.Id,
            blockIndices: Array.from(selectedBlocks),
        }));
        setReorderModalOpen(false);
        router.push("/custom-orders/new");
    };

    const blockSummaryLabel = (block: any): string => {
        if (block.BlockType === "Notebook" && block.NotebookDetails) {
            const nd = block.NotebookDetails;
            const parts = [nd.PaperSize, nd.PaperQuality, nd.BindingType].filter(Boolean);
            return `Notebook${parts.length ? " — " + parts.join(", ") : ""}`;
        }
        if (block.BlockType === "Diary" && block.DiaryDetails) {
            const dd = block.DiaryDetails;
            const parts = [dd.PaperSize, dd.Style, dd.BindingType].filter(Boolean);
            return `Diary${parts.length ? " — " + parts.join(", ") : ""}`;
        }
        const itemsSummary = (block.Items || []).map((i: any) => `${i.Qty}x ${i.Name}`).join(", ");
        return `Custom${itemsSummary ? " — " + itemsSummary : ""}`;
    };

    const order = selectedOrder;

    if (loading && !order) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6">
                <button onClick={() => router.push("/custom-orders")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
                    <ArrowLeftIcon className="w-4 h-4" /> Back to Custom Orders
                </button>
                <div className="text-center text-gray-400 py-20">Order not found.</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-4 overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/custom-orders")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{order.OrderNumber}</h1>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                                {order.OrderType}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.Status] || "bg-gray-100 text-gray-800"}`}>
                                {order.Status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">Created {new Date(order.CreatedAt).toLocaleString()}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    {order.Status === "Pending" && (
                        <>
                            <button
                                onClick={() => router.push(`/custom-orders/${order.Id}/edit`)}
                                className="px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
                            >
                                Edit Order
                            </button>
                            <button
                                onClick={() => openPaymentModal("deliver")}
                                className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                            >
                                Delivered
                            </button>
                        </>
                    )}
                    {order.Status === "Delivered" && (
                        <button
                            onClick={() => openPaymentModal(order.RemainingBalance > 0 ? "collect" : "complete")}
                            className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                        >
                            Complete
                        </button>
                    )}
                    <button
                        onClick={openReorderModal}
                        className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                    >
                        Reorder
                    </button>
                </div>
            </div>

            {/* Error */}
            {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 max-w-4xl">{actionError}</div>
            )}

            <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-visible">
                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-full">
                    {/* Left Column: Order Info + Items */}
                    <div className="lg:col-span-2 lg:overflow-y-auto pr-1 space-y-4">
                        {/* Info Grid Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Order Information</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</div>
                                    <div className="text-sm font-bold text-gray-900 mt-1">{order.CustomerName || "—"}</div>
                                    <div className="text-xs text-gray-500">{order.CustomerContact}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Staff</div>
                                    <div className="text-sm font-medium text-gray-700 mt-1">{order.StaffName || "—"}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delivery</div>
                                    <div className="text-sm font-medium text-gray-700 mt-1">{order.DeliveryType}</div>
                                    {order.DeliveryDate && (
                                        <div className="text-xs text-gray-400">{new Date(order.DeliveryDate).toLocaleDateString()}</div>
                                    )}
                                </div>
                            </div>
                            {order.Description && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
                                    <p className="text-sm text-gray-700">{order.Description}</p>
                                </div>
                            )}
                        </div>

                        {/* Blocks */}
                        {order.Blocks?.map((block, blockIdx) => (
                            <div key={blockIdx} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    Block {blockIdx + 1} — {block.BlockType === "Notebook" ? "Notebook Order" : block.BlockType === "Diary" ? "Diary Order" : "Custom Order"}
                                </h2>

                                {block.BlockType === "Notebook" && block.NotebookDetails && (
                                    <>
                                        {/* Paper & Cover */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paper Size</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.PaperSize || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paper Quality</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.PaperQuality || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Binding Type</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.BindingType || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Print Color</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.PrintColor || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Card Material</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.CardMaterial || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lamination</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.Lamination || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Binder Name</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.BinderName || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Index</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.IndexPages || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Margin Line</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.NotebookDetails.MarginLine || "—"}</div>
                                            </div>
                                        </div>

                                        {/* Ruling Paper Allocation */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Paper Issued for Ruling</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { label: "Urdu Notebooks", value: block.NotebookDetails.RulingQty.Urdu },
                                                    { label: "English 4-Line", value: block.NotebookDetails.RulingQty.English4Line },
                                                    { label: "Box (Math)", value: block.NotebookDetails.RulingQty.Box },
                                                    { label: "Narrow Line", value: block.NotebookDetails.RulingQty.NarrowLine },
                                                ].map(r => (
                                                    <div key={r.label} className="bg-gray-50 rounded-xl px-3 py-2">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{r.label}</div>
                                                        <div className="text-sm font-bold text-gray-900 mt-0.5">{r.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Production Costs */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Production Costs</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { label: "Paper", value: block.NotebookDetails.ProductionCosts.PaperCost },
                                                    { label: "Card", value: block.NotebookDetails.ProductionCosts.CardCost },
                                                    { label: "Binding", value: block.NotebookDetails.ProductionCosts.BindingCost },
                                                    { label: "Misc", value: block.NotebookDetails.ProductionCosts.MiscCost },
                                                ].map(c => (
                                                    <div key={c.label} className="bg-gray-50 rounded-xl px-3 py-2">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</div>
                                                        <div className="text-sm font-bold text-gray-900 mt-0.5">{c.value != null ? `Rs ${c.value.toLocaleString()}` : "—"}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Production Cost</span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    Rs {(
                                                        (block.NotebookDetails.ProductionCosts.PaperCost || 0)
                                                        + (block.NotebookDetails.ProductionCosts.CardCost || 0)
                                                        + (block.NotebookDetails.ProductionCosts.BindingCost || 0)
                                                        + (block.NotebookDetails.ProductionCosts.MiscCost || 0)
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {block.BlockType === "Diary" && block.DiaryDetails && (
                                    <>
                                        {/* Paper & Cover */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paper Size</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.PaperSize || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paper Quality</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.PaperQuality || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Style</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.Style || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Binding Type</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.BindingType || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Print Color</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.PrintColor || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Card Material</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.CardMaterial || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lamination</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.Lamination || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Binder Name</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.BinderName || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Index</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.IndexPages || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Margin Line</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.MarginLine || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No. of Pages</div>
                                                <div className="text-sm font-medium text-gray-700 mt-1">{block.DiaryDetails.PagesQty || "—"}</div>
                                            </div>
                                        </div>

                                        {/* Production Costs */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Production Costs</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { label: "Paper", value: block.DiaryDetails.ProductionCosts.PaperCost },
                                                    { label: "Card", value: block.DiaryDetails.ProductionCosts.CardCost },
                                                    { label: "Binding", value: block.DiaryDetails.ProductionCosts.BindingCost },
                                                    { label: "Misc", value: block.DiaryDetails.ProductionCosts.MiscCost },
                                                ].map(c => (
                                                    <div key={c.label} className="bg-gray-50 rounded-xl px-3 py-2">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</div>
                                                        <div className="text-sm font-bold text-gray-900 mt-0.5">{c.value != null ? `Rs ${c.value.toLocaleString()}` : "—"}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Production Cost</span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    Rs {(
                                                        (block.DiaryDetails.ProductionCosts.PaperCost || 0)
                                                        + (block.DiaryDetails.ProductionCosts.CardCost || 0)
                                                        + (block.DiaryDetails.ProductionCosts.BindingCost || 0)
                                                        + (block.DiaryDetails.ProductionCosts.MiscCost || 0)
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Items */}
                                <div className={block.BlockType === "Notebook" || block.BlockType === "Diary" ? "pt-4 border-t border-gray-100" : ""}>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</div>
                                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Name</th>
                                                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Price (Rs)</th>
                                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Subtotal (Rs)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {block.Items?.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2.5">
                                                            <div className="font-medium text-gray-800">{item.Name}</div>
                                                            {item.Notes && <div className="text-xs text-gray-400 mt-0.5">{item.Notes}</div>}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center text-gray-600">{item.Qty}</td>
                                                        <td className="px-4 py-2.5 text-right text-gray-600">Rs {item.Price?.toLocaleString()}</td>
                                                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">Rs {(item.Price * item.Qty).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Financial + Timelines */}
                    <div className="lg:overflow-y-auto pr-1 space-y-4">
                        {/* Financial Summary Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-3">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Payment Summary</h2>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total</span>
                                <span className="font-bold text-gray-900">Rs {order.TotalAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Paid</span>
                                <span className="font-semibold text-green-700">Rs {order.PaidAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                                <span className="font-semibold text-gray-700">Remaining</span>
                                <span className={`font-bold text-lg ${order.RemainingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                                    Rs {order.RemainingBalance?.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Payment Timeline Card */}
                        {order.PaymentHistory && order.PaymentHistory.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Payment History</h2>
                                <div className="space-y-0">
                                    {order.PaymentHistory.map((entry, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-3 h-3 rounded-full mt-1.5 bg-green-500"></div>
                                                {idx < order.PaymentHistory.length - 1 && (
                                                    <div className="w-px flex-1 bg-gray-200 my-1"></div>
                                                )}
                                            </div>
                                            <div className="pb-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-green-800 bg-green-100">
                                                        +Rs {entry.Amount?.toLocaleString()}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-600 bg-gray-100">
                                                        {entry.PaymentMethod}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {new Date(entry.PaidAt).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    by {entry.ReceivedByName || "System"}
                                                    {entry.Note && <span className="text-gray-600"> — {entry.Note}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status Timeline Card */}
                        {order.StatusHistory && order.StatusHistory.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Status Timeline</h2>
                                <div className="space-y-0">
                                    {order.StatusHistory.map((entry, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full mt-1.5 ${TIMELINE_DOT_COLORS[entry.Status] || "bg-gray-400"}`}></div>
                                                {idx < order.StatusHistory.length - 1 && (
                                                    <div className="w-px flex-1 bg-gray-200 my-1"></div>
                                                )}
                                            </div>
                                            <div className="pb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[entry.Status] || "bg-gray-100 text-gray-800"}`}>
                                                        {entry.Status}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {new Date(entry.ChangedAt).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    by {entry.ChangedByName || "System"}
                                                    {entry.Note && <span className="text-gray-600"> — {entry.Note}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reorder modal: pick which blocks of this order to carry into a new order (all selected by default) */}
            {reorderModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-w-[90%]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Reorder {order.OrderNumber}</h3>
                        <p className="text-sm text-gray-500 mb-4">Choose which blocks to include in the new order.</p>
                        <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
                            {order.Blocks.map((block, i) => (
                                <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedBlocks.has(i)}
                                        onChange={() => toggleReorderBlock(i)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{block.BlockType}</span>
                                        <p className="text-sm font-medium text-gray-800">{blockSummaryLabel(block)}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setReorderModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReorder}
                                disabled={selectedBlocks.size === 0}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Reorder Selected
                            </button>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={() => setReorderModalOpen(false)} />
                </div>
            )}

            {/* Payment modal: shared by "deliver" (mark Delivered, optionally collecting a payment) and
                "collect" (record a payment toward a delivered order's balance — backend closes it as
                Complete once the balance hits zero). */}
            {paymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                        {paymentModal === "deliver" ? "Mark as Delivered" : "Complete Order"}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{order.OrderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setPaymentModal(null); setActionError(""); }}
                                className="p-1.5 -m-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {actionError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3" role="alert">{actionError}</div>
                            )}

                            {paymentModal === "complete" ? (
                                <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-medium text-emerald-700">
                                    This order is fully paid. Marking it complete will close it.
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label htmlFor="collect-amount" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount to Collect</label>
                                        {order.RemainingBalance > 0 ? (
                                            <>
                                                <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50/60 border border-indigo-100 rounded-xl focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                    <span className="text-sm font-medium text-indigo-400">Rs</span>
                                                    <input
                                                        id="collect-amount"
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
                                                    {paymentModal === "deliver" && " — leave as 0 to deliver on credit."}
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
                                                value={paymentMethodInput}
                                                onChange={setPaymentMethodInput}
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
                                <label htmlFor="deliver-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Note <span className="font-normal normal-case text-gray-400">(optional)</span>
                                </label>
                                <input
                                    id="deliver-note"
                                    type="text"
                                    placeholder="Add a note..."
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={() => { setPaymentModal(null); setActionError(""); }}
                                className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {actionLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {actionLoading ? "Processing..." : paymentModal === "deliver" ? "Mark as Delivered" : paymentModal === "complete" ? "Mark Complete" : "Record Payment"}
                            </button>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={() => { setPaymentModal(null); setActionError(""); }} />
                </div>
            )}
        </div>
    );
}
