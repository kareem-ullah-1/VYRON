"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchCustomOrderDetail, clearSelectedOrder } from "@/store/slices/customOrderSlice";
import OrderForm from "@/components/CustomOrders/OrderForm";

export default function EditCustomOrderPage() {
    const params = useParams();
    const id = Number(params.id);
    const dispatch = useDispatch<AppDispatch>();
    const { selectedOrder, loading } = useSelector((state: RootState) => state.customOrders);

    useEffect(() => {
        if (id && !isNaN(id)) {
            dispatch(fetchCustomOrderDetail(id));
        }
        return () => { dispatch(clearSelectedOrder()); };
    }, [dispatch, id]);

    if (!id || isNaN(id)) {
        return (
            <div className="p-6 text-center text-gray-400">
                <p>Invalid order ID.</p>
            </div>
        );
    }

    if (loading && !selectedOrder) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!selectedOrder) {
        return (
            <div className="p-6 text-center text-gray-400">
                <p>Order not found.</p>
            </div>
        );
    }

    if (selectedOrder.Status !== "Pending") {
        return (
            <div className="p-6 text-center text-gray-400">
                <p>Only pending orders can be edited.</p>
            </div>
        );
    }

    return <OrderForm editOrder={selectedOrder} />;
}
