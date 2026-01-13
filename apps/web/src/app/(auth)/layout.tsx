"use client";

import Link from "next/link";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import { ThemeToggle } from "@acme/ui/theme";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" />

            {/* Theme toggle */}
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>

            {/* Logo/Brand link */}
            <Link
                href="/"
                className="absolute left-6 top-6 flex items-center gap-2 text-xl font-bold tracking-tight transition-colors hover:text-primary"
            >
                <span className="text-primary">GSP</span>
            </Link>

            {/* Main content */}
            <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
    );
}
