"use client";

import { useParams } from "next/navigation";
import { useProgressRouter } from "@/components/Navigation";
import ViewCustomerScreen from "@/components/Customers/ViewCustomerModal";

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useProgressRouter();
    const id = Number(params.id);

    if (!id || isNaN(id)) {
        return (
            <div className="p-6 text-center text-gray-400">
                <p>Invalid customer ID.</p>
            </div>
        );
    }

    return <ViewCustomerScreen customerId={id} onBack={() => router.push("/customers")} />;
}
