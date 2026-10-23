"use client";

import React, { ReactNode, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TableSkeleton } from "../ui/TableSkeleton";
import { InboxIcon } from "@heroicons/react/24/outline";

export interface Column<T> {
    header: string;
    accessor?: keyof T | string;
    render?: (row: T) => ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data?: T[] | null;
    totalItems?: number; // for server-side pagination
    actions?: (row: T) => ReactNode;
    pageSizeOptions?: number[];
    currentPage?: number; // controlled page (server-side)
    pageSize?: number; // controlled page size (server-side)
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onRowClick?: (row: T) => void;
    rowHover?: boolean;
    renderExpanded?: (row: T) => ReactNode;
    noDataTitle?: string;
    noDataIcon?: ReactNode;
    isLoading?: boolean;
}

export default function DataTable<T extends { Id?: string | number }>({
    columns,
    data = [],
    totalItems,
    actions,
    pageSizeOptions = [25, 50, 100],
    currentPage: controlledPage,
    pageSize: controlledPageSize,
    onPageChange,
    onPageSizeChange,
    onRowClick,
    rowHover = true,
    renderExpanded,
    noDataTitle = "No records found",
    noDataIcon = <InboxIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />,
    isLoading = false,
}: DataTableProps<T>) {
    // Local state for client-side pagination if server-side not used
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    useEffect(() => {
        setExpandedRows(new Set());
    }, [data]);

    const effectivePage = controlledPage ?? currentPage;
    const effectivePageSize = controlledPageSize ?? pageSize;

    const totalPages = totalItems
        ? Math.ceil(totalItems / effectivePageSize)
        : Math.ceil((data?.length || 0) / effectivePageSize);

    const displayedData = useMemo(() => {
        if (totalItems) return data; // server already returns current page
        const start = (effectivePage - 1) * effectivePageSize;
        return data?.slice(start, start + effectivePageSize);
    }, [data, effectivePage, effectivePageSize, totalItems]);

    const handlePrev = () => {
        if (onPageChange) {
            onPageChange(effectivePage - 1);
            setExpandedRows(new Set());
        } else setCurrentPage((p) => Math.max(1, p - 1));
    };

    const handleNext = () => {
        if (onPageChange) {
            onPageChange(effectivePage + 1);
            setExpandedRows(new Set());
        } else setCurrentPage((p) => Math.min(totalPages, p + 1));
    };

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const size = Number(e.target.value);
        if (onPageSizeChange) onPageSizeChange(size);
        else setPageSize(size);
        if (!onPageChange) setCurrentPage(1);
        setExpandedRows(new Set());
    };

    const toggleRow = (globalIndex: number) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            newSet.has(globalIndex)
                ? newSet.delete(globalIndex)
                : newSet.add(globalIndex);
            return newSet;
        });
    };

    const tableBodyClasses = rowHover ? "hover:bg-gray-50 cursor-pointer" : "";
    const hasData = Array.isArray(displayedData) && displayedData.length > 0;

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full">
            {isLoading ? (
                <div className="p-4">
                    <TableSkeleton rowCount={effectivePageSize} columnCount={columns.length + (actions ? 1 : 0) + (renderExpanded ? 1 : 0)} />
                </div>
            ) : hasData ? (
                <>
                    <div className="flex-1 overflow-auto custom-scrollbar" style={{ minHeight: 0 }}>
                        <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="pl-6 pr-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Sr No.
                                    </th>
                                    {renderExpanded && (
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                                    )}
                                    {columns.map((col, i) => (
                                        <th
                                            key={i}
                                            className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || "text-left"
                                                }`}>
                                            {col.header}
                                        </th>
                                    ))}
                                    {actions && (
                                        <th className="pr-6 pl-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            <motion.tbody
                                className="bg-white divide-y divide-gray-200"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.05 } }
                                }}
                            >
                                {displayedData.map((row, idx) => {
                                    const globalIndex =
                                        (effectivePage - 1) * effectivePageSize + idx;
                                    const rowKey = row.Id ?? globalIndex;

                                    return (
                                        <React.Fragment key={rowKey}>
                                            <motion.tr
                                                variants={{
                                                    hidden: { opacity: 0, y: 10 },
                                                    visible: { opacity: 1, y: 0 }
                                                }}
                                                className={`${tableBodyClasses} ${renderExpanded || onRowClick ? 'cursor-pointer hover:bg-gray-50/80 transition-colors' : ''}`}
                                                onClick={() => {
                                                    if (renderExpanded) toggleRow(globalIndex);
                                                    if (onRowClick) onRowClick(row);
                                                }}
                                            >
                                                <td className="pl-6 pr-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                    {globalIndex + 1}
                                                </td>
                                                {renderExpanded && (
                                                    <td className="px-2 py-2 text-sm text-gray-900">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleRow(globalIndex);
                                                            }}
                                                            className="p-1 rounded hover:bg-gray-200 transition">
                                                            {expandedRows.has(
                                                                globalIndex
                                                            ) ? (
                                                                <svg
                                                                    className="w-4 h-4 text-gray-600 transition-transform"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                    xmlns="http://www.w3.org/2000/svg">
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M5 15l7-7 7 7"
                                                                    />
                                                                </svg>
                                                            ) : (
                                                                <svg
                                                                    className="w-4 h-4 text-gray-600 transition-transform"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                    xmlns="http://www.w3.org/2000/svg">
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 9l-7 7-7-7"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </td>
                                                )}
                                                {columns.map((col, i) => (
                                                    <td
                                                        key={i}
                                                        className={`px-4 py-2 whitespace-nowrap text-sm text-gray-900 ${col.className || ""}`}>
                                                        {col.render
                                                            ? col.render(row)
                                                            : (row[
                                                                col.accessor as keyof T
                                                            ] as ReactNode) ?? "—"}
                                                    </td>
                                                ))}
                                                {actions && (
                                                    <td className="pr-6 pl-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                        {actions(row)}
                                                    </td>
                                                )}
                                            </motion.tr>

                                            <AnimatePresence>
                                                {renderExpanded && expandedRows.has(globalIndex) && (
                                                    <motion.tr
                                                        className="bg-gray-50 overflow-hidden"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <td
                                                            colSpan={
                                                                columns.length +
                                                                (actions ? 2 : 1) +
                                                                1
                                                            } // +1 for expand column
                                                            className="px-6 py-4">
                                                            {renderExpanded(row)}
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })}
                            </motion.tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3 bg-gray-50 border-t text-sm text-gray-600 gap-3">
                        <div className="flex items-center space-x-2">
                            <span>Rows per page:</span>
                            <select
                                title="pagination"
                                value={effectivePageSize}
                                onChange={handlePageSizeChange}
                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none">
                                {pageSizeOptions.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handlePrev}
                                disabled={effectivePage === 1}
                                className="px-3 py-1 border rounded disabled:text-gray-400">
                                Prev
                            </button>

                            <span>
                                Page <strong>{effectivePage}</strong> of{" "}
                                <strong>{totalPages || 1}</strong>
                            </span>

                            <button
                                onClick={handleNext}
                                disabled={
                                    effectivePage === totalPages || totalPages === 0
                                }
                                className="px-3 py-1 border rounded disabled:text-gray-400">
                                Next
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 rounded-b-lg">
                    {noDataIcon}
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {noDataTitle}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Try adjusting your search or filters to find what you're looking for.
                    </p>
                </div>
            )}
        </div>
    );
}
