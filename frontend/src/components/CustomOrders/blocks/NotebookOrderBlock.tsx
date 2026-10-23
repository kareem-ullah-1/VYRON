"use client";

import { useMemo } from "react";
import { BookOpenIcon, SwatchIcon, Square3Stack3DIcon } from "@heroicons/react/24/outline";
import SuggestInput from "../../POS/SuggestInput";
import notebookSuggestions from "@/data/notebookOrderSuggestions.json";
import { OrderBlock } from "@/store/slices/customOrderSlice";

export interface VariantQty {
    urdu: number;
    english4Line: number;
    box: number;
    narrowLine: number;
}

export interface NotebookBlockData {
    paperSize: string;
    paperQuality: string;
    variantQty: VariantQty;
    bindingType: string;
    printColor: string;
    cardMaterial: string;
    lamination: string;
    binderName: string;
    pagesMode: "single" | "perVariant";
    pagesQty: number | "";
    pagesQtyPerVariant: VariantQty;
    indexPages: string;
    marginLine: string;
    rulingQty: VariantQty;
    paperCost: number | "";
    cardCost: number | "";
    bindingCost: number | "";
    miscCost: number | "";
    unitRate: number | "";
}

const emptyVariantQty = (): VariantQty => ({ urdu: 0, english4Line: 0, box: 0, narrowLine: 0 });

export const createEmptyNotebookBlockData = (): NotebookBlockData => ({
    paperSize: "",
    paperQuality: "",
    variantQty: emptyVariantQty(),
    bindingType: "",
    printColor: "",
    cardMaterial: "",
    lamination: "",
    binderName: "",
    pagesMode: "single",
    pagesQty: "",
    pagesQtyPerVariant: emptyVariantQty(),
    indexPages: "",
    marginLine: "",
    rulingQty: emptyVariantQty(),
    paperCost: "",
    cardCost: "",
    bindingCost: "",
    miscCost: "",
    unitRate: "",
});

export const variantFields: { key: keyof VariantQty; label: string }[] = [
    { key: "urdu", label: "Urdu Notebooks" },
    { key: "english4Line", label: "English 4-Line" },
    { key: "box", label: "Box (Math)" },
    { key: "narrowLine", label: "Narrow Line" },
];

export function notebookBlockQuantity(data: NotebookBlockData): number {
    return data.variantQty.urdu + data.variantQty.english4Line + data.variantQty.box + data.variantQty.narrowLine;
}

export function notebookBlockSubtotal(data: NotebookBlockData): number {
    return notebookBlockQuantity(data) * (typeof data.unitRate === "number" ? data.unitRate : 0);
}

export function notebookBlockItems(data: NotebookBlockData) {
    return variantFields
        .filter(v => data.variantQty[v.key] > 0)
        .map(v => ({ Name: v.label, Qty: data.variantQty[v.key], Price: typeof data.unitRate === "number" ? data.unitRate : 0, Notes: null as string | null }));
}

export function notebookBlockToDTO(data: NotebookBlockData) {
    return {
        PaperSize: data.paperSize || null,
        PaperQuality: data.paperQuality || null,
        BindingType: data.bindingType || null,
        PrintColor: data.printColor || null,
        CardMaterial: data.cardMaterial || null,
        Lamination: data.lamination || null,
        BinderName: data.binderName.trim() || null,
        IndexPages: data.indexPages || null,
        MarginLine: data.marginLine || null,
        PagesQty: data.pagesMode === "single"
            ? {
                Urdu: typeof data.pagesQty === "number" ? data.pagesQty : 0,
                English4Line: typeof data.pagesQty === "number" ? data.pagesQty : 0,
                Box: typeof data.pagesQty === "number" ? data.pagesQty : 0,
                NarrowLine: typeof data.pagesQty === "number" ? data.pagesQty : 0,
            }
            : {
                Urdu: data.pagesQtyPerVariant.urdu,
                English4Line: data.pagesQtyPerVariant.english4Line,
                Box: data.pagesQtyPerVariant.box,
                NarrowLine: data.pagesQtyPerVariant.narrowLine,
            },
        RulingQty: {
            Urdu: data.rulingQty.urdu,
            English4Line: data.rulingQty.english4Line,
            Box: data.rulingQty.box,
            NarrowLine: data.rulingQty.narrowLine,
        },
        ProductionCosts: {
            PaperCost: typeof data.paperCost === "number" ? data.paperCost : null,
            CardCost: typeof data.cardCost === "number" ? data.cardCost : null,
            BindingCost: typeof data.bindingCost === "number" ? data.bindingCost : null,
            MiscCost: typeof data.miscCost === "number" ? data.miscCost : null,
        },
    };
}

export function notebookBlockFromOrderBlock(block: OrderBlock): NotebookBlockData {
    const data = createEmptyNotebookBlockData();
    const labelToKey: Record<string, keyof VariantQty> = {
        "Urdu Notebooks": "urdu",
        "English 4-Line": "english4Line",
        "Box (Math)": "box",
        "Narrow Line": "narrowLine",
    };
    const variantQty = emptyVariantQty();
    let derivedRate = 0;
    (block.Items || []).forEach(item => {
        const key = labelToKey[item.Name];
        if (key) {
            variantQty[key] = item.Qty;
            derivedRate = item.Price;
        }
    });
    data.variantQty = variantQty;
    if (derivedRate) data.unitRate = derivedRate;

    const nd = block.NotebookDetails;
    if (nd) {
        data.paperSize = nd.PaperSize || "";
        data.paperQuality = nd.PaperQuality || "";
        data.bindingType = nd.BindingType || "";
        data.printColor = nd.PrintColor || "";
        data.cardMaterial = nd.CardMaterial || "";
        data.lamination = nd.Lamination || "";
        data.binderName = nd.BinderName || "";
        data.indexPages = nd.IndexPages || "";
        data.marginLine = nd.MarginLine || "";
        const p: VariantQty = {
            urdu: nd.PagesQty?.Urdu || 0,
            english4Line: nd.PagesQty?.English4Line || 0,
            box: nd.PagesQty?.Box || 0,
            narrowLine: nd.PagesQty?.NarrowLine || 0,
        };
        const sameAcrossVariants = p.urdu === p.english4Line && p.urdu === p.box && p.urdu === p.narrowLine;
        if (sameAcrossVariants) {
            data.pagesMode = "single";
            data.pagesQty = p.urdu || "";
        } else {
            data.pagesMode = "perVariant";
            data.pagesQtyPerVariant = p;
        }
        data.rulingQty = {
            urdu: nd.RulingQty?.Urdu || 0,
            english4Line: nd.RulingQty?.English4Line || 0,
            box: nd.RulingQty?.Box || 0,
            narrowLine: nd.RulingQty?.NarrowLine || 0,
        };
        data.paperCost = nd.ProductionCosts?.PaperCost ?? "";
        data.cardCost = nd.ProductionCosts?.CardCost ?? "";
        data.bindingCost = nd.ProductionCosts?.BindingCost ?? "";
        data.miscCost = nd.ProductionCosts?.MiscCost ?? "";
    }
    return data;
}

const inputClass = "w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50/30";
const labelClass = "text-[10px] font-bold text-gray-400 uppercase tracking-wider block ml-1";

interface Props {
    data: NotebookBlockData;
    onChange: (patch: Partial<NotebookBlockData>) => void;
}

export default function NotebookOrderBlock({ data, onChange }: Props) {
    const totalQuantity = useMemo(() => notebookBlockQuantity(data), [data.variantQty]);
    const totalRulingQty = useMemo(
        () => data.rulingQty.urdu + data.rulingQty.english4Line + data.rulingQty.box + data.rulingQty.narrowLine,
        [data.rulingQty]
    );
    const totalProductionCost = useMemo(
        () => (typeof data.paperCost === "number" ? data.paperCost : 0)
            + (typeof data.cardCost === "number" ? data.cardCost : 0)
            + (typeof data.bindingCost === "number" ? data.bindingCost : 0)
            + (typeof data.miscCost === "number" ? data.miscCost : 0),
        [data.paperCost, data.cardCost, data.bindingCost, data.miscCost]
    );

    const updateVariant = (field: "variantQty" | "pagesQtyPerVariant" | "rulingQty", key: keyof VariantQty, value: number) => {
        onChange({ [field]: { ...data[field], [key]: value } } as Partial<NotebookBlockData>);
    };

    return (
        <div className="space-y-2">
            {/* Notebook Variants */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpenIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Ordered Variants (Finished Quantity)</h3>
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        Total: {totalQuantity}
                    </div>
                </div>
                {/* Pages-per-book mode selector — controls whether one page count covers every
                    ruling type, or each ruling type gets its own page count entered below. */}
                <div className="px-3 py-2 bg-indigo-50/40 border-b border-gray-50 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pages per Book</span>
                    <div className="flex rounded-lg bg-white border border-gray-200 p-0.5">
                        {([["single", "Same for all rulings"], ["perVariant", "Different per ruling"]] as const).map(([mode, label]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onChange({ pagesMode: mode })}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${data.pagesMode === mode ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] text-gray-400 normal-case tracking-normal">
                        {data.pagesMode === "single"
                            ? "One page count applies to every ruling type."
                            : "Enter a page count beneath each ruling type below."}
                    </span>
                </div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {variantFields.map(v => (
                        <div key={v.key} className="space-y-1">
                            <label className={labelClass}>{v.label}</label>
                            <input
                                type="number"
                                min={0}
                                value={data.variantQty[v.key] || ""}
                                onChange={(e) => updateVariant("variantQty", v.key, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className={`${inputClass} text-right tabular-nums`}
                            />
                            {data.pagesMode === "perVariant" && (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase tracking-wide">Pgs</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={data.pagesQtyPerVariant[v.key] || ""}
                                        onChange={(e) => updateVariant("pagesQtyPerVariant", v.key, parseInt(e.target.value) || 0)}
                                        placeholder="pages / book"
                                        title={`Pages per book — ${v.label}`}
                                        className={`${inputClass} pl-10 text-right tabular-nums placeholder:text-[10px]`}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="space-y-1">
                        <label className={labelClass}>Pages / Book</label>
                        {data.pagesMode === "single" ? (
                            <input
                                type="number"
                                min={0}
                                value={data.pagesQty}
                                onChange={(e) => onChange({ pagesQty: e.target.value ? parseInt(e.target.value) : "" })}
                                placeholder="0"
                                className={`${inputClass} text-right tabular-nums`}
                            />
                        ) : (
                            <div className={`${inputClass} !font-normal text-gray-400 text-[11px]`}>
                                ↑ set per ruling above
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className={labelClass}>Index</label>
                        <SuggestInput
                            value={data.indexPages}
                            onChange={(v) => onChange({ indexPages: v })}
                            suggestions={notebookSuggestions.indexPages}
                            placeholder=""
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
                <div className="px-3 pb-3 pt-2.5 border-t border-gray-50">
                    <div className="space-y-1 w-40">
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

            {/* Production & Ruling */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-2.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Square3Stack3DIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Production & Ruling</h3>
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        Paper Total: {totalRulingQty}
                    </div>
                </div>
                <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Paper allocation for ruling */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Total Paper Issued for Ruling</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {variantFields.map(v => (
                                <div key={v.key} className="space-y-1">
                                    <label className={labelClass}>{v.label}</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={data.rulingQty[v.key] || ""}
                                        onChange={(e) => updateVariant("rulingQty", v.key, parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className={`${inputClass} text-right tabular-nums`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Production costs */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Production Costs</p>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total: Rs {totalProductionCost.toLocaleString()}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
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
            </div>
        </div>
    );
}
