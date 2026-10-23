"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { toast } from "sonner";
import Modal from "../POS/Modal";
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    GlobeAltIcon,
    BuildingOffice2Icon,
    MapIcon,
} from "@heroicons/react/24/outline";

interface CustomerModalProps {
    customer: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CustomerModal({
    customer,
    isOpen,
    onClose,
    onSuccess,
}: CustomerModalProps) {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        contactNumber: "",
        fullAddress: "",
        city: "Faisalabad",
        state: "Punjab",
        country: "Pakistan",
        isActive: true,
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                fullName: customer.FullName || "",
                email: customer.Email || "",
                contactNumber: customer.ContactNumber || "",
                fullAddress: customer.FullAddress || "",
                city: customer.City || "Faisalabad",
                state: customer.State || "Punjab",
                country: "Pakistan",
                isActive: true,
            });
        } else {
            setFormData({
                fullName: "",
                email: "",
                contactNumber: "",
                fullAddress: "",
                city: "Faisalabad",
                state: "Punjab",
                country: "Pakistan",
                isActive: true,
            });
        }
    }, [customer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = { ...formData };

        try {
            const res = customer?.Id
                ? await axios.put(`Customer/UpdateCustomer/${customer.Id}`, payload)
                : await axios.post("Customer/CreateCustomer", payload);

            if (!res.data.isSuccess) {
                toast.error(res.data.message || res.data.error || "Failed to save customer.");
                return;
            }

            toast.success(customer ? "Customer updated successfully!" : "Customer added successfully!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save customer. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={customer ? "Edit Customer" : "Add New Customer"}
            size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Full Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    title="FullName"
                                    required
                                    placeholder="e.g. Ahmed Khan"
                                    value={formData.fullName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, fullName: e.target.value })
                                    }
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="email"
                                    title="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        {/* Contact Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Number
                            </label>
                            <div className="relative">
                                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="tel"
                                    title="tel"
                                    placeholder="03XX-XXXXXXX"
                                    value={formData.contactNumber}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            contactNumber: e.target.value,
                                        })
                                    }
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Address Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Full Address */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Address
                            </label>
                            <div className="relative">
                                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    title="Address"
                                    placeholder="Street, area, landmark"
                                    value={formData.fullAddress}
                                    onChange={(e) =>
                                        setFormData({ ...formData, fullAddress: e.target.value })
                                    }
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                City
                            </label>
                            <div className="relative">
                                <BuildingOffice2Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    title="City"
                                    value={formData.city}
                                    onChange={(e) =>
                                        setFormData({ ...formData, city: e.target.value })
                                    }
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        {/* State */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Province
                            </label>
                            <div className="relative">
                                <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    title="State"
                                    value={formData.state}
                                    onChange={(e) =>
                                        setFormData({ ...formData, state: e.target.value })
                                    }
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        {/* Country */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Country
                            </label>
                            <div className="relative">
                                <GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <select
                                    title="Country"
                                    value={formData.country}
                                    onChange={(e) =>
                                        setFormData({ ...formData, country: e.target.value })
                                    }
                                    className="input-field pl-10">
                                    <option value="Pakistan">Pakistan</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading
                            ? "Saving..."
                            : customer
                            ? "Update Customer"
                            : "Add Customer"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
