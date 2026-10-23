"use client";

import { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
    isOpen: boolean;
    title?: string;
    onClose: () => void;
    children: ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
};

export default function Modal({
    isOpen,
    title,
    onClose,
    children,
    size = "md",
}: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center min-h-screen bg-black/60 backdrop-blur-sm p-4 overflow-hidden"
                    onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", duration: 0.4 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
                        {title && (
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                                <button
                                    title="close"
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                        <div className="p-6">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
