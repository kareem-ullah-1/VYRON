import api from "@/lib/axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "cashier" | "manager";
    isActive: boolean;
    avatar?: string;
}

export interface Role {
    id: string;
    name: string;
}

interface UserState {
    users: User[];
    roles: Role[];
    loading: boolean;
    error: string | null;
}

const initialState: UserState = {
    users: [],
    roles: [],
    loading: false,
    error: null,
};

export const fetchUsers = createAsyncThunk<User[]>(
    "users/fetchUsers",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/User/GetAll");
            // Parsing the JSON string if returned as string, else use directly
            const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (responseData.isSuccess) {
                // Normalize PascalCase from backend to camelCase for frontend
                return (responseData.data || []).map((u: any) => ({
                    id: u.Id || u.id,
                    name: u.Name || u.name,
                    email: u.Email || u.email,
                    role: (u.Role || u.role || "cashier").toLowerCase(),
                    isActive: u.IsActive !== undefined ? u.IsActive : u.isActive,
                    avatar: u.Avatar || u.avatar
                }));
            } else {
                return rejectWithValue(responseData.message);
            }
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || error.message);
        }
    }
);

export const fetchRoles = createAsyncThunk<Role[]>(
    "users/fetchRoles",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/Roles");
            const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (responseData.isSuccess) {
                // Normalize PascalCase from backend to camelCase for frontend
                return (responseData.data || []).map((r: any) => ({
                    id: r.Id || r.id,
                    name: r.Name || r.name || ""
                }));
            } else {
                return rejectWithValue(responseData.message);
            }
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || error.message);
        }
    }
);

export const addUser = createAsyncThunk<
    any,
    { username: string; email: string; password: string; role: string }
>("users/addUser", async (userData, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.post("/Auth/register", {
            Username: userData.username,
            Email: userData.email,
            Password: userData.password,
            Role: userData.role
        });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (data.isSuccess) {
            dispatch(fetchUsers());
            return data.data;
        } else {
            return rejectWithValue(data.message);
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

export const toggleUserStatus = createAsyncThunk<
    void,
    string
>("users/toggleStatus", async (userId, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.put(`/User/ToggleStatus/${userId}`);
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (data.isSuccess) {
            dispatch(fetchUsers());
        } else {
            return rejectWithValue(data.message);
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

export const updateUserRole = createAsyncThunk<
    void,
    { userId: string; role: string }
>("users/updateRole", async ({ userId, role }, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.put(`/User/UpdateRole/${userId}`, { Role: role });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (data.isSuccess) {
            dispatch(fetchUsers());
        } else {
            return rejectWithValue(data.message);
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

export const deleteUser = createAsyncThunk<
    void,
    string
>("users/deleteUser", async (userId, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.delete(`/User/Delete/${userId}`);
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (data.isSuccess) {
            dispatch(fetchUsers());
        } else {
            return rejectWithValue(data.message);
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

export const updateUserDetails = createAsyncThunk<
    void,
    { userId: string; name: string; email: string; role: string }
>("users/updateDetails", async ({ userId, ...userData }, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.put(`/User/Update/${userId}`, {
            Name: userData.name,
            Email: userData.email,
            Role: userData.role
        });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (data.isSuccess) {
            dispatch(fetchUsers());
        } else {
            return rejectWithValue(data.message);
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

export const resetUserPassword = createAsyncThunk<
    void,
    { userId: string; newPassword: string }
>("users/resetPassword", async ({ userId, newPassword }, { rejectWithValue }) => {
    try {
        const response = await api.put(`/User/ResetPassword/${userId}`, {
            NewPassword: newPassword
        });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (!data.isSuccess) {
            return rejectWithValue(data.message);
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || error.message);
    }
});

const userSlice = createSlice({
    name: "users",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchRoles.fulfilled, (state, action) => {
                state.roles = action.payload;
            })
            .addCase(fetchRoles.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(addUser.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(toggleUserStatus.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(updateUserRole.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(deleteUser.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(updateUserDetails.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            .addCase(resetUserPassword.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { clearError } = userSlice.actions;

export default userSlice.reducer;
