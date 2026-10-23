import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/axios";

// -------------------------
// Types
// -------------------------
export interface DashboardStats {
    totalSales: number;
    totalProfit: number;
    todaySales: number;
    totalTransactions: number;
    totalProducts: number;
    totalCustomers: number;
}

export interface SalesChartDataPoint {
    name: string;
    sales: number;
    purchases: number;
}

export interface RecentSale {
    id: number;
    customerName: string | null;
    finalAmount: number;
    saleDate: string;
    status: string;
}

export interface TopProduct {
    id: number;
    name: string;
    price: number;
    salesCount: number;
    growthPercentage: number;
}

export interface LowStockProduct {
    id: number;
    name: string;
    stock: number;
    lowStockThreshold: number;
    productCode: string;
}

export interface DashboardOverview {
    stats: DashboardStats;
    salesChartData: SalesChartDataPoint[];
    recentSales: RecentSale[];
    topProducts: TopProduct[];
    lowStockProducts: LowStockProduct[];
}

interface DashboardState {
    stats: DashboardStats;
    salesChartData: SalesChartDataPoint[];
    recentSales: RecentSale[];
    topProducts: TopProduct[];
    lowStockProducts: LowStockProduct[];
    loading: boolean;
    error: string | null;
}

// -------------------------
// Initial State
// -------------------------
const initialState: DashboardState = {
    stats: {
        totalSales: 0,
        totalProfit: 0,
        todaySales: 0,
        totalTransactions: 0,
        totalProducts: 0,
        totalCustomers: 0,
    },
    salesChartData: [],
    recentSales: [],
    topProducts: [],
    lowStockProducts: [],
    loading: false,
    error: null,
};

// -------------------------
// Async Thunks
// -------------------------
export const fetchDashboardOverview = createAsyncThunk<
    DashboardOverview,
    void,
    { rejectValue: string }
>("dashboard/fetchOverview", async (_, { rejectWithValue }) => {
    try {
        const response = await api.get("/Dashboard/GetOverview");

        if (!response.data?.isSuccess) {
            return rejectWithValue(
                response.data?.message || "Failed to fetch dashboard data"
            );
        }

        const d = response.data.data;

        // Map PascalCase API response → camelCase frontend types
        const mapped: DashboardOverview = {
            stats: {
                totalSales: d.Stats?.TotalSales ?? 0,
                totalProfit: d.Stats?.TotalProfit ?? 0,
                todaySales: d.Stats?.TodaySales ?? 0,
                totalTransactions: d.Stats?.TotalTransactions ?? 0,
                totalProducts: d.Stats?.TotalProducts ?? 0,
                totalCustomers: d.Stats?.TotalCustomers ?? 0,
            },
            salesChartData: (d.SalesChartData ?? []).map((p: any) => ({
                name: p.Name,
                sales: p.Sales,
                purchases: p.Purchases,
            })),
            recentSales: (d.RecentSales ?? []).map((s: any) => ({
                id: s.Id,
                customerName: s.CustomerName,
                finalAmount: s.FinalAmount,
                saleDate: s.SaleDate,
                status: s.Status,
            })),
            topProducts: (d.TopProducts ?? []).map((p: any) => ({
                id: p.Id,
                name: p.Name,
                price: p.Price,
                salesCount: p.SalesCount,
                growthPercentage: p.GrowthPercentage,
            })),
            lowStockProducts: (d.LowStockProducts ?? []).map((p: any) => ({
                id: p.Id,
                name: p.Name,
                stock: p.Stock,
                lowStockThreshold: p.LowStockThreshold,
                productCode: p.ProductCode,
            })),
        };

        return mapped;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || error.message || "Failed to fetch dashboard data"
        );
    }
});

// -------------------------
// Slice
// -------------------------
const dashboardSlice = createSlice({
    name: "dashboard",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchDashboardOverview.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(
            fetchDashboardOverview.fulfilled,
            (state, action: PayloadAction<DashboardOverview>) => {
                state.loading = false;
                state.stats = action.payload.stats;
                state.salesChartData = action.payload.salesChartData;
                state.recentSales = action.payload.recentSales;
                state.topProducts = action.payload.topProducts;
                state.lowStockProducts = action.payload.lowStockProducts;
            }
        );
        builder.addCase(fetchDashboardOverview.rejected, (state, action) => {
            state.loading = false;
            state.error =
                action.payload ??
                action.error.message ??
                "Failed to load dashboard data";
        });
    },
});

// -------------------------
// Exports
// -------------------------
export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
