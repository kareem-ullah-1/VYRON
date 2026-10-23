"use client";

import React from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";
import clsx from "clsx";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "primary" | "warning";
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    isLoading = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            buttonVariant: "danger" as const,
        },
        primary: {
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600",
            buttonVariant: "primary" as const,
        },
        warning: {
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            buttonVariant: "primary" as const, // We don't have a warning variant in Button yet, but primary works
        },
    };

    const currentVariant = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] max-w-[90%] animate-in zoom-in-95 duration-200 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center mb-4", currentVariant.iconBg)}>
                        <ExclamationTriangleIcon className={clsx("w-8 h-8", currentVariant.iconColor)} />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 rounded-xl"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={currentVariant.buttonVariant}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        isLoading={isLoading}
                        className="flex-1 rounded-xl shadow-md"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}
