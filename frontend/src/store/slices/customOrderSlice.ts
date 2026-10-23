import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/axios";

// -------------------------
// Types
// -------------------------
export interface CustomOrderItem {
    Name: string;
    Qty: number;
    Price: number;
    Notes: string | null;
}

export interface StatusHistoryEntry {
    Status: string;
    ChangedAt: string;
    ChangedByUserId: string | null;
    ChangedByName: string | null;
    Note: string | null;
}

export interface PaymentHistoryEntry {
    Amount: number;
    PaymentMethod: string;
    PaidAt: string;
    ReceivedByUserId: string | null;
    ReceivedByName: string | null;
    Note: string | null;
}

export interface VariantQtyJson {
    Urdu: number;
    English4Line: number;
    Box: number;
    NarrowLine: number;
}

export interface ProductionCostsJson {
    PaperCost: number | null;
    CardCost: number | null;
    BindingCost: number | null;
    MiscCost: number | null;
}

export interface NotebookOrderDetailsJson {
    PaperSize: string | null;
    PaperQuality: string | null;
    BindingType: string | null;
    PrintColor: string | null;
    CardMaterial: string | null;
    Lamination: string | null;
    BinderName: string | null;
    IndexPages: string | null;
    MarginLine: string | null;
    PagesQty: VariantQtyJson;
    RulingQty: VariantQtyJson;
    ProductionCosts: ProductionCostsJson;
}

export interface DiaryOrderDetailsJson {
    PaperSize: string | null;
    PaperQuality: string | null;
    Style: string | null;
    BindingType: string | null;
    PrintColor: string | null;
    CardMaterial: string | null;
    Lamination: string | null;
    BinderName: string | null;
    IndexPages: string | null;
    MarginLine: string | null;
    PagesQty: number;
    ProductionCosts: ProductionCostsJson;
}

export interface OrderBlock {
    BlockType: string; // "Custom" | "Notebook" | "Diary"
    Items: CustomOrderItem[];
    NotebookDetails: NotebookOrderDetailsJson | null;
    DiaryDetails: DiaryOrderDetailsJson | null;
}

export interface CustomOrder {
    Id: number;
    OrderNumber: string;
    OrderType: string;
    CustomerId: number;
    CustomerName: string | null;
    CustomerContact: string | null;
    CustomerAddress: string | null;
    StaffId: string | null;
    StaffName: string | null;
    Description: string | null;
    DeliveryType: string | null;
    DeliveryDate: string | null;
    TotalAmount: number;
    PaidAmount: number;
    RemainingBalance: number;
    PaymentMethod: string | null;
    Status: string;
    Blocks: OrderBlock[];
    StatusHistory: StatusHistoryEntry[];
    PaymentHistory: PaymentHistoryEntry[];
    Attachments: string[] | null;
    CreatedAt: string;
    UpdatedAt: string | null;
}

interface CustomOrdersState {
    orders: CustomOrder[];
    selectedOrder: CustomOrder | null;
    loading: boolean;
    error: string | null;
}

// -------------------------
// Initial State
// -------------------------
const initialState: CustomOrdersState = {
    orders: [],
    selectedOrder: null,
    loading: false,
    error: null,
};

// -------------------------
// Async Thunks
// -------------------------
export const fetchCustomOrders = createAsyncThunk<CustomOrder[], void, { rejectValue: string }>(
    "customOrders/fetchAll",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/CustomOrder/GetAllOrders");
            if (!response.data?.isSuccess) {
                return rejectWithValue(response.data?.message || "Failed to fetch custom orders");
            }
            return Array.isArray(response.data.data) ? response.data.data : [];
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch custom orders");
        }
    }
);

export const fetchCustomOrderDetail = createAsyncThunk<CustomOrder, number, { rejectValue: string }>(
    "customOrders/fetchDetail",
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.get(`/CustomOrder/GetOrder/${id}`);
            if (!response.data?.isSuccess) {
                return rejectWithValue(response.data?.message || "Failed to fetch order details");
            }
            return response.data.data as CustomOrder;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch order details");
        }
    }
);

// -------------------------
// Slice
// -------------------------
const customOrderSlice = createSlice({
    name: "customOrders",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearSelectedOrder: (state) => {
            state.selectedOrder = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch All
        builder.addCase(fetchCustomOrders.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchCustomOrders.fulfilled, (state, action: PayloadAction<CustomOrder[]>) => {
            state.loading = false;
            state.orders = action.payload;
        });
        builder.addCase(fetchCustomOrders.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload ?? action.error.message ?? "Failed to load custom orders";
            state.orders = [];
        });

        // Fetch Detail
        builder.addCase(fetchCustomOrderDetail.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchCustomOrderDetail.fulfilled, (state, action: PayloadAction<CustomOrder>) => {
            state.loading = false;
            state.selectedOrder = action.payload;
        });
        builder.addCase(fetchCustomOrderDetail.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload ?? action.error.message ?? "Failed to load order details";
        });
    },
});

// -------------------------
// Exports
// -------------------------
export const { clearError, clearSelectedOrder } = customOrderSlice.actions;
export default customOrderSlice.reducer;
