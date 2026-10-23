"use client";

import { TopProduct } from "@/store/slices/dashboardSlice";

interface TopProductsProps {
    products: TopProduct[];
}

export default function TopProducts({ products }: TopProductsProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    Top Selling Products
                </h3>
            </div>

            <div className="space-y-4">
                {products.length > 0 ? (
                    products.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-3 hover:bg-gray-50/80 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-sm border border-gray-200/50">
                                    <span className="text-gray-700 font-bold text-sm">
                                        #{index + 1}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {product.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Rs {product.price}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">
                                    {product.salesCount} <span className="text-xs font-normal text-gray-500">Sales</span>
                                </p>
                                <p className="text-xs font-semibold text-emerald-600">+{product.growthPercentage}%</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No top products data available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
