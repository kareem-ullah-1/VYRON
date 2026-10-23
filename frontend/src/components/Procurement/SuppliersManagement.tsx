"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchSuppliers, Supplier } from "@/store/slices/supplierSlice";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios";
import SuppliersTable from "./SuppliersTable";
import { ConfirmModal } from "../ui/ConfirmModal";
import { toast } from "sonner";

export default function SuppliersManagement() {
    const dispatch = useDispatch<AppDispatch>();
    const { suppliers, loading } = useSelector((state: RootState) => state.supplier);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; supplier: Supplier | null }>({
        isOpen: false,
        supplier: null,
    });
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        dispatch(fetchSuppliers());
    }, [dispatch]);

    const openModal = (supplier?: Supplier) => {
        if (supplier) {
            setSelectedSupplier(supplier);
            setFormData({
                name: supplier.name,
                email: supplier.email || "",
                phone: supplier.phone || "",
                address: supplier.address || "",
            });
        } else {
            setSelectedSupplier(null);
            setFormData({ name: "", email: "", phone: "", address: "" });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (selectedSupplier) {
                await api.put(`/Supplier/UpdateSupplier/${selectedSupplier.id}`, formData);
            } else {
                await api.post("/Supplier/AddSupplier", formData);
            }
            setIsModalOpen(false);
            dispatch(fetchSuppliers());
        } catch (error) {
            console.error("Failed to save supplier", error);
        }
    };

    const handleDelete = async (supplier: Supplier) => {
        try {
            await api.delete(`/Supplier/DeleteSupplier/${supplier.id}`);
            toast.success("Supplier deleted successfully");
            dispatch(fetchSuppliers());
        } catch (error) {
            console.error("Failed to delete supplier", error);
            toast.error("Failed to delete supplier");
        }
    };

    const filteredSuppliers = suppliers?.filter(
        (s) =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.phone && s.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Suppliers</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your suppliers and vendor records.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap">
                    <PlusIcon className="w-5 h-5 stroke-2" />
                    <span>Add Supplier</span>
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
                                placeholder="Search suppliers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Results count indicator */}
                {searchTerm && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>
                            Showing {filteredSuppliers?.length || 0} of {suppliers?.length || 0} suppliers
                        </span>
                        <button
                            onClick={() => setSearchTerm("")}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2">
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Suppliers Table Container */}
                <div className="flex-1 overflow-hidden rounded-b-2xl bg-white">
                    {loading ? (
                        <div className="flex justify-center h-40 items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <SuppliersTable
                            suppliers={filteredSuppliers ?? []}
                            onEdit={openModal}
                            onDelete={(s) => setDeleteModal({ isOpen: true, supplier: s })}
                        />
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] max-w-[calc(100vw-2rem)]">
                        <h2 className="text-xl font-bold mb-4">{selectedSupplier ? "Edit" : "Add"} Supplier</h2>
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
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 rounded text-white hover:bg-indigo-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, supplier: null })}
                onConfirm={() => deleteModal.supplier && handleDelete(deleteModal.supplier)}
                title="Delete Supplier"
                message={`Are you sure you want to delete supplier "${deleteModal.supplier?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
