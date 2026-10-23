"use client";

import { useState } from "react";
import {
    UserIcon,
    TagIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import UserSettings from "./UserSettings";
import AttributeSettings from "./AttributeSettings";
import CategorySettings from "./CategorySettings";

const settingsTabs = [
    { id: "user", name: "Users", description: "Manage user accounts", icon: UserIcon },
    { id: "attribute", name: "Attributes", description: "Product attributes", icon: TagIcon },
    { id: "category", name: "Categories", description: "Product categories", icon: CubeIcon },
];

export default function SettingsManagement() {
    const [activeTab, setActiveTab] = useState("user");

    const renderTabContent = () => {
        switch (activeTab) {
            case "user":
                return <UserSettings />;
            case "attribute":
                return <AttributeSettings />;
            case "category":
                return <CategorySettings />;
            default:
                return <UserSettings />;
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-[1400px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your application preferences and configurations</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="lg:w-60 shrink-0">
                    <nav className="bg-white rounded-2xl border border-gray-200 p-2 lg:sticky lg:top-6">
                        {settingsTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                                        isActive
                                            ? "bg-primary-50 text-primary-700 shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}>
                                    <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary-100" : "bg-gray-100"}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{tab.name}</div>
                                        <div className={`text-xs truncate ${isActive ? "text-primary-500" : "text-gray-400"}`}>
                                            {tab.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">{renderTabContent()}</div>
            </div>
        </div>
    );
}
