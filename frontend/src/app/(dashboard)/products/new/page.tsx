"use client";

import ProductScreen from "@/components/Products/ProductScreen";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
    const router = useRouter();

    return (
        <ProductScreen
            product={null}
            onBack={() => router.push("/products")}
        />
    );
}
