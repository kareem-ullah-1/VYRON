"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchPurchases } from "@/store/slices/purchaseSlice";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useProgressRouter } from "@/components/Navigation";
import PurchasesTable from "./PurchasesTable";
import FilterSelect from "../POS/FilterSelect";

export default function PurchasesManagement() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useProgressRouter();
    const { purchases, loading } = useSelector((state: RootState) => state.purchase);

    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        dispatch(fetchPurchases());
    }, [dispatch]);

    const filteredPurchases = useMemo(() => {
        let result = purchases || [];

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter((p) => new Date(p.purchaseDate) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((p) => new Date(p.purchaseDate) <= end);
        }

        if (statusFilter !== "All") {
            result = result.filter((p) => p.status?.toLowerCase() === statusFilter.toLowerCase());
        }

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            result = result.filter((p) =>
                (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
                (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
                p.status.toLowerCase().includes(q)
            );
        }
        return result;
    }, [purchases, searchTerm, startDate, endDate, statusFilter]);

    const hasFilters = !!(searchTerm || startDate || endDate || statusFilter !== "All");

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage stock purchases and history.</p>
                </div>
                <button
                    onClick={() => router.push("/procurement/purchases/new")}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                    <PlusIcon className="w-4 h-4 stroke-2" />
                    New Purchase
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
                                placeholder="Search invoice, supplier..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                            />
                        </div>
                        <FilterSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "All", label: "All Statuses" },
                                { value: "Completed", label: "Completed", dot: "bg-emerald-500" },
                                { value: "Pending", label: "Pending", dot: "bg-amber-500" },
                                { value: "Failed", label: "Failed", dot: "bg-rose-500" },
                            ]}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                            <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-gray-500 px-2 whitespace-nowrap">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                max={endDate}
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    setStartDate(newStart);
                                    if (endDate && newStart > endDate) setEndDate("");
                                }}
                                className="bg-transparent text-gray-800 text-sm py-1.5 outline-none w-full sm:w-[130px] cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                            <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-gray-500 px-2 whitespace-nowrap">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-gray-800 text-sm py-1.5 outline-none w-full sm:w-[130px] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Results count indicator */}
                {hasFilters && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>Showing {filteredPurchases?.length || 0} purchase{(filteredPurchases?.length || 0) !== 1 ? "s" : ""}</span>
                        <button
                            onClick={() => { setSearchTerm(""); setStatusFilter("All"); setStartDate(""); setEndDate(""); }}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Table */}
                <PurchasesTable purchases={filteredPurchases ?? []} isLoading={loading} />
            </div>
        </div >
    );
}
