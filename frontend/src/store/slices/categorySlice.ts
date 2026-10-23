import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/axios";

export interface Category {
    id: number;
    name: string;
    description: string;
    isActive?: boolean;
}

export interface CategoryState {
    categories: Category[];
    loading: boolean;
    error: string | null;
}

const initialState: CategoryState = {
    categories: [],
    loading: false,
    error: null,
};

// Only fetch categories via Redux
export const fetchCategories = createAsyncThunk<
    Category[],
    void,
    { state: any, rejectValue: string }
>("category/fetchCategories", async (_, { rejectWithValue }) => {
    try {
        const res = await api.get("Category/GetCategories");
        return res.data.data;
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.error || err.message);
    }
}, {
    condition: (_, { getState }) => {
        const state = getState().category;
        if (state.loading || state.categories?.length > 0) {
            return false;
        }
        return true;
    }
});

const categorySlice = createSlice({
    name: "category",
    initialState,
    reducers: {
        // Optional: update categories locally if needed
        setCategories: (state, action: PayloadAction<Category[]>) => {
            state.categories = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                fetchCategories.fulfilled,
                (state, action: PayloadAction<Category[]>) => {
                    state.loading = false;
                    state.categories = action.payload;
                }
            )
            .addCase(fetchCategories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch categories";
            });
    },
});

export const { setCategories } = categorySlice.actions;
export default categorySlice.reducer;
