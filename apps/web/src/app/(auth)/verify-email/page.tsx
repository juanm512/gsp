"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { authClient } from "~/auth/client";

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"pending" | "verifying" | "verified" | "error">(
        token ? "verifying" : "pending"
    );
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState("");

    useEffect(() => {
        if (token && status === "verifying") {
            // Auto-verify if token is present
            authClient.verifyEmail({ query: { token } }).then((result) => {
                if (result.error) {
                    setStatus("error");
                } else {
                    setStatus("verified");
                }
            });
        }
    }, [token, status]);

    const handleResend = async () => {
        setIsResending(true);
        setResendMessage("");

        try {
            // Get the email from URL or session
            const email = searchParams.get("email");
            if (email) {
                await authClient.sendVerificationEmail({ email });
                setResendMessage("Email de verificación reenviado");
            } else {
                setResendMessage("No se pudo reenviar. Intenta iniciar sesión nuevamente.");
            }
        } catch {
            setResendMessage("Error al reenviar el email");
        } finally {
            setIsResending(false);
        }
    };

    if (status === "verified") {
        return (
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl">¡Email Verificado!</CardTitle>
                    <CardDescription>
                        Tu cuenta ha sido verificada correctamente
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Button asChild className="w-full">
                        <a href="/login">Iniciar Sesión</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (status === "error") {
        return (
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-red-600">Error de Verificación</CardTitle>
                    <CardDescription>
                        El enlace de verificación es inválido o ha expirado
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <Button onClick={handleResend} disabled={isResending} className="w-full">
                        {isResending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Reenviando...
                            </>
                        ) : (
                            "Reenviar Email de Verificación"
                        )}
                    </Button>
                    {resendMessage && (
                        <p className="text-sm text-muted-foreground">{resendMessage}</p>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">Verifica tu Email</CardTitle>
                <CardDescription>
                    Hemos enviado un enlace de verificación a tu correo electrónico.
                    Por favor revisa tu bandeja de entrada.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                    ¿No recibiste el email? Revisa tu carpeta de spam o solicita un nuevo email.
                </p>
                <Button
                    onClick={handleResend}
                    disabled={isResending}
                    variant="outline"
                    className="w-full"
                >
                    {isResending ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Reenviando...
                        </>
                    ) : (
                        "Reenviar Email de Verificación"
                    )}
                </Button>
                {resendMessage && (
                    <p className="text-sm text-muted-foreground">{resendMessage}</p>
                )}
            </CardContent>
        </Card>
    );
}
