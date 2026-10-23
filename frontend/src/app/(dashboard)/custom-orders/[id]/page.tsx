"use client";

import { useParams } from "next/navigation";
import CustomOrderDetail from "@/components/CustomOrders/CustomOrderDetail";

export default function CustomOrderDetailPage() {
    const params = useParams();
    const id = Number(params.id);

    if (!id || isNaN(id)) {
        return (
            <div className="p-6 text-center text-gray-400">
                <p>Invalid order ID.</p>
            </div>
        );
    }

    return <CustomOrderDetail orderId={id} />;
}
