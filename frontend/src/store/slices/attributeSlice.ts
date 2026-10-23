import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/axios";

export interface Attribute {
    Id: number;
    Name: string;
    Values: string[];
    Type: string;
}

interface AttributeState {
    attributes: Attribute[];
    loading: boolean;
    error: string | null;
}

const initialState: AttributeState = {
    attributes: [],
    loading: false,
    error: null,
};

// ✅ Thunk for fetching attributes
export const fetchAttributes = createAsyncThunk(
    "attributes/fetchAttributes",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("Attributes/GetAllAttributes");
            return response.data?.data ?? [];
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch attributes"
            );
        }
    }
);

const attributeSlice = createSlice({
    name: "attributes",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAttributes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAttributes.fulfilled, (state, action) => {
                state.attributes = action.payload;
                state.loading = false;
            })
            .addCase(fetchAttributes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default attributeSlice.reducer;
