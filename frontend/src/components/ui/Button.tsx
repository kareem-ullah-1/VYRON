import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({
    children,
    className,
    isLoading = false,
    variant = 'primary',
    size = 'md',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 active:scale-[0.98] outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 focus:ring-indigo-500",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-50 focus:ring-gray-500",
        danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 focus:ring-red-500",
        outline: "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 focus:ring-indigo-500",
        ghost: "bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-400 focus:ring-gray-500",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base shadow-sm",
    };

    return (
        <button
            className={clsx(
                baseStyles,
                variants[variant],
                sizes[size],
                (disabled || isLoading) && "opacity-70 cursor-not-allowed",
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </button>
    );
}
