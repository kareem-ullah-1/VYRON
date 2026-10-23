"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchProducts, Product } from "@/store/slices/productsSlice";
import ProductDetail from "@/components/Products/ProductDetail";
import { toast } from "sonner";
import LoadingState from "@/components/ui/LoadingState";

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { products, loading } = useSelector((state: RootState) => state.products);
    const [product, setProduct] = useState<Product | null>(null);

    useEffect(() => {
        if (products.length === 0) {
            dispatch(fetchProducts());
        }
    }, [dispatch, products.length]);

    useEffect(() => {
        if (products.length > 0 && id) {
            const found = products.find((p) => String(p.Id) === String(id));
            if (found) {
                setProduct(found);
            } else if (!loading) {
                toast.error("Product not found");
                router.push("/products");
            }
        }
    }, [products, id, loading, router]);

    if (!product) {
        return <LoadingState message="Loading Details..." subtitle="Retrieving product information" />;
    }

    return (
        <ProductDetail 
            product={product} 
            onBack={() => router.push("/products")}
            onEdit={(p) => router.push(`/products/edit/${p.Id}`)}
        />
    );
}
