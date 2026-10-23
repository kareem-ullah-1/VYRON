import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/axios";

export interface PurchaseDetail {
    id: number;
    rawMaterialId: number;
    rawMaterialName?: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
    itemSnapshotJson?: string;
}

export interface Purchase {
    id: number;
    Id?: number; // alias for DataTable compatibility
    purchaseDate: string;
    supplierId: number;
    supplierName?: string;
    totalAmount: number;
    status: string;
    invoiceNumber?: string;
    createdAt?: string;
    purchaseDetails?: PurchaseDetail[];
}

export interface PurchaseState {
    purchases: Purchase[];
    loading: boolean;
    error: string | null;
}

const initialState: PurchaseState = {
    purchases: [],
    loading: false,
    error: null,
};

export const fetchPurchases = createAsyncThunk<
    Purchase[],
    void,
    { rejectValue: string }
>("purchase/fetchPurchases", async (_, { rejectWithValue }) => {
    try {
        const res = await api.get("Purchase/GetPurchases");
        return res.data.data.map((item: any) => ({
            id: item.Id,
            purchaseDate: item.PurchaseDate,
            supplierId: item.SupplierId,
            supplierName: item.SupplierName,
            totalAmount: item.TotalAmount,
            status: item.Status,
            invoiceNumber: item.InvoiceNumber,
            createdAt: item.CreatedAt,
            purchaseDetails: item.PurchaseDetails?.map((detail: any) => ({
                id: detail.Id,
                rawMaterialId: detail.RawMaterialId,
                rawMaterialName: detail.RawMaterialName,
                quantity: detail.Quantity,
                unitPrice: detail.UnitPrice,
                subTotal: detail.SubTotal,
                itemSnapshotJson: detail.ItemSnapshotJson
            }))
        }));
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message || err.message);
    }
});

const purchaseSlice = createSlice({
    name: "purchase",
    initialState,
    reducers: {
        setPurchases: (state, action: PayloadAction<Purchase[]>) => {
            state.purchases = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPurchases.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                fetchPurchases.fulfilled,
                (state, action: PayloadAction<Purchase[]>) => {
                    state.loading = false;
                    state.purchases = action.payload;
                }
            )
            .addCase(fetchPurchases.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch purchases";
            });
    },
});

export const { setPurchases } = purchaseSlice.actions;
export default purchaseSlice.reducer;
