"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addUser, User, fetchRoles, updateUserDetails, resetUserPassword } from "@/store/slices/userSlice";
import { toast } from "sonner";
import Modal from "../POS/Modal";
import { Button } from "@/components/ui/Button";
import { KeyIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import FilterSelect from "../POS/FilterSelect";

interface UserModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserModal({ user, isOpen, onClose }: UserModalProps) {
    const dispatch = useAppDispatch();
    const { roles } = useAppSelector((state) => state.users);
    const [loading, setLoading] = useState(false);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState("");

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "",
    });

    useEffect(() => {
        if (isOpen) {
            dispatch(fetchRoles());
            setShowPasswordReset(false);
            setNewPassword("");
        }
    }, [dispatch, isOpen]);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.name || "",
                email: user.email || "",
                password: "",
                role: (user.role || "").toLowerCase(),
            });
        } else {
            setFormData({
                username: "",
                email: "",
                password: "",
                role: roles.length > 0 ? (roles[0].name || "").toLowerCase() : "",
            });
        }
    }, [user, isOpen, roles]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dbRole = roles.find(r => (r.name || "").toLowerCase() === (formData.role || "").toLowerCase())?.name || formData.role;

            if (user) {
                // Update Details (Name, Email, Role)
                await dispatch(updateUserDetails({
                    userId: user.id,
                    name: formData.username,
                    email: formData.email,
                    role: dbRole
                })).unwrap();

                // Handle Password Reset if requested
                if (showPasswordReset && newPassword) {
                    await dispatch(resetUserPassword({
                        userId: user.id,
                        newPassword: newPassword
                    })).unwrap();
                    toast.success("Password reset successfully");
                }

                toast.success("User updated successfully");
            } else {
                // Add User (Register)
                await dispatch(addUser({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: dbRole
                })).unwrap();
                toast.success("User added successfully");
            }
            onClose();
        } catch (error: any) {
            toast.error(error || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? "Edit User" : "Add New User"}
            size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email / Username</label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="john@example.com"
                    />
                </div>

                {!user ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                ) : (
                    <div className="pt-2">
                        {!showPasswordReset ? (
                            <button
                                type="button"
                                onClick={() => setShowPasswordReset(true)}
                                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
                                <KeyIcon className="w-4 h-4" />
                                Reset User Password
                            </button>
                        ) : (
                            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordReset(false);
                                            setNewPassword("");
                                        }}
                                        className="text-xs text-gray-400 hover:text-gray-600">
                                        Cancel
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    required={showPasswordReset}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                                    placeholder="Enter new password"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <FilterSelect
                        value={formData.role}
                        onChange={(val) => setFormData({ ...formData, role: val })}
                        icon={<UserGroupIcon className="w-4 h-4" />}
                        options={roles.map((role) => ({
                            value: (role.name || "").toLowerCase(),
                            label: role.name || "Unknown Role"
                        }))}
                        className="w-full"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        {user ? "Update User" : "Create User"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
