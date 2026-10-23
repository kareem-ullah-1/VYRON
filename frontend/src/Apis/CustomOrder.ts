import api from "@/lib/axios";

interface ApiResponse {
    isSuccess: boolean;
    message?: string;
    data?: any;
}

export const getCustomOrder = async (id: number): Promise<ApiResponse> => {
    try {
        const response = await api.get(`/CustomOrder/GetOrder/${id}`);
        return response.data;
    } catch (error) {
        console.error("Get custom order failed:", error);
        throw error;
    }
};

export const createCustomOrder = async (payload: any): Promise<ApiResponse> => {
    try {
        const response = await api.post("/CustomOrder/CreateOrder", payload);
        return response.data;
    } catch (error) {
        console.error("Create custom order failed:", error);
        throw error;
    }
};

export const updateCustomOrder = async (id: number, payload: any): Promise<ApiResponse> => {
    try {
        const response = await api.put(`/CustomOrder/UpdateOrder/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error("Update custom order failed:", error);
        throw error;
    }
};

export const updateCustomOrderStatus = async (id: number, payload: { Status: string; Note?: string }): Promise<ApiResponse> => {
    try {
        const response = await api.put(`/CustomOrder/UpdateStatus/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error("Update custom order status failed:", error);
        throw error;
    }
};

export const addCustomOrderPayment = async (id: number, payload: { Amount: number; PaymentMethod: string; Note?: string }): Promise<ApiResponse> => {
    try {
        const response = await api.post(`/CustomOrder/AddPayment/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error("Add custom order payment failed:", error);
        throw error;
    }
};

export const deleteCustomOrder = async (id: number): Promise<ApiResponse> => {
    try {
        const response = await api.delete(`/CustomOrder/DeleteOrder/${id}`);
        return response.data;
    } catch (error) {
        console.error("Delete custom order failed:", error);
        throw error;
    }
};
