"use client";

import { useMemo } from "react";
import { CalendarDaysIcon, SwatchIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import SuggestInput from "../../POS/SuggestInput";
import notebookSuggestions from "@/data/notebookOrderSuggestions.json";
import { OrderBlock } from "@/store/slices/customOrderSlice";

export interface DiaryBlockData {
    paperSize: string;
    paperQuality: string;
    style: string;
    bindingType: string;
    printColor: string;
    cardMaterial: string;
    lamination: string;
    binderName: string;
    indexPages: string;
    marginLine: string;
    totalQty: number | "";
    pagesQty: number | "";
    unitRate: number | "";
    paperCost: number | "";
    cardCost: number | "";
    bindingCost: number | "";
    miscCost: number | "";
}

export const createEmptyDiaryBlockData = (): DiaryBlockData => ({
    paperSize: "",
    paperQuality: "",
    style: "",
    bindingType: "",
    printColor: "",
    cardMaterial: "",
    lamination: "",
    binderName: "",
    indexPages: "",
    marginLine: "",
    totalQty: "",
    pagesQty: "",
    unitRate: "",
    paperCost: "",
    cardCost: "",
    bindingCost: "",
    miscCost: "",
});

export function diaryBlockSubtotal(data: DiaryBlockData): number {
    const qty = typeof data.totalQty === "number" ? data.totalQty : 0;
    const rate = typeof data.unitRate === "number" ? data.unitRate : 0;
    return qty * rate;
}

export function diaryBlockItems(data: DiaryBlockData) {
    const qty = typeof data.totalQty === "number" ? data.totalQty : 0;
    if (qty <= 0) return [];
    return [{ Name: "Diaries", Qty: qty, Price: typeof data.unitRate === "number" ? data.unitRate : 0, Notes: null as string | null }];
}

export function diaryBlockToDTO(data: DiaryBlockData) {
    return {
        PaperSize: data.paperSize || null,
        PaperQuality: data.paperQuality || null,
        Style: data.style || null,
        BindingType: data.bindingType || null,
        PrintColor: data.printColor || null,
        CardMaterial: data.cardMaterial || null,
        Lamination: data.lamination || null,
        BinderName: data.binderName.trim() || null,
        IndexPages: data.indexPages || null,
        MarginLine: data.marginLine || null,
        PagesQty: typeof data.pagesQty === "number" ? data.pagesQty : 0,
        ProductionCosts: {
            PaperCost: typeof data.paperCost === "number" ? data.paperCost : null,
            CardCost: typeof data.cardCost === "number" ? data.cardCost : null,
            BindingCost: typeof data.bindingCost === "number" ? data.bindingCost : null,
            MiscCost: typeof data.miscCost === "number" ? data.miscCost : null,
        },
    };
}

export function diaryBlockFromOrderBlock(block: OrderBlock): DiaryBlockData {
    const data = createEmptyDiaryBlockData();
    const item = block.Items?.[0];
    if (item) {
        data.totalQty = item.Qty;
        data.unitRate = item.Price;
    }

    const dd = block.DiaryDetails;
    if (dd) {
        data.paperSize = dd.PaperSize || "";
        data.paperQuality = dd.PaperQuality || "";
        data.style = dd.Style || "";
        data.bindingType = dd.BindingType || "";
        data.printColor = dd.PrintColor || "";
        data.cardMaterial = dd.CardMaterial || "";
        data.lamination = dd.Lamination || "";
        data.binderName = dd.BinderName || "";
        data.indexPages = dd.IndexPages || "";
        data.marginLine = dd.MarginLine || "";
        data.pagesQty = dd.PagesQty || "";
        data.paperCost = dd.ProductionCosts?.PaperCost ?? "";
        data.cardCost = dd.ProductionCosts?.CardCost ?? "";
        data.bindingCost = dd.ProductionCosts?.BindingCost ?? "";
        data.miscCost = dd.ProductionCosts?.MiscCost ?? "";
    }
    return data;
}

const inputClass = "w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50/30";
const labelClass = "text-[10px] font-bold text-gray-400 uppercase tracking-wider block ml-1";

interface Props {
    data: DiaryBlockData;
    onChange: (patch: Partial<DiaryBlockData>) => void;
}

export default function DiaryOrderBlock({ data, onChange }: Props) {
    const totalProductionCost = useMemo(
        () => (typeof data.paperCost === "number" ? data.paperCost : 0)
            + (typeof data.cardCost === "number" ? data.cardCost : 0)
            + (typeof data.bindingCost === "number" ? data.bindingCost : 0)
            + (typeof data.miscCost === "number" ? data.miscCost : 0),
        [data.paperCost, data.cardCost, data.bindingCost, data.miscCost]
    );

    return (
        <div className="space-y-2">
            {/* Diaries Ordered */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Diaries Ordered</h3>
                    </div>
                </div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                        <label className={labelClass}>Total Diaries Qty</label>
                        <input
                            type="number"
                            min={0}
                            value={data.totalQty}
                            onChange={(e) => onChange({ totalQty: e.target.value ? parseInt(e.target.value) : "" })}
                            placeholder="0"
                            className={`${inputClass} text-right tabular-nums`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>No. of Pages</label>
                        <input
                            type="number"
                            min={0}
                            value={data.pagesQty}
                            onChange={(e) => onChange({ pagesQty: e.target.value ? parseInt(e.target.value) : "" })}
                            placeholder="0"
                            className={`${inputClass} text-right tabular-nums`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Rate</label>
                        <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={data.unitRate}
                            onChange={(e) => onChange({ unitRate: e.target.value ? parseFloat(e.target.value) : "" })}
                            placeholder="0.00"
                            className={`${inputClass} text-right tabular-nums`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Index</label>
                        <SuggestInput
                            value={data.indexPages}
                            onChange={(v) => onChange({ indexPages: v })}
                            suggestions={notebookSuggestions.indexPages}
                            placeholder="None"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Margin Line</label>
                        <select
                            value={data.marginLine}
                            onChange={(e) => onChange({ marginLine: e.target.value })}
                            className={`${inputClass} ${data.marginLine ? "" : "!font-normal text-gray-400"}`}
                        >
                            <option value="">—</option>
                            <option value="Single">Single</option>
                            <option value="Double">Double</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Cover & Finishing */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                    <SwatchIcon className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Cover & Finishing Specifications</h3>
                </div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                        <label className={labelClass}>Paper Size</label>
                        <SuggestInput value={data.paperSize} onChange={(v) => onChange({ paperSize: v })} suggestions={notebookSuggestions.paperSize} placeholder="e.g. 20x30" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Paper Quality</label>
                        <SuggestInput value={data.paperQuality} onChange={(v) => onChange({ paperQuality: v })} suggestions={notebookSuggestions.paperQuality} placeholder="e.g. Al-Karam" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Style</label>
                        <SuggestInput value={data.style} onChange={(v) => onChange({ style: v })} suggestions={notebookSuggestions.diaryStyle} placeholder="e.g. Executive" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Binding Type</label>
                        <SuggestInput value={data.bindingType} onChange={(v) => onChange({ bindingType: v })} suggestions={notebookSuggestions.bindingType} placeholder="e.g. Stitched, Spiral" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Print Color</label>
                        <SuggestInput value={data.printColor} onChange={(v) => onChange({ printColor: v })} suggestions={notebookSuggestions.printColor} placeholder="e.g. 1-Color, 4-Color" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Card Material</label>
                        <SuggestInput value={data.cardMaterial} onChange={(v) => onChange({ cardMaterial: v })} suggestions={notebookSuggestions.cardMaterial} placeholder="Cover board type" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Lamination</label>
                        <SuggestInput value={data.lamination} onChange={(v) => onChange({ lamination: v })} suggestions={notebookSuggestions.lamination} placeholder="e.g. Gloss, Matte, UV" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Binder Name</label>
                        <input
                            type="text"
                            value={data.binderName}
                            onChange={(e) => onChange({ binderName: e.target.value })}
                            placeholder="Binder name"
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* Production Costs */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BanknotesIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Production Costs</h3>
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total: Rs {totalProductionCost.toLocaleString()}</div>
                </div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                        <label className={labelClass}>Paper Cost</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rs.</span>
                            <input type="number" min={0} step={0.01} value={data.paperCost} onChange={(e) => onChange({ paperCost: e.target.value ? parseFloat(e.target.value) : "" })} placeholder="0.00" className={`${inputClass} pl-8 text-right tabular-nums`} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Card Cost</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rs.</span>
                            <input type="number" min={0} step={0.01} value={data.cardCost} onChange={(e) => onChange({ cardCost: e.target.value ? parseFloat(e.target.value) : "" })} placeholder="0.00" className={`${inputClass} pl-8 text-right tabular-nums`} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Binding Cost</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rs.</span>
                            <input type="number" min={0} step={0.01} value={data.bindingCost} onChange={(e) => onChange({ bindingCost: e.target.value ? parseFloat(e.target.value) : "" })} placeholder="0.00" className={`${inputClass} pl-8 text-right tabular-nums`} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Misc Cost</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rs.</span>
                            <input type="number" min={0} step={0.01} value={data.miscCost} onChange={(e) => onChange({ miscCost: e.target.value ? parseFloat(e.target.value) : "" })} placeholder="0.00" className={`${inputClass} pl-8 text-right tabular-nums`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
