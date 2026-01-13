"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Shield } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

export function AdminLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(searchParams.get("error") === "unauthorized"
        ? "No tienes permisos de administrador"
        : "");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await authClient.signIn.email({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message ?? "Error al iniciar sesión");
                setIsLoading(false);
                return;
            }

            // Check if user has admin role
            const session = await authClient.getSession();
            const userRole = session.data?.user?.role;

            if (!userRole || !["admin", "superadmin"].includes(userRole)) {
                // Sign out the non-admin user
                await authClient.signOut();
                setError("Acceso denegado. Solo administradores pueden acceder.");
                setIsLoading(false);
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch {
            setError("Error al iniciar sesión. Por favor intenta de nuevo.");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="admin@gsp.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                    </>
                ) : (
                    <>
                        <Shield className="mr-2 h-4 w-4" />
                        Acceder como Administrador
                    </>
                )}
            </Button>

            <p className="text-center text-xs text-slate-500">
                Este panel es solo para administradores autorizados
            </p>
        </form>
    );
}
