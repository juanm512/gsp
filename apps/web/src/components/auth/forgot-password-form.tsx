"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await authClient.forgetPassword({
                email,
                redirectTo: "/reset-password",
            });

            if (result.error) {
                setError(result.error.message ?? "Error al enviar el email");
                return;
            }

            setIsSuccess(true);
        } catch {
            setError("Error al enviar el email. Por favor intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Si existe una cuenta con el email <strong>{email}</strong>, recibirás
                        un enlace para restablecer tu contraseña.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Revisa tu bandeja de entrada y carpeta de spam.
                    </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/login">Volver a Iniciar Sesión</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                    </>
                ) : (
                    "Enviar Enlace de Recuperación"
                )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                    Volver a Iniciar Sesión
                </Link>
            </p>
        </form>
    );
}
