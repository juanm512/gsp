"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Crown, Loader2, Shield, User } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@acme/ui/dialog";
import { cn } from "@acme/ui";

import { useTRPC } from "~/trpc/react";

interface ChangeRoleDialogProps {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const roles = [
    {
        value: "user",
        label: "Usuario",
        description: "Acceso básico al sistema",
        icon: User,
        color: "border-slate-600 hover:border-slate-500",
        activeColor: "border-slate-400 bg-slate-800",
    },
    {
        value: "superadmin",
        label: "Super Admin",
        description: "Acceso total, incluyendo gestión de usuarios",
        icon: Crown,
        color: "border-amber-600/50 hover:border-amber-500",
        activeColor: "border-amber-500 bg-amber-950",
    },
];

export function ChangeRoleDialog({
    user,
    open,
    onOpenChange,
    onSuccess,
}: ChangeRoleDialogProps) {
    const trpc = useTRPC();
    const [selectedRole, setSelectedRole] = useState(user.role);
    const [error, setError] = useState("");

    const setUserRoleMutation = useMutation(
        trpc.admin.setUserRole.mutationOptions({
            onSuccess: () => {
                onSuccess();
            },
            onError: (err) => {
                setError(err.message ?? "Error al cambiar el rol");
            },
        })
    );

    const handleSubmit = async () => {
        if (selectedRole === user.role) {
            onOpenChange(false);
            return;
        }

        setError("");
        setUserRoleMutation.mutate({
            userId: user.id,
            role: selectedRole as "user" | "admin" | "superadmin",
        });
    };

    const isLoading = setUserRoleMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white">Cambiar Rol</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Cambiar el rol de <span className="font-medium text-white">{user.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {roles.map((role) => {
                        const isActive = selectedRole === role.value;
                        return (
                            <button
                                key={role.value}
                                type="button"
                                onClick={() => setSelectedRole(role.value)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                                    isActive ? role.activeColor : role.color
                                )}
                            >
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-lg",
                                    role.value === "superadmin" && "bg-amber-500/20 text-amber-400",
                                    role.value === "admin" && "bg-blue-500/20 text-blue-400",
                                    role.value === "user" && "bg-slate-500/20 text-slate-400"
                                )}>
                                    <role.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-white">{role.label}</p>
                                    <p className="text-sm text-slate-400">{role.description}</p>
                                </div>
                                {isActive && (
                                    <div className="h-3 w-3 rounded-full bg-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="border-slate-700 text-slate-300"
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || selectedRole === user.role}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar Cambios"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
