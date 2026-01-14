"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Crown,
    Loader2,
    MoreHorizontal,
    RefreshCw,
    Shield,
    User,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import { Input } from "@acme/ui/input";
import { cn } from "@acme/ui";

import { useTRPC } from "~/trpc/react";
import { ChangeRoleDialog } from "./change-role-dialog";

type UserData = {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    createdAt: Date;
    emailVerified: boolean;
};

const roleConfig: Record<string, { label: string; icon: typeof Crown; color: string }> = {
    superadmin: { label: "Super Admin", icon: Crown, color: "text-amber-400" },
    admin: { label: "Admin", icon: Shield, color: "text-blue-400" },
    user: { label: "Usuario", icon: User, color: "text-slate-400" },
};

export function UserTable() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [showRoleDialog, setShowRoleDialog] = useState(false);

    // Use tRPC to fetch users
    const { data, isLoading, refetch } = useQuery(
        trpc.admin.listUsers.queryOptions({
            limit: 100,
            search: search || undefined,
            roleFilter: roleFilter as "all" | "user" | "admin" | "superadmin",
        })
    );

    const users = (data?.users ?? []) as UserData[];

    const handleRoleChange = (user: UserData) => {
        setSelectedUser(user);
        setShowRoleDialog(true);
    };

    if (isLoading) {
        return (
            <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-slate-800 bg-slate-800/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white">Usuarios</CardTitle>
                            <CardDescription className="text-slate-400">
                                {users.length} usuarios registrados
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="border-slate-700 text-slate-300"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Actualizar
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 pt-4">
                        <Input
                            placeholder="Buscar por nombre o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                        />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                        >
                            <option value="all">Todos los roles</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="user">Usuario</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-slate-700">
                        {users.length === 0 ? (
                            <div className="py-8 text-center text-slate-500">
                                No se encontraron usuarios
                            </div>
                        ) : (
                            users.map((user) => {
                                const role = roleConfig[user.role] || roleConfig.user;
                                const RoleIcon = role.icon;

                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between py-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            {user.image ? (
                                                <img
                                                    src={user.image}
                                                    alt={user.name}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                                                    <User className="h-5 w-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-white">{user.name}</p>
                                                <p className="text-sm text-slate-400">{user.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Role badge */}
                                            <div className={cn(
                                                "flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-xs font-medium",
                                                role.color
                                            )}>
                                                <RoleIcon className="h-3 w-3" />
                                                {role.label}
                                            </div>

                                            {/* Email verified */}
                                            <div className={cn(
                                                "rounded-full px-2 py-1 text-xs",
                                                user.emailVerified
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-red-500/20 text-red-400"
                                            )}>
                                                {user.emailVerified ? "Verificado" : "Sin verificar"}
                                            </div>

                                            {/* Actions */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-slate-400 hover:text-white"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user)}>
                                                        <Shield className="mr-2 h-4 w-4" />
                                                        Cambiar Rol
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem disabled className="text-red-500">
                                                        Deshabilitar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Change role dialog */}
            {selectedUser && (
                <ChangeRoleDialog
                    user={selectedUser}
                    open={showRoleDialog}
                    onOpenChange={setShowRoleDialog}
                    onSuccess={() => {
                        setShowRoleDialog(false);
                        refetch();
                    }}
                />
            )}
        </>
    );
}
