"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
    fetchProducts,
    fetchCategories,
    Product,
} from "@/store/slices/productsSlice";
import { MagnifyingGlassIcon, PlusIcon, FunnelIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import ProductsTable from "./ProductsTable";
import FilterSelect from "../POS/FilterSelect";
import ProductScreen from "./ProductScreen";
import ProductDetail from "./ProductDetail";
import { toast } from "sonner";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";

export default function ProductsManagement() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [stockStatus, setStockStatus] = useState<string>("All");

    const dispatch = useDispatch<AppDispatch>();

    const {
        products = [],
        categories = [],
        loading,
        error,
    } = useSelector((state: RootState) => state.products);

    const refreshProducts = () => {
        dispatch(fetchProducts());
    };

    useEffect(() => {
        dispatch(fetchCategories());
        dispatch(fetchProducts());
    }, [dispatch]);

    // Client-side filtering
    const filteredProducts = useMemo(() => {
        let result = products;

        if (selectedCategoryId) {
            result = result.filter(
                (p) => String(p.CategoryId) === selectedCategoryId
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (p) =>
                    p.ProductName?.toLowerCase().includes(q) ||
                    p.ProductCode?.toLowerCase().includes(q) ||
                    p.RomanUrduName?.toLowerCase().includes(q) ||
                    (p.Variants && p.Variants.some(v => v.VariantName?.toLowerCase().includes(q)))
            );
        }

        if (stockStatus !== "All") {
            result = result.filter(p => {
                if (stockStatus === "InStock") {
                    return p.Variants && p.Variants.length > 0
                        ? p.Variants.some(v => (v.Stock ?? 0) > 10)
                        : (p.Stock ?? 0) > 10;
                }
                if (stockStatus === "LowStock") {
                    return p.Variants && p.Variants.length > 0
                        ? p.Variants.some(v => (v.Stock ?? 0) > 0 && (v.Stock ?? 0) <= 10)
                        : ((p.Stock ?? 0) > 0 && (p.Stock ?? 0) <= 10);
                }
                if (stockStatus === "OutOfStock") {
                    // Check if *all* variants are out of stock, OR at least *some* are out of stock?
                    // Typically users want to know if *any* variant is out of stock.
                    return p.Variants && p.Variants.length > 0
                        ? p.Variants.some(v => (v.Stock ?? 0) <= 0)
                        : (p.Stock ?? 0) <= 0;
                }
                return true;
            }).map(p => {
                // If there are variants, filter them down to only the ones matching the status
                // so the user only sees the variants that triggered the filter.
                if (!p.Variants || p.Variants.length === 0) return p;

                let filteredVariants = p.Variants;
                if (stockStatus === "InStock") {
                    filteredVariants = p.Variants.filter(v => (v.Stock ?? 0) > 10);
                } else if (stockStatus === "LowStock") {
                    filteredVariants = p.Variants.filter(v => (v.Stock ?? 0) > 0 && (v.Stock ?? 0) <= 10);
                } else if (stockStatus === "OutOfStock") {
                    filteredVariants = p.Variants.filter(v => (v.Stock ?? 0) <= 0);
                }

                return { ...p, Variants: filteredVariants };
            });
        }

        return result;
    }, [products, selectedCategoryId, searchQuery, stockStatus]);

    const handleDeleteProduct = async (product: Product) => {
        try {
            const response = await api.delete(`Product/DeleteProduct/${product.Id}`);
            const result = response.data;
            if (result?.isSuccess === false) {
                toast.error(result.message || "Failed to delete product");
                return;
            }
            toast.success(`${product.ProductName} deleted successfully`);
            refreshProducts();
        } catch (err: any) {
            const message =
                err.response?.data?.message || err.message || "Failed to delete product";
            toast.error(message);
            throw err;
        }
    };

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const handleAddProduct = () => {
        router.push("/products/new");
    };

    const handleEditProduct = (product: Product) => {
        router.push(`/products/edit/${product.Id}`);
    };

    const handleViewProduct = (product: Product) => {
        router.push(`/products/${product.Id}`);
    };



    return (
        <div className="p-4 sm:p-6 flex flex-col h-full gap-6 overflow-y-auto md:overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your inventory, configure variants, and track stock.</p>
                </div>
                <button
                    type="button"
                    onClick={handleAddProduct}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                >
                    <PlusIcon className="w-5 h-5 stroke-2" />
                    <span>Add Product</span>
                </button>
            </div>

            {/* Filters & Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-[26rem] md:min-h-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-gray-50/30 relative z-10">

                    {/* Left: Search & Filters */}
                    <div className="flex flex-1 w-full gap-4 flex-col sm:flex-row items-center">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-gray-800 text-sm rounded-xl outline-none transition-all shadow-sm placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-1 w-full gap-3 sm:w-auto">
                            <FilterSelect
                                value={selectedCategoryId}
                                onChange={setSelectedCategoryId}
                                icon={<FunnelIcon className="w-4 h-4" />}
                                options={[
                                    { value: "", label: "All Categories" },
                                    ...(Array.isArray(categories) ? categories.map((cat: any) => ({
                                        value: String(cat.Id),
                                        label: cat.Name,
                                    })) : []),
                                ]}
                            />

                            <FilterSelect
                                value={stockStatus}
                                onChange={setStockStatus}
                                icon={<ArchiveBoxIcon className="w-4 h-4" />}
                                options={[
                                    { value: "All", label: "All Stock" },
                                    { value: "InStock", label: "In Stock (>10)", dot: "bg-emerald-500" },
                                    { value: "LowStock", label: "Low Stock (1-10)", dot: "bg-amber-500" },
                                    { value: "OutOfStock", label: "Out of Stock (0)", dot: "bg-rose-500" },
                                ]}
                            />
                        </div>
                    </div>

                </div>

                {/* Results count indicator - optional, inline above the table */}
                {(searchQuery || selectedCategoryId) && (
                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-700 flex items-center justify-between font-medium">
                        <span>
                            Showing {filteredProducts.length} of {products.length} products
                        </span>
                        <button
                            onClick={() => { setSearchQuery(""); setSelectedCategoryId(""); setStockStatus("All"); }}
                            className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2">
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Table Container */}
                <div className="flex-1 overflow-hidden">
                    <ProductsTable
                        onEdit={handleEditProduct}
                        onView={handleViewProduct}
                        products={filteredProducts}
                        onDelete={handleDeleteProduct}
                        isLoading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
