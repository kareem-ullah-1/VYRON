import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/axios";

// -------------------------
// Types
// -------------------------
export interface SalesReportSummary {
    totalSales: number;
    totalTransactions: number;
    totalDiscount: number;
    averageSaleValue: number;
    totalProfit: number;
}

export interface SalesReportDayPoint {
    date: string;
    sales: number;
    transactions: number;
}

export interface SalesReportPaymentMethod {
    paymentMethod: string;
    sales: number;
    transactions: number;
}

export interface SalesReportProduct {
    name: string;
    quantity: number;
    sales: number;
}

export interface SalesReport {
    startDate: string;
    endDate: string;
    summary: SalesReportSummary;
    byDay: SalesReportDayPoint[];
    byPaymentMethod: SalesReportPaymentMethod[];
    byProduct: SalesReportProduct[];
}

interface ReportState {
    report: SalesReport | null;
    loading: boolean;
    error: string | null;
}

// -------------------------
// Initial State
// -------------------------
const initialState: ReportState = {
    report: null,
    loading: false,
    error: null,
};

// -------------------------
// Async Thunks
// -------------------------
export const fetchSalesReport = createAsyncThunk<
    SalesReport,
    { startDate?: string; endDate?: string },
    { rejectValue: string }
>("report/fetchSalesReport", async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
        const response = await api.get("/Report/GetSalesReport", {
            params: { StartDate: startDate || undefined, EndDate: endDate || undefined },
        });

        if (!response.data?.isSuccess) {
            return rejectWithValue(response.data?.message || "Failed to fetch sales report");
        }

        const d = response.data.data;
        const mapped: SalesReport = {
            startDate: d.Range?.StartDate,
            endDate: d.Range?.EndDate,
            summary: {
                totalSales: d.Summary?.TotalSales ?? 0,
                totalTransactions: d.Summary?.TotalTransactions ?? 0,
                totalDiscount: d.Summary?.TotalDiscount ?? 0,
                averageSaleValue: d.Summary?.AverageSaleValue ?? 0,
                totalProfit: d.Summary?.TotalProfit ?? 0,
            },
            byDay: (d.ByDay ?? []).map((r: any) => ({ date: r.Date, sales: r.Sales, transactions: r.Transactions })),
            byPaymentMethod: (d.ByPaymentMethod ?? []).map((r: any) => ({
                paymentMethod: r.PaymentMethod,
                sales: r.Sales,
                transactions: r.Transactions,
            })),
            byProduct: (d.ByProduct ?? []).map((r: any) => ({ name: r.Name, quantity: r.Quantity, sales: r.Sales })),
        };
        return mapped;
    } catch (error: any) {
        return rejectWithValue(error.message || "Failed to fetch sales report");
    }
});

// -------------------------
// Slice
// -------------------------
const reportSlice = createSlice({
    name: "report",
    initialState,
    reducers: {
        clearReportError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchSalesReport.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchSalesReport.fulfilled, (state, action: PayloadAction<SalesReport>) => {
            state.loading = false;
            state.report = action.payload;
        });
        builder.addCase(fetchSalesReport.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload ?? action.error.message ?? "Failed to load sales report";
        });
    },
});

export const { clearReportError } = reportSlice.actions;
export default reportSlice.reducer;
