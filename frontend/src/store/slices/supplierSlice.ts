import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/axios";

export interface Supplier {
    id: number;
    Id?: number; // alias for DataTable compatibility
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt?: string;
}

export interface SupplierState {
    suppliers: Supplier[];
    loading: boolean;
    error: string | null;
}

const initialState: SupplierState = {
    suppliers: [],
    loading: false,
    error: null,
};

export const fetchSuppliers = createAsyncThunk<
    Supplier[],
    void,
    { rejectValue: string }
>("supplier/fetchSuppliers", async (_, { rejectWithValue }) => {
    try {
        const res = await api.get("Supplier/GetSuppliers");
        return res.data.data.map((item: any) => ({
            id: item.Id,
            name: item.Name,
            email: item.Email,
            phone: item.Phone,
            address: item.Address,
            createdAt: item.CreatedAt
        }));
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message || err.message);
    }
});

const supplierSlice = createSlice({
    name: "supplier",
    initialState,
    reducers: {
        setSuppliers: (state, action: PayloadAction<Supplier[]>) => {
            state.suppliers = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSuppliers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                fetchSuppliers.fulfilled,
                (state, action: PayloadAction<Supplier[]>) => {
                    state.loading = false;
                    state.suppliers = action.payload;
                }
            )
            .addCase(fetchSuppliers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch suppliers";
            });
    },
});

export const { setSuppliers } = supplierSlice.actions;
export default supplierSlice.reducer;
