import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/axios";

export interface RawMaterial {
    id: number;
    Id?: number; // alias for DataTable compatibility
    name: string;
    description?: string;
    unitOfMeasure?: string;
    currentStockQuantity: number;
    createdAt?: string;
    updatedAt?: string;
    attributesJson?: string;
}

export interface RawMaterialState {
    rawMaterials: RawMaterial[];
    loading: boolean;
    error: string | null;
}

const initialState: RawMaterialState = {
    rawMaterials: [],
    loading: false,
    error: null,
};

export const fetchRawMaterials = createAsyncThunk<
    RawMaterial[],
    void,
    { rejectValue: string }
>("rawMaterial/fetchRawMaterials", async (_, { rejectWithValue }) => {
    try {
        const res = await api.get("RawMaterial/GetRawMaterials");
        return res.data.data.map((item: any) => ({
            id: item.Id,
            name: item.Name,
            description: item.Description,
            unitOfMeasure: item.UnitOfMeasure,
            currentStockQuantity: item.CurrentStockQuantity,
            createdAt: item.CreatedAt,
            updatedAt: item.UpdatedAt,
            attributesJson: item.AttributesJson
        }));
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message || err.message);
    }
});

const rawMaterialSlice = createSlice({
    name: "rawMaterial",
    initialState,
    reducers: {
        setRawMaterials: (state, action: PayloadAction<RawMaterial[]>) => {
            state.rawMaterials = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchRawMaterials.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                fetchRawMaterials.fulfilled,
                (state, action: PayloadAction<RawMaterial[]>) => {
                    state.loading = false;
                    state.rawMaterials = action.payload;
                }
            )
            .addCase(fetchRawMaterials.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch raw materials";
            });
    },
});

export const { setRawMaterials } = rawMaterialSlice.actions;
export default rawMaterialSlice.reducer;
