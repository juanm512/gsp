"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Building2,
    FolderKanban,
    Home,
    Settings,
} from "lucide-react";

import { cn } from "@acme/ui";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Organizaciones", href: "/dashboard/organizations", icon: Building2 },
    // los sig. links estan asociados directamente con una org especifica
    // { name: "Presentaciones", href: "/dashboard/presentations", icon: FolderKanban },
    // { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-64 flex-shrink-0 border-r bg-white dark:bg-slate-900 lg:block">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FolderKanban className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                    <span className="text-primary">GSP</span>
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
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
