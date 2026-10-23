"use client";
import { motion } from "framer-motion";
import {
    CurrencyDollarIcon,
    ChartBarIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

interface StatsCardsProps {
    totalSales: number;
    totalProfit: number;
    todaySales: number;
    totalCustomers: number;
    totalProducts: number;
}

export default function StatsCards({
    totalSales,
    totalProfit,
    todaySales,
    totalCustomers,
    totalProducts,
}: StatsCardsProps) {
    const stats = [
        {
            name: "Total Sales",
            value: `Rs ${totalSales.toLocaleString()}`,
            subtitle: undefined as string | undefined,
            // change: "+22%",
            changeType: "positive" as const,
            icon: CurrencyDollarIcon,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            name: "Net Cash Flow",
            value: `Rs ${totalProfit.toLocaleString()}`,
            subtitle: "Completed POS sales minus recorded purchase spending",
            // change: "+35%",
            changeType: "positive" as const,
            icon: ChartBarIcon,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        },
        {
            name: "Today Sales",
            value: `Rs ${todaySales.toLocaleString()}`,
            subtitle: undefined as string | undefined,
            // change: "+22%",
            changeType: "positive" as const,
            icon: CurrencyDollarIcon,
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
        {
            name: "Total Customers",
            value: totalCustomers.toLocaleString(),
            subtitle: undefined as string | undefined,
            // change: "+15%",
            changeType: "positive" as const,
            icon: UsersIcon,
            color: "text-amber-600",
            bg: "bg-amber-100",
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <motion.div key={stat.name} className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300" variants={itemVariants}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            {/* <div className="flex items-center space-x-1 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                {stat.changeType === "positive" ? (
                                    <span className="text-emerald-500 text-sm font-bold relative top-[-1px]">↗</span>
                                ) : (
                                    <span className="text-red-500 text-sm font-bold relative top-[-1px]">↘</span>
                                )}
                                <span
                                    className={`text-xs font-bold ${stat.changeType === "positive"
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                        }`}>
                                    {stat.change}
                                </span>
                            </div> */}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">
                                {stat.name}
                            </p>
                            <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                {stat.value}
                            </p>
                            {stat.subtitle && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {stat.subtitle}
                                </p>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
