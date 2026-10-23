"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchSalesReport } from "@/store/slices/reportSlice";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DocumentArrowDownIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

const money = (n: number) => `Rs ${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
                <p className="text-sm text-gray-500">
                    Sales: <span className="font-bold text-gray-900">{money(payload[0].value)}</span>
                </p>
            </div>
        );
    }
    return null;
};

export default function SalesReport() {
    const dispatch = useDispatch<AppDispatch>();
    const { report, loading, error } = useSelector((state: RootState) => state.report);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

    useEffect(() => {
        dispatch(fetchSalesReport({ startDate, endDate }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const runReport = () => {
        dispatch(fetchSalesReport({ startDate, endDate }));
    };

    const chartData = useMemo(() => (report?.byDay ?? []).map((d) => ({ name: d.date, Sales: d.sales })), [report]);

    const handleExportExcel = async () => {
        if (!report) return;
        setExporting("excel");
        try {
            const XLSX = await import("xlsx");
            const wb = XLSX.utils.book_new();

            const summarySheet = XLSX.utils.json_to_sheet([
                { Metric: "Total Sales", Value: report.summary.totalSales },
                { Metric: "Total Transactions", Value: report.summary.totalTransactions },
                { Metric: "Total Discount", Value: report.summary.totalDiscount },
                { Metric: "Average Sale Value", Value: report.summary.averageSaleValue },
                { Metric: "Total Profit", Value: report.summary.totalProfit },
            ]);
            XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

            XLSX.utils.book_append_sheet(
                wb,
                XLSX.utils.json_to_sheet(report.byDay.map((d) => ({ Date: d.date, Sales: d.sales, Transactions: d.transactions }))),
                "By Day",
            );
            XLSX.utils.book_append_sheet(
                wb,
                XLSX.utils.json_to_sheet(
                    report.byPaymentMethod.map((p) => ({ "Payment Method": p.paymentMethod, Sales: p.sales, Transactions: p.transactions })),
                ),
                "By Payment Method",
            );
            XLSX.utils.book_append_sheet(
                wb,
                XLSX.utils.json_to_sheet(report.byProduct.map((p) => ({ Product: p.name, Quantity: p.quantity, Sales: p.sales }))),
                "By Product",
            );

            XLSX.writeFile(wb, `sales-report_${report.startDate}_to_${report.endDate}.xlsx`);
        } catch {
            toast.error("Failed to generate Excel file");
        } finally {
            setExporting(null);
        }
    };

    const handleExportPdf = async () => {
        if (!report) return;
        setExporting("pdf");
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("Sales Report", 14, 18);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`${report.startDate} to ${report.endDate}`, 14, 25);

            autoTable(doc, {
                startY: 32,
                head: [["Metric", "Value"]],
                body: [
                    ["Total Sales", money(report.summary.totalSales)],
                    ["Total Transactions", String(report.summary.totalTransactions)],
                    ["Total Discount", money(report.summary.totalDiscount)],
                    ["Average Sale Value", money(report.summary.averageSaleValue)],
                    ["Total Profit", money(report.summary.totalProfit)],
                ],
                theme: "striped",
                headStyles: { fillColor: [79, 70, 229] },
            });

            const afterSummaryY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(30);
            doc.text("By Payment Method", 14, afterSummaryY);
            autoTable(doc, {
                startY: afterSummaryY + 4,
                head: [["Payment Method", "Sales", "Transactions"]],
                body: report.byPaymentMethod.map((p) => [p.paymentMethod, money(p.sales), String(p.transactions)]),
                theme: "striped",
                headStyles: { fillColor: [79, 70, 229] },
            });

            const afterPaymentY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.text("By Product", 14, afterPaymentY);
            autoTable(doc, {
                startY: afterPaymentY + 4,
                head: [["Product", "Quantity", "Sales"]],
                body: report.byProduct.map((p) => [p.name, String(p.quantity), money(p.sales)]),
                theme: "striped",
                headStyles: { fillColor: [79, 70, 229] },
            });

            doc.save(`sales-report_${report.startDate}_to_${report.endDate}.pdf`);
        } catch {
            toast.error("Failed to generate PDF");
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Report</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Totals and breakdowns across POS sales and completed custom orders.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportExcel}
                        disabled={!report || !!exporting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                        <TableCellsIcon className="w-4 h-4" />
                        {exporting === "excel" ? "Exporting…" : "Export Excel"}
                    </button>
                    <button
                        onClick={handleExportPdf}
                        disabled={!report || !!exporting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                    </button>
                </div>
            </div>

            {/* Date range */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto bg-gray-50/50 border border-gray-200 rounded-xl px-2 py-1">
                    <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-gray-500 px-2 whitespace-nowrap">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-gray-800 text-sm py-1.5 outline-none w-full sm:w-[150px] cursor-pointer"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto bg-gray-50/50 border border-gray-200 rounded-xl px-2 py-1">
                    <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-gray-500 px-2 whitespace-nowrap">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-gray-800 text-sm py-1.5 outline-none w-full sm:w-[150px] cursor-pointer"
                    />
                </div>
                <button
                    onClick={runReport}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                    {loading ? "Loading…" : "Run Report"}
                </button>
                {report && (
                    <span className="text-xs text-gray-400 sm:ml-auto">
                        Showing {report.startDate} to {report.endDate}
                    </span>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Total Sales", value: money(report?.summary.totalSales ?? 0) },
                    { label: "Transactions", value: (report?.summary.totalTransactions ?? 0).toLocaleString() },
                    { label: "Total Discount", value: money(report?.summary.totalDiscount ?? 0) },
                    { label: "Avg. Sale Value", value: money(report?.summary.averageSaleValue ?? 0) },
                    { label: "Net Profit", value: money(report?.summary.totalProfit ?? 0) },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                        <p className="text-xs font-medium text-gray-500">{s.label}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* By day chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Sales by Day</h3>
                <div className="h-64">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="reportSalesGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Sales" stroke="#4f46e5" fill="url(#reportSalesGradient)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                            {loading ? "Loading…" : "No sales in this range"}
                        </div>
                    )}
                </div>
            </div>

            {/* Breakdown tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <h3 className="text-base font-bold text-gray-900 px-5 pt-5 pb-3">By Payment Method</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50/60">
                                <th className="px-5 py-2.5">Method</th>
                                <th className="px-5 py-2.5 text-right">Transactions</th>
                                <th className="px-5 py-2.5 text-right">Sales</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(report?.byPaymentMethod ?? []).map((p) => (
                                <tr key={p.paymentMethod}>
                                    <td className="px-5 py-2.5 text-gray-800">{p.paymentMethod}</td>
                                    <td className="px-5 py-2.5 text-right text-gray-600">{p.transactions}</td>
                                    <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{money(p.sales)}</td>
                                </tr>
                            ))}
                            {!report?.byPaymentMethod?.length && (
                                <tr>
                                    <td colSpan={3} className="px-5 py-6 text-center text-gray-400">
                                        {loading ? "Loading…" : "No data for this range"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <h3 className="text-base font-bold text-gray-900 px-5 pt-5 pb-3">By Product</h3>
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50/60">
                                    <th className="px-5 py-2.5">Product</th>
                                    <th className="px-5 py-2.5 text-right">Qty</th>
                                    <th className="px-5 py-2.5 text-right">Sales</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(report?.byProduct ?? []).map((p) => (
                                    <tr key={p.name}>
                                        <td className="px-5 py-2.5 text-gray-800">{p.name}</td>
                                        <td className="px-5 py-2.5 text-right text-gray-600">{p.quantity}</td>
                                        <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{money(p.sales)}</td>
                                    </tr>
                                ))}
                                {!report?.byProduct?.length && (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-6 text-center text-gray-400">
                                            {loading ? "Loading…" : "No data for this range"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
