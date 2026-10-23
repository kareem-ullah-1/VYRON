"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon, PencilIcon, EyeIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { Attribute, fetchAttributes } from "@/store/slices/attributeSlice";
import { RootState } from "@/store/store";
import Modal from "../POS/Modal";
import { Button } from "@/components/ui/Button";

export default function AttributeSettings() {
    const dispatch = useDispatch();
    const { attributes, loading } = useSelector((state: RootState) => state.attributes);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewModalData, setViewModalData] = useState<Attribute | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modalData, setModalData] = useState<{
        Id?: number;
        Name: string;
        Values: string[];
        Type: string;
        currentValue?: string;
    }>({ Name: "", Values: [], Type: "Option", currentValue: "" });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [attributeToDelete, setAttributeToDelete] = useState<Attribute | null>(null);

    useEffect(() => {
        dispatch(fetchAttributes() as any);
    }, [dispatch]);

    const openAddModal = () => {
        setModalData({ Name: "", Values: [], Type: "Option", currentValue: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (attr: Attribute) => {
        setModalData({
            Id: attr.Id,
            Name: attr.Name,
            Values: [...attr.Values],
            Type: attr.Type ?? "Option",
            currentValue: "",
        });
        setIsModalOpen(true);
    };

    const handleModalSave = async () => {
        if (!modalData.Name.trim()) return toast.error("Attribute name is required");
        if (modalData.Values.length === 0) return toast.error("At least one value is required");

        setIsLoading(true);
        try {
            if (modalData.Id) {
                await api.put(`Attributes/UpdateAttribute/${modalData.Id}`, {
                    name: modalData.Name, values: modalData.Values, type: modalData.Type, isActive: true,
                });
                toast.success("Attribute updated successfully");
            } else {
                await api.post("Attributes/CreateAttribute", {
                    name: modalData.Name, values: modalData.Values, type: modalData.Type, isActive: true,
                });
                toast.success("Attribute added successfully");
            }
            dispatch(fetchAttributes() as any);
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save attribute");
        } finally {
            setIsLoading(false);
        }
    };

    const promptDelete = (attr: Attribute) => {
        setAttributeToDelete(attr);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!attributeToDelete) return;
        setIsLoading(true);
        try {
            await api.delete(`Attributes/DeleteAttribute/${attributeToDelete.Id}`);
            toast.success("Attribute deleted successfully");
            dispatch(fetchAttributes() as any);
            setIsDeleteModalOpen(false);
            setAttributeToDelete(null);
        } catch {
            toast.error("Failed to delete attribute");
        } finally {
            setIsLoading(false);
        }
    };

    const addValueField = () => {
        const trimmed = modalData.currentValue?.trim();
        if (trimmed) {
            setModalData({ ...modalData, Values: [...modalData.Values, trimmed], currentValue: "" });
        }
    };

    const removeValueField = (index: number) => {
        setModalData({ ...modalData, Values: modalData.Values.filter((_, i) => i !== index) });
    };

    const totalPages = Math.ceil(attributes.length / itemsPerPage);
    const paginatedAttributes = attributes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const TYPE_STYLES: Record<string, string> = {
        Option: "bg-violet-50 text-violet-700",
        Number: "bg-sky-50 text-sky-700",
        Measurement: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Attributes</h2>
                    <p className="text-xs text-gray-500">Define product variants like color, size, and material</p>
                </div>
                <Button onClick={openAddModal} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" />
                    Add Attribute
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attribute</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Values</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600" />
                                        </div>
                                    </td>
                                </tr>
                            ) : attributes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <SwatchIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No attributes defined</p>
                                        <button onClick={openAddModal} className="text-sm text-primary-600 hover:underline mt-1">
                                            Create your first attribute
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                paginatedAttributes.map((attr: Attribute, index: number) => (
                                    <tr key={attr.Id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3 text-sm text-gray-400 font-medium">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm font-medium text-gray-900">{attr.Name}</span>
                                        </td>
                                        <td className="px-6 py-3 hidden sm:table-cell">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[attr.Type] || "bg-gray-50 text-gray-600"}`}>
                                                {attr.Type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                                                {attr.Values.slice(0, 4).map((v, i) => (
                                                    <span key={i} className="inline-flex items-center bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">
                                                        {v}
                                                    </span>
                                                ))}
                                                {attr.Values.length > 4 && (
                                                    <span className="text-xs text-gray-400 self-center">+{attr.Values.length - 4} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => setViewModalData(attr)} className="text-gray-400 hover:text-gray-700">
                                                    <EyeIcon className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(attr)} className="text-gray-400 hover:text-primary-600">
                                                    <PencilIcon className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => promptDelete(attr)} className="text-gray-400 hover:text-red-600">
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {attributes.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                                Prev
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Modal */}
            <Modal isOpen={!!viewModalData} title="Attribute Details" onClose={() => setViewModalData(null)} size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Name</p>
                            <p className="text-sm text-gray-900 font-medium">{viewModalData?.Name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Type</p>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[viewModalData?.Type || ""] || "bg-gray-50 text-gray-600"}`}>
                                {viewModalData?.Type}
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Values</p>
                        <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto">
                            {viewModalData?.Values.length === 0 ? (
                                <p className="text-gray-400 text-sm">No values added.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {viewModalData?.Values.map((v, i) => (
                                        <span key={i} className="inline-flex items-center bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-sm text-gray-700">
                                            {v}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={() => setViewModalData(null)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal */}
            <Modal isOpen={isModalOpen} title={modalData.Id ? "Update Attribute" : "Add Attribute"} onClose={() => setIsModalOpen(false)} size="lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Attribute Name</label>
                        <input
                            value={modalData.Name}
                            onChange={(e) => setModalData({ ...modalData, Name: e.target.value })}
                            className="input-field"
                            placeholder="e.g. Color"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Attribute Type</label>
                        <select
                            title="type"
                            value={modalData.Type}
                            onChange={(e) => setModalData({ ...modalData, Type: e.target.value })}
                            className="input-field">
                            <option value="Option">Option</option>
                            <option value="Number">Number</option>
                            <option value="Measurement">Measurement</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Values</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                value={modalData.currentValue}
                                onChange={(e) => setModalData({ ...modalData, currentValue: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValueField(); } }}
                                className="input-field flex-1"
                                placeholder="Type a value and press Enter or click Add"
                            />
                            <Button onClick={addValueField}>Add</Button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto min-h-[60px]">
                            {modalData.Values.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-2">No values added yet</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {modalData.Values.map((val, i) => (
                                        <span key={i} className="inline-flex items-center bg-white border border-gray-200 pl-3 pr-1.5 py-1 rounded-lg text-sm text-gray-700 gap-1.5">
                                            {val}
                                            <button
                                                onClick={() => removeValueField(i)}
                                                className="p-0.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors">
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleModalSave} isLoading={isLoading}>Save</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            {isDeleteModalOpen && !!attributeToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-[400px] max-w-[calc(100vw-2rem)] animate-fadeIn">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <TrashIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 text-center">Delete Attribute</h2>
                        <p className="text-sm text-gray-500 text-center mt-2">
                            This will permanently remove <span className="font-medium text-gray-700">{attributeToDelete.Name}</span> and all its values.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button variant="danger" className="flex-1" onClick={confirmDelete} isLoading={isLoading}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
