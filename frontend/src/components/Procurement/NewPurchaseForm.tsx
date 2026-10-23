"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchSuppliers } from "@/store/slices/supplierSlice";
import { fetchRawMaterials } from "@/store/slices/rawMaterialSlice";
import { fetchPurchases } from "@/store/slices/purchaseSlice";
import { PlusIcon, TrashIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useProgressRouter } from "@/components/Navigation";
import api from "@/lib/axios";
import { toast } from "sonner";
import FilterSelect from "../POS/FilterSelect";
import { UserIcon, BeakerIcon } from "@heroicons/react/24/outline";

interface PurchaseLineItem {
    rawMaterialId: number | "";
    quantity: number;
    unitPrice: number;
}

export default function NewPurchaseForm() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useProgressRouter();

    const { suppliers, loading: loadingSuppliers } = useSelector((state: RootState) => state.supplier);
    const { rawMaterials, loading: loadingMaterials } = useSelector((state: RootState) => state.rawMaterial);

    const [supplierId, setSupplierId] = useState<number | "">("");
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
    const [invoiceNumber, setInvoiceNumber] = useState("");

    // Line items starting with 1 empty row
    const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([
        { rawMaterialId: "", quantity: 1, unitPrice: 0 }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        dispatch(fetchSuppliers());
        dispatch(fetchRawMaterials());
    }, [dispatch]);

    const addLineItem = () => {
        setLineItems([...lineItems, { rawMaterialId: "", quantity: 1, unitPrice: 0 }]);
    };

    const removeLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const updateLineItem = (index: number, field: keyof PurchaseLineItem, value: any) => {
        const newItems = [...lineItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setLineItems(newItems);
    };

    const grandTotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierId) return toast.error("Please select a supplier");
        if (lineItems.length === 0) return toast.error("Please add at least one item");
        if (lineItems.some(item => !item.rawMaterialId)) return toast.error("Please select a material for all rows");

        setIsSubmitting(true);
        try {
            const payload = {
                supplierId,
                purchaseDate: new Date(purchaseDate).toISOString(),
                invoiceNumber,
                purchaseDetails: lineItems.map(item => ({
                    rawMaterialId: Number(item.rawMaterialId),
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice)
                }))
            };

            await api.post("/Purchase/AddPurchase", payload);
            toast.success("Purchase created successfully!");
            dispatch(fetchPurchases()); // Refresh cache
            router.push("/procurement/purchases");
        } catch (error: any) {
            console.error("Failed to submit purchase", error);
            toast.error("Failed to submit purchase: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-indigo-600 font-medium">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Purchases
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium shadow-md transition-all">
                    {isSubmitting ? "Saving..." : "Create Purchase"}
                </button>
            </div>

            {/* Top Section: Master Record */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Purchase Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                        <FilterSelect
                            value={String(supplierId)}
                            onChange={(val) => setSupplierId(val === "" ? "" : Number(val))}
                            icon={<UserIcon className="w-4 h-4" />}
                            options={[
                                { value: "", label: "Select Supplier" },
                                ...suppliers.map(s => ({ value: String(s.id), label: s.name }))
                            ]}
                            searchable
                            searchPlaceholder="Search suppliers..."
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                        <input
                            type="date"
                            required
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                            type="text"
                            placeholder="Optional"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Section: Line Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-semibold text-gray-800">Items Ordered</h3>
                    <button
                        type="button"
                        onClick={addLineItem}
                        className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        <PlusIcon className="w-4 h-4 mr-1" /> Add Row
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left">
                        <thead>
                            <tr className="text-sm text-gray-500 border-b">
                                <th className="pb-2 w-1/2">Raw Material</th>
                                <th className="pb-2 w-1/6">Quantity</th>
                                <th className="pb-2 w-1/6">Unit Price</th>
                                <th className="pb-2 w-1/6 text-right">Subtotal</th>
                                <th className="pb-2 w-12 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100 last:border-0">
                                    <td className="py-3 pr-2">
                                        <FilterSelect
                                            value={String(item.rawMaterialId)}
                                            onChange={(val) => updateLineItem(index, 'rawMaterialId', val === "" ? "" : Number(val))}
                                            icon={<BeakerIcon className="w-4 h-4" />}
                                            options={[
                                                { value: "", label: "Select Material..." },
                                                ...(!loadingMaterials ? (rawMaterials || []).map(rm => ({
                                                    value: String(rm.id),
                                                    label: `${rm.name} (Stock: ${rm.currentStockQuantity})`
                                                })) : [])
                                            ]}
                                            searchable
                                            searchPlaceholder="Search material..."
                                            className="w-full"
                                        />
                                    </td>
                                    <td className="py-3 px-2">
                                        <input
                                            type="number"
                                            required
                                            min="0.01"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full rounded border-gray-300 border p-2 outline-none focus:border-indigo-500 text-sm"
                                        />
                                    </td>
                                    <td className="py-3 px-2">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full rounded border-gray-300 border p-2 outline-none focus:border-indigo-500 text-sm"
                                        />
                                    </td>
                                    <td className="py-3 px-2 text-right font-medium text-gray-800">
                                        Rs {(item.quantity * item.unitPrice).toFixed(2)}
                                    </td>
                                    <td className="py-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeLineItem(index)}
                                            className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end items-center text-xl">
                    <span className="font-medium text-gray-500 mr-4">Grand Total:</span>
                    <span className="font-bold text-gray-900">Rs {grandTotal.toFixed(2)}</span>
                </div>
            </div>
        </form>
    );
}
