"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import {
    FolderKanban,
    Search,
    Loader2,
    Building2,
    User,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Hand,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent } from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Badge } from "@acme/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const statusConfig = {
    draft: { label: "Borrador", icon: Clock, color: "bg-slate-500" },
    pending_review: { label: "Pendiente", icon: Clock, color: "bg-yellow-500" },
    rejected: { label: "Rechazado", icon: XCircle, color: "bg-red-500" },
    approved: { label: "Aprobado", icon: CheckCircle, color: "bg-blue-500" },
    processing: { label: "Procesando", icon: Loader2, color: "bg-purple-500" },
    completed: { label: "Completado", icon: CheckCircle, color: "bg-green-500" },
    failed: { label: "Fallido", icon: AlertCircle, color: "bg-red-500" },
};

export default function AdminPresentationsPage() {
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [showMine, setShowMine] = useState(false);
    const [showUnassigned, setShowUnassigned] = useState(false);

    const { data, isLoading } = useQuery(
        trpc.presentation.adminList.queryOptions({
            status: statusFilter as any || undefined,
            assignedToMe: showMine || undefined,
            unassigned: showUnassigned || undefined,
            limit: 50,
        })
    );

    const claimMutation = useMutation(
        trpc.presentation.adminClaim.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [["presentation", "adminList"]] });
            },
        })
    );

    const presentations = data?.presentations ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Presentaciones
                    </h1>
                    <p className="text-slate-400">
                        Gestiona todas las presentaciones del sistema
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                        placeholder="Buscar presentaciones..."
                        className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                    <option value="">Todos los estados</option>
                    <option value="pending_review">Pendiente Revisión</option>
                    <option value="approved">Aprobado</option>
                    <option value="processing">Procesando</option>
                    <option value="completed">Completado</option>
                    <option value="rejected">Rechazado</option>
                    <option value="failed">Fallido</option>
                </select>
                <Button
                    variant={showMine ? "default" : "outline"}
                    onClick={() => {
                        setShowMine(!showMine);
                        if (!showMine) setShowUnassigned(false);
                    }}
                    className={!showMine ? "border-slate-700 text-slate-300" : ""}
                >
                    <User className="mr-2 h-4 w-4" />
                    Mis Asignadas
                </Button>
                <Button
                    variant={showUnassigned ? "default" : "outline"}
                    onClick={() => {
                        setShowUnassigned(!showUnassigned);
                        if (!showUnassigned) setShowMine(false);
                    }}
                    className={!showUnassigned ? "border-slate-700 text-slate-300" : ""}
                >
                    Sin Asignar
                </Button>
            </div>

            {/* Presentations List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            ) : presentations.length === 0 ? (
                <Card className="border-slate-800 bg-slate-800/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                            <FolderKanban className="h-8 w-8 text-slate-500" />
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-white">
                            No hay presentaciones
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Las presentaciones aparecerán cuando los usuarios las creen
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {presentations.map((pres: any) => {
                        const status = statusConfig[pres.status as keyof typeof statusConfig] || statusConfig.draft;
                        const StatusIcon = status.icon;

                        return (
                            <Card
                                key={pres.id}
                                className="border-slate-800 bg-slate-800/50 cursor-pointer hover:border-slate-600 transition-colors"
                                onClick={() => router.push(`/presentations/${pres.id}`)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
                                                <FolderKanban className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white">
                                                    {pres.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Building2 className="h-3 w-3" />
                                                    {pres.organization?.name || "Sin org"}
                                                    <span>•</span>
                                                    <User className="h-3 w-3" />
                                                    {pres.createdBy?.name || "Usuario"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {pres.assignedTo ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <User className="h-4 w-4" />
                                                    {pres.assignedTo.name}
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        claimMutation.mutate({ presentationId: pres.id });
                                                    }}
                                                    disabled={claimMutation.isPending}
                                                >
                                                    <Hand className="mr-1 h-4 w-4" />
                                                    Tomar
                                                </Button>
                                            )}
                                            <span className="text-sm text-slate-400">
                                                {new Date(pres.createdAt).toLocaleDateString()}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`${status.color} text-white border-none`}
                                            >
                                                <StatusIcon className="mr-1 h-3 w-3" />
                                                {status.label}
                                            </Badge>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-slate-400 hover:text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/presentations/${pres.id}`);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
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
