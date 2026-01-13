"use client";

import { useRouter } from "next/navigation";
import { LogOut, Shield, User } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import { ThemeToggle } from "@acme/ui/theme";

import { authClient } from "~/auth/client";

interface AdminHeaderProps {
    user: {
        id: string;
        name: string;
        email: string;
        role?: string;
        image?: string | null;
    };
}

export function AdminHeader({ user }: AdminHeaderProps) {
    const router = useRouter();

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    };

    const isSuperadmin = user.role === "superadmin";

    return (
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
            {/* Left side - Title */}
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">Panel de Control</h1>
            </div>

            {/* Right side - Theme toggle & User menu */}
            <div className="flex items-center gap-4">
                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative flex items-center gap-2 text-slate-300 hover:text-white"
                        >
                            {user.image ? (
                                <img
                                    src={user.image}
                                    alt={user.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                                    <User className="h-4 w-4" />
                                </div>
                            )}
                            <span className="hidden sm:inline">{user.name}</span>
                            {isSuperadmin && (
                                <Shield className="h-4 w-4 text-amber-400" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                <p className={`text-xs font-medium ${isSuperadmin ? "text-amber-500" : "text-blue-500"}`}>
                                    {isSuperadmin ? "Super Admin" : "Administrador"}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleSignOut}
                            className="text-red-500 focus:text-red-500"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
