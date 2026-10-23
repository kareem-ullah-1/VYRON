"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { OrderBlock } from "@/store/slices/customOrderSlice";

export interface ItemRow {
    name: string;
    qty: number;
    price: number;
    notes: string;
}

export interface CustomBlockData {
    items: ItemRow[];
}

export const createEmptyCustomBlockData = (): CustomBlockData => ({
    items: [{ name: "", qty: 1, price: 0, notes: "" }],
});

export function customBlockSubtotal(data: CustomBlockData): number {
    return data.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function customBlockToItemsDTO(data: CustomBlockData) {
    return data.items.map(i => ({ Name: i.name, Qty: i.qty, Price: i.price, Notes: i.notes || null }));
}

export function customBlockFromOrderBlock(block: OrderBlock): CustomBlockData {
    return {
        items: block.Items?.length
            ? block.Items.map(i => ({ name: i.Name, qty: i.Qty, price: i.Price, notes: i.Notes || "" }))
            : [{ name: "", qty: 1, price: 0, notes: "" }],
    };
}

interface Props {
    data: CustomBlockData;
    onChange: (patch: Partial<CustomBlockData>) => void;
}

export default function CustomOrderBlock({ data, onChange }: Props) {
    const addItem = () => {
        onChange({ items: [...data.items, { name: "", qty: 1, price: 0, notes: "" }] });
    };
    const removeItem = (index: number) => {
        if (data.items.length <= 1) return;
        onChange({ items: data.items.filter((_, i) => i !== index) });
    };
    const updateItem = (index: number, field: keyof ItemRow, value: any) => {
        const updated = [...data.items];
        (updated[index] as any)[field] = value;
        onChange({ items: updated });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Order Line Items</h3>
                <button onClick={addItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-white border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-all shadow-sm active:scale-95">
                    <PlusIcon className="w-3 h-3 stroke-[3]" /> Add Row
                </button>
            </div>
            <div className="p-3 space-y-2.5">
                {data.items.map((item, idx) => (
                    <div key={idx} className="relative p-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-indigo-100 transition-colors group">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-6 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block ml-1">Item Name / Service *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Action Register"
                                    value={item.name}
                                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                                    className="w-full px-4 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block ml-1">Quantity</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={item.qty}
                                    onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-right tabular-nums"
                                />
                            </div>
                            <div className="md:col-span-4 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block ml-1">Unit Price (Rs)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">Rs.</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={item.price || ""}
                                        onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                                        className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-right tabular-nums"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-12 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block ml-1">Specific Instructions (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Color, material, or packaging requirements..."
                                    value={item.notes}
                                    onChange={(e) => updateItem(idx, "notes", e.target.value)}
                                    className="w-full px-4 py-1.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:font-normal placeholder:italic"
                                />
                            </div>
                        </div>

                        {data.items.length > 1 && (
                            <button
                                onClick={() => removeItem(idx)}
                                className="absolute -top-2 -right-2 p-2 bg-white text-rose-500 border border-gray-100 rounded-xl shadow-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                title="Remove item row"
                            >
                                <TrashIcon className="w-4 h-4 stroke-[2]" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
