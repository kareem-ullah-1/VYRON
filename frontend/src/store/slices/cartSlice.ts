import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
    Id: number;
    name: string;
    price: number;
    editedPrice: number;
    quantity: number;
    stock: number;
    image?: string;
    category: string;
}

interface CartState {
    items: CartItem[];
    subtotal: number;
    discount: number;
    // tax: number;
    total: number;
}

const STORAGE_KEY = "pos_cart";

const saveCartToStorage = (state: CartState) => {
    try {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    } catch { }
};

const initialState: CartState = {
    items: [],
    subtotal: 0,
    discount: 0,
    // tax: 0,
    total: 0,
};

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItem: (state, action: PayloadAction<CartItem>) => {
            if (!action.payload.Id || action.payload.Id === 0) {
                console.warn("⚠️ Ignored adding item: Invalid product variant ID.");
                return;
            }

            const existingItem = state.items.find(
                (item) => item.Id === action.payload.Id
            );

            if (existingItem) {
                // ✅ Prevent exceeding stock
                const newQty = existingItem.quantity + action.payload.quantity;
                existingItem.quantity = Math.min(newQty, existingItem.stock);
                // Also update the edited price if one was specifically given (like from reorder)
                if (action.payload.editedPrice !== undefined && action.payload.editedPrice !== action.payload.price) {
                    existingItem.editedPrice = action.payload.editedPrice;
                }
            } else {
                state.items.push({
                    ...action.payload,
                    editedPrice: action.payload.editedPrice ?? action.payload.price,
                    quantity: Math.min(action.payload.quantity, action.payload.stock), // ✅ Do not exceed stock initially
                });
            }

            cartSlice.caseReducers.calculateTotals(state);
            saveCartToStorage(state);
        },

        removeItem: (state, action: PayloadAction<number>) => {
            state.items = state.items.filter((item) => item.Id !== action.payload);
            cartSlice.caseReducers.calculateTotals(state);
            saveCartToStorage(state);
        },

        updateQuantity: (
            state,
            action: PayloadAction<{ Id: number; quantity: number }>
        ) => {
            const item = state.items.find((i) => i.Id === action.payload.Id);
            if (item) {
                // ✅ Cap quantity to stock
                item.quantity = Math.min(action.payload.quantity, item.stock);

                if (item.quantity <= 0) {
                    state.items = state.items.filter((i) => i.Id !== action.payload.Id);
                }
            }
            cartSlice.caseReducers.calculateTotals(state);
            saveCartToStorage(state);
        },

        updatePrice: (
            state,
            action: PayloadAction<{ Id: number; editedPrice: number }>
        ) => {
            const item = state.items.find((i) => i.Id === action.payload.Id);
            if (item) {
                item.editedPrice = Math.min(action.payload.editedPrice, item.price);
            }
            cartSlice.caseReducers.calculateTotals(state);
            saveCartToStorage(state);
        },

        setDiscount: (state, action: PayloadAction<number>) => {
            state.discount = action.payload;
            cartSlice.caseReducers.calculateTotals(state);
            saveCartToStorage(state);
        },

        clearCart: (state) => {
            state.items = [];
            state.subtotal = 0;
            state.discount = 0;
            // state.tax = 0;
            state.total = 0;
            saveCartToStorage(state);
        },

        calculateTotals: (state) => {
            state.subtotal = state.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            const itemDiscount = state.items.reduce(
                (sum, item) => sum + (item.price - item.editedPrice) * item.quantity,
                0
            );

            const hasEditedItems = state.items.some(
                (item) => item.editedPrice !== item.price
            );

            if (hasEditedItems) {
                state.discount = itemDiscount;
            }

            // state.tax = Math.floor((state.subtotal - state.discount) * 0.08);
            state.total = Math.floor(state.subtotal - state.discount);
        },
    },
});

export const {
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    clearCart,
    setDiscount,
} = cartSlice.actions;

export default cartSlice.reducer;
