"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchRawMaterials, RawMaterial } from "@/store/slices/rawMaterialSlice";
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios";
import RawMaterialsTable from "./RawMaterialsTable";
import FilterSelect from "../POS/FilterSelect";
import { ConfirmModal } from "../ui/ConfirmModal";
import { toast } from "sonner";

export default function RawMaterialsManagement() {
    const dispatch = useDispatch<AppDispatch>();
    const { rawMaterials, loading } = useSelector((state: RootState) => state.rawMaterial);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "", unitOfMeasure: "", currentStockQuantity: 0 });
    const [attributes, setAttributes] = useState<{ key: string, value: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [stockStatus, setStockStatus] = useState<string>("All");
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; material: RawMaterial | null }>({
        isOpen: false,
        material: null,
    });

    useEffect(() => {
        dispatch(fetchRawMaterials());
    }, [dispatch]);

    const openModal = (material?: RawMaterial) => {
        if (material) {
            setSelectedMaterial(material);
            setFormData({
                name: material.name,
                description: material.description || "",
                unitOfMeasure: material.unitOfMeasure || "",
                currentStockQuantity: material.currentStockQuantity || 0,
            });
            try {
                const parsed = material.attributesJson ? JSON.parse(material.attributesJson) : {};
                const arr = Object.keys(parsed).map(key => ({ key, value: parsed[key] }));
                setAttributes(arr);
            } catch {
                setAttributes([]);
            }
        } else {
            setSelectedMaterial(null);
            setFormData({ name: "", description: "", unitOfMeasure: "", currentStockQuantity: 0 });
            setAttributes([]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            // Convert attributes array to strict JSON object
            const attrObj: Record<string, string> = {};
            attributes.forEach(attr => {
                if (attr.key.trim()) attrObj[attr.key.trim()] = attr.value.trim();
            });

            const payload = {
                ...formData,
                attributesJson: Object.keys(attrObj).length > 0 ? JSON.stringify(attrObj) : null
            };

            if (selectedMaterial) {
                await api.put(`/RawMaterial/UpdateRawMaterial/${selectedMaterial.id}`, payload);
                toast.success("Material updated successfully");
            } else {
                await api.post("/RawMaterial/AddRawMaterial", payload);
                toast.success("Material added successfully");
            }
            setIsModalOpen(false);
            dispatch(fetchRawMaterials());
        } catch (error) {
            console.error("Failed to save material", error);
            toast.error("Failed to save material");
        }
    };

    const handleDelete = async (material: RawMaterial) => {
        try {
            await api.delete(`/RawMaterial/DeleteRawMaterial/${material.id}`);
            toast.success("Material deleted successfully");
            dispatch(fetchRawMaterials());
        } catch (error) {
            console.error("Failed to delete material", error);
            toast.error("Failed to delete material");
        }
    };

    const addAttribute = () => setAttributes([...attributes, { key: "", value: "" }]);
    const removeAttribute = (index: number) => setAttributes(attributes.filter((_, i) => i !== index));
    const updateAttribute = (index: number, field: "key" | "value", val: string) => {
        const newAttrs = [...attributes];
        newAttrs[index][field] = val;
        setAttributes(newAttrs);
    };

    const filteredMaterials = useMemo(() => {
        let result = rawMaterials || [];

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            result = result.filter(
                (r) =>
                    r.name.toLowerCase().includes(q) ||
                    (r.unitOfMeasure && r.unitOfMeasure.toLowerCase().includes(q))
            );
        }

        if (stockStatus !== "All") {
            result = result.filter((r) => {
                const stock = r.currentStockQuantity ?? 0;
                if (stockStatus === "InStock") return stock > 10;
                if (stockStatus === "LowStock") return stock > 0 && stock <= 10;
                if (stockStatus === "OutOfStock") return stock <= 0;
                return true;
            });
        }

        return result;
    }, [rawMaterials, searchTerm, stockStatus]);

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Raw Materials</h1>
                    <p className="text-sm text-gray-500 mt-1">Track inventory and configure material stock.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap">
                    <PlusIcon className="w-5 h-5 stroke-2" />
                    <span>Add Material</span>
                </button>
            </div>

            {/* Filters & Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-[26rem] md:min-h-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-gray-50/30">
                    <div className="flex flex-1 w-full gap-3 flex-col sm:flex-row items-center">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search materials..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                            />
                        </div>

                        <FilterSelect
                            value={stockStatus}
                            onChange={setStockStatus}
                            icon={<ArchiveBoxIcon className="w-4 h-4" />}
                            options={[
                                { value: "All", label: "All Stock" },
                                { value: "InStock", label: "In Stock (>10)", dot: "bg-emerald-500" },
                                { value: "LowStock", label: "Low Stock (1-10)", dot: "bg-amber-500" },
                                { value: "OutOfStock", label: "Out of Stock (0)", dot: "bg-rose-500" },
                            ]}
                        />
                    </div>
                </div>

                {/* Results count indicator */}
                {(searchTerm || stockStatus !== "All") && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>
                            Showing {filteredMaterials?.length || 0} of {rawMaterials?.length || 0} materials
                        </span>
                        <button
                            onClick={() => { setSearchTerm(""); setStockStatus("All"); }}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2">
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Table Container */}
                <div className="flex-1 overflow-hidden rounded-b-2xl bg-white">
                    {loading ? (
                        <div className="flex justify-center h-40 items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <RawMaterialsTable
                            materials={filteredMaterials ?? []}
                            onEdit={openModal}
                            onDelete={(m) => setDeleteModal({ isOpen: true, material: m })}
                        />
                    )}
                </div>
            </div>

            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] max-w-[calc(100vw-2rem)]">
                            <h2 className="text-xl font-bold mb-4">{selectedMaterial ? "Edit" : "Add"} Raw Material</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. kg, pieces, liters"
                                        value={formData.unitOfMeasure}
                                        onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Initial Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.currentStockQuantity}
                                        onChange={(e) => setFormData({ ...formData, currentStockQuantity: parseFloat(e.target.value) || 0 })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Custom Attributes</label>
                                        <button onClick={addAttribute} className="text-sm text-indigo-600 font-medium">+ Add Attribute</button>
                                    </div>
                                    {attributes.map((attr, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Key (e.g. Thickness)"
                                                value={attr.key}
                                                onChange={(e) => updateAttribute(idx, "key", e.target.value)}
                                                className="flex-1 w-1/2 rounded-md border-gray-300 p-1.5 border text-sm"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Value (e.g. 2mm)"
                                                value={attr.value}
                                                onChange={(e) => updateAttribute(idx, "value", e.target.value)}
                                                className="flex-1 w-1/2 rounded-md border-gray-300 p-1.5 border text-sm"
                                            />
                                            <button onClick={() => removeAttribute(idx)} className="text-red-500 p-1">
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 rounded text-white hover:bg-indigo-700">Save</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, material: null })}
                onConfirm={() => deleteModal.material && handleDelete(deleteModal.material)}
                title="Delete Raw Material"
                message={`Are you sure you want to delete raw material "${deleteModal.material?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </div >
    );
}
