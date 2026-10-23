import axios, { AxiosInstance } from "axios";
import { toast } from "sonner";
import { DEMO_WRITE_MESSAGE, demoAdapter } from "@/demo/demoAdapter";

// Public portfolio demo: every request is answered by the in-browser demo adapter (see src/demo),
// so the app needs no backend, no network and no sign-in.
const api: AxiosInstance = axios.create({
    adapter: demoAdapter,
    headers: { "Content-Type": "application/json" },
});

// Several screens swallow write errors silently; tell the visitor once why nothing changed.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== "undefined" && error?.response?.data?.message === DEMO_WRITE_MESSAGE) {
            toast.info(DEMO_WRITE_MESSAGE, { id: "demo-read-only" });
        }
        return Promise.reject(error);
    }
);

export { api };
export default api;
