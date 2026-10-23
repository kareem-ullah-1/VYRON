"use client";
import { useEffect, useRef, useState } from "react";
import {
    QrCodeIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    PhotoIcon,
    XMarkIcon,
    ChevronRightIcon,
    InformationCircleIcon,
    ClipboardDocumentListIcon,
    FunnelIcon,
    TagIcon
} from "@heroicons/react/24/outline";
import { useFormik, FieldArray, FormikProvider } from "formik";
import * as Yup from "yup";
import { Product } from "@/store/slices/productsSlice";
import api from "@/lib/axios";
import { toast } from "sonner";
import { addProduct, updateProduct } from "@/Apis/Product";
import FilterSelect from "../POS/FilterSelect";
import { ConfirmModal } from "../ui/ConfirmModal";

// --- Type Definitions ---

interface Attribute {
    attributeId: number;
    attributeName: string;
    attributeValue: string;
    Values: [];
}

interface Variant {
    id?: number;
    price: number;
    stock: number;
    variantName?: string;
    attributes: Attribute[];
}

interface ProductPayload {
    productName: string;
    romanUrduName: string;
    category: string;
    categoryId: number;
    description: string;
    productBarCode: string;
    addVariant: Boolean;
    variants: Variant[];
}

interface ProductScreenProps {
    product: Product | null;
    onBack?: () => void;
}

interface APIAttribute {
    Id: number;
    Name: string;
    type: string;
    values: string[];
    Values?: string[];
    isActive: boolean;
}

const newEmptyAttribute: Attribute = {
    attributeId: 0,
    attributeName: "",
    attributeValue: "",
    Values: [],
};

const initialVariant: Variant = {
    price: 0,
    stock: 0,
    attributes: [],
};

interface Category {
    Id: number;
    Name: string;
}

export default function ProductScreen({ product, onBack }: ProductScreenProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [allAttributes, setAllAttributes] = useState<APIAttribute[]>([]);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set());
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const variantRefs = useRef<(HTMLDivElement | null)[]>([]);

    const formik = useFormik<ProductPayload>({
        initialValues: {
            productName: "",
            romanUrduName: "",
            category: "",
            categoryId: 0,
            description: "",
            productBarCode: "",
            addVariant: true,
            variants: [initialVariant],
        },
        validationSchema: Yup.object({
            productName: Yup.string().trim().required("Product Name is required"),
            category: Yup.string().required("Category is required"),
            productBarCode: Yup.string().optional(),
            variants: Yup.array()
                .of(
                    Yup.object().shape({
                        price: Yup.number()
                            .typeError("Price must be a number")
                            .required("Price is required")
                            .min(0, "Price cannot be negative"),
                        stock: Yup.number()
                            .typeError("Stock must be a number")
                            .required("Stock is required")
                            .min(0, "Stock cannot be negative"),
                        attributes: Yup.array()
                            .of(
                                Yup.object({
                                    attributeName: Yup.string().nullable(),
                                    attributeValue: Yup.string().nullable(),
                                }).test(
                                    "both-or-none",
                                    "Both name and value are required",
                                    function (value) {
                                        const hasName = !!value?.attributeName?.trim();
                                        const hasValue = !!value?.attributeValue?.trim();
                                        if ((hasName && !hasValue) || (!hasName && hasValue)) {
                                            return this.createError({
                                                message: "Both name and value are required",
                                            });
                                        }
                                        return true;
                                    }
                                )
                            )
                            .optional(),
                    })
                )
                .min(1, "At least one variant is required"),
        }),

        onSubmit: async (values) => {
            const payload = {
                productName: values.productName,
                romanUrduName: values.romanUrduName,
                description: values.description,
                category: values.category,
                categoryId: values.categoryId,
                productBarCode: values.productBarCode,
                variants: values.variants.map((v) => ({
                    id: v.id || 0,
                    price: v.price,
                    stock: v.stock,
                    attributes: v.attributes.map((a) => ({
                        attributeId: a.attributeId,
                        attributeName: a.attributeName,
                        attributeValue: a.attributeValue,
                    })),
                })),
                addVariant: values.addVariant,
            };

            try {
                let response;
                if (product && product.Id) {
                    response = await updateProduct(product.Id, payload, selectedImages);
                } else {
                    response = await addProduct(payload, selectedImages);
                }

                if (response.isSuccess) {
                    toast.success(response.message || (product ? "Product updated!" : "Product added!"));
                    if (onBack) onBack();
                } else {
                    toast.error(`❌ Failed: ${response.message || "Unknown error"}`);
                }
            } catch (error) {
                toast.error(`⚠️ Error occurred while saving.`);
            }
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [attrRes, catRes] = await Promise.all([
                    api.get("Attributes/GetAllAttributes"),
                    api.get("/Category/GetCategories"),
                ]);
                setAllAttributes(attrRes.data?.data || []);
                setCategories(catRes.data?.data || []);
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (product) {
            formik.setValues({
                productName: product.ProductName || "",
                romanUrduName: product.RomanUrduName || "",
                category: product.Category || "",
                categoryId: product.CategoryId || 0,
                description: product.Description || "",
                productBarCode: product.ProductBarCode || product.ProductCode || "",
                addVariant: Boolean(product?.Variants?.length),
                variants: (product.Variants?.length
                    ? product.Variants.map((v) => ({
                        id: v.Id,
                        price: v.Price,
                        stock: v.Stock ?? 0,
                        variantName: v.VariantName || "",
                        attributes: v.Attributes?.length
                            ? v.Attributes.map((attr) => ({
                                attributeId: attr.AttributeId || attr.Id,
                                attributeName: attr.AttributeName,
                                attributeValue: attr.AttributeValue,
                                Values: [],
                            }))
                            : [],
                    }))
                    : [
                        {
                            price: product.Price || 0,
                            stock: product.Stock || 0,
                            variantName: "",
                            attributes: [],
                        },
                    ]) as any,
            });
            setExpandedVariants(new Set());
        } else {
            setExpandedVariants(new Set([0]));
        }
    }, [product]);

    useEffect(() => {
        if (product?.ProductImages?.length) {
            setImagePreviews(product.ProductImages);
        } else {
            setImagePreviews([]);
            setSelectedImages([]);
        }
    }, [product]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setSelectedImages((prev) => [...prev, ...files]);
        const newPreviews = files.map((f) => URL.createObjectURL(f));
        setImagePreviews((prev) => [...prev, ...newPreviews]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeImage = (index: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Remove Image",
            message: "Are you sure you want to remove this image?",
            onConfirm: () => {
                setSelectedImages((prev) => prev.filter((_, i) => i !== index));
                setImagePreviews((prev) => prev.filter((_, i) => i !== index));
            }
        });
    };

    const toggleVariant = (index: number) => {
        setExpandedVariants(prev => {
            const next = new Set<number>();
            if (!prev.has(index)) {
                next.add(index);
                
                // Auto-scroll to the expanded variant after it renders
                setTimeout(() => {
                    variantRefs.current[index]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);
            }
            return next;
        });
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="text-gray-500 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition-all">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                            {product ? "Edit Product" : "Create Product"}
                        </h2>
                        {formik.values.romanUrduName && (
                            <p className="text-sm font-medium text-gray-500 mt-0.5 italic flex items-center gap-1.5">
                                <span className="text-gray-300">|</span> {formik.values.romanUrduName}
                            </p>
                        )}
                        {!formik.values.romanUrduName && (
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                {product ? `Editing: ${product.ProductName}` : "New Listing Details"}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm">
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        form="product-form"
                        disabled={formik.isSubmitting}
                        className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-md shadow-indigo-200 active:scale-95"
                    >
                        {formik.isSubmitting ? "Saving..." : product ? "Update Product" : "Save Product"}
                    </button>
                </div>
            </div>

            <FormikProvider value={formik}>
                <form id="product-form" onSubmit={formik.handleSubmit} className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Basic Info */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                                    <InformationCircleIcon className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Basic Information</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                                Product Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Action Register"
                                                {...formik.getFieldProps("productName")}
                                                className={`w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 ${formik.touched.productName && formik.errors.productName ? 'border-red-500 bg-red-50/10' : ''}`}
                                            />
                                            {formik.touched.productName && formik.errors.productName && (
                                                <p className="text-red-500 text-[10px] font-bold uppercase ml-1 tracking-tight">{formik.errors.productName}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                                Category <span className="text-red-500">*</span>
                                            </label>
                                            <FilterSelect
                                                value={String(formik.values.categoryId)}
                                                onChange={(val) => {
                                                    const selectedId = Number(val);
                                                    const selected = categories.find(c => c.Id === selectedId);
                                                    formik.setFieldValue("categoryId", selectedId);
                                                    formik.setFieldValue("category", selected?.Name || "");
                                                }}
                                                icon={<FunnelIcon className="w-4 h-4" />}
                                                options={[
                                                    { value: "0", label: "Select a category" },
                                                    ...categories.map(cat => ({ value: String(cat.Id), label: cat.Name }))
                                                ]}
                                                searchable
                                                className="!w-full !rounded-xl !bg-gray-50/50 focus-within:!bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Roman Urdu Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Register Karwai"
                                                {...formik.getFieldProps("romanUrduName")}
                                                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Barcode / SKU</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Scan or enter manually"
                                                        {...formik.getFieldProps("productBarCode")}
                                                        className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 font-mono"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toast.info("Barcode scan triggered")}
                                                    className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-sm active:scale-95 group">
                                                    <QrCodeIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Detailed Description</label>
                                        <textarea
                                            {...formik.getFieldProps("description")}
                                            rows={4}
                                            placeholder="Provide key details about the product..."
                                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-gray-700 placeholder:font-normal placeholder:text-gray-400 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Media */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                                    <PhotoIcon className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Product Media</h3>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group bg-gray-50/20">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ring-4 ring-white group-hover:ring-indigo-100/50">
                                            <PhotoIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <p className="text-[11px] text-gray-700 font-bold uppercase tracking-wider">Click to upload</p>
                                        <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Max 5 high-res images</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </div>

                                    {imagePreviews.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 pt-2">
                                            {imagePreviews.map((src, idx) => (
                                                <div key={idx} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ring-1 ring-gray-100">
                                                    <img
                                                        src={src}
                                                        alt="preview"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg p-1 shadow-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                                        <XMarkIcon className="w-3.5 h-3.5 stroke-[3]" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Variants Section */}
                        <div className="lg:col-span-12">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-indigo-50 rounded-xl">
                                            <ClipboardDocumentListIcon className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Configuration Variants</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Define sizes, colors & individual stock</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newIndex = formik.values.variants.length;
                                            formik.setFieldValue("variants", [...formik.values.variants, initialVariant]);
                                            setExpandedVariants(prev => new Set(Array.from(prev).concat(newIndex)));
                                        }}
                                        className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add Variant
                                    </button>
                                </div>

                                <div className="p-6">
                                    <FieldArray
                                        name="variants"
                                        render={(arrayHelpers) => (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 w-full items-start">
                                                {formik.values.variants.map((variant, vIndex) => (
                                                    <div 
                                                        key={vIndex} 
                                                        ref={(el) => { variantRefs.current[vIndex] = el; }}
                                                        className={`w-full scroll-mt-24 border rounded-2xl overflow-hidden transition-all ${expandedVariants.has(vIndex) ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-gray-200 hover:border-gray-300 shadow-sm'}`}
                                                    >
                                                        {/* Variant Header */}
                                                        <div
                                                            className={`flex items-center gap-4 px-5 py-4 cursor-pointer select-none transition-colors ${expandedVariants.has(vIndex) ? 'bg-indigo-50/50' : 'bg-white'}`}
                                                            onClick={() => toggleVariant(vIndex)}
                                                        >
                                                            <div className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${expandedVariants.has(vIndex) ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                                                <ChevronRightIcon className={`w-4 h-4 transition-transform duration-200 ${expandedVariants.has(vIndex) ? "rotate-90 text-indigo-600" : "text-gray-500"}`} />
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-800 flex-1 min-w-0 break-words leading-snug">
                                                                {variant.variantName || `Variant ${vIndex + 1}`}
                                                            </span>
                                                            <div className="flex items-center gap-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Price</span>
                                                                    <div className="text-xs font-bold text-gray-900 tabular-nums">
                                                                        Rs {Number(variant.price).toLocaleString()}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Stock</span>
                                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${variant.stock <= 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                                                                        {variant.stock || 0}
                                                                    </div>
                                                                </div>
                                                                {formik.values.variants.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setConfirmModal({
                                                                                isOpen: true,
                                                                                title: "Remove Variant",
                                                                                message: `Are you sure you want to remove the variant '${variant.variantName || `Variant ${vIndex + 1}`}'?`,
                                                                                onConfirm: () => {
                                                                                    arrayHelpers.remove(vIndex);
                                                                                    setExpandedVariants(prev => {
                                                                                        const next = new Set(prev);
                                                                                        next.delete(vIndex);
                                                                                        return next;
                                                                                    });
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                    >
                                                                        <TrashIcon className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Variant Body */}
                                                        {expandedVariants.has(vIndex) && (
                                                            <div className="px-4 py-4 border-t border-indigo-50 bg-indigo-50/5 flex flex-col gap-4">
                                                                {/* Top Row: Price & Stock & Add Attribute */}
                                                                <div className="flex flex-wrap items-end justify-between gap-4">
                                                                    <div className="flex gap-4">
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Unit Price (Rs)</label>
                                                                            <div className="relative w-32">
                                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">Rs.</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    {...formik.getFieldProps(`variants[${vIndex}].price`)}
                                                                                    className="w-full text-xs font-bold text-gray-900 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-right tabular-nums"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {(() => {
                                                                        const hasUnusedAttributes = allAttributes.length > formik.values.variants[vIndex].attributes.length;
                                                                        const hasEmptyRow = formik.values.variants[vIndex].attributes.some(a => !a.attributeName);
                                                                        const canAddAttribute = hasUnusedAttributes && !hasEmptyRow;

                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                disabled={!canAddAttribute}
                                                                                onClick={() => formik.setFieldValue(
                                                                                    `variants[${vIndex}].attributes`,
                                                                                    [...formik.values.variants[vIndex].attributes, newEmptyAttribute]
                                                                                )}
                                                                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 border transition-all active:scale-95 shadow-sm ${
                                                                                    canAddAttribute 
                                                                                        ? 'text-indigo-700 bg-white hover:bg-indigo-50 border-indigo-100' 
                                                                                        : 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed opacity-70'
                                                                                }`}
                                                                                title={!hasUnusedAttributes ? "All available attributes have been added" : hasEmptyRow ? "Please select a value for the empty attribute row first" : ""}
                                                                            >
                                                                                <PlusIcon className="w-3 h-3 stroke-[3]" /> Add Attribute
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                {/* Attributes Table */}
                                                                {formik.values.variants[vIndex].attributes.length > 0 ? (
                                                                    <div className="border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                                                        <table className="w-full text-left border-collapse">
                                                                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                                                                <tr>
                                                                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/2">Attribute Name</th>
                                                                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/2">Value</th>
                                                                                    <th className="px-4 py-2 w-10"></th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50">
                                                                                <FieldArray
                                                                                    name={`variants[${vIndex}].attributes`}
                                                                                    render={(attrHelpers) => (
                                                                                        <>
                                                                                            {formik.values.variants[vIndex].attributes.map((attr, aIndex) => {
                                                                                                const namePath = `variants[${vIndex}].attributes[${aIndex}].attributeName`;
                                                                                                const valuePath = `variants[${vIndex}].attributes[${aIndex}].attributeValue`;
                                                                                                const idPath = `variants[${vIndex}].attributes[${aIndex}].attributeId`;
                                                                                                
                                                                                                const selectedAttr = allAttributes.find(a => a.Name === attr.attributeName);
                                                                                                const rawValues = selectedAttr?.Values || selectedAttr?.values || [];
                                                                                                const values = [...rawValues].sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }));
                                                                                                const availableAttributes = allAttributes.filter(
                                                                                                    a => !formik.values.variants[vIndex].attributes.map(att => att.attributeName).includes(a.Name) || a.Name === attr.attributeName
                                                                                                );

                                                                                                return (
                                                                                                    <tr key={aIndex} className="hover:bg-gray-50/50 group transition-colors">
                                                                                                        <td className="px-2 py-1.5">
                                                                                                            <FilterSelect
                                                                                                                value={attr.attributeName}
                                                                                                                onChange={(selectedName) => {
                                                                                                                    const selected = allAttributes.find(a => a.Name === selectedName);
                                                                                                                    formik.setFieldValue(namePath, selectedName);
                                                                                                                    formik.setFieldValue(valuePath, "");
                                                                                                                    formik.setFieldValue(idPath, selected?.Id || 0);
                                                                                                                }}
                                                                                                                icon={<TagIcon className="w-3.5 h-3.5 text-gray-400" />}
                                                                                                                placeholder="Select Attribute"
                                                                                                                options={availableAttributes.map(a => ({ value: a.Name, label: a.Name }))}
                                                                                                                searchable
                                                                                                                className="!w-full !py-1 !px-2 !rounded-lg !text-xs !border-transparent hover:!border-gray-200 focus:!border-indigo-500 !bg-transparent !shadow-none"
                                                                                                            />
                                                                                                        </td>
                                                                                                        <td className="px-2 py-1.5">
                                                                                                            {values.length > 0 ? (
                                                                                                                <FilterSelect
                                                                                                                    value={attr.attributeValue}
                                                                                                                    onChange={(val) => formik.setFieldValue(valuePath, val)}
                                                                                                                    placeholder="Select Value"
                                                                                                                    options={values.map(v => ({ value: v, label: v }))}
                                                                                                                    searchable
                                                                                                                    className="!w-full !py-1 !px-2 !rounded-lg !text-xs !border-transparent hover:!border-gray-200 focus:!border-indigo-500 !bg-transparent !shadow-none"
                                                                                                                />
                                                                                                            ) : (
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    placeholder="Enter value"
                                                                                                                    {...formik.getFieldProps(valuePath)}
                                                                                                                    className="w-full text-xs font-medium text-gray-900 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 bg-transparent outline-none transition-colors"
                                                                                                                />
                                                                                                            )}
                                                                                                        </td>
                                                                                                        <td className="px-3 py-1.5 text-right">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => {
                                                                                                                    setConfirmModal({
                                                                                                                        isOpen: true,
                                                                                                                        title: "Remove Attribute",
                                                                                                                        message: `Are you sure you want to remove the attribute '${attr.attributeName || 'Unnamed Attribute'}'?`,
                                                                                                                        onConfirm: () => attrHelpers.remove(aIndex)
                                                                                                                    });
                                                                                                                }}
                                                                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                                                                            >
                                                                                                                <TrashIcon className="h-4 w-4" />
                                                                                                            </button>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                );
                                                                                            })}
                                                                                        </>
                                                                                    )}
                                                                                />
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl bg-white/50">
                                                                        <TagIcon className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                                                        <p className="text-xs text-gray-500 font-medium">No attributes configured</p>
                                                                        <p className="text-[10px] text-gray-400 mt-1">Click "Add Attribute" to define properties.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </FormikProvider>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
}
