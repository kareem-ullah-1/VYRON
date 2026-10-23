"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories, Category } from "@/store/slices/categorySlice";
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    FolderIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/lib/axios";
import { RootState } from "@/store/store";
import { toast } from "sonner";
import Modal from "../POS/Modal";
import { Button } from "@/components/ui/Button";

export default function CategorySettings() {
    const dispatch = useDispatch<any>();
    const { categories, loading } = useSelector((state: RootState) => state.category);

    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewData, setViewData] = useState({ name: "", description: "" });
    const [modalData, setModalData] = useState<{ id?: number; name: string; description: string }>({
        name: "",
        description: "",
    });
    const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        dispatch(fetchCategories());
    }, [dispatch]);

    const mappedCategories = categories?.map((cat: any) => ({
        id: cat.Id,
        name: cat.Name,
        description: cat.Description,
    }));

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentData = mappedCategories?.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil((mappedCategories?.length || 0) / itemsPerPage);

    const openAddModal = () => {
        setModalData({ name: "", description: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (cat: Category) => {
        setModalData({ id: cat.id, name: cat.name, description: cat.description || "" });
        setIsModalOpen(true);
    };

    const openViewModal = (cat: Category) => {
        setViewData({ name: cat.name, description: cat.description || "No Description" });
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setCategoryToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleModalSave = async () => {
        if (!modalData.name.trim() || !modalData.description.trim())
            return toast.error("Category name and description is required");

        setIsLoading(true);
        try {
            if (modalData.id) {
                await api.put(`Category/UpdateCategory/${modalData.id}`, modalData);
                toast.success("Category updated successfully");
            } else {
                await api.post("Category/AddCategory", modalData);
                toast.success("Category added successfully");
            }
            dispatch(fetchCategories());
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save category");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        setIsLoading(true);
        try {
            await api.delete(`Category/DeleteCategory/${categoryToDelete}`);
            toast.success("Category deleted successfully");
            dispatch(fetchCategories());
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete category");
        } finally {
            setIsLoading(false);
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Categories</h2>
                    <p className="text-xs text-gray-500">Organize products into logical groups</p>
                </div>
                <Button onClick={openAddModal} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" />
                    Add Category
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-12">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600" />
                                        </div>
                                    </td>
                                </tr>
                            ) : currentData?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center">
                                        <FolderIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No categories yet</p>
                                        <button onClick={openAddModal} className="text-sm text-primary-600 hover:underline mt-1">
                                            Create your first category
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((cat: Category, index: number) => (
                                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3 text-sm text-gray-400 font-medium">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                                        </td>
                                        <td className="px-6 py-3 hidden sm:table-cell">
                                            <span className="text-sm text-gray-500 line-clamp-1">{cat.description}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openViewModal(cat)} className="text-gray-400 hover:text-gray-700">
                                                    <EyeIcon className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(cat)} className="text-gray-400 hover:text-primary-600">
                                                    <PencilIcon className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openDeleteModal(cat.id)} className="text-gray-400 hover:text-red-600">
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
                {mappedCategories && mappedCategories.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            Showing {indexOfFirst + 1}-{Math.min(indexOfLast, mappedCategories.length)} of {mappedCategories.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}>
                                Prev
                            </Button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                        currentPage === i + 1
                                            ? "bg-primary-600 text-white"
                                            : "text-gray-600 hover:bg-gray-100"
                                    }`}>
                                    {i + 1}
                                </button>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                title={modalData.id ? "Edit Category" : "Add Category"}
                onClose={() => setIsModalOpen(false)}
                size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category Name</label>
                        <input
                            value={modalData.name}
                            onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                            className="input-field"
                            placeholder="e.g. Electronics"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea
                            value={modalData.description}
                            onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                            className="input-field resize-none h-32"
                            placeholder="Brief description of this category"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleModalSave} isLoading={isLoading}>
                            {modalData.id ? "Update" : "Create"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-[400px] max-w-[calc(100vw-2rem)] animate-fadeIn">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <TrashIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 text-center">Delete Category</h2>
                        <p className="text-sm text-gray-500 text-center mt-2">
                            This action cannot be undone. The category will be permanently removed.
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

            {/* View Modal */}
            <Modal
                isOpen={isViewModalOpen}
                title="Category Details"
                onClose={() => setIsViewModalOpen(false)}
                size="md">
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Name</p>
                        <p className="text-sm text-gray-900 font-medium">{viewData.name}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Description</p>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {viewData.description}
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
