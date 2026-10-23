"use client";

import { useState, useEffect, useRef } from "react";
import {
    ArrowLeftIcon,
    UserCircleIcon,
    MagnifyingGlassIcon,
    DocumentTextIcon,
    TruckIcon,
    BanknotesIcon,
    CalendarDaysIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    PlusIcon,
    TrashIcon,
    BookOpenIcon,
    ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { useProgressRouter } from "@/components/Navigation";
import { AppDispatch, RootState } from "@/store/store";
import { fetchCustomers } from "@/store/slices/customersSlice";
import { createCustomOrder, updateCustomOrder, getCustomOrder } from "@/Apis/CustomOrder";
import { CustomOrder, OrderBlock } from "@/store/slices/customOrderSlice";
import FilterSelect from "../POS/FilterSelect";
import NotebookOrderBlock, {
    NotebookBlockData,
    createEmptyNotebookBlockData,
    notebookBlockSubtotal,
    notebookBlockItems,
    notebookBlockToDTO,
    notebookBlockFromOrderBlock,
} from "./blocks/NotebookOrderBlock";
import CustomOrderBlock, {
    CustomBlockData,
    createEmptyCustomBlockData,
    customBlockSubtotal,
    customBlockToItemsDTO,
    customBlockFromOrderBlock,
} from "./blocks/CustomOrderBlock";
import DiaryOrderBlock, {
    DiaryBlockData,
    createEmptyDiaryBlockData,
    diaryBlockSubtotal,
    diaryBlockItems,
    diaryBlockToDTO,
    diaryBlockFromOrderBlock,
} from "./blocks/DiaryOrderBlock";

type Block =
    | { id: string; type: "Notebook"; data: NotebookBlockData }
    | { id: string; type: "Custom"; data: CustomBlockData }
    | { id: string; type: "Diary"; data: DiaryBlockData };

interface OrderFormProps {
    editOrder?: CustomOrder;
}

const inputClass = "w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50/30";
const labelClass = "text-[10px] font-bold text-gray-500 uppercase tracking-wider block ml-1";

function blockSubtotal(block: Block): number {
    if (block.type === "Notebook") return notebookBlockSubtotal(block.data);
    if (block.type === "Diary") return diaryBlockSubtotal(block.data);
    return customBlockSubtotal(block.data);
}

function blocksFromOrder(order: CustomOrder | any): Block[] {
    const orderBlocks: OrderBlock[] = order.Blocks || [];
    if (orderBlocks.length === 0) return [];
    return orderBlocks.map((b, idx) => {
        const id = `block-${idx}-${Date.now()}`;
        if (b.BlockType === "Notebook") return { id, type: "Notebook", data: notebookBlockFromOrderBlock(b) };
        if (b.BlockType === "Diary") return { id, type: "Diary", data: diaryBlockFromOrderBlock(b) };
        return { id, type: "Custom", data: customBlockFromOrderBlock(b) };
    });
}

export default function OrderForm({ editOrder }: OrderFormProps) {
    const dispatch = useDispatch<AppDispatch>();
    const router = useProgressRouter();
    const { customers } = useSelector((state: RootState) => state.customers);

    const isEditMode = !!editOrder;
    const blockIdRef = useRef(0);
    const nextBlockId = () => `block-${blockIdRef.current++}`;

    const [customerId, setCustomerId] = useState<number | "">("");
    const [customerName, setCustomerName] = useState("");
    const [customerNumber, setCustomerNumber] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [showCustomerPicker, setShowCustomerPicker] = useState(false);
    const [customerPickerSearch, setCustomerPickerSearch] = useState("");
    const [description, setDescription] = useState("");
    const [deliveryType, setDeliveryType] = useState("Pickup");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [paidAmount, setPaidAmount] = useState<number | "">("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [addBlockMenuOpen, setAddBlockMenuOpen] = useState(false);
    const addBlockMenuRef = useRef<HTMLDivElement>(null);
    const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [justAddedBlockId, setJustAddedBlockId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        dispatch(fetchCustomers());
    }, [dispatch]);

    useEffect(() => {
        if (!addBlockMenuOpen) return;
        const handler = (e: MouseEvent) => {
            if (addBlockMenuRef.current && !addBlockMenuRef.current.contains(e.target as Node)) {
                setAddBlockMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [addBlockMenuOpen]);

    // Pre-populate form when editing
    useEffect(() => {
        if (editOrder) {
            setDescription(editOrder.Description || "");
            setDeliveryType(editOrder.DeliveryType || "Pickup");
            setDeliveryDate(editOrder.DeliveryDate ? editOrder.DeliveryDate.split("T")[0] : "");
            const loaded = blocksFromOrder(editOrder);
            setBlocks(loaded.length ? loaded : [{ id: nextBlockId(), type: "Custom", data: createEmptyCustomBlockData() }]);
            // Don't pre-populate paid amount for edit — payments are managed separately
        }
    }, [editOrder]);

    // Reorder: pre-fill from a previous order, set by ViewCustomerModal's "Reorder" button.
    // Guarded per-mount by a ref (avoids a duplicate fetch within the same mount), but the
    // localStorage key itself is cleared on a delay — the destination route can genuinely
    // remount shortly after landing, and a later mount must still see the key to re-apply the
    // prefill on itself (whichever mount ends up staying on screen).
    const reorderLoadedRef = useRef(false);
    useEffect(() => {
        if (isEditMode || reorderLoadedRef.current) return;
        const storedId = localStorage.getItem("reorderCustomOrderId");
        if (!storedId) { reorderLoadedRef.current = true; return; }
        reorderLoadedRef.current = true;

        const loadReorder = async () => {
            try {
                const parsed = JSON.parse(storedId);
                // Legacy shape was a bare order id (number). Current shape carries an optional
                // blockIndices filter so a reorder can be scoped to a chosen subset of the order's
                // blocks instead of always pulling in every block — an order can hold several
                // Notebook and/or Custom blocks, and ViewCustomerModal's reorder modal lets the
                // user pick which of them to carry into the new order.
                const orderId: number = typeof parsed === "number" ? parsed : parsed.orderId;
                const blockIndices: number[] | null = typeof parsed === "number" ? null : parsed.blockIndices;

                const res = await getCustomOrder(orderId);
                if (!res.isSuccess || !res.data) return;
                const order = res.data;
                if (blockIndices) {
                    order.Blocks = (order.Blocks || []).filter((_: any, i: number) => blockIndices.includes(i));
                }

                if (order.CustomerId) setCustomerId(order.CustomerId);
                setCustomerName(order.CustomerName || "");
                setCustomerNumber(order.CustomerContact || "");
                setCustomerAddress(order.CustomerAddress || "");
                setDescription(order.Description || "");
                setDeliveryType(order.DeliveryType || "Pickup");
                setDeliveryDate(order.DeliveryDate ? order.DeliveryDate.split("T")[0] : "");
                const loaded = blocksFromOrder(order);
                if (loaded.length) setBlocks(loaded);
                // Don't pre-populate paid amount — this is a fresh order, not a continuation of the old one's payments
            } catch {
                // best-effort prefill — ignore failures
            } finally {
                setTimeout(() => localStorage.removeItem("reorderCustomOrderId"), 2000);
            }
        };
        loadReorder();
    }, [isEditMode]);

    const filteredCustomers = customers.filter(c =>
        c.FullName.toLowerCase().includes(customerPickerSearch.toLowerCase()) ||
        c.ContactNumber.includes(customerPickerSearch)
    );

    const selectCustomer = (c: typeof customers[number]) => {
        setCustomerId(c.Id);
        setCustomerName(c.FullName);
        setCustomerNumber(c.ContactNumber);
        setCustomerAddress(c.FullAddress || "");
        setShowCustomerPicker(false);
        setCustomerPickerSearch("");
    };

    const totalAmount = blocks.reduce((sum, b) => sum + blockSubtotal(b), 0);
    const remaining = totalAmount - (typeof paidAmount === "number" ? paidAmount : 0);

    const addBlock = (type: "Notebook" | "Custom" | "Diary") => {
        setAddBlockMenuOpen(false);
        const id = nextBlockId();
        setBlocks(prev => [...prev, type === "Notebook"
            ? { id, type: "Notebook", data: createEmptyNotebookBlockData() }
            : type === "Diary"
                ? { id, type: "Diary", data: createEmptyDiaryBlockData() }
                : { id, type: "Custom", data: createEmptyCustomBlockData() }
        ]);
        setJustAddedBlockId(id);
    };
    const removeBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    };
    const patchBlock = (id: string, patch: any) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, ...patch } } : b));
    };

    // Scroll the newly added block into view — otherwise it renders off-screen below the fold with no cue it appeared.
    useEffect(() => {
        if (!justAddedBlockId) return;
        const el = blockRefs.current[justAddedBlockId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setJustAddedBlockId(null);
    }, [justAddedBlockId]);

    const handleSubmit = async () => {
        setError("");

        if (blocks.length === 0) { setError("Add at least one block."); return; }

        const blockPayloads = blocks.map(b => {
            if (b.type === "Notebook") return { BlockType: "Notebook", Items: notebookBlockItems(b.data), NotebookDetails: notebookBlockToDTO(b.data), DiaryDetails: null };
            if (b.type === "Diary") return { BlockType: "Diary", Items: diaryBlockItems(b.data), NotebookDetails: null, DiaryDetails: diaryBlockToDTO(b.data) };
            return { BlockType: "Custom", Items: customBlockToItemsDTO(b.data), NotebookDetails: null, DiaryDetails: null };
        });

        if (blockPayloads.some(b => b.Items.length === 0)) { setError("Every block needs at least one item / variant quantity."); return; }
        if (blockPayloads.some(b => b.Items.some(i => !i.Name.trim()))) { setError("All items must have a name."); return; }
        if (blockPayloads.some(b => b.Items.some(i => i.Qty <= 0))) { setError("All items must have quantity > 0."); return; }
        if (blockPayloads.some(b => b.Items.some(i => i.Price < 0))) { setError("Item price cannot be negative."); return; }

        setSubmitting(true);
        try {
            let res;
            if (isEditMode) {
                const updatePayload = {
                    Description: description || null,
                    DeliveryType: deliveryType,
                    DeliveryDate: deliveryDate || null,
                    Blocks: blockPayloads,
                };
                res = await updateCustomOrder(editOrder!.Id, updatePayload);
            } else {
                if (!customerId && !customerName.trim()) { setError("Please select a customer or enter a name."); setSubmitting(false); return; }
                if (typeof paidAmount === "number" && paidAmount > totalAmount) { setError("Paid amount cannot exceed total."); setSubmitting(false); return; }

                const payload = {
                    CustomerId: customerId || null,
                    CustomerName: customerId ? null : (customerName.trim() || "Walk-in Customer"),
                    CustomerContact: customerId ? null : (customerNumber.trim() || null),
                    CustomerAddress: customerId ? null : (customerAddress.trim() || null),
                    Description: description || null,
                    DeliveryType: deliveryType,
                    DeliveryDate: deliveryDate || null,
                    PaidAmount: typeof paidAmount === "number" ? paidAmount : 0,
                    PaymentMethod: (typeof paidAmount === "number" && paidAmount > 0) ? paymentMethod : null,
                    Blocks: blockPayloads,
                };
                res = await createCustomOrder(payload);
            }

            if (res.isSuccess) {
                router.push(isEditMode ? `/custom-orders/${editOrder!.Id}` : "/custom-orders");
            } else {
                setError(res.message || `Failed to ${isEditMode ? "update" : "create"} order`);
            }
        } catch (err: any) {
            setError(err.message || `Failed to ${isEditMode ? "update" : "create"} order`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="px-5 pt-4 pb-6 flex flex-col h-full gap-3 overflow-hidden bg-gray-50/50">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push(isEditMode ? `/custom-orders/${editOrder!.Id}` : "/custom-orders")} className="p-2.5 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-gray-100 transition-all active:scale-95">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {isEditMode ? `Edit Order ${editOrder!.OrderNumber}` : "New Order"}
                        </h1>
                        <p className="text-xs font-bold text-gray-500 mt-1.5 uppercase tracking-wider flex items-center gap-1.5">
                            {isEditMode ? "Update established order details" : "Create a custom order — mix notebook & custom blocks freely"}
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="text-indigo-500">POS-CO-{new Date().getFullYear()}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(isEditMode ? `/custom-orders/${editOrder!.Id}` : "/custom-orders")}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-indigo-100 active:scale-95"
                    >
                        {submitting && (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {submitting ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Confirm Order")}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            {/* Two Column Layout */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
                {/* Left Column: Customer + Notes + Blocks */}
                <div className="lg:col-span-2 flex flex-col gap-2.5">
                    {/* Header Row: Customer + Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* Customer Details */}
                        {isEditMode ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2 rounded-t-2xl">
                                    <UserCircleIcon className="w-4 h-4 text-indigo-500" />
                                    <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Customer Information</h2>
                                </div>
                                <div className="p-3">
                                    <div className="text-sm font-bold text-gray-900">{editOrder!.CustomerName || "—"}</div>
                                    {editOrder!.CustomerContact && <div className="text-xs font-bold text-gray-500 mt-0.5">{editOrder!.CustomerContact}</div>}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 relative">
                                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <UserCircleIcon className="w-4 h-4 text-indigo-500" />
                                        <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Customer Details</h2>
                                        {customerId !== "" && <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Linked
                                        </span>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomerPicker(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border ${showCustomerPicker ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"}`}
                                    >
                                        <MagnifyingGlassIcon className="w-3 h-3" />
                                        Select Customer
                                    </button>
                                </div>

                                {showCustomerPicker && (
                                    <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 relative">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Search name or contact..."
                                            value={customerPickerSearch}
                                            onChange={(e) => setCustomerPickerSearch(e.target.value)}
                                            className={inputClass}
                                        />
                                        <div className="absolute z-[50] left-3 right-3 mt-2 border border-gray-200 rounded-2xl max-h-60 overflow-y-auto bg-white shadow-2xl divide-y divide-gray-50 ring-1 ring-black/5">
                                            {filteredCustomers.length === 0 ? (
                                                <div className="px-4 py-6 text-center">
                                                    <UserCircleIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-xs font-bold text-gray-500 uppercase">No customer found</p>
                                                </div>
                                            ) : (
                                                filteredCustomers.slice(0, 10).map(c => (
                                                    <button
                                                        key={c.Id}
                                                        onClick={() => selectCustomer(c)}
                                                        className="w-full text-left px-5 py-3 hover:bg-indigo-50/50 transition-colors flex justify-between items-center group"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{c.FullName}</div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{c.ContactNumber}</div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 space-y-2.5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className={labelClass}>Name <span className="text-rose-400 normal-case">*</span></label>
                                            <input
                                                type="text"
                                                placeholder="Customer name"
                                                value={customerName}
                                                onChange={(e) => { setCustomerName(e.target.value); setCustomerId(""); }}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Number</label>
                                            <input
                                                type="text"
                                                placeholder="Phone number"
                                                value={customerNumber}
                                                onChange={(e) => { setCustomerNumber(e.target.value); setCustomerId(""); }}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Address</label>
                                        <input
                                            type="text"
                                            placeholder="Customer address"
                                            value={customerAddress}
                                            onChange={(e) => { setCustomerAddress(e.target.value); setCustomerId(""); }}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Notes */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Order Notes</h2>
                            </div>
                            <div className="p-3">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Special requirements for this order..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50/30 resize-none italic"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Blocks */}
                    {blocks.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl bg-white/40">
                            <div className="p-3 bg-indigo-50 rounded-2xl mb-3">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-600">No blocks added yet</p>
                            <p className="text-xs font-medium text-gray-400 mt-1">Use &ldquo;Add Block&rdquo; below to start a Notebook, Custom, or Diary order.</p>
                        </div>
                    )}
                    {blocks.map((block, idx) => (
                        <div
                            key={block.id}
                            ref={(el) => { blockRefs.current[block.id] = el; }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-4"
                        >
                            <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {block.type === "Notebook"
                                        ? <BookOpenIcon className="w-4 h-4 text-indigo-500" />
                                        : block.type === "Diary"
                                            ? <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
                                            : <ClipboardDocumentListIcon className="w-4 h-4 text-indigo-500" />}
                                    <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                                        Block {idx + 1} — {block.type === "Notebook" ? "Notebook Order" : block.type === "Diary" ? "Diary Order" : "Custom Order"}
                                    </h2>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                        Rs {blockSubtotal(block).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeBlock(block.id)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Remove block"
                                    aria-label={`Remove block ${idx + 1}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-2.5">
                                {block.type === "Notebook" ? (
                                    <NotebookOrderBlock data={block.data} onChange={(patch) => patchBlock(block.id, patch)} />
                                ) : block.type === "Diary" ? (
                                    <DiaryOrderBlock data={block.data} onChange={(patch) => patchBlock(block.id, patch)} />
                                ) : (
                                    <CustomOrderBlock data={block.data} onChange={(patch) => patchBlock(block.id, patch)} />
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Block — sticky at the bottom of the scroll area so it stays reachable no matter how tall the blocks above get */}
                    <div className="sticky bottom-0 z-10 -mx-1 px-1 pt-2 pb-1 bg-gray-50/95 backdrop-blur-sm">
                        <div className="relative" ref={addBlockMenuRef}>
                            <button
                                onClick={() => setAddBlockMenuOpen(prev => !prev)}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-indigo-700 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl transition-all active:scale-[0.99] shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4 stroke-[3]" />
                                Add Block
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${addBlockMenuOpen ? "rotate-180" : ""}`} />
                            </button>

                            {addBlockMenuOpen && (
                                <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-50 divide-y divide-gray-50">
                                    <button
                                        onClick={() => addBlock("Notebook")}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors group"
                                    >
                                        <span className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                            <BookOpenIcon className="w-4 h-4 text-indigo-600" />
                                        </span>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Notebook Order</div>
                                            <div className="text-[10px] font-medium text-gray-500">Variants, cover, ruling & rate</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => addBlock("Diary")}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors group"
                                    >
                                        <span className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                            <CalendarDaysIcon className="w-4 h-4 text-indigo-600" />
                                        </span>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Diary Order</div>
                                            <div className="text-[10px] font-medium text-gray-500">Style, cover & rate — no ruling</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => addBlock("Custom")}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50 transition-colors group"
                                    >
                                        <span className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                            <ClipboardDocumentListIcon className="w-4 h-4 text-indigo-600" />
                                        </span>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Custom Order</div>
                                            <div className="text-[10px] font-medium text-gray-500">Generic line items</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Delivery + Payment */}
                <div className="space-y-2.5 h-fit">
                    {/* Delivery Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                            <TruckIcon className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Fulfillment</h2>
                        </div>
                        <div className="p-3 space-y-2.5">
                            <div className="space-y-1">
                                <label className={labelClass}>Delivery Type</label>
                                <FilterSelect
                                    value={deliveryType}
                                    onChange={(val) => setDeliveryType(val)}
                                    icon={<TruckIcon className="w-4 h-4" />}
                                    options={[
                                        { value: "Pickup", label: "Pickup In-Store" },
                                        { value: "Delivery", label: "Home Delivery" }
                                    ]}
                                    className="!w-full !rounded-xl !bg-gray-50/30"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>Due Date</label>
                                <div className="relative">
                                    <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none bg-gray-50/30"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Card */}
                    {isEditMode ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                                <BanknotesIcon className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Financial Summary</h2>
                            </div>
                            <div className="p-2.5 space-y-2.5">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Order Total</span>
                                        <span className="text-sm font-black text-gray-900">Rs {totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Already Paid</span>
                                        <span className="text-sm font-black text-emerald-600">Rs {editOrder!.PaidAmount?.toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-gray-100 mx-1" />
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Remaining</span>
                                        <span className={`text-lg font-black tabular-nums ${(totalAmount - editOrder!.PaidAmount) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                            Rs {(totalAmount - editOrder!.PaidAmount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                                    <InformationCircleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">Payments can only be added from the Order Details page.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                                <BanknotesIcon className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Billing & Payment</h2>
                            </div>
                            <div className="p-2.5 space-y-2.5">
                                {blocks.length > 1 && (
                                    <div className="space-y-1 px-1">
                                        {blocks.map((b, idx) => (
                                            <div key={b.id} className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                <span>Block {idx + 1} — {b.type}</span>
                                                <span className="text-gray-600">Rs {blockSubtotal(b).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-indigo-50/50 p-3 flex flex-col items-center justify-center text-center rounded-2xl border border-indigo-100/50">
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Grand Total</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase">Rs</span>
                                        <span className="text-2xl font-black text-indigo-700 tracking-tight tabular-nums">
                                            {totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Advance / Deposit Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">Rs.</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={totalAmount}
                                            value={paidAmount || ""}
                                            onChange={(e) => {
                                                const val = e.target.value ? parseFloat(e.target.value) : "";
                                                setPaidAmount(val === "" ? "" : Math.min(Math.max(val, 0), totalAmount));
                                            }}
                                            placeholder="0.00"
                                            className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-right tabular-nums bg-gray-50/30"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>Payment Method</label>
                                    <FilterSelect
                                        value={paymentMethod}
                                        onChange={(val) => setPaymentMethod(val)}
                                        icon={<BanknotesIcon className="w-4 h-4" />}
                                        options={[
                                            { value: "Cash", label: "Cash" },
                                            { value: "Card", label: "Debit / Credit Card" },
                                            { value: "Bank Transfer", label: "Bank Transfer" }
                                        ]}
                                        className="!w-full !rounded-xl !bg-gray-50/30"
                                    />
                                </div>

                                <div className="pt-1">
                                    <div className="bg-slate-900 rounded-xl p-3 flex justify-between items-center shadow-lg shadow-slate-200">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Balance Due</div>
                                        <div className="text-base font-black text-emerald-400 tabular-nums tracking-tight">
                                            Rs {remaining.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
