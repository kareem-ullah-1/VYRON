"use client";

import { useEffect, useState, useMemo, useCallback, MouseEvent } from "react";
import { Customer } from "@/store/slices/customersSlice";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios";
import { useProgressRouter } from "@/components/Navigation";
import DataTable, { Column } from "../POS/DataTable";
import { Button } from "../ui/Button";
import CustomOrderStatusCell from "../CustomOrders/CustomOrderStatusCell";
import { NotebookOrderDetailsJson, DiaryOrderDetailsJson } from "@/store/slices/customOrderSlice";

interface ViewCustomerScreenProps {
    customerId: number;
    onBack: () => void;
}

const SALE_STATUS_COLORS: Record<string, string> = {
    Completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    Pending: "bg-amber-50 text-amber-700 border border-amber-100",
};

interface CustomOrderItem {
    Name: string;
    Qty: number;
    Price: number;
    Notes: string | null;
}

interface OrderBlockSummary {
    BlockType: string;
    Items: CustomOrderItem[];
    NotebookDetails: NotebookOrderDetailsJson | null;
    DiaryDetails: DiaryOrderDetailsJson | null;
}

interface CustomOrderSummary {
    Id: number;
    OrderNumber: string;
    OrderType: string;
    CustomerId: number | null;
    CustomerName: string | null;
    CustomerContact: string | null;
    Status: string;
    TotalAmount: number;
    PaidAmount: number;
    RemainingBalance: number;
    DeliveryDate: string | null;
    Blocks: OrderBlockSummary[];
    CreatedAt: string;
}

// ── Notebook Ledger: group every Notebook block across this customer's orders by
// exact (normalized) match on Date + the 7 spec fields — mirrors the physical order-book
// layout where identical spec = one production batch, regardless of which order it came from.
interface NotebookLedgerRow {
    orderId: number;
    orderNumber: string;
    orderDate: string;
    status: string;
    blockIndex: number;
    urdu: number;
    english4Line: number;
    box: number;
    narrowLine: number;
    pagesLabel: string;
    totalCopies: number;
    rate: number;
    totalAmount: number;
    advance: number;
    balance: number;
    dueDate: string | null;
    binderName: string | null;
}

interface NotebookLedgerBlock {
    key: string;
    date: string;
    size: string;
    paperQuality: string;
    index: string;
    titleCard: string;
    titlePrinting: string;
    lamination: string;
    bindingMethod: string;
    rows: NotebookLedgerRow[];
}

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
const dateOnly = (s: string) => s.split("T")[0];

function buildNotebookLedger(orders: CustomOrderSummary[]): NotebookLedgerBlock[] {
    const blockMap = new Map<string, NotebookLedgerBlock>();

    orders.forEach(order => {
        order.Blocks.forEach((block, blockIndex) => {
            if (block.BlockType !== "Notebook" || !block.NotebookDetails) return;
            const nd = block.NotebookDetails!;
            const date = dateOnly(order.CreatedAt);
            // Date is deliberately NOT part of the match key — two orders placed on different
            // days but with identical specs still represent the same production batch, and
            // should append into one block's row list rather than split into separate blocks.
            const key = [
                norm(nd.PaperSize), norm(nd.PaperQuality), norm(nd.IndexPages),
                norm(nd.CardMaterial), norm(nd.PrintColor), norm(nd.Lamination), norm(nd.BindingType),
            ].join("|");

            const pq = nd.PagesQty;
            const pagesValues = pq ? [pq.Urdu, pq.English4Line, pq.Box, pq.NarrowLine] : [0, 0, 0, 0];
            const uniquePages = Array.from(new Set(pagesValues.filter(v => v > 0)));
            const pagesLabel = uniquePages.length <= 1 ? String(uniquePages[0] ?? 0) : uniquePages.join(" / ");

            // Ordered Variants (Finished Quantity) — the actual sold/produced qty per ruling type,
            // derived from Items by name. NOT NotebookDetails.RulingQty, which is a separate,
            // often-unfilled field for raw paper issued to the ruling process.
            const itemNameToKey: Record<string, "urdu" | "english4Line" | "box" | "narrowLine"> = {
                "Urdu Notebooks": "urdu",
                "English 4-Line": "english4Line",
                "Box (Math)": "box",
                "Narrow Line": "narrowLine",
            };
            const orderedQty = { urdu: 0, english4Line: 0, box: 0, narrowLine: 0 };
            block.Items.forEach(item => {
                const k = itemNameToKey[item.Name];
                if (k) orderedQty[k] = item.Qty;
            });

            const rate = block.Items[0]?.Price || 0;
            const totalAmount = block.Items.reduce((sum, i) => sum + i.Qty * i.Price, 0);
            const totalCopies = orderedQty.urdu + orderedQty.english4Line + orderedQty.box + orderedQty.narrowLine;

            const row: NotebookLedgerRow = {
                orderId: order.Id,
                orderNumber: order.OrderNumber,
                orderDate: date,
                status: order.Status,
                blockIndex,
                urdu: orderedQty.urdu, english4Line: orderedQty.english4Line, box: orderedQty.box, narrowLine: orderedQty.narrowLine,
                pagesLabel, totalCopies, rate, totalAmount,
                advance: order.PaidAmount,
                balance: order.RemainingBalance,
                dueDate: order.DeliveryDate,
                binderName: nd.BinderName,
            };

            const existing = blockMap.get(key);
            if (existing) {
                existing.rows.push(row);
                if (date > existing.date) existing.date = date; // keep the most recent order date for sorting
            } else {
                blockMap.set(key, {
                    key,
                    date,
                    size: nd.PaperSize || "—",
                    paperQuality: nd.PaperQuality || "—",
                    index: nd.IndexPages || "—",
                    titleCard: nd.CardMaterial || "—",
                    titlePrinting: nd.PrintColor || "—",
                    lamination: nd.Lamination || "—",
                    bindingMethod: nd.BindingType || "—",
                    rows: [row],
                });
            }
        });
    });

    const blocks = Array.from(blockMap.values());
    blocks.forEach(b => b.rows.sort((r1, r2) => r2.orderDate.localeCompare(r1.orderDate)));
    return blocks.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Custom Items: group every Custom block's line items across this customer's orders
// by exact (normalized) item name match — each order's items already sit together by
// definition, this just also collapses repeat purchases of the same named item over time.
interface CustomItemRow {
    orderId: number;
    orderNumber: string;
    status: string;
    blockIndex: number;
    qty: number;
    price: number;
    notes: string | null;
    date: string;
    balance: number;
}

interface CustomItemBlock {
    name: string;
    rows: CustomItemRow[];
}

function buildCustomItemLedger(orders: CustomOrderSummary[]): CustomItemBlock[] {
    const blockMap = new Map<string, CustomItemBlock>();

    orders.forEach(order => {
        order.Blocks.forEach((block, blockIndex) => {
            if (block.BlockType !== "Custom") return;
            block.Items.forEach(item => {
                const key = norm(item.Name);
                const row: CustomItemRow = {
                    orderId: order.Id,
                    orderNumber: order.OrderNumber,
                    status: order.Status,
                    blockIndex,
                    qty: item.Qty,
                    price: item.Price,
                    notes: item.Notes,
                    date: dateOnly(order.CreatedAt),
                    balance: order.RemainingBalance,
                };
                const existing = blockMap.get(key);
                if (existing) {
                    existing.rows.push(row);
                } else {
                    blockMap.set(key, { name: item.Name, rows: [row] });
                }
            });
        });
    });

    return Array.from(blockMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ── Diary Ledger: group every Diary block across this customer's orders by exact
// (normalized) spec match — same idea as the Notebook Ledger, but Diary blocks have no
// ruling breakdown (a single Total Diaries Qty instead) and add a Style field.
interface DiaryLedgerRow {
    orderId: number;
    orderNumber: string;
    orderDate: string;
    status: string;
    blockIndex: number;
    qty: number;
    pagesQty: number;
    rate: number;
    advance: number;
    balance: number;
    dueDate: string | null;
    binderName: string | null;
}

interface DiaryLedgerBlock {
    key: string;
    date: string;
    size: string;
    paperQuality: string;
    style: string;
    index: string;
    titleCard: string;
    titlePrinting: string;
    lamination: string;
    bindingMethod: string;
    rows: DiaryLedgerRow[];
}

function buildDiaryLedger(orders: CustomOrderSummary[]): DiaryLedgerBlock[] {
    const blockMap = new Map<string, DiaryLedgerBlock>();

    orders.forEach(order => {
        order.Blocks.forEach((block, blockIndex) => {
            if (block.BlockType !== "Diary" || !block.DiaryDetails) return;
            const dd = block.DiaryDetails;
            const date = dateOnly(order.CreatedAt);
            const key = [
                norm(dd.PaperSize), norm(dd.PaperQuality), norm(dd.Style), norm(dd.IndexPages),
                norm(dd.CardMaterial), norm(dd.PrintColor), norm(dd.Lamination), norm(dd.BindingType),
            ].join("|");

            const item = block.Items[0];
            const row: DiaryLedgerRow = {
                orderId: order.Id,
                orderNumber: order.OrderNumber,
                orderDate: date,
                status: order.Status,
                blockIndex,
                qty: item?.Qty || 0,
                pagesQty: dd.PagesQty || 0,
                rate: item?.Price || 0,
                advance: order.PaidAmount,
                balance: order.RemainingBalance,
                dueDate: order.DeliveryDate,
                binderName: dd.BinderName,
            };

            const existing = blockMap.get(key);
            if (existing) {
                existing.rows.push(row);
                if (date > existing.date) existing.date = date;
            } else {
                blockMap.set(key, {
                    key,
                    date,
                    size: dd.PaperSize || "—",
                    paperQuality: dd.PaperQuality || "—",
                    style: dd.Style || "—",
                    index: dd.IndexPages || "—",
                    titleCard: dd.CardMaterial || "—",
                    titlePrinting: dd.PrintColor || "—",
                    lamination: dd.Lamination || "—",
                    bindingMethod: dd.BindingType || "—",
                    rows: [row],
                });
            }
        });
    });

    const blocks = Array.from(blockMap.values());
    blocks.forEach(b => b.rows.sort((r1, r2) => r2.orderDate.localeCompare(r1.orderDate)));
    return blocks.sort((a, b) => b.date.localeCompare(a.date));
}

// Full spec + quantity + pricing breakdown for a Notebook block, used in the reorder modal's
// block picker (everything except date fields — those don't matter when picking what to reorder).
function computeNotebookBlockDetails(block: OrderBlockSummary) {
    const nd = block.NotebookDetails;
    if (!nd) return null;
    const pq = nd.PagesQty;
    const pagesValues = pq ? [pq.Urdu, pq.English4Line, pq.Box, pq.NarrowLine] : [0, 0, 0, 0];
    const uniquePages = Array.from(new Set(pagesValues.filter(v => v > 0)));
    const pagesLabel = uniquePages.length <= 1 ? String(uniquePages[0] ?? 0) : uniquePages.join(" / ");
    const rq = nd.RulingQty || { Urdu: 0, English4Line: 0, Box: 0, NarrowLine: 0 };
    const rate = block.Items[0]?.Price || 0;
    const totalAmount = block.Items.reduce((sum, i) => sum + i.Qty * i.Price, 0);
    return { nd, rq, pagesLabel, rate, totalAmount };
}

interface Sale {
    Id: number;
    SaleDate: string;
    TotalAmount: number;
    FinalAmount: number;
    DiscountAmount: number;
    // TaxAmount: number;
    Status: string;
    Items: {
        Id: number;
        ProductVariantId: number;
        ProductVariantName: string;
        Quantity: number;
        UnitPrice: number;
        TotalPrice: number;
        DiscountAmount: number;
    }[];
    Payments: {
        Id: number;
        SaleId: number;
        PaymentMethod: string;
        Amount: number;
        PaymentDate: string;
        TransactionReference: string | null;
    }[];
}

export default function ViewCustomerScreen({
    customerId,
    onBack,
}: ViewCustomerScreenProps) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    const [customOrders, setCustomOrders] = useState<CustomOrderSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"sales" | "custom">("custom");
    const [reorderModal, setReorderModal] = useState<{ order: CustomOrderSummary; selected: Set<number> } | null>(null);

    const router = useProgressRouter();

    const fetchCustomOrders = useCallback(async () => {
        try {
            const response = await api.get("/CustomOrder/GetAllOrders");
            const allOrders: CustomOrderSummary[] = response?.data?.data || [];
            setCustomOrders(allOrders.filter((o) => o.CustomerId === customerId));
        } catch {
            setCustomOrders([]);
        }
    }, [customerId]);

    useEffect(() => {
        const fetchCustomer = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/Customer/GetCustomerById/${customerId}`);
                setCustomer(response?.data.data.customer);
                setSalesHistory(response?.data.data.salesHistory.data || []);
            } catch (err: any) {
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    "Failed to fetch customer"
                );
            } finally {
                setLoading(false);
            }
        };
        fetchCustomer();
        fetchCustomOrders();
    }, [customerId, fetchCustomOrders]);

    const notebookLedger = useMemo(() => buildNotebookLedger(customOrders), [customOrders]);
    const diaryLedger = useMemo(() => buildDiaryLedger(customOrders), [customOrders]);
    const customItemLedger = useMemo(() => buildCustomItemLedger(customOrders), [customOrders]);

    const handleReorder = (sale: Sale) => {
        localStorage.setItem("reordersaleId", JSON.stringify(sale.Id));
        router.push(`/pos?customerId=${customerId}`);
    };

    const handleReorderCustomOrder = (e: MouseEvent, orderId: number) => {
        e.stopPropagation();
        localStorage.setItem("reorderCustomOrderId", JSON.stringify(orderId));
        router.push("/custom-orders/new");
    };

    // An order can carry several Notebook and/or Custom blocks. Clicking Reorder on any one
    // row opens a picker listing every block in that order so the user can choose which of
    // them (just the clicked one, or others too) get carried into the new order.
    const openReorderModal = (e: MouseEvent, orderId: number, blockIndex: number) => {
        e.stopPropagation();
        const order = customOrders.find(o => o.Id === orderId);
        if (!order) return;
        if (order.Blocks.length <= 1) {
            handleReorderCustomOrder(e, orderId);
            return;
        }
        setReorderModal({ order, selected: new Set([blockIndex]) });
    };

    const toggleReorderBlock = (index: number) => {
        setReorderModal(prev => {
            if (!prev) return prev;
            const selected = new Set(prev.selected);
            if (selected.has(index)) selected.delete(index); else selected.add(index);
            return { ...prev, selected };
        });
    };

    const confirmReorderModal = () => {
        if (!reorderModal || reorderModal.selected.size === 0) return;
        localStorage.setItem("reorderCustomOrderId", JSON.stringify({
            orderId: reorderModal.order.Id,
            blockIndices: Array.from(reorderModal.selected),
        }));
        setReorderModal(null);
        router.push("/custom-orders/new");
    };

    const formatDate = (value: string) =>
        new Date(value).toLocaleString("en-US", {
            month: "short", day: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        });

    const salesColumns: Column<Sale>[] = [
        { header: "Sale #", render: (sale) => <span className="font-bold text-indigo-600">#{sale.Id}</span> },
        { header: "Date", render: (sale) => <span className="text-gray-600">{formatDate(sale.SaleDate)}</span> },
        {
            header: "Final",
            className: "text-right",
            render: (sale) => <span className="font-bold text-indigo-700">Rs {(sale.FinalAmount ?? 0).toFixed(0)}</span>,
        },
        {
            header: "Discount",
            className: "text-right",
            render: (sale) => {
                const totalDiscount = (sale.Items?.reduce((s, i) => s + (i.DiscountAmount ?? 0), 0) ?? 0) + (sale.DiscountAmount ?? 0);
                return totalDiscount > 0
                    ? <span className="text-green-600">-Rs {totalDiscount.toFixed(0)}</span>
                    : <span className="text-gray-400">—</span>;
            },
        },
        {
            header: "Payment",
            render: (sale) => (
                <div className="flex flex-wrap gap-1">
                    {sale.Payments.map((p) => (
                        <span key={p.Id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {p.PaymentMethod} · Rs {p.Amount}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            header: "Status",
            render: (sale) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${SALE_STATUS_COLORS[sale.Status] || "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                    {sale.Status}
                </span>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600">
                    Back
                </button>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4">Customer not found</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600">
                    Back
                </button>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-gray-50 flex flex-col overflow-y-auto md:overflow-hidden">
            {/* Fixed Top: Header + Customer Info */}
            <div className="flex-shrink-0 p-4 sm:p-6 pb-0">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-9 h-9 bg-white hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition shadow-sm"
                        title="Back to list">
                        <ArrowLeftIcon className="w-4 h-4 stroke-2" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {customer.FullName ?? "Customer Details"}
                        </h1>
                        <p className="text-xs text-gray-500">Customer profile and purchase history</p>
                    </div>
                </div>

                {/* Customer Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-5">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5">
                        <h2 className="text-xs font-semibold text-white/90 uppercase tracking-wider">Contact Information</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 px-5 py-3">
                        {[
                            { label: "Name", value: customer.FullName },
                            { label: "Email", value: customer.Email },
                            { label: "Phone", value: customer.ContactNumber },
                            { label: "City", value: customer.City },
                            { label: "State", value: customer.State },
                            { label: "Country", value: customer.Country },
                        ].map((item) => (
                            <div key={item.label}>
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-0.5">{item.label}</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{item.value || "N/A"}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sales History / Custom Orders — tabbed, one full-height table at a time */}
            <div className="flex-1 min-h-[28rem] md:min-h-0 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100 bg-gray-50/30 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab("sales")}
                            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${activeTab === "sales" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                            Sales History
                            <span className="text-xs font-normal text-gray-400 ml-1.5">({salesHistory.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("custom")}
                            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${activeTab === "custom" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                            Custom Orders
                            <span className="text-xs font-normal text-gray-400 ml-1.5">({customOrders.length})</span>
                        </button>
                    </div>

                    {activeTab === "sales" ? (
                        <DataTable<Sale>
                            data={salesHistory}
                            noDataTitle="No sales found for this customer"
                            columns={salesColumns}
                            renderExpanded={(sale) => (
                                <div className="space-y-1 max-w-2xl">
                                    {sale.Items.map((item) => {
                                        const hasDiscount = (item.DiscountAmount ?? 0) > 0;
                                        const originalTotal = (item.UnitPrice ?? 0) * item.Quantity;
                                        return (
                                            <div key={item.Id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                                                        x{item.Quantity}
                                                    </span>
                                                    <span className="text-gray-700 truncate font-medium">
                                                        {item.ProductVariantName || `#${item.ProductVariantId}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                    {hasDiscount && (
                                                        <span className="text-gray-400 line-through text-[10px]">Rs {originalTotal.toFixed(0)}</span>
                                                    )}
                                                    <span className={`font-semibold ${hasDiscount ? "text-green-600" : "text-gray-900"}`}>
                                                        Rs {(item.TotalPrice ?? 0).toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            actions={(sale) => (
                                <button
                                    onClick={() => handleReorder(sale)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                                    title="Reorder this sale">
                                    Reorder
                                </button>
                            )}
                        />
                    ) : (
                        <div className="flex-1 overflow-auto p-4 space-y-6">
                            {/* Notebook Ledger: Notebook blocks grouped by matching spec */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Notebook Orders</h3>
                                <div className="space-y-4">
                                {notebookLedger.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 text-sm">No notebook orders found for this customer</div>
                            ) : notebookLedger.map(block => (
                                <div key={block.key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    {/* Upper Part: shared header + specs */}
                                    <div className="p-4 bg-gray-50/60 border-b border-gray-100">
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                ["Size", block.size], ["Paper Quality", block.paperQuality], ["Index", block.index],
                                                ["Title Card", block.titleCard], ["Title Printing", block.titlePrinting],
                                                ["Lamination", block.lamination], ["Binding", block.bindingMethod],
                                            ].map(([label, value]) => (
                                                <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">
                                                    <span className="text-gray-400 uppercase">{label}:</span> {value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Lower Part: order rows sharing the spec above */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400">
                                                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Order Date</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Urdu</th>
                                                    <th className="text-right px-3 py-2 font-semibold">4-Line</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Math Box</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Narrow Line</th>
                                                    <th className="text-right px-3 py-2 font-semibold">No. of Pages</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Total Copies</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Rate</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Due Date</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Binder</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {block.rows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => router.push(`/custom-orders/${row.orderId}`)}>
                                                        <td className="px-3 py-2">
                                                            <CustomOrderStatusCell
                                                                order={{ Id: row.orderId, OrderNumber: row.orderNumber, Status: row.status, RemainingBalance: row.balance }}
                                                                onAdvanced={fetchCustomOrders}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500">{row.orderDate}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.urdu || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.english4Line || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.box || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.narrowLine || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.pagesLabel}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.totalCopies}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">Rs {row.rate.toFixed(0)}</td>
                                                        <td className="px-3 py-2 text-gray-500">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}</td>
                                                        <td className="px-3 py-2 text-gray-500">{row.binderName || "—"}</td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); router.push(`/custom-orders/${row.orderId}`); }}
                                                                    className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-600 border border-gray-200 hover:border-gray-600 rounded-lg transition-all"
                                                                    title="View order details">
                                                                    View
                                                                </button>
                                                                {/* Reorder moved into the order detail page's action bar — commented out here for now.
                                                                <button
                                                                    onClick={(e) => openReorderModal(e, row.orderId, row.blockIndex)}
                                                                    className="px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                                                                    title="Reorder this order">
                                                                    Reorder
                                                                </button>
                                                                */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                                </div>
                            </div>

                            {/* Diary Ledger: Diary blocks grouped by matching spec */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Diary Orders</h3>
                                <div className="space-y-4">
                                {diaryLedger.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 text-sm">No diary orders found for this customer</div>
                            ) : diaryLedger.map(block => (
                                <div key={block.key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    {/* Upper Part: shared specs */}
                                    <div className="p-4 bg-gray-50/60 border-b border-gray-100">
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                ["Size", block.size], ["Paper Quality", block.paperQuality], ["Style", block.style], ["Index", block.index],
                                                ["Title Card", block.titleCard], ["Title Printing", block.titlePrinting],
                                                ["Lamination", block.lamination], ["Binding", block.bindingMethod],
                                            ].map(([label, value]) => (
                                                <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">
                                                    <span className="text-gray-400 uppercase">{label}:</span> {value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Lower Part: order rows sharing the spec above */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400">
                                                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Order Date</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Total Diaries Qty</th>
                                                    <th className="text-right px-3 py-2 font-semibold">No. of Pages</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Rate</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Due Date</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Binder</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {block.rows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => router.push(`/custom-orders/${row.orderId}`)}>
                                                        <td className="px-3 py-2">
                                                            <CustomOrderStatusCell
                                                                order={{ Id: row.orderId, OrderNumber: row.orderNumber, Status: row.status, RemainingBalance: row.balance }}
                                                                onAdvanced={fetchCustomOrders}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500">{row.orderDate}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.qty || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.pagesQty || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">Rs {row.rate.toFixed(0)}</td>
                                                        <td className="px-3 py-2 text-gray-500">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}</td>
                                                        <td className="px-3 py-2 text-gray-500">{row.binderName || "—"}</td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); router.push(`/custom-orders/${row.orderId}`); }}
                                                                    className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-600 border border-gray-200 hover:border-gray-600 rounded-lg transition-all"
                                                                    title="View order details">
                                                                    View
                                                                </button>
                                                                {/* Reorder moved into the order detail page's action bar — commented out here for now.
                                                                <button
                                                                    onClick={(e) => openReorderModal(e, row.orderId, row.blockIndex)}
                                                                    className="px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                                                                    title="Reorder this order">
                                                                    Reorder
                                                                </button>
                                                                */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                                </div>
                            </div>

                            {/* Custom Items: Custom block items grouped by item name */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Custom Items</h3>
                                <div className="space-y-4">
                            {customItemLedger.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 text-sm">No custom items found for this customer</div>
                            ) : customItemLedger.map(block => (
                                <div key={block.name} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="p-3 bg-gray-50/60 border-b border-gray-100">
                                        <p className="text-sm font-bold text-gray-900">{block.name}</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400">
                                                    <th className="text-left px-3 py-2 font-semibold">Item Name</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Order Date</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Price</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Subtotal</th>
                                                    <th className="text-left px-3 py-2 font-semibold">Notes</th>
                                                    <th className="text-right px-3 py-2 font-semibold">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {block.rows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => router.push(`/custom-orders/${row.orderId}`)}>
                                                        <td className="px-3 py-2 font-medium text-gray-800">{block.name}</td>
                                                        <td className="px-3 py-2">
                                                            <CustomOrderStatusCell
                                                                order={{ Id: row.orderId, OrderNumber: row.orderNumber, Status: row.status, RemainingBalance: row.balance }}
                                                                onAdvanced={fetchCustomOrders}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500">{row.date}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{row.qty}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">Rs {row.price.toFixed(0)}</td>
                                                        <td className="px-3 py-2 text-right font-semibold tabular-nums">Rs {(row.qty * row.price).toFixed(0)}</td>
                                                        <td className="px-3 py-2 text-gray-500 italic">{row.notes || "—"}</td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); router.push(`/custom-orders/${row.orderId}`); }}
                                                                    className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-600 border border-gray-200 hover:border-gray-600 rounded-lg transition-all"
                                                                    title="View order details">
                                                                    View
                                                                </button>
                                                                {/* Reorder moved into the order detail page's action bar — commented out here for now.
                                                                <button
                                                                    onClick={(e) => openReorderModal(e, row.orderId, row.blockIndex)}
                                                                    className="px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                                                                    title="Reorder this order">
                                                                    Reorder
                                                                </button>
                                                                */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reorder modal: an order can hold several Notebook/Custom blocks — let the user pick which to carry over */}
            {reorderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-w-[90%] relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Reorder {reorderModal.order.OrderNumber}</h3>
                        <p className="text-sm text-gray-500 mb-4">This order has multiple blocks. Choose which ones to include in the new order.</p>
                        <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                            {reorderModal.order.Blocks.map((block, i) => {
                                const nb = block.BlockType === "Notebook" ? computeNotebookBlockDetails(block) : null;
                                return (
                                    <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={reorderModal.selected.has(i)}
                                            onChange={() => toggleReorderBlock(i)}
                                            className="w-4 h-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{block.BlockType}</span>

                                            {nb ? (
                                                <div className="mt-1.5 space-y-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {[
                                                            ["Size", nb.nd.PaperSize], ["Paper Quality", nb.nd.PaperQuality], ["Index", nb.nd.IndexPages],
                                                            ["Title Card", nb.nd.CardMaterial], ["Title Printing", nb.nd.PrintColor],
                                                            ["Lamination", nb.nd.Lamination], ["Binding", nb.nd.BindingType],
                                                        ].filter(([, v]) => v).map(([label, value]) => (
                                                            <span key={label} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-semibold text-gray-600">
                                                                <span className="text-gray-400 uppercase">{label}:</span> {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div><p className="text-[9px] uppercase text-gray-400">Urdu</p><p className="text-xs font-bold text-gray-800">{nb.rq.Urdu}</p></div>
                                                        <div><p className="text-[9px] uppercase text-gray-400">4-Line</p><p className="text-xs font-bold text-gray-800">{nb.rq.English4Line}</p></div>
                                                        <div><p className="text-[9px] uppercase text-gray-400">Math Box</p><p className="text-xs font-bold text-gray-800">{nb.rq.Box}</p></div>
                                                        <div><p className="text-[9px] uppercase text-gray-400">Narrow Line</p><p className="text-xs font-bold text-gray-800">{nb.rq.NarrowLine}</p></div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
                                                        <span>Pages: <b className="text-gray-900">{nb.pagesLabel}</b></span>
                                                        <span>Rate: <b className="text-gray-900">Rs {nb.rate.toFixed(0)}</b></span>
                                                        <span>Total: <b className="text-gray-900">Rs {nb.totalAmount.toFixed(0)}</b></span>
                                                        {nb.nd.BinderName && <span>Binder: <b className="text-gray-900">{nb.nd.BinderName}</b></span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-1.5 space-y-1">
                                                    {block.Items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[11px] text-gray-700">
                                                            <span className="truncate">{item.Qty}x {item.Name}{item.Notes ? ` — ${item.Notes}` : ""}</span>
                                                            <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">Rs {(item.Qty * item.Price).toFixed(0)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setReorderModal(null)} className="flex-1 rounded-xl">
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={confirmReorderModal} disabled={reorderModal.selected.size === 0} className="flex-1 rounded-xl">
                                Reorder Selected
                            </Button>
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-10" onClick={() => setReorderModal(null)} />
                </div>
            )}
        </div>
    );
}
