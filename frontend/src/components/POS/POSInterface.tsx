"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchCategories, fetchProducts } from "@/store/slices/productsSlice";
import { fetchCustomers } from "@/store/slices/customersSlice";
import { addItem, clearCart, setDiscount } from "@/store/slices/cartSlice";
import ProductGrid from "./ProductGrid";
import ShoppingCart from "./ShoppingCart";
import CustomerSelector from "./CustomerSelector";
import ReceiptModal from "./ReceiptModal";
import FilterSelect from "./FilterSelect";
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/axios";

export default function POSInterface({ reorderCustomerId }: { reorderCustomerId?: number | null }) {
    const {
        products,
        categories,
        loading: productsLoading,
    } = useSelector((s: RootState) => s.products);
    const { loading: customersLoading } = useSelector((s: RootState) => s.customers);
    const { items } = useSelector((s: RootState) => s.cart);

    // UI States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();

    // Customer
    const [isWalkIn, setIsWalkIn] = useState(!reorderCustomerId);
    const [walkInName, setWalkInName] = useState(reorderCustomerId ? "" : "Walk-in Customer");
    const [walkInPhone, setWalkInPhone] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<number | string | null>(reorderCustomerId ?? null);

    // Receipt
    const [saleData, setSaleData] = useState<any | null>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);

    const dispatch = useDispatch<AppDispatch>();

    const saleLoadedRef = useRef(false);

    useEffect(() => {
        if (products.length === 0 || saleLoadedRef.current) return;

        const fetchSaleDetails = async () => {
            const storedSaleId = localStorage.getItem("reordersaleId");
            if (!storedSaleId) {
                saleLoadedRef.current = true;
                return;
            }

            saleLoadedRef.current = true;
            dispatch(clearCart());

            try {
                const saleId = JSON.parse(storedSaleId);

                const { data } = await api.get(`/Sales/GetSaleDetails/${saleId}`);
                const saleData = data.data;

                // Handle both PascalCase and camelCase API responses
                const saleItems = saleData.Items || saleData.items || [];

                saleItems.forEach((saleItem: any) => {
                    const product = products.find((p) =>
                        p.Variants?.some((v) => v.Id === saleItem.ProductVariantId)
                    );
                    if (!product) {
                        console.warn("[Reorder] Product not found for variant ID:", saleItem.ProductVariantId);
                        return;
                    }

                    const variant = product.Variants?.find(
                        (v) => v.Id === saleItem.ProductVariantId
                    );
                    if (!variant) {
                        console.warn("[Reorder] Variant not found:", saleItem.ProductVariantId);
                        return;
                    }

                    const hasDiscount = (saleItem.DiscountAmount ?? 0) > 0;
                    const discountPerUnit = hasDiscount ? (saleItem.DiscountAmount ?? 0) / saleItem.Quantity : 0;
                    const soldAt = (saleItem.UnitPrice ?? variant.Price) - discountPerUnit;

                    const isUrdu = variant.Attributes?.some((a: any) => a.AttributeName?.toLowerCase() === 'language' && a.AttributeValue?.toLowerCase() === 'urdu');
                    const mainName = isUrdu && product.RomanUrduName ? product.RomanUrduName : product.ProductName;
                    const displayName = variant.VariantName ? `${mainName} - ${variant.VariantName}` : mainName;


                    dispatch(
                        addItem({
                            Id: variant.Id,
                            name: displayName,
                            price: variant.Price,
                            editedPrice: soldAt,
                            quantity: saleItem.Quantity,
                            stock: variant.Stock,
                            category: product.Category,
                        })
                    );
                });
                setSaleData(saleData);
            } catch (err) {
                console.error("[Reorder] Error fetching sale details:", err);
            } finally {
                localStorage.removeItem("reordersaleId");
            }
        };

        fetchSaleDetails();
    }, [dispatch, products]);

    // Load data
    useEffect(() => {
        dispatch(fetchProducts());
        dispatch(fetchCustomers());
        dispatch(fetchCategories());
    }, [dispatch]);

    // AUTO CALCULATE DISCOUNT
    useEffect(() => {
        const totalDiscount = items.reduce((sum, item) => {
            const final = item.editedPrice ?? item.price;
            return sum + (item.price - final) * item.quantity;
        }, 0);
        dispatch(setDiscount(Math.max(0, totalDiscount)));
    }, [items, dispatch]);

    // Filter products and variants (split-word search at variant level)
    const filteredProducts = products
        .filter((p) => !selectedCategory || p.CategoryId === selectedCategory)
        .map((p) => {
            if (!searchQuery) return p;
            const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

            if (p.Variants && p.Variants.length > 0) {
                const matchingVariants = p.Variants.filter((v) => {
                    const isUrdu = v.Attributes?.some((a: any) => a.AttributeName?.toLowerCase() === 'language' && a.AttributeValue?.toLowerCase() === 'urdu');
                    const mainName = isUrdu && p.RomanUrduName ? p.RomanUrduName : p.ProductName;
                    const displayName = (v.VariantName ? `${mainName} - ${v.VariantName}` : mainName).toLowerCase();
                    const searchable = [displayName, String(v.Id)].join(" ");
                    return words.every((w) => searchable.includes(w));
                });

                if (matchingVariants.length > 0) {
                    return { ...p, Variants: matchingVariants };
                }
                return null;
            }

            // If no variants exist, match base product name
            const productName = p.ProductName?.toLowerCase() ?? "";
            const allMatchProduct = words.every((w) => productName.includes(w));
            if (allMatchProduct) return p;

            return null;
        })
        .filter(Boolean) as typeof products;

    // Handle sale complete
    const handleSaleComplete = (s: any) => {
        setSaleData(s);
        setIsReceiptOpen(true);
        setSelectedCustomer(null);
        setWalkInName("Walk-in Customer");
        setWalkInPhone("");
        setIsWalkIn(true);
        dispatch(fetchProducts());
    };

    // Build category options for FilterSelect
    const categoryOptions = [
        { value: "", label: "All Categories" },
        ...categories.map((c) => ({
            value: String(c.Id),
            label: c.Name,
        })),
    ];

    const handleCategoryChange = (val: string) => {
        setSelectedCategory(val ? Number(val) : undefined);
    };

    return (
        <div className="h-screen max-h-screen flex gap-4 p-2 sm:p-4 bg-gray-100 overflow-hidden">
            {/* Left Section */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <header className="px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-primary-700">
                            <CubeIcon className="w-5 h-5 font-bold" />
                            <h2 className="text-lg font-bold">Products</h2>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-gray-400" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products..."
                                className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                            />
                        </div>

                        {/* Category Dropdown */}
                        <FilterSelect
                            value={selectedCategory !== undefined ? String(selectedCategory) : ""}
                            onChange={handleCategoryChange}
                            options={categoryOptions}
                            icon={<FunnelIcon className="w-4 h-4" />}
                            searchable
                            searchPlaceholder="Filter categories..."
                            className="w-64 sm:w-64"
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
                    {productsLoading || customersLoading ? (
                        <p className="text-center py-20 text-gray-500">Loading...</p>
                    ) : filteredProducts.length ? (
                        <ProductGrid products={filteredProducts} />
                    ) : (
                        <p className="text-center py-20 text-gray-400">
                            No products found.
                        </p>
                    )}
                </div>
            </div>

            {/* Right Section - Merged Customer & Cart */}
            <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <CustomerSelector
                    selectedCustomer={selectedCustomer}
                    setSelectedCustomer={setSelectedCustomer}
                    saleCustomerId={saleData?.originalSale?.customerId}
                    isWalkIn={isWalkIn}
                    setIsWalkIn={setIsWalkIn}
                    walkInName={walkInName}
                    setWalkInName={setWalkInName}
                    walkInPhone={walkInPhone}
                    setWalkInPhone={setWalkInPhone}
                />

                <ShoppingCart
                    selectedCustomer={selectedCustomer}
                    isWalkIn={isWalkIn}
                    walkInName={walkInName}
                    walkInPhone={walkInPhone}
                    onSaleComplete={handleSaleComplete}
                />
            </div>

            {isReceiptOpen && saleData && (
                <ReceiptModal sale={saleData} onClose={() => setIsReceiptOpen(false)} />
            )}
        </div>
    );
}

