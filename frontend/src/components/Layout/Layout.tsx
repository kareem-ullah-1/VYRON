"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import PageTransition from "./PageTransition";

interface LayoutProps {
    children: React.ReactNode;
    screenName?: string;
    screenDesc?: string;
}

export default function Layout({ children, screenName, screenDesc }: LayoutProps) {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div className="fixed inset-0 flex bg-gray-50 overflow-hidden">
            <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <div role="note" className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-800">
                    Portfolio demo: sample data only. Changes are disabled.
                </div>
                <div className="md:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="Open navigation menu"
                        className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">V</span>
                    </div>
                    <span className="font-semibold text-gray-900">VYRON</span>
                </div>
                <main className="flex-1 overflow-hidden relative bg-gray-50">
                    <AnimatePresence mode="wait">
                        <PageTransition key={pathname} className="h-full">
                            {children}
                        </PageTransition>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
