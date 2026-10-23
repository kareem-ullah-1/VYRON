import api from "@/lib/axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface StockAdjustmentLog {
    Id: number;
    AdjustmentType: string;
    Quantity: number;
    PreviousStock: number;
    NewStock: number;
    Reason: string | null;
    AdjustedAt: string;
    CreatedAt: string;
}

export interface Attribute {
    Id: number;
    ProductVariantId: number;
    AttributeId: number;
    AttributeName: string;
    AttributeValue: string;
    VariantName: string;
    Values?: any;
}

export interface Variant {
    Id: number;
    Price: number;
    Stock: number;
    StockAvailable: number;
    ProductId: number;
    Attributes: Attribute[];
    VariantName: string;
}

export interface Category {
    Id: number;
    Name: string;
    Description: string;
    IsActive: boolean;
    CreatedAt: string;
    UpdatedAt: string | null;
}

export interface Product {
    Id: number;
    ProductName: string;
    RomanUrduName?: string;
    Description: string;
    ProductCode: string;
    ProductBarCode: string;
    Category: string;
    CategoryId: number;
    CreatedAt?: string;
    UpdatedAt?: string;
    Variants?: Variant[];
    Price?: number;
    Stock?: number;
    StockAvailable?: number;
    ProductImages?: string[];
    Image?: string;
    Status?: "active" | "inactive";
    LowStockThreshold?: number;
}

interface ProductsState {
    products: Product[];
    categories: Category[];
    searchQuery: string;
    selectedCategory: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: ProductsState = {
    products: [],
    categories: [],
    searchQuery: "",
    selectedCategory: null,
    loading: false,
    error: null,
};

export const fetchProducts = createAsyncThunk<
    Product[],
    { search?: string; category?: string } | void,
    { state: any }
>("products/fetchProducts", async (filters = {}, { rejectWithValue }) => {
    try {
        const response = await api.get("/Product/GetProducts", { params: filters });
        return response.data.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
}, {
    condition: (filters, { getState }) => {
        const state = getState().products;
        // Skip if already fetching
        if (state.loading) {
            return false;
        }
        // If simply fetching all (no filters) and we already have them, we could optionally skip:
        // if (!filters && state.products.length > 0) return false;
        return true;
    }
});

export const fetchCategories = createAsyncThunk<
    Category[],
    void,
    { state: any }
>(
    "Category/fetchCategories",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/Category/GetCategories");
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || error.message);
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState().products;
            if (state.categories?.length > 0) {
                // Prevent over-fetching categories in POS since they rarely change
                return false;
            }
        }
    }
);

export const adjustProductStock = createAsyncThunk<
    { variantId: number; newStock: number },
    { variantId: number; adjustmentType: string; quantity: number; reason?: string; adjustedAt?: string }
>("products/adjustStock", async (payload, { rejectWithValue }) => {
    try {
        const response = await api.post("/Product/AdjustStock", {
            ProductVariantId: payload.variantId,
            AdjustmentType: payload.adjustmentType,
            Quantity: payload.quantity,
            Reason: payload.reason ?? "",
            AdjustedAt: payload.adjustedAt ?? new Date().toISOString(),
        });
        if (!response.data.isSuccess) throw new Error(response.data.message);
        return { variantId: payload.variantId, newStock: response.data.data.NewStock };
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

export const fetchVariantStockHistory = createAsyncThunk<
    StockAdjustmentLog[],
    number
>("products/fetchStockHistory", async (variantId, { rejectWithValue }) => {
    try {
        const response = await api.get(`/Product/StockHistory/${variantId}`);
        if (!response.data.isSuccess) throw new Error(response.data.message);
        return response.data.data ?? [];
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },
        setSelectedCategory: (state, action) => {
            state.selectedCategory = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.loading = false;
                state.products = action.payload;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.categories = action.payload;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(adjustProductStock.fulfilled, (state, action) => {
                const { variantId, newStock } = action.payload;
                for (const product of state.products) {
                    const variant = product.Variants?.find((v) => v.Id === variantId);
                    if (variant) {
                        variant.Stock = newStock;
                        break;
                    }
                }
            });
    },
});

export const { clearError, setSearchQuery, setSelectedCategory } = productsSlice.actions;

export default productsSlice.reducer;
