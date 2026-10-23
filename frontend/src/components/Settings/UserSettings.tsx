"use client";

import { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, TrashIcon, UserCircleIcon, PowerIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUsers, toggleUserStatus, deleteUser, User } from "@/store/slices/userSlice";
import { toast } from "sonner";
import UserModal from "./UserModal";
import { clsx } from "clsx";

const ROLE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    admin: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    manager: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    cashier: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export default function UserSettings() {
    const dispatch = useAppDispatch();
    const { users, loading } = useAppSelector((state) => state.users);

    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        dispatch(fetchUsers());
    }, [dispatch]);

    const handleAddUser = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await dispatch(toggleUserStatus(id)).unwrap();
            toast.success("User status updated");
        } catch (error: any) {
            toast.error(error || "Failed to toggle status");
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await dispatch(deleteUser(id)).unwrap();
            toast.success("User deleted successfully");
        } catch (error: any) {
            toast.error(error || "Failed to delete user");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">User Management</h2>
                    <p className="text-xs text-gray-500">Manage system users and their access roles</p>
                </div>
                <Button onClick={handleAddUser} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" />
                    Add User
                </Button>
            </div>

            {/* User Cards */}
            {loading && users.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {users.map((user) => {
                        const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.cashier;
                        const isAdmin = user.role === "admin";
                        return (
                            <div
                                key={user.id}
                                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center overflow-hidden">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-primary-700">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => !isAdmin && handleToggleStatus(user.id)}
                                        disabled={isAdmin}
                                        className={clsx(
                                            "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                                            isAdmin ? "text-gray-300 cursor-not-allowed" :
                                                user.isActive ? "text-emerald-600 hover:text-emerald-700" : "text-gray-400 hover:text-gray-500"
                                        )}>
                                        <span className={clsx(
                                            "w-1.5 h-1.5 rounded-full",
                                            isAdmin ? "bg-gray-200" :
                                                user.isActive ? "bg-emerald-500" : "bg-gray-300"
                                        )} />
                                        {isAdmin ? "System Protected" : user.isActive ? "Active" : "Inactive"}
                                        {!isAdmin && <PowerIcon className="w-3 h-3 ml-0.5" />}
                                    </button>
                                    {!isAdmin && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditUser(user)}
                                                className="text-gray-500 hover:text-primary-600">
                                                <PencilIcon className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="text-gray-500 hover:text-red-600">
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add User Card */}
                    <button
                        onClick={handleAddUser}
                        className="rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors duration-200 min-h-[140px]">
                        <UserCircleIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">Add New User</span>
                    </button>
                </div>
            )}

            <UserModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                user={editingUser}
            />
        </div>
    );
}
