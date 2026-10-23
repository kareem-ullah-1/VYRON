"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { Customer, fetchCustomers } from "@/store/slices/customersSlice";
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useProgressRouter } from "@/components/Navigation";
import CustomersTable from "./CustomersTable";
import CustomerModal from "./CustomerModal";
import api from "@/lib/axios";

export default function CustomersManagement() {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const router = useProgressRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { customers, loading } = useSelector(
        (state: RootState) => state.customers
    );

    const [searchQuery, setSearchQuery] = useState("");

    const filteredCustomers = useMemo(() => {
        if (!searchQuery.trim()) return customers;
        const q = searchQuery.toLowerCase().trim();
        return customers.filter(
            (c) =>
                c.FullName?.toLowerCase().includes(q) ||
                c.ContactNumber?.toLowerCase().includes(q)
        );
    }, [customers, searchQuery]);

    useEffect(() => {
        dispatch(fetchCustomers());
    }, [dispatch]);

    // --- View Customer Screen ---
    const openViewScreen = (customer: Customer) => {
        router.push(`/customers/${customer.Id}`);
    };

    // --- Add/Edit Customer ---
    const openAddModal = () => {
        setSelectedCustomer(null);
        setModalOpen(true);
    };
    const openEditModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setModalOpen(true);
    };
    const closeModal = () => {
        setModalOpen(false);
        setSelectedCustomer(null);
    };
    const handleSuccess = () => {
        closeModal();
        dispatch(fetchCustomers());
    };

    // --- Delete Customer ---
    const handleDeleteClick = (customer: Customer) => {
        setSelectedCustomer(customer);
        setDeleteModalOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!selectedCustomer) return;
        setIsDeleting(true);
        try {
            await api.delete(`/Customer/DeleteCustomer/${selectedCustomer.Id}`);
            dispatch(fetchCustomers());
            setDeleteModalOpen(false);
            setSelectedCustomer(null);
        } catch (error) {
            console.error("Failed to delete customer:", error);
        } finally {
            setIsDeleting(false);
        }
    };
    const closeDeleteModal = () => {
        if (!isDeleting) {
            setDeleteModalOpen(false);
            setSelectedCustomer(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your customer database and records.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                    <PlusIcon className="w-5 h-5 stroke-2" />
                    <span>Add Customer</span>
                </button>
            </div>

            {/* Filters & Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-[26rem] md:min-h-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-gray-50/30">
                    {/* Left: Search */}
                    <div className="flex flex-1 w-full gap-3 flex-col sm:flex-row items-center">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Results count indicator */}
                {searchQuery && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>
                            Showing {filteredCustomers.length} of {customers.length} customers
                        </span>
                        <button
                            onClick={() => setSearchQuery("")}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2">
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Customers Table Container */}
                <div className="flex-1 overflow-hidden rounded-b-2xl">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <CustomersTable
                            customers={filteredCustomers}
                            onEdit={openEditModal}
                            onDelete={handleDeleteClick}
                            onView={openViewScreen}
                        />
                    )}
                </div>
            </div>

            {/* Add/Edit Customer Modal */}
            {modalOpen && (
                <CustomerModal
                    customer={selectedCustomer}
                    isOpen={modalOpen}
                    onClose={closeModal}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Delete Customer Modal */}
            {deleteModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-[380px] max-w-[calc(100vw-2rem)] animate-fadeIn relative">
                        <button
                            title="Close"
                            onClick={closeDeleteModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            disabled={isDeleting}>
                            <XMarkIcon className="w-5 h-5" />
                        </button>

                        <h2 className="text-lg font-semibold text-gray-900">
                            Delete Customer
                        </h2>

                        <p className="text-gray-600 text-sm mb-6">
                            Are you sure you want to delete{" "}
                            <span className="text-red-600 font-semibold">
                                {selectedCustomer.FullName}
                            </span>
                            ? This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeDeleteModal}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                disabled={isDeleting}>
                                Cancel
                            </button>

                            {isDeleting ? (
                                <button
                                    className="px-4 py-2 bg-red-600 text-white rounded cursor-not-allowed opacity-70"
                                    disabled>
                                    Deleting...
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
