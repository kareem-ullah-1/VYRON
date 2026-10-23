import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/axios";
export interface Customer {
    Id: number;
    FullName: string;
    Email: string;
    ContactNumber: string;
    FullAddress: string;
    City: string;
    State: string;
    Country: string;
    CreatedAt: string;
    UpdatedAt: string | null;
}

// Pagination info from API
interface Pagination {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

interface CustomersState {
    customers: Customer[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
}

const initialState: CustomersState = {
    customers: [],
    pagination: {
        totalCount: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
    },
    loading: false,
    error: null,
};

export const fetchCustomers = createAsyncThunk<
    Customer[],
    void,
    { rejectValue: string }
>("customers/fetchCustomers", async (_, { rejectWithValue }) => {
    try {
        const response = await api.get(`/Customer/GetAllCustomers`);
        const result = response.data;

        if (!result?.isSuccess) return rejectWithValue(result?.message || "Failed to fetch customers");

        // The API now returns the list directly in result.data
        return result.data as Customer[];
    } catch (error: any) {
        return rejectWithValue(error.message || "Failed to fetch customers");
    }
});

const customersSlice = createSlice({
    name: "customers",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCustomers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCustomers.fulfilled, (state, action) => {
                state.loading = false;
                state.customers = action.payload;
            })
            .addCase(fetchCustomers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch customers";
            });
    },
});

export default customersSlice.reducer;
