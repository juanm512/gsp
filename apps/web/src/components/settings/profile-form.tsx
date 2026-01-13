"use client";

import { useState } from "react";
import { Loader2, User } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
} from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

interface ProfileFormProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
}

export function ProfileForm({ user }: ProfileFormProps) {
    const [name, setName] = useState(user.name);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        try {
            const result = await authClient.updateUser({
                name,
            });

            if (result.error) {
                setMessage({ type: "error", text: result.error.message ?? "Error al actualizar" });
                return;
            }

            setMessage({ type: "success", text: "Perfil actualizado correctamente" });
        } catch {
            setMessage({ type: "error", text: "Error al actualizar el perfil" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Avatar preview */}
                    <div className="flex items-center gap-4">
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name}
                                className="h-16 w-16 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <User className="h-8 w-8" />
                            </div>
                        )}
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    {/* Name field */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Email field (read-only) */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            El email no se puede cambiar
                        </p>
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
                    <Button type="submit" disabled={isLoading || name === user.name}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar Cambios"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
