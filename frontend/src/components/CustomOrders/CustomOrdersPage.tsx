"use client";

import { useState, useEffect, useMemo } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { useProgressRouter } from "@/components/Navigation";
import { AppDispatch, RootState } from "@/store/store";
import { fetchCustomOrders, CustomOrder } from "@/store/slices/customOrderSlice";
import { deleteCustomOrder } from "@/Apis/CustomOrder";
import DataTable, { Column } from "../POS/DataTable";
import FilterSelect from "../POS/FilterSelect";
import { ConfirmModal } from "../ui/ConfirmModal";
import CustomOrderStatusCell from "./CustomOrderStatusCell";
import { toast } from "sonner";

export default function CustomOrdersPage() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useProgressRouter();
    const { orders, loading } = useSelector((state: RootState) => state.customOrders);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: number | null }>({
        isOpen: false,
        orderId: null,
    });

    useEffect(() => {
        dispatch(fetchCustomOrders());
    }, [dispatch]);

    const filteredOrders = useMemo(() => {
        let result = orders;

        if (statusFilter !== "All") {
            result = result.filter(o => o.Status?.toLowerCase() === statusFilter.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(o =>
                o.OrderNumber?.toLowerCase().includes(q) ||
                o.CustomerName?.toLowerCase().includes(q) ||
                o.Description?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [orders, statusFilter, searchQuery]);

    const handleDelete = async (id: number) => {
        try {
            const res = await deleteCustomOrder(id);
            if (res.isSuccess) {
                toast.success("Order deleted successfully");
                dispatch(fetchCustomOrders());
            } else {
                toast.error(res.message || "Failed to delete order");
            }
        } catch {
            toast.error("Failed to delete order");
        }
    };

    const columns: Column<CustomOrder>[] = [
        {
            header: "Order #",
            render: (order) => (
                <span className="font-semibold text-indigo-700">{order.OrderNumber}</span>
            ),
        },
        {
            header: "Customer",
            render: (order) => (
                <div>
                    <div className="font-medium text-gray-900">{order.CustomerName || "—"}</div>
                    <div className="text-xs text-gray-400">{order.CustomerContact}</div>
                </div>
            ),
        },
        {
            header: "Type",
            render: (order) => (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                    {order.OrderType}
                </span>
            ),
        },
        {
            header: "Items",
            render: (order) => {
                const count = order.Blocks?.reduce((sum, b) => sum + (b.Items?.length || 0), 0) || 0;
                return <span className="text-gray-600">{count} item{count !== 1 ? "s" : ""}</span>;
            },
        },
        {
            header: "Total",
            className: "text-right",
            render: (order) => (
                <span className="font-semibold text-gray-900">{order.TotalAmount?.toLocaleString()}</span>
            ),
        },
        {
            header: "Paid",
            className: "text-right",
            render: (order) => (
                <span className="text-green-700 font-medium">{order.PaidAmount?.toLocaleString()}</span>
            ),
        },
        {
            header: "Remaining",
            className: "text-right",
            render: (order) => (
                <span className="text-red-600 font-medium">Rs {order.RemainingBalance?.toLocaleString()}</span>
            ),
        },
        {
            header: "Status",
            render: (order) => (
                <CustomOrderStatusCell
                    order={order}
                    size="md"
                    onAdvanced={() => dispatch(fetchCustomOrders())}
                />
            ),
        },
        {
            header: "Delivery",
            render: (order) => (
                <div>
                    <div className="text-xs">{order.DeliveryType}</div>
                    {order.DeliveryDate && (
                        <div className="text-xs text-gray-400">{new Date(order.DeliveryDate).toLocaleDateString()}</div>
                    )}
                </div>
            ),
        },
        {
            header: "Created",
            render: (order) => (
                <span className="text-xs text-gray-500">{new Date(order.CreatedAt).toLocaleDateString()}</span>
            ),
        },
    ];

    const actions = (order: CustomOrder) => (
        <div className="flex items-center justify-end gap-1">
            <button
                onClick={(e) => { e.stopPropagation(); router.push(`/custom-orders/${order.Id}`); }}
                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
                View
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); if (order.Status === "Pending") router.push(`/custom-orders/${order.Id}/edit`); }}
                disabled={order.Status !== "Pending"}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${order.Status === "Pending" ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : "text-gray-400 bg-gray-100 cursor-not-allowed"}`}
            >
                Edit
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); if (order.Status === "Pending") setDeleteModal({ isOpen: true, orderId: order.Id }); }}
                disabled={order.Status !== "Pending"}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${order.Status === "Pending" ? "text-red-700 bg-red-50 hover:bg-red-100" : "text-gray-400 bg-gray-100 cursor-not-allowed"}`}
            >
                Delete
            </button>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Custom Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Create and manage custom orders with deposits and status tracking.</p>
                </div>
                <button
                    onClick={() => router.push("/custom-orders/new")}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                    <PlusIcon className="w-4 h-4 stroke-2" />
                    New Order
                </button>
            </div>

            {/* Filters & Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-[26rem] md:min-h-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
                    <div className="relative flex-1 w-full sm:max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search order #, customer, description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                        />
                    </div>
                    <FilterSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { value: "All", label: "All Statuses" },
                            { value: "Pending", label: "Pending", dot: "bg-amber-500" },
                            { value: "Delivered", label: "Delivered", dot: "bg-teal-500" },
                            { value: "Complete", label: "Complete", dot: "bg-blue-500" },
                        ]}
                    />
                </div>

                {/* Results count */}
                {(searchQuery || statusFilter !== "All") && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</span>
                        <button
                            onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filteredOrders}
                    actions={actions}
                    onRowClick={(order) => router.push(`/custom-orders/${order.Id}`)}
                    isLoading={loading}
                    noDataTitle="No custom orders found"
                    pageSizeOptions={[25, 50, 100]}
                />
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, orderId: null })}
                onConfirm={() => deleteModal.orderId && handleDelete(deleteModal.orderId)}
                title="Delete Custom Order"
                message="Are you sure you want to delete this custom order? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
