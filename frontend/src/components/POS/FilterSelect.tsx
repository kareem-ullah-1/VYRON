"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FunnelIcon, CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export interface FilterOption {
    value: string;
    label: string;
    dot?: string; // tailwind color class for the dot, e.g. "bg-emerald-500"
}

interface FilterSelectProps {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    searchable?: boolean;
    searchPlaceholder?: string;
    placeholder?: string;
    className?: string;
}

export default function FilterSelect({
    options,
    value,
    onChange,
    icon = <FunnelIcon className="w-4 h-4" />,
    searchable = false,
    searchPlaceholder = "Search...",
    placeholder = "Select...",
    className = "",
}: FilterSelectProps) {
    const [open, setOpen] = useState(false);
    const [filterText, setFilterText] = useState("");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    const selected = options.find((o) => o.value === value);

    const displayedOptions = searchable && filterText.trim()
        ? options.filter((o) => o.label.toLowerCase().includes(filterText.toLowerCase()))
        : options;

    // Calculate position when opening
    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const estimatedDropdownHeight = 250; // max height of dropdown
            
            const shouldOpenUp = spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight;

            setDropdownPos({
                top: shouldOpenUp ? undefined : rect.bottom + 6,
                bottom: shouldOpenUp ? window.innerHeight - rect.top + 6 : undefined,
                left: rect.left,
                width: rect.width,
            });
        }
    }, []);

    useEffect(() => {
        if (open) {
            updatePosition();
            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);
            return () => {
                window.removeEventListener("scroll", updatePosition, true);
                window.removeEventListener("resize", updatePosition);
            };
        }
    }, [open, updatePosition]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
                setFilterText("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                setFilterText("");
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (open && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [open, searchable]);

    const dropdownContent = (
        <AnimatePresence>
            {open && (
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        bottom: dropdownPos.bottom,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        zIndex: 9999,
                    }}
                    className="bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden"
                >
                    {/* Search input */}
                    {searchable && (
                        <div className="px-2 pt-2 pb-1 border-b border-gray-100">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-800 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-colors placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                    )}

                    <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {displayedOptions.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-gray-400 text-center">No matches found</div>
                        ) : (
                            displayedOptions.map((option) => {
                                const isActive = option.value === value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                            setFilterText("");
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isActive
                                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                                : "text-gray-700 hover:bg-gray-50 font-medium"
                                            }`}
                                    >
                                        {option.dot && (
                                            <span
                                                className={`w-2 h-2 rounded-full flex-shrink-0 ${option.dot}`}
                                            />
                                        )}
                                        <span className="flex-1 text-left">{option.label}</span>
                                        {isActive && (
                                            <CheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0 stroke-2" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className={`relative w-full sm:w-48 ${className}`}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`w-full flex items-center gap-2 pl-3 pr-3 py-2.5 bg-white border rounded-xl text-sm font-medium shadow-sm cursor-pointer transition-all outline-none ${open
                        ? "border-indigo-500 ring-1 ring-indigo-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
            >
                <span className="text-gray-400 flex-shrink-0">{icon}</span>
                {selected?.dot && (
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`} />
                )}
                <span className="flex-1 text-left text-gray-800 truncate">
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDownIcon
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Portal-based dropdown - renders at document.body to escape overflow-hidden */}
            {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
        </div>
    );
}
