"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

export function DangerZone() {
    const router = useRouter();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleDeleteAccount = async () => {
        if (confirmText !== "ELIMINAR") {
            setError("Escribe ELIMINAR para confirmar");
            return;
        }

        setIsDeleting(true);
        setError("");

        try {
            const result = await authClient.deleteUser();

            if (result.error) {
                setError(result.error.message ?? "Error al eliminar la cuenta");
                return;
            }

            // Redirect to home after account deletion
            router.push("/");
        } catch {
            setError("Error al eliminar la cuenta");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSignOutAll = async () => {
        try {
            await authClient.signOut();
            router.push("/login");
        } catch {
            setError("Error al cerrar sesiones");
        }
    };

    return (
        <Card className="border-red-200 dark:border-red-900">
            <CardContent className="space-y-4 pt-6">
                {/* Sign out all sessions */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Cerrar todas las sesiones</p>
                        <p className="text-sm text-muted-foreground">
                            Cierra sesión en todos los dispositivos
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleSignOutAll}>
                        Cerrar Sesiones
                    </Button>
                </div>

                <div className="border-t pt-4">
                    {/* Delete account */}
                    {!showDeleteConfirm ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Eliminar cuenta</p>
                                <p className="text-sm text-muted-foreground">
                                    Elimina permanentemente tu cuenta y todos tus datos
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                Eliminar Cuenta
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
                                <div>
                                    <p className="font-medium text-red-600 dark:text-red-400">
                                        ¿Estás seguro?
                                    </p>
                                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                                        Esta acción no se puede deshacer. Se eliminarán permanentemente
                                        tu cuenta y todos los datos asociados.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmDelete">
                                    Escribe <strong>ELIMINAR</strong> para confirmar
                                </Label>
                                <Input
                                    id="confirmDelete"
                                    type="text"
                                    placeholder="ELIMINAR"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    disabled={isDeleting}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setConfirmText("");
                                        setError("");
                                    }}
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting || confirmText !== "ELIMINAR"}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Eliminando...
                                        </>
                                    ) : (
                                        "Eliminar Permanentemente"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
