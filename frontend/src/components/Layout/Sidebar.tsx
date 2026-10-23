"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    HomeIcon,
    ShoppingCartIcon,
    CubeIcon,
    UsersIcon,
    ChartBarIcon,
    CogIcon,
    TruckIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    BellIcon,
    UserCircleIcon,
    DocumentTextIcon
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useProgressRouter } from "@/components/Navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";

const navigation = [
    { name: "Dashboard", href: "/", icon: HomeIcon },
    { name: "POS", href: "/pos", icon: ShoppingCartIcon },
    { name: "Sales", href: "/sales", icon: ChartBarIcon },
    { name: "Custom Orders", href: "/custom-orders", icon: DocumentTextIcon },
    { label: "Manage", isHeader: true },
    { name: "Products", href: "/products", icon: CubeIcon },
    { name: "Customers", href: "/customers", icon: UsersIcon },
    { label: "Purchasing", isHeader: true },
    { name: "Suppliers", href: "/procurement/suppliers", icon: TruckIcon },
    { name: "Raw Materials", href: "/procurement/raw-materials", icon: ClipboardDocumentListIcon },
    { name: "Purchases", href: "/procurement/purchases", icon: CurrencyDollarIcon },
    { label: "Settings", isHeader: true },
    { name: "Settings", href: "/settings", icon: CogIcon },
];

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
    const [hovered, setHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pathname = usePathname();
    const router = useProgressRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setHovered(true);
        }, 150);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHovered(false);
    };

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        onMobileClose?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const collapsed = !hovered && !mobileOpen; // collapsed when not hovered (always expanded in mobile drawer)

    return (
        <>
        {mobileOpen && (
            <div
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={onMobileClose}
                aria-hidden="true"
            />
        )}
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={clsx(
                "flex flex-col bg-white border-r border-gray-200 transition-[width,transform] duration-200 ease-out will-change-[width]",
                "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:shadow-xl",
                mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
                collapsed ? "w-16" : "w-64"
            )}>
            {/* Header */}
            <div className="flex items-center p-4 border-b border-gray-200">
                {!collapsed && (
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">DP</span>
                        </div>
                        <span className="font-semibold text-gray-900">POS</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
                {navigation.map((item, idx) => {
                    if (item.isHeader) {
                        return (
                            <div key={`header-${idx}`} className={clsx("mt-6 mb-2 flex items-center", collapsed ? "justify-center" : "px-3")}>
                                {!collapsed && <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{item.label}</span>}
                                {collapsed && <div className="w-4 h-px bg-gray-300"></div>}
                            </div>
                        );
                    }

                    // Check if current route matches or starts with the item's href (for nested active states)
                    const isActive = item.href === "/"
                        ? pathname === "/"
                        : pathname?.startsWith(item.href as string);

                    const Icon = item.icon as React.ElementType;

                    return (
                        <Link
                            key={item.name}
                            href={item.href as string}
                            className={clsx(
                                "flex items-center py-2 text-sm font-medium rounded-lg transition-colors",
                                collapsed ? "justify-center px-0" : "px-3",
                                isActive
                                    ? "bg-primary-50 text-primary-700"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}>
                            <span className="flex items-center justify-center w-6">
                                <Icon className="w-5 h-5" />
                            </span>
                            {!collapsed && <span className="ml-3 whitespace-nowrap">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer with Menu */}
            <div className="p-4 border-t border-gray-200">
                <Menu as="div" className="relative">
                    <Menu.Button
                        className={clsx(
                            "w-full flex items-center p-2 rounded-xl hover:bg-gray-50/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 group",
                            collapsed ? "justify-center" : "space-x-3"
                        )}>
                        <div className="relative flex-shrink-0">
                            <div className={clsx(
                                "relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105",
                                user?.avatar ? "border border-gray-200" : "bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-shadow-sm shadow-primary-200"
                            )}>
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=6366f1&color=fff`;
                                        }}
                                    />
                                ) : (
                                    <span className="text-sm font-bold tracking-tight">
                                        {user?.name?.substring(0, 2).toUpperCase() || "U"}
                                    </span>
                                )}
                            </div>

                            {/* Notification Dot with Pulse Effect */}
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                            </span>
                        </div>
                        <div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0 text-left overflow-hidden">
                                    <p className="text-sm font-bold text-gray-900 truncate tracking-tight group-hover:text-primary-700 transition-colors">
                                        {user?.name || "User"}
                                    </p>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                                        {user?.role || "Role"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95 translate-y-2"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-2">
                        <Menu.Items className={`absolute bottom-full mb-2 ${collapsed ? "left-0 w-48" : "left-0 w-full"} bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 focus:outline-none`}>
                            {/* Notifications (Mocked for now as we moved it from Header) */}
                            {/* <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Notifications
                                    </h3>
                                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        3 New
                                    </span>
                                </div>
                                <div className="mt-2 space-y-2">
                                    <div className="text-xs text-gray-700 leading-tight">
                                        <span className="font-semibold text-gray-900">Order #78901</span> confirmed by James Kirwin.
                                    </div>
                                    <div className="text-[10px] text-gray-400">2 days ago</div>
                                </div>
                            </div> */}

                            <Menu.Item>
                                {({ active }) => (
                                    <Link
                                        href="/profile"
                                        className={clsx(
                                            "flex items-center px-4 py-2.5 text-sm transition-colors",
                                            active ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"
                                        )}>
                                        <UserCircleIcon className="w-4 h-4 mr-3 text-gray-400" />
                                        My Profile
                                    </Link>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <Link
                                        href="/settings"
                                        className={clsx(
                                            "flex items-center px-4 py-2.5 text-sm transition-colors",
                                            active ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"
                                        )}>
                                        <CogIcon className="w-4 h-4 mr-3 text-gray-400" />
                                        Settings
                                    </Link>
                                )}
                            </Menu.Item>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </div>
        </>
    );
}
