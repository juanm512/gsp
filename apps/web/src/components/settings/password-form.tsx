"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
} from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

export function PasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "Las contraseñas no coinciden" });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: "error", text: "La contraseña debe tener al menos 8 caracteres" });
            return;
        }

        setIsLoading(true);

        try {
            const result = await authClient.changePassword({
                currentPassword,
                newPassword,
            });

            if (result.error) {
                setMessage({ type: "error", text: result.error.message ?? "Error al cambiar la contraseña" });
                return;
            }

            setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            setMessage({ type: "error", text: "Error al cambiar la contraseña" });
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = currentPassword && newPassword && confirmPassword;

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Current password */}
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Contraseña Actual</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {/* New password */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Message */}
                    {message && (
                        <div
                            className={`rounded-md p-3 text-sm ${message.type === "success"
                                    ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                                    : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {/* Submit */}
                    <Button type="submit" disabled={isLoading || !isFormValid}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cambiando...
                            </>
                        ) : (
                            "Cambiar Contraseña"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
