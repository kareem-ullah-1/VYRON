"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import {
    MagnifyingGlassIcon,
    UserIcon,
    UsersIcon,
    TicketIcon,
    XMarkIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";

// Define Customer type (adjust based on your actual customer shape)
interface Customer {
    Id: string | number;
    FullName: string;
    Email: string;
    ContactNumber?: string | null;
}

interface CustomerSelectorProps {
    selectedCustomer: string | number | null;
    setSelectedCustomer: (id: string | number | null) => void;
    isWalkIn: boolean;
    setIsWalkIn: (value: boolean) => void;
    walkInName: string;
    setWalkInName: (value: string) => void;
    walkInPhone: string;
    setWalkInPhone: (value: string) => void;
    saleCustomerId: number;
}

export default function CustomerSelector({
    selectedCustomer,
    setSelectedCustomer,
    isWalkIn,
    setIsWalkIn,
    walkInName,
    setWalkInName,
    walkInPhone,
    setWalkInPhone,
    saleCustomerId,
}: CustomerSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showResults, setShowResults] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { customers, loading } = useSelector((state: RootState) => state.customers);

    const [currentTab, setCurrentTab] = useState<"search" | "walkIn">("search");

    const hasCustomer = selectedCustomer !== null || isWalkIn;
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (saleCustomerId && !selectedCustomer) {
            setSelectedCustomer(saleCustomerId);
            setCurrentTab("search");
        }
    }, [saleCustomerId, selectedCustomer, setSelectedCustomer]);

    const filteredCustomers = customers.filter((c: Customer) => {
        const query = searchQuery.toLowerCase();
        return (
            (c.FullName && c.FullName.toLowerCase().includes(query)) ||
            (c.Email && c.Email.toLowerCase().includes(query)) ||
            (c.ContactNumber && c.ContactNumber.includes(searchQuery))
        );
    });

    const selectedCustomerObj = customers.find(
        (c: Customer) => c.Id === selectedCustomer
    );

    const initialMount = useRef(true);
    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }
        if (currentTab === "search" && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [currentTab]);

    const switchTab = (tab: "search" | "walkIn") => {
        setCurrentTab(tab);
        setSearchQuery("");
        setShowResults(false);

        if (tab === "search") {
            setWalkInName("");
            setWalkInPhone("");
        }
    };

    const clearCustomer = () => {
        setSelectedCustomer(null);
        setIsWalkIn(false);
        setWalkInName("");
        setWalkInPhone("");
        setSearchQuery("");
        setShowResults(false);
        setCurrentTab("search");
        setIsExpanded(true);
    };

    return (
        <div className="w-full bg-white shrink-0">

            {/* Selected Badge */}
            {hasCustomer && (
                <div className="mx-4 mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200">
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="leading-tight">
                            <p className="font-bold text-indigo-900 text-sm truncate max-w-[200px]">
                                {isWalkIn
                                    ? `Walk-In: ${walkInName || "Guest"}`
                                    : selectedCustomerObj?.FullName ?? "Unknown"}
                            </p>
                            {(isWalkIn
                                ? walkInPhone
                                : selectedCustomerObj?.ContactNumber) && (
                                    <p className="text-[11px] font-medium text-indigo-600">
                                        {isWalkIn
                                            ? walkInPhone
                                            : selectedCustomerObj?.ContactNumber}
                                    </p>
                                )}
                        </div>
                    </div>
                    <button
                        onClick={clearCustomer}
                        className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 p-1.5 rounded-full transition-colors"
                        aria-label="Clear customer">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Collapsed: show compact button to expand */}
            {!hasCustomer && !isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <UsersIcon className="w-4 h-4" />
                    <span>Select Customer</span>
                </button>
            )}

            {/* Tabs */}
            {!hasCustomer && isExpanded && (
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                    <TabBtn
                        active={currentTab === "search"}
                        onClick={() => switchTab("search")}
                        Icon={MagnifyingGlassIcon}
                        label="Search Customer"
                        disabled={hasCustomer}
                    />
                    <TabBtn
                        active={currentTab === "walkIn"}
                        onClick={() => switchTab("walkIn")}
                        Icon={TicketIcon}
                        label="Walk-In"
                        disabled={hasCustomer}
                    />
                </div>
            )}

            <div className={`px-4 ${hasCustomer ? 'pb-2 pt-0' : isExpanded ? 'py-4' : 'py-0'} space-y-4`}>
                {/* SEARCH TAB */}
                {currentTab === "search" && !hasCustomer && isExpanded && (
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            onBlur={() => {
                                // Delay hide to allow click on results
                                setTimeout(() => setShowResults(false), 200);
                            }}
                            placeholder="Search customer..."
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />

                        {showResults && (
                            <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-lg border max-h-64 overflow-auto">
                                {loading ? (
                                    <p className="p-3 text-center text-sm text-gray-500">
                                        Loading...
                                    </p>
                                ) : filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((c: Customer) => (
                                        <button
                                            key={c.Id}
                                            className="flex w-full items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition"
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevents the input from losing focus prematurely
                                                setSelectedCustomer(c.Id);
                                                setShowResults(false);
                                                setSearchQuery("");
                                            }}>
                                            <span className="w-8 h-8 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full text-xs font-bold">
                                                {c.FullName.charAt(0).toUpperCase()}
                                            </span>
                                            <div className="text-sm leading-tight">
                                                <p className="font-medium">
                                                    {c.FullName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {c.Email} •{" "}
                                                    {c.ContactNumber || "No phone"}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="p-3 text-center text-sm text-gray-500">
                                        No match found
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* WALK-IN TAB */}
                {currentTab === "walkIn" && !hasCustomer && isExpanded && (
                    <div className="flex gap-1.5 items-center">
                        <input
                            type="text"
                            placeholder="Name *"
                            value={walkInName}
                            onChange={(e) => setWalkInName(e.target.value)}
                            className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            value={walkInPhone}
                            onChange={(e) => setWalkInPhone(e.target.value)}
                            className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                        <button
                            disabled={!walkInName.trim()}
                            onClick={() => { setIsWalkIn(true); setSelectedCustomer(null); }}
                            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition flex-shrink-0">
                            <CheckIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Tab Button Component
interface TabBtnProps {
    active: boolean;
    onClick: () => void;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    disabled: boolean;
}

function TabBtn({ active, onClick, Icon, label, disabled }: TabBtnProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-2 border-b-2 transition-all
        ${active
                    ? "border-primary-600 text-primary-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }
        disabled:text-gray-300 disabled:cursor-not-allowed hidden`}
            style={{ display: disabled ? 'none' : 'flex' }}
            aria-pressed={active}>
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}
