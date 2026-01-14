"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import {
    Plus,
    Loader2,
    FileVideo,
    Image,
    Box,
    MoreHorizontal,
    Eye,
    Trash2,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card";
import { Badge } from "@acme/ui/badge";
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
import { Textarea } from "@acme/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";

const statusConfig = {
    draft: { label: "Borrador", icon: Clock, color: "bg-slate-500" },
    pending_review: { label: "Pendiente", icon: Clock, color: "bg-yellow-500" },
    rejected: { label: "Rechazado", icon: XCircle, color: "bg-red-500" },
    approved: { label: "Aprobado", icon: CheckCircle, color: "bg-blue-500" },
    processing: { label: "Procesando", icon: Loader2, color: "bg-purple-500" },
    completed: { label: "Completado", icon: CheckCircle, color: "bg-green-500" },
    failed: { label: "Fallido", icon: AlertCircle, color: "bg-red-500" },
};

export default function PresentationsPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.orgId as string;
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");

    const { data, isLoading } = useQuery(
        trpc.presentation.list.queryOptions({
            organizationId: orgId,
            limit: 50,
        })
    );

    const createMutation = useMutation(
        trpc.presentation.create.mutationOptions({
            onSuccess: (result) => {
                setIsCreateOpen(false);
                setNewTitle("");
                setNewDescription("");
                queryClient.invalidateQueries({ queryKey: ["presentation", "list"] });
                router.push(`/dashboard/organizations/${orgId}/presentations/${result.presentation?.id}`);
            },
        })
    );

    const deleteMutation = useMutation(
        trpc.presentation.delete.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["presentation", "list"] });
            },
        })
    );

    const handleCreate = () => {
        if (!newTitle.trim()) return;
        createMutation.mutate({
            organizationId: orgId,
            title: newTitle,
            description: newDescription || undefined,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const presentations = data?.presentations ?? [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Presentaciones</h1>
                    <p className="text-muted-foreground">
                        {data?.total ?? 0} presentaciones en total
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Presentación
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Presentación</DialogTitle>
                            <DialogDescription>
                                Crea una nueva presentación para subir material de Gaussian Splatting
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título</Label>
                                <Input
                                    id="title"
                                    placeholder="Nombre de la instalación..."
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción (opcional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descripción del proyecto..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={!newTitle.trim() || createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    "Crear"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {presentations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Box className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No hay presentaciones</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            Crea tu primera presentación para comenzar a subir material de Gaussian Splatting
                        </p>
                        <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Presentación
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {presentations.map((pres: any) => {
                        const status = statusConfig[pres.status as keyof typeof statusConfig] || statusConfig.draft;
                        const StatusIcon = status.icon;

                        return (
                            <Card
                                key={pres.id}
                                className="cursor-pointer hover:border-primary transition-colors"
                                onClick={() => router.push(`/dashboard/organizations/${orgId}/presentations/${pres.id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg line-clamp-1">
                                                {pres.title}
                                            </CardTitle>
                                            {pres.description && (
                                                <CardDescription className="line-clamp-2">
                                                    {pres.description}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/organizations/${orgId}/presentations/${pres.id}`);
                                                    }}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver Detalle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("¿Eliminar esta presentación?")) {
                                                            deleteMutation.mutate({ presentationId: pres.id });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm">
                                        <Badge
                                            variant="outline"
                                            className={`${status.color} text-white border-none`}
                                        >
                                            <StatusIcon className="mr-1 h-3 w-3" />
                                            {status.label}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            {new Date(pres.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
