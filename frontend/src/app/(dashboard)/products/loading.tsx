"use client";

import LoadingState from "@/components/ui/LoadingState";

export default function Loading() {
    return <LoadingState message="Loading Inventory..." subtitle="Synchronizing your product catalog" />;
}
