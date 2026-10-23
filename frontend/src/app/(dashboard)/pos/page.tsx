"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import POSInterface from "@/components/POS/POSInterface";

function POSContent() {
    const searchParams = useSearchParams();
    const reorderCustomerId = searchParams.get("customerId");

    return <POSInterface reorderCustomerId={reorderCustomerId ? Number(reorderCustomerId) : null} />;
}

export default function POSPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>}>
            <POSContent />
        </Suspense>
    );
}
