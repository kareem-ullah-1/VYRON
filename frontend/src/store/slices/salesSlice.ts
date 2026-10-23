import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/axios";

// -------------------------
// Types
// -------------------------
export interface SaleItem {
    Id: number;
    SaleId: number;
    ProductVariantId: number | null;
    ProductVariantName: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
    DiscountAmount: number;
}

export interface Sale {
    Id: number;
    CustomerId: number | null;
    SaleDate: string;
    TotalAmount: number;
    DiscountAmount: number;
    // TaxAmount: number;
    FinalAmount: number;
    Status: string;
    CustomerName: string | null;
    CustomerNumber: string | null;
    CreatedAt: string;
    SaleItems: SaleItem[];
    // POS sale rows omit this (defaults to "Sale"); completed Custom Orders are
    // included read-only in GetAllSales with Source "CustomOrder" — no delete/receipt for those.
    Source?: "Sale" | "CustomOrder";
    OrderNumber?: string | null;
}

export interface DashboardStats {
    totalSales: number;
    totalProfit: number;
    todaySales: number;
    totalTransactions: number;
}

interface SalesState {
    sales: Sale[];
    totalSales: number;
    totalProfit: number;
    todaySales: number;
    totalTransactions: number;
    loadingSales: boolean;
    loadingStats: boolean;
    error: string | null;
}

// -------------------------
// Initial State
// -------------------------
const initialState: SalesState = {
    sales: [],
    totalSales: 0,
    totalProfit: 0,
    todaySales: 0,
    totalTransactions: 0,
    loadingSales: false,
    loadingStats: false,
    error: null,
};

// -------------------------
// Async Thunks
// -------------------------
export const fetchSales = createAsyncThunk<Sale[], void, { rejectValue: string }>(
    "sales/fetchSales",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/Sales/GetAllSales");

            if (!response.data?.isSuccess) {
                return rejectWithValue(response.data?.message || "Failed to fetch sales");
            }

            // The backend now returns the array directly in response.data.data
            return Array.isArray(response.data.data) ? response.data.data : [];
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch sales");
        }
    }
);

export const fetchDashboardStats = createAsyncThunk<
    DashboardStats,
    void,
    { rejectValue: string }
>("sales/fetchDashboardStats", async (_, { rejectWithValue }) => {
    try {
        const response = await api.get("/Sales/GetDashboardStats");

        if (!response.data?.isSuccess) {
            return rejectWithValue(
                response.data?.message || "Failed to fetch dashboard stats"
            );
        }

        return response.data.data as DashboardStats;
    } catch (error: any) {
        return rejectWithValue(error.message || "Failed to fetch dashboard stats");
    }
});

export const deleteSale = createAsyncThunk<number, number, { rejectValue: string }>(
    "sales/deleteSale",
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/Sales/DeleteSale/${id}`);
            if (!response.data?.isSuccess) {
                return rejectWithValue(response.data?.message || "Failed to delete sale");
            }
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to delete sale");
        }
    }
);

// -------------------------
// Slice
// -------------------------
const salesSlice = createSlice({
    name: "sales",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Sales
        builder.addCase(fetchSales.pending, (state) => {
            state.loadingSales = true;
            state.error = null;
        });
        builder.addCase(fetchSales.fulfilled, (state, action: PayloadAction<Sale[]>) => {
            state.loadingSales = false;
            state.sales = action.payload;
        });
        builder.addCase(fetchSales.rejected, (state, action) => {
            state.loadingSales = false;
            state.error =
                action.payload ?? action.error.message ?? "Failed to load sales";
            state.sales = [];
        });

        // Delete Sale
        builder.addCase(deleteSale.fulfilled, (state, action: PayloadAction<number>) => {
            state.sales = state.sales.filter(s => s.Id !== action.payload);
        });

        // Fetch Dashboard Stats
        builder.addCase(fetchDashboardStats.pending, (state) => {
            state.loadingStats = true;
            state.error = null;
        });
        builder.addCase(
            fetchDashboardStats.fulfilled,
            (state, action: PayloadAction<DashboardStats>) => {
                state.loadingStats = false;
                state.totalSales = action.payload.totalSales;
                state.totalProfit = action.payload.totalProfit;
                state.todaySales = action.payload.todaySales;
                state.totalTransactions = action.payload.totalTransactions;
            }
        );
        builder.addCase(fetchDashboardStats.rejected, (state, action) => {
            state.loadingStats = false;
            state.error =
                action.payload ??
                action.error.message ??
                "Failed to load dashboard statistics";
        });
    },
});

// -------------------------
// Exports
// -------------------------
export const { clearError } = salesSlice.actions;
export default salesSlice.reducer;
