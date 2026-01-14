"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@acme/ui/dialog";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

type Organization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
};

export default function OrgSettingsGeneralPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.orgId as string;

    const [org, setOrg] = useState<Organization | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        loadOrg();
    }, [orgId]);

    const loadOrg = async () => {
        try {
            const result = await authClient.organization.list();
            if (result.data) {
                const found = result.data.find((o) => o.id === orgId);
                if (found) {
                    setOrg(found);
                    setName(found.name);
                    setSlug(found.slug);
                }
            }
        } catch (error) {
            console.error("Error loading org:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        try {
            const result = await authClient.organization.update({
                data: {
                    name,
                    slug,
                },
            });

            if (result.error) {
                setMessage({ type: "error", text: result.error.message ?? "Error al guardar" });
                return;
            }

            setMessage({ type: "success", text: "Organización actualizada" });
            setOrg({ ...org!, name, slug });
        } catch {
            setMessage({ type: "error", text: "Error al guardar los cambios" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmation !== org?.name) return;

        setIsDeleting(true);
        try {
            const result = await authClient.organization.delete({
                organizationId: org.id,
            });

            if (result.error) {
                setMessage({ type: "error", text: result.error.message ?? "Error al eliminar" });
                setShowDeleteDialog(false);
                return;
            }

            router.push("/dashboard/organizations");
        } catch {
            setMessage({ type: "error", text: "Error al eliminar la organización" });
            setShowDeleteDialog(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const hasChanges = org && (name !== org.name || slug !== org.slug);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>
                        Configura el nombre y la URL de tu organización
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Organización</Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Identificador URL</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">gsp.app/org/</span>
                                <Input
                                    id="slug"
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    disabled={isSaving}
                                    className="flex-1"
                                />
                            </div>
                        </div>

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

                        <Button type="submit" disabled={isSaving || !hasChanges}>
                            {isSaving ? (
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

            {/* Danger zone */}
            <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">
                        Zona de Peligro
                    </CardTitle>
                    <CardDescription>
                        Acciones irreversibles para esta organización
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Eliminar Organización</p>
                            <p className="text-sm text-muted-foreground">
                                Elimina permanentemente esta organización y todos sus datos
                            </p>
                        </div>
                        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                        <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <DialogTitle className="text-center">¿Eliminar Organización?</DialogTitle>
                                    <DialogDescription className="text-center">
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente la
                                        organización <span className="font-bold text-foreground">{org?.name}</span> y eliminará todos sus datos.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="py-4">
                                    <Label htmlFor="confirmation" className="mb-2 block text-sm">
                                        Escribe <span className="font-bold select-none">{org?.name}</span> para confirmar
                                    </Label>
                                    <Input
                                        id="confirmation"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder={org?.name}
                                        autoComplete="off"
                                    />
                                </div>

                                <DialogFooter className="sm:justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowDeleteDialog(false)}
                                        disabled={isDeleting}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={isDeleting || deleteConfirmation !== org?.name}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Eliminando...
                                            </>
                                        ) : (
                                            "Eliminar Organización"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
