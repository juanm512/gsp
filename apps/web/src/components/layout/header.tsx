"use client";

import { ThemeToggle } from "@acme/ui/theme";

import { OrgSelector } from "~/components/organizations/org-selector";
import { UserMenu } from "~/components/layout/user-menu";

interface HeaderProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:bg-slate-900">
            {/* Left side - Org selector */}
            <div className="flex items-center gap-4">
                <OrgSelector />
            </div>

            {/* Right side - Theme toggle & User menu */}
            <div className="flex items-center gap-4">
                <ThemeToggle />
                <UserMenu user={user} />
            </div>
        </header>
    );
}
