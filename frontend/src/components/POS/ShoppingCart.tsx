"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import {
    updateQuantity,
    removeItem,
    clearCart,
    updatePrice,
    setDiscount,
} from "@/store/slices/cartSlice";
import {
    MinusIcon,
    PlusIcon,
    TrashIcon,
    ShoppingCartIcon,
    TagIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    CubeIcon,
    BanknotesIcon,
    // CreditCardIcon,
    // BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import api from "@/lib/axios";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";

interface ShoppingCartProps {
    selectedCustomer: number | string | null;
    walkInName: string;
    walkInPhone: string;
    isWalkIn: boolean;
    onSaleComplete: (sale: any) => void;
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
export default function ShoppingCart({
    selectedCustomer,
    walkInName,
    walkInPhone,
    isWalkIn,
    onSaleComplete,
}: ShoppingCartProps) {
    const dispatch = useDispatch();
    const { items, subtotal, /* tax, */ discount, total } = useSelector(
        (state: RootState) => state.cart
    );

    const [isLoading, setIsLoading] = useState(false);
    const [cartDiscount, setCartDiscount] = useState(0);
    const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
    const [priceInput, setPriceInput] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [amountReceived, setAmountReceived] = useState<string>("");
    const [showClearModal, setShowClearModal] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<{ id: number; name: string } | null>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const hasEditedItems = items.some((i) => i.editedPrice !== i.price);

    /* Pre-fill received amount with current total */
    useEffect(() => {
        if (total > 0) setAmountReceived(total.toFixed(2));
    }, [total]);

    /* Global digit-key shortcut → clear & set received amount, focus input */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
            if (!/^\d$/.test(e.key)) return;
            e.preventDefault(); // prevent key replaying into the newly focused input
            setAmountReceived(e.key);
            amountInputRef.current?.focus();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    /* Reset cart discount when any item price is edited */
    useEffect(() => {
        if (hasEditedItems && cartDiscount !== 0) {
            setCartDiscount(0);
            dispatch(setDiscount(0));
            toast.info("Item-level price edit detected. Cart discount was reset.");
        }
    }, [hasEditedItems, cartDiscount, dispatch]);

    /* ---------------------------------------------------------------------- */
    /*                              ITEM HANDLERS                             */
    /* ---------------------------------------------------------------------- */
    const updateQuantityHandler = (id: number, qty: number) => {
        const item = items.find((i) => i.Id === id);
        if (!item) return;

        if (qty > item.stock) {
            toast.error(`Only ${item.stock} available in stock`);
            return;
        }

        if (qty <= 0) {
            setItemToRemove({ id, name: item.name });
        } else {
            dispatch(updateQuantity({ Id: id, quantity: qty }));
        }
    };

    const deleteItemHandler = (id: number) => {
        const item = items.find((i) => i.Id === id);
        if (item) {
            dispatch(removeItem(id));
            toast.success(`Removed ${item.name} from cart`);
        }
    };

    const startPriceEdit = (item: any) => {
        setEditingPriceId(item.Id);
        setPriceInput(item.editedPrice.toString());
    };

    const cancelPriceEdit = () => {
        setEditingPriceId(null);
        setPriceInput("");
    };

    const savePriceEdit = (id: number) => {
        const newPrice = parseFloat(priceInput);
        const originalPrice = items.find((i) => i.Id === id)!.price;

        if (isNaN(newPrice) || newPrice < 0) {
            toast.error("Please enter a valid price");
            return;
        }

        if (newPrice > originalPrice) {
            toast.error("Edited price cannot exceed original price");
            return;
        }

        dispatch(updatePrice({ Id: id, editedPrice: newPrice }));
        setEditingPriceId(null);
        setPriceInput("");
        toast.success("Price updated successfully");
    };

    const handlePriceInputChange = (value: string) => {
        // Allow only numbers and decimal point
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        // Ensure only one decimal point
        const parts = sanitizedValue.split(".");
        if (parts.length > 2) {
            setPriceInput(parts[0] + "." + parts.slice(1).join(""));
        } else {
            setPriceInput(sanitizedValue);
        }
    };

    /* ---------------------------------------------------------------------- */
    /*                                 PAYMENT                                */
    /* ---------------------------------------------------------------------- */
    const processPayment = async () => {
        if (!items.length) return toast.error("Cart is empty!");
        if (!selectedCustomer && (!isWalkIn || !walkInName.trim()))
            return toast.error("Please select a customer or enter walk-in details.");

        setIsLoading(true);
        try {
            const itemsPayload = items.map((i) => ({
                productVariantId: i.Id,
                quantity: i.quantity,
                discountAmount: (i.price - i.editedPrice) * i.quantity,
            }));

            // Only send the portion of the global discount that isn't already accounted for by item-level price drops.
            // If hasEditedItems is true, cartSlice set `discount` to the sum of all item discounts.
            // In that case, sale-level discountAmount should be 0 since item discounts cover it.
            const totalItemDiscount = itemsPayload.reduce((sum, item) => sum + item.discountAmount, 0);
            const saleLevelDiscount = hasEditedItems ? 0 : discount;

            const payload = {
                customerId: selectedCustomer ?? null,
                customerName: isWalkIn ? walkInName : null,
                customerNumber: isWalkIn ? walkInPhone : null,
                paymentMethod: paymentMethod,
                discountAmount: saleLevelDiscount,
                // taxAmount: tax,
                items: itemsPayload,
            };

            const { data } = await api.post("Sales/AddSale", payload);
            if (!data?.isSuccess) return toast.error(data?.message ?? "Payment failed");

            toast.success("Payment successful! Sale recorded.");
            dispatch(clearCart());
            setCartDiscount(0);
            onSaleComplete(data.data);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /*                               EMPTY STATE                              */
    /* ---------------------------------------------------------------------- */
    if (!items.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-indigo-300 text-center">
                <ShoppingCartIcon className="w-20 h-20 text-indigo-400 mb-4" />
                <h3 className="text-2xl font-bold text-gray-700">Your cart is empty</h3>
                <p className="mt-2 text-sm text-gray-500">
                    Add products to start building an order.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /*                                 MAIN UI                                */
    /* ---------------------------------------------------------------------- */
    return (
        <>
            <div className="flex flex-col flex-1 bg-white overflow-hidden">
                {/* --------------------------- Header / Toolbar --------------------------- */}
                <header className="flex items-center justify-between px-4 py-3 bg-white border-y border-gray-100">
                    <div className="flex items-center gap-2 text-gray-800">
                        <ShoppingCartIcon className="w-5 h-5 text-gray-400" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
                            Current Order
                        </h2>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-primary-50 text-primary-700 rounded-full">
                            {items.length} items
                        </span>
                    </div>

                    <button
                        onClick={() => setShowClearModal(true)}
                        disabled={items.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <TrashIcon className="w-3.5 h-3.5" />
                        Clear All
                    </button>
                </header>

                {items.some((i) => i.stock === 0) && (
                    <div className="bg-red-50 text-red-700 text-[11px] font-bold px-4 py-2 border-b border-red-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Some items are out of stock. Please adjust quantities.
                    </div>
                )}

                <section className="flex-1 overflow-y-auto bg-gray-50/30">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase text-gray-400 font-bold tracking-wider shadow-sm">
                            <tr>
                                <th className="px-3 py-2.5 w-16 text-center">Img</th>
                                <th className="px-3 py-2.5 w-full max-w-[160px] text-left">Item</th>
                                <th className="px-3 py-2.5 text-right w-24">Price</th>
                                <th className="px-3 py-2.5 text-center w-32">Qty</th>
                                <th className="px-3 py-2.5 text-right w-24">Total</th>
                                <th className="px-3 py-2.5 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <tr key={item.Id} className="hover:bg-indigo-50/20 transition-colors group bg-white">
                                    <td className="px-3 py-2 text-center align-top w-16">
                                        <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden border border-gray-100 bg-gray-50 mx-auto inline-flex items-center justify-center shadow-sm">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
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
                                    <td className="px-3 py-2 w-full max-w-[160px] align-top text-left">
                                        <div className="font-bold text-gray-900 text-xs leading-tight line-clamp-2 whitespace-normal break-words group-hover:text-primary-700 transition-colors">
                                            {item.name}
                                        </div>
                                        <div className="mt-1">
                                            <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded-sm ${item.stock > 10 ? "bg-emerald-100/80 text-emerald-700" : item.stock > 0 ? "bg-amber-100/80 text-amber-700" : "bg-red-100/80 text-red-700"}`}>
                                                {item.stock > 10 ? "In Stock" : item.stock > 0 ? `${item.stock} left` : "Out of Stock"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right align-top w-24">
                                        {editingPriceId === item.Id ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <input
                                                    type="number"
                                                    value={priceInput}
                                                    onChange={(e) => {
                                                        const value = Number(e.target.value);
                                                        if (value <= item.price) {
                                                            handlePriceInputChange(value.toString());
                                                        }
                                                    }}
                                                    className="w-14 px-1 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] text-right"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") savePriceEdit(item.Id);
                                                        else if (e.key === "Escape") cancelPriceEdit();
                                                    }}
                                                    min={0}
                                                    max={item.price}
                                                    step="1"
                                                />
                                                <div className="flex flex-col gap-0.5">
                                                    <button onClick={() => savePriceEdit(item.Id)} className="p-[2px] bg-emerald-500 hover:bg-emerald-600 rounded text-white"><CheckIcon className="w-2.5 h-2.5" /></button>
                                                    <button onClick={cancelPriceEdit} className="p-[2px] bg-gray-500 hover:bg-gray-600 rounded text-white"><XMarkIcon className="w-2.5 h-2.5" /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center justify-end gap-1.5 group/price cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded -mr-1" onClick={() => startPriceEdit(item)}>
                                                    <span className="text-[12px] font-bold text-gray-900">Rs {item.editedPrice.toLocaleString()}</span>
                                                    <div className="p-0.5 opacity-0 group-hover/price:opacity-100 transition-opacity">
                                                        <PencilIcon className="w-3 h-3 text-indigo-400" />
                                                    </div>
                                                </div>
                                                {item.editedPrice < item.price && (
                                                    <span className="text-[10px] font-medium text-gray-400 line-through pr-1 tracking-tight">Rs {item.price.toLocaleString()}</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-top w-32">
                                        {editingPriceId !== item.Id && (
                                            <div className="flex items-center justify-center gap-0.5 bg-gray-50 border border-gray-200 rounded-md px-1 py-0.5 w-max mx-auto shadow-sm">
                                                <button
                                                    onClick={() => updateQuantityHandler(item.Id, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                    className={`p-1 rounded-sm ${item.quantity <= 1 ? "opacity-30" : "hover:bg-white hover:shadow-sm"}`}>
                                                    <MinusIcon className="w-3 h-3 text-gray-700 font-bold" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={item.stock > 0 ? item.stock : undefined}
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantityHandler(item.Id, Math.max(1, Number(e.target.value)))}
                                                    className="w-8 text-center bg-transparent outline-none text-[12px] font-bold text-gray-900"
                                                />
                                                <button
                                                    onClick={() => updateQuantityHandler(item.Id, item.quantity + 1)}
                                                    disabled={item.stock > 0 && item.quantity >= item.stock}
                                                    className={`p-1 rounded-sm ${item.stock > 0 && item.quantity >= item.stock ? "opacity-30" : "hover:bg-white hover:shadow-sm"}`}>
                                                    <PlusIcon className="w-3 h-3 text-gray-700 font-bold" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right align-top w-24">
                                        <span className="text-[13px] font-black text-primary-700">
                                            Rs {(item.editedPrice * item.quantity).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center align-top w-12">
                                        <button
                                            onClick={() => deleteItemHandler(item.Id)}
                                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-gray-400 hover:text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* --------------------------- Summary (sticky) --------------------------- */}
                <footer className="sticky bottom-0 bg-white border-t p-2 space-y-2 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subtotal</span>
                                <span className="text-xs font-bold text-gray-800">Rs {subtotal.toFixed(2)}</span>
                            </div>
                            {/* <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax (8%)</span>
                                <span className="text-xs font-bold text-gray-800">Rs {tax.toFixed(2)}</span>
                            </div> */}
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <TagIcon className="w-3 h-3 text-indigo-400" />
                                Discount
                            </span>
                            {!hasEditedItems ? (
                                <div className="flex items-center mt-0.5">
                                    <span className="text-[10px] text-gray-500 font-medium mr-1">Rs</span>
                                    <input
                                        type="number"
                                        value={cartDiscount}
                                        min={0}
                                        max={subtotal}
                                        step={0.01}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const raw = parseFloat(e.target.value) || 0;
                                            const val = Math.min(subtotal, Math.max(0, raw));
                                            setCartDiscount(val);
                                            dispatch(setDiscount(val));
                                        }}
                                        className="w-14 px-1 py-0.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            ) : (
                                <span className="text-xs font-bold text-red-600">-Rs {discount.toFixed(2)}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 px-1">
                        <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Payable</span>
                        <span className="text-xl font-black text-emerald-600">Rs {total.toFixed(2)}</span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                        {[
                            { value: "Cash", label: "Cash", icon: <BanknotesIcon className="w-4 h-4" /> },
                            // { value: "Card", label: "Card", icon: <CreditCardIcon className="w-4 h-4" /> },
                            // { value: "BankTransfer", label: "Bank", icon: <BuildingLibraryIcon className="w-4 h-4" /> },
                        ].map((method) => (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() => { setPaymentMethod(method.value); setAmountReceived(""); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all border ${paymentMethod === method.value
                                    ? "bg-primary-50 text-primary-700 border-primary-300 ring-1 ring-primary-200 shadow-sm"
                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
                                    }`}
                            >
                                {method.icon}
                                {method.label}
                            </button>
                        ))}
                    </div>

                    {/* Cash Tendered / Change Calculator */}
                    {paymentMethod === "Cash" && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Received:</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">Rs</span>
                                    <input
                                        ref={amountInputRef}
                                        type="number"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        placeholder="0"
                                        min={0}
                                        className="w-32 pl-6 pr-2 py-1 text-right text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded outline-none focus:ring-1 focus:ring-primary-500 transition-all tabular-nums"
                                    />
                                </div>
                            </div>
                            {amountReceived !== "" && (
                                <div className={`flex flex-col items-end ${parseFloat(amountReceived) >= total ? "text-emerald-700" : "text-red-600"}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {parseFloat(amountReceived) >= total ? "Change" : "Short"}
                                    </span>
                                    <span className="text-sm font-black leading-none mt-0.5">
                                        Rs {Math.abs(parseFloat(amountReceived) - total).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        disabled={isLoading || !items.length || (paymentMethod === "Cash" && (!amountReceived || parseFloat(amountReceived) < total))}
                        isLoading={isLoading}
                        onClick={processPayment}
                        className={`
            w-full py-2.5 rounded-xl text-base font-bold transition
            ${!items.length
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-primary-600 to-primary-700 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg"
                            }`}>
                        {isLoading ? "Processing…" : `Pay Rs ${total.toFixed(2)}`}
                    </Button>
                </footer>
            </div>

            {/* Clear Cart Confirmation Modal */}
            <ConfirmModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={() => {
                    dispatch(clearCart());
                    setCartDiscount(0);
                    toast.success("Cart cleared");
                }}
                title="Clear Cart?"
                message={`This will remove all ${items.length} items from your cart. This action cannot be undone.`}
                confirmText="Clear All"
                variant="danger"
            />

            {/* Remove Item Confirmation Modal */}
            <ConfirmModal
                isOpen={!!itemToRemove}
                onClose={() => setItemToRemove(null)}
                onConfirm={() => {
                    if (itemToRemove) deleteItemHandler(itemToRemove.id);
                }}
                title="Remove Item?"
                message={`Are you sure you want to remove "${itemToRemove?.name}" from your cart?`}
                confirmText="Remove"
                variant="danger"
            />
        </>
    );
}

