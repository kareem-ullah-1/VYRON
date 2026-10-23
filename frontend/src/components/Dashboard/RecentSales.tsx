"use client";

import { RecentSale } from "@/store/slices/dashboardSlice";
import { format } from "date-fns";

interface RecentSalesProps {
    sales: RecentSale[];
}

export default function RecentSales({ sales }: RecentSalesProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Recent Sales</h3>
            </div>

            <div className="space-y-4">
                {sales.map((sale) => (
                    <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center shadow-sm border border-primary-200/50">
                                <span className="text-primary-600 font-medium text-sm">
                                    {sale.customerName?.charAt(0) ?? "?"}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {sale.customerName ?? "Walk-in Customer"}
                                </p>
                                <p className="text-xs text-gray-500">Order #{sale.id}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                                Rs {(sale.finalAmount || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                                {sale.saleDate
                                    ? format(new Date(sale.saleDate), "MMM dd, yyyy")
                                    : "-"}
                            </p>
                        </div>
                    </div>
                ))}
                {sales.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-4">
                        No recent sales found.
                    </div>
                )}
            </div>
        </div>
    );
}
