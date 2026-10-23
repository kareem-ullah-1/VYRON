import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import { combineReducers } from "redux";

const createNoopStorage = () => {
    return {
        getItem(_key: any) {
            return Promise.resolve(null);
        },
        setItem(_key: any, value: any) {
            return Promise.resolve(value);
        },
        removeItem(_key: any) {
            return Promise.resolve();
        },
    };
};

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

import authReducer from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import productsReducer from "./slices/productsSlice";
import customersReducer from "./slices/customersSlice";
import salesReducer from "./slices/salesSlice";
import categoryReducer from "./slices/categorySlice";
import attributeReducer from "./slices/attributeSlice";
import dashboardReducer from "./slices/dashboardSlice";
import supplierReducer from "./slices/supplierSlice";
import rawMaterialReducer from "./slices/rawMaterialSlice";
import purchaseReducer from "./slices/purchaseSlice";
import customOrderReducer from "./slices/customOrderSlice";
import userReducer from "./slices/userSlice";
import reportReducer from "./slices/reportSlice";

const rootReducer = combineReducers({
    auth: authReducer,
    cart: cartReducer,
    products: productsReducer,
    customers: customersReducer,
    sales: salesReducer,
    category: categoryReducer,
    attributes: attributeReducer,
    dashboard: dashboardReducer,
    supplier: supplierReducer,
    rawMaterial: rawMaterialReducer,
    purchase: purchaseReducer,
    customOrders: customOrderReducer,
    users: userReducer,
    report: reportReducer,
});

const persistConfig = {
    key: "root",
    storage,
    whitelist: ["cart"], // Only persist the cart slice for now
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
