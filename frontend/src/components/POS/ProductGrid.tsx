"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { addItem } from "@/store/slices/cartSlice";
import { Product } from "@/store/slices/productsSlice";
import { toast } from "sonner";
import { CubeIcon } from "@heroicons/react/24/outline";

const BATCH_SIZE = 30;

interface ProductTableProps {
    products: Product[];
}

export default function ProductTable({ products }: ProductTableProps) {
    const dispatch = useDispatch();
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const sentinelRef = useRef<HTMLTableRowElement>(null);

    // Reset visible count when products change (e.g. search/filter)
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [products]);

    // Flatten products into rows (each variant = 1 row)
    const allRows = React.useMemo(() => {
        const rows: { product: Product; variant?: Product["Variants"] extends (infer V)[] | undefined ? V : never }[] = [];
        products.forEach((product) => {
            const hasVariants = product.Variants && product.Variants.length > 0;
            if (hasVariants) {
                product.Variants!.forEach((variant) => {
                    rows.push({ product, variant });
                });
            } else {
                rows.push({ product });
            }
        });
        return rows;
    }, [products]);

    const visibleRows = allRows.slice(0, visibleCount);
    const hasMore = visibleCount < allRows.length;

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!hasMore || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, allRows.length));
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, allRows.length, visibleCount]);

    const handleAddToCart = (
        product: Product,
        variantId: number,
        variantPrice: number,
        variantName: string,
        variantStock: number,
        isUrdu: boolean = false
    ) => {
        if (!variantId || variantId === 0) {
            toast.error("Invalid product variant selected.");
            return;
        }

        const mainName = isUrdu && product.RomanUrduName ? product.RomanUrduName : product.ProductName;

        dispatch(
            addItem({
                Id: variantId,
                name: `${mainName} - ${variantName}`,
                price: variantPrice,
                editedPrice: variantPrice,
                quantity: 1,
                stock: variantStock,
                category: product.Category,
                image: product.ProductImages?.[0] || product.Image,
            })
        );
    };

    return (
        <div className="bg-white overflow-hidden flex flex-col h-full">
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap w-12">Img</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Product</th>
                            <th className="px-4 py-3 whitespace-nowrap">Category</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">Price</th>
                            <th className="px-4 py-3 whitespace-nowrap text-center">Stock</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {visibleRows.map((row, idx) => {
                            const { product, variant } = row;

                            if (variant) {
                                return (
                                    <tr key={`${product.Id}-${variant.Id}`} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                                                {product.ProductImages?.[0] || product.Image ? (
                                                    <img
                                                        src={product.ProductImages?.[0] || product.Image}
                                                        alt={product.ProductName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <CubeIcon className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="font-semibold text-gray-900 leading-tight">
                                                {variant.Attributes?.some(a => a.AttributeName?.toLowerCase() === 'language' && a.AttributeValue?.toLowerCase() === 'urdu') && product.RomanUrduName
                                                    ? product.RomanUrduName
                                                    : product.ProductName}
                                            </div>
                                            {(product.RomanUrduName || (variant.Attributes?.some(a => a.AttributeName?.toLowerCase() === 'language' && a.AttributeValue?.toLowerCase() === 'urdu') && product.ProductName)) && (
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {variant.Attributes?.some(a => a.AttributeName?.toLowerCase() === 'language' && a.AttributeValue?.toLowerCase() === 'urdu')
                                                        ? product.ProductName
                                                        : product.RomanUrduName}
                                                </div>
                                            )}
                                            <div className="text-xs text-indigo-600 font-medium mt-0.5">
                                                {variant.VariantName}
                                                <span className="text-gray-400 ml-1">· #{variant.Id}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-xs">
                                            <span className="whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 border border-gray-200">
                                                {product.Category || 'None'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                            Rs {variant.Price.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${variant.Stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {variant.Stock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                disabled={variant.Stock <= 0}
                                                onClick={() => handleAddToCart(
                                                    product,
                                                    variant.Id,
                                                    variant.Price,
                                                    variant.VariantName,
                                                    variant.Stock,
                                                    variant.Attributes?.some(a => a.AttributeName?.toLowerCase() === 'language' && a.AttributeValue?.toLowerCase() === 'urdu') ?? false
                                                )}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${variant.Stock <= 0
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white border border-primary-200 hover:border-primary-600 shadow-sm'
                                                    }`}
                                            >
                                                Add
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }

                            // No variants (base product only)
                            return (
                                <tr key={product.Id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-4 py-2">
                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                                            {product.ProductImages?.[0] || product.Image ? (
                                                <img
                                                    src={product.ProductImages?.[0] || product.Image}
                                                    alt={product.ProductName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <CubeIcon className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="font-semibold text-gray-900 leading-tight">
                                            {product.ProductName}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {product.RomanUrduName || product.ProductCode || 'Standard'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                        <span className="whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 border border-gray-200">
                                            {product.Category || 'None'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                        -
                                    </td>
                                    <td className="px-4 py-2 text-center text-xs text-gray-400">
                                        N/A
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <span className="text-xs text-gray-400 italic">No Variants</span>
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Sentinel row for infinite scroll */}
                        {hasMore && (
                            <tr ref={sentinelRef}>
                                <td colSpan={6} className="py-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                        Loading more products...
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Count indicator */}
                {allRows.length > 0 && (
                    <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100 bg-gray-50/50">
                        Showing {Math.min(visibleCount, allRows.length)} of {allRows.length} items
                    </div>
                )}
            </div>
        </div>
    );
}
