"use client";

import DataTable, { Column } from "../POS/DataTable";
import { Customer } from "@/store/slices/customersSlice";

interface CustomersTableProps {
    customers: Customer[];
    pagination?: {
        totalCount: number;
        page: number;
        pageSize: number;
        totalPages: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
    };
    onEdit: (customer: Customer) => void;
    onDelete?: (customer: Customer) => void;
    onView?: (customer: Customer) => void;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
}

export default function CustomersTable({
    customers,
    pagination,
    onEdit,
    onDelete,
    onView,
    onPageChange,
    onPageSizeChange,
}: CustomersTableProps) {
    const columns: Column<Customer>[] = [
        {
            header: "Customer",
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 flex items-center justify-center flex-shrink-0 text-indigo-700">
                        <span className="text-xs font-bold">
                            {c?.FullName?.[0]?.toUpperCase() ?? "?"}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 leading-tight">
                            {c?.FullName ?? "N/A"}
                        </span>
                        <span className="text-xs text-gray-400">
                            ID: #{c?.Id ?? "N/A"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "Contact",
            render: (c) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{c?.Email ?? "N/A"}</span>
                    <span className="text-xs font-medium text-gray-500 mt-0.5">
                        {c?.ContactNumber ?? "N/A"}
                    </span>
                </div>
            ),
        },
        {
            header: "Location",
            render: (c) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                        {c?.City ?? "N/A"}, {c?.State ?? "N/A"}
                    </span>
                    <span className="text-xs font-medium text-gray-500 mt-0.5">{c?.Country ?? "N/A"}</span>
                </div>
            ),
        },
    ];

    const actions = (c: Customer) => (
        <div className="flex items-center justify-end gap-1">
            {onView && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onView(c);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                    View
                </button>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(c);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
                Edit
            </button>
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                    Delete
                </button>
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <DataTable
                columns={columns}
                data={customers ?? []}
                actions={actions}
                onRowClick={(c) => onView?.(c)}
                rowHover
                pageSizeOptions={[25, 50, 100]}
                currentPage={pagination?.page ?? 1}
                pageSize={pagination?.pageSize ?? 25}
                totalItems={pagination?.totalCount}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                noDataTitle="No customers found"
                noDataIcon="👥"
            />
        </div>
    );
}
