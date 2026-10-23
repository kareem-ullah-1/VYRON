"use client";

interface SalesStatsProps {
    totalSales: number;
    totalProfit: number;
    todaySales: number;
    totalTransactions: number;
}

export default function SalesStats({
    totalSales,
    totalProfit,
    todaySales,
    totalTransactions,
}: SalesStatsProps) {
    const stats = [
        {
            name: "Total Sales",
            value: `$${totalSales?.toLocaleString()}`,
            subtitle: undefined as string | undefined,
            change: "+22%",
            changeType: "positive" as const,
        },
        {
            name: "Net Cash Flow",
            value: `$${totalProfit?.toLocaleString()}`,
            subtitle: "Completed POS sales minus recorded purchase spending",
            change: "+35%",
            changeType: "positive" as const,
        },
        {
            name: "Today Sales",
            value: `$${todaySales?.toLocaleString()}`,
            subtitle: undefined as string | undefined,
            change: "+22%",
            changeType: "positive" as const,
        },
        {
            name: "Total Transactions",
            value: totalTransactions?.toLocaleString(),
            subtitle: undefined as string | undefined,
            change: "+15%",
            changeType: "positive" as const,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div key={stat.name} className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">
                                {stat?.name}
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stat?.value}
                            </p>
                            {stat?.subtitle && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {stat.subtitle}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {stat?.changeType === "positive" ? (
                                <span className="text-green-500 text-lg">↗</span>
                            ) : (
                                <span className="text-red-500 text-lg">↘</span>
                            )}
                            <span
                                className={`text-sm font-medium ${
                                    stat?.changeType === "positive"
                                        ? "text-green-600"
                                        : "text-red-600"
                                }`}>
                                {stat?.change}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
