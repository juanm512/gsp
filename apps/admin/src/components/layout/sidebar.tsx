"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ClipboardList,
    FolderKanban,
    LayoutDashboard,
    Users,
} from "lucide-react";

import { cn } from "@acme/ui";

interface AdminSidebarProps {
    userRole: string;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tareas", href: "/tasks", icon: ClipboardList },
    { name: "Presentaciones", href: "/presentations", icon: FolderKanban },
];

const superadminNav = [
    { name: "Usuarios", href: "/users", icon: Users },
];

export function AdminSidebar({ userRole }: AdminSidebarProps) {
    const pathname = usePathname();
    const isSuperadmin = userRole === "superadmin";

    const allNav = isSuperadmin ? [...navigation, ...superadminNav] : navigation;

    return (
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 lg:block">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
                <span className="rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                    ADMIN
                </span>
                <span className="text-xl font-bold tracking-tight text-white">
                    GSP
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-4">
                {allNav.map((item) => {
                    const isActive = pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/20 text-primary"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
