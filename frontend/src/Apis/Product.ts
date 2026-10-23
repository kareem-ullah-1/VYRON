// lib/productApi.ts
import api from "@/lib/axios";

interface ApiResponse {
    isSuccess: boolean;
    message?: string;
    data?: any;
}

const buildFormData = (payload: any, images: File[]): FormData => {
    const fd = new FormData();
    fd.append("data", JSON.stringify(payload));
    images.forEach((img) => fd.append("images", img));
    return fd;
};

export const addProduct = async (payload: any, images: File[] = []): Promise<ApiResponse> => {
    try {
        const response = await api.post("/Product/AddProduct", buildFormData(payload, images), {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        console.error("Add product failed:", error);
        throw error;
    }
};

export const updateProduct = async (id: any, payload: any, images: File[] = []): Promise<ApiResponse> => {
    try {
        const response = await api.put(`/Product/UpdateProduct/${id}`, buildFormData(payload, images), {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        console.error("Update product failed:", error);
        throw error;
    }
};
