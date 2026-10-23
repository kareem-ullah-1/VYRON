"use client";

import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { login } from "@/store/slices/authSlice";
import { toast } from "sonner";
import api from "@/lib/axios";

export default function ProfilePage() {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [avatar, setAvatar] = useState(user?.avatar || "");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setAvatar(user.avatar || "");
        }
    }, [user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onload = () => {
            setAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("Name", name);
            if (selectedFile) {
                formData.append("Avatar", selectedFile);
            }

            const response = await api.put("/User/UpdateProfile", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.data.isSuccess) {
                const serverUser = response.data.data;
                // Merge server response with existing local tokens/data
                const updatedUser = {
                    ...user,
                    name: serverUser.name,
                    avatar: serverUser.avatar
                };

                dispatch(login(updatedUser));

                try {
                    const existing = localStorage.getItem("pos_auth_user");
                    if (existing) {
                        const parsedExisting = JSON.parse(existing);
                        // Save the merged data, maintaining existing token
                        localStorage.setItem("pos_auth_user", JSON.stringify({
                            ...parsedExisting,
                            name: serverUser.name,
                            avatar: serverUser.avatar
                        }));
                    }
                } catch { }

                toast.success("Profile updated successfully!");
                setSelectedFile(null); // Reset file so we don't re-upload on next save unless changed
            } else {
                toast.error(response.data.message || "Failed to update profile.");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "An error occurred while updating profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    My Profile
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Avatar Card */}
                    <div className="card lg:col-span-1 flex flex-col items-center">
                        <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden mb-4 flex items-center justify-center">
                            {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl text-gray-400">
                                    {name?.charAt(0) || "U"}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="btn-secondary">
                            Change Avatar
                        </button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>

                    {/* Details Form */}
                    <div className="card lg:col-span-2">
                        <form className="space-y-6" onSubmit={handleSave}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        className="input-field bg-gray-50"
                                        value={user?.role || ""}
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        User ID
                                    </label>
                                    <input
                                        type="text"
                                        className="input-field bg-gray-50"
                                        value={user?.id || ""}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary px-6 py-2">
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
