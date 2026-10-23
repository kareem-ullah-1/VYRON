"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestInputProps {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
}

export default function SuggestInput({ value, onChange, suggestions, placeholder, className = "" }: SuggestInputProps) {
    const [open, setOpen] = useState(false);
    const [hasTyped, setHasTyped] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    const filtered = hasTyped && value.trim()
        ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
        : suggestions;

    const updatePosition = useCallback(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const estimatedDropdownHeight = 220;
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

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                inputRef.current && !inputRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);

    const dropdownContent = (
        <AnimatePresence>
            {open && filtered.length > 0 && (
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
                    className="bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 overflow-hidden py-1 max-h-56 overflow-y-auto custom-scrollbar"
                >
                    {filtered.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => { onChange(s); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            <input
                ref={inputRef}
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={(e) => { setHasTyped(true); onChange(e.target.value); }}
                onFocus={() => { setHasTyped(false); setOpen(true); }}
                onClick={() => setOpen(true)}
                className={className}
            />
            {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
        </>
    );
}
