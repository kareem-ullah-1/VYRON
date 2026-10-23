import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";
import { NavigationProgressProvider, NavigationProgressBar } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "VYRON - Point of Sale System",
    description: "VYRON — a modern point-of-sale system built with Next.js and Tailwind CSS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-gray-50`}>
                <Providers>
                    <NavigationProgressProvider>
                        <NavigationProgressBar />
                        {children}
                    </NavigationProgressProvider>
                    <Toaster
                        position="top-center"
                        richColors
                        closeButton
                        duration={3000}
                        toastOptions={{
                            className: 'rounded-xl shadow-xl border border-gray-100 focus:ring-primary-500'
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}
