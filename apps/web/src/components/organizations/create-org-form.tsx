"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}

export function CreateOrgForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isSlugEdited, setIsSlugEdited] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleNameChange = (value: string) => {
        setName(value);
        if (!isSlugEdited) {
            setSlug(generateSlug(value));
        }
    };

    const handleSlugChange = (value: string) => {
        setSlug(generateSlug(value));
        setIsSlugEdited(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("El nombre es requerido");
            return;
        }

        if (!slug.trim()) {
            setError("El identificador es requerido");
            return;
        }

        setIsLoading(true);

        try {
            const result = await authClient.organization.create({
                name: name.trim(),
                slug: slug.trim(),
            });

            if (result.error) {
                setError(result.error.message ?? "Error al crear la organización");
                return;
            }

            // Set the new organization as active
            if (result.data) {
                await authClient.organization.setActive({
                    organizationId: result.data.id,
                });
            }

            router.push("/dashboard/organizations");
            router.refresh();
        } catch {
            setError("Error al crear la organización. Por favor intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Organización</Label>
                <Input
                    id="name"
                    type="text"
                    placeholder="Mi Empresa"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                    Este es el nombre que verán todos los miembros.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="slug">Identificador URL</Label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">gsp.app/org/</span>
                    <Input
                        id="slug"
                        type="text"
                        placeholder="mi-empresa"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        required
                        disabled={isLoading}
                        className="flex-1"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Se usa en las URLs. Solo letras minúsculas, números y guiones.
                </p>
            </div>

            <div className="flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando...
                        </>
                    ) : (
                        "Crear Organización"
                    )}
                </Button>
            </div>
        </form>
    );
}
