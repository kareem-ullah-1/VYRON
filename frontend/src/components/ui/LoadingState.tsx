"use client";

export default function LoadingState({ message = "Loading...", subtitle = "Please wait a moment" }: { message?: string, subtitle?: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] w-full gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-t-4 border-indigo-600 animate-spin"></div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-gray-700 animate-pulse">{message}</p>
                <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
        </div>
    );
}
