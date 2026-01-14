"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import {
    ArrowLeft,
    Loader2,
    Upload,
    FileVideo,
    Image,
    Box,
    Download,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    File,
    Lock,
    AlertTriangle,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card";
import { Badge } from "@acme/ui/badge";
import { Separator } from "@acme/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";

const statusConfig = {
    draft: { label: "Borrador", icon: Clock, color: "bg-slate-500" },
    pending_review: { label: "Pendiente de Revisión", icon: Clock, color: "bg-yellow-500" },
    rejected: { label: "Rechazado", icon: XCircle, color: "bg-red-500" },
    approved: { label: "Aprobado", icon: CheckCircle, color: "bg-blue-500" },
    processing: { label: "Procesando", icon: Loader2, color: "bg-purple-500" },
    completed: { label: "Completado", icon: CheckCircle, color: "bg-green-500" },
    failed: { label: "Fallido", icon: AlertCircle, color: "bg-red-500" },
};

const viewableExtensions = [".sog", ".splat", ".ply"];

function isViewableFile(filename: string): boolean {
    return viewableExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

function getFileIcon(filename: string, type?: string) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".avi") || type === "video") {
        return FileVideo;
    }
    if (lower.endsWith(".zip") || type === "images_zip") {
        return Image;
    }
    if (isViewableFile(lower) || type === "gaussian_file") {
        return Box;
    }
    return File;
}

export default function PresentationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.orgId as string;
    const presentationId = params.id as string;
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const { data: presentation, isLoading } = useQuery(
        trpc.presentation.getById.queryOptions({ presentationId })
    );

    const initiateUploadMutation = useMutation(
        trpc.presentation.initiateUpload.mutationOptions()
    );

    const confirmUploadMutation = useMutation(
        trpc.presentation.confirmUpload.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [["presentation", "getById"]] });
                setIsUploading(false);
                setUploadError(null);
            },
            onError: (error) => {
                setUploadError(error.message);
                setIsUploading(false);
            },
        })
    );

    const downloadMutation = useMutation(
        trpc.presentation.getDownloadUrl.mutationOptions()
    );

    const handleDownload = async (fileKey: string) => {
        const result = await downloadMutation.mutateAsync({ fileKey });
        window.open(result.url, "_blank");
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        let uploadType: "video" | "images_zip" | "gaussian_file" = "video";
        if (file.name.endsWith(".zip")) {
            uploadType = "images_zip";
        } else if (
            file.name.endsWith(".sog") ||
            file.name.endsWith(".splat") ||
            file.name.endsWith(".ply") ||
            file.name.endsWith(".compressed.ply")
        ) {
            uploadType = "gaussian_file";
        }

        try {
            const initResult = await initiateUploadMutation.mutateAsync({
                presentationId,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || "application/octet-stream",
                uploadType,
            });

            const uploadResponse = await fetch(initResult.presignedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type || "application/octet-stream",
                },
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            await confirmUploadMutation.mutateAsync({
                uploadId: initResult.uploadId,
            });
        } catch (error) {
            console.error("Upload error:", error);
            setUploadError(error instanceof Error ? error.message : "Error al subir el archivo");
            setIsUploading(false);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!presentation) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold">Presentación no encontrada</h2>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push(`/dashboard/organizations/${orgId}/presentations`)}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>
        );
    }

    const status = statusConfig[presentation.status as keyof typeof statusConfig] || statusConfig.draft;
    const StatusIcon = status.icon;

    const userFiles = (presentation.uploads || []).map((u: any) => ({
        id: u.id,
        name: u.originalName,
        fileKey: u.fileKey,
        fileSize: u.fileSize,
        type: "upload" as const,
        uploadType: u.type,
        createdAt: u.createdAt,
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const canUpload = presentation.status === "draft" || presentation.status === "rejected";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push(`/dashboard/organizations/${orgId}/presentations`)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{presentation.title}</h1>
                    {presentation.description && (
                        <p className="text-muted-foreground">{presentation.description}</p>
                    )}
                </div>
                <Badge variant="outline" className={`${status.color} text-white border-none`}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {status.label}
                </Badge>
            </div>

            {presentation.status === "rejected" && presentation.rejectionReason && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Presentación Rechazada</AlertTitle>
                    <AlertDescription>{presentation.rejectionReason}</AlertDescription>
                </Alert>
            )}
            {presentation.status === "failed" && presentation.failedReason && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error en Procesamiento</AlertTitle>
                    <AlertDescription>{presentation.failedReason}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Tabs defaultValue="files" className="w-full">
                        <TabsList>
                            <TabsTrigger value="files">Archivos</TabsTrigger>
                            <TabsTrigger value="visualizer">Visualizador</TabsTrigger>
                        </TabsList>

                        <TabsContent value="visualizer" className="mt-4">
                            {presentation.activeFileKey ? (
                                <Card className="border-2 border-dashed border-muted bg-muted/30 overflow-hidden relative group">
                                    <div className="aspect-video w-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                                        <Box className="h-16 w-16 mb-4 opacity-50" />
                                        <p className="font-medium text-lg">Visualizador 3D</p>
                                        <p className="text-sm opacity-70">
                                            Mostrando vista previa de archivo procesado
                                        </p>
                                    </div>
                                </Card>
                            ) : (
                                <Card className="border-2 border-dashed border-muted bg-muted/30">
                                    <div className="aspect-video w-full flex flex-col items-center justify-center text-muted-foreground">
                                        <Box className="h-12 w-12 mb-3 opacity-30" />
                                        <p>Visualización no disponible</p>
                                        <p className="text-sm text-muted-foreground/70 mt-2">
                                            La visualización estará disponible cuando un administrador procese y apruebe tu presentación.
                                        </p>
                                    </div>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="files" className="mt-4 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Subir Material</CardTitle>
                                    <CardDescription>
                                        Sube videos, imágenes (ZIP) o archivos Gaussian (.sog, .splat, .ply)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {canUpload ? (
                                        <>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".mp4,.mov,.avi,.zip,.sog,.splat,.ply"
                                                onChange={handleFileSelect}
                                            />
                                            <div
                                                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {isUploading ? (
                                                    <div className="flex flex-col items-center">
                                                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                                                        <p className="font-medium">Subiendo archivo...</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                                        <p className="font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Videos, ZIP de imágenes (min. 20 fotos), o archivos .sog/.splat/.ply
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {uploadError && (
                                                <p className="text-sm text-red-500 mt-2 text-center">{uploadError}</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="border-2 border-dashed border-muted bg-muted/50 rounded-lg p-8 text-center">
                                            <div className="flex flex-col items-center">
                                                <Lock className="h-10 w-10 text-muted-foreground mb-2" />
                                                <p className="font-medium text-muted-foreground">La subida de archivos está bloqueada</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Solo puedes subir archivos cuando la presentación está en estado "Borrador" o "Rechazado".
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Archivos Subidos</CardTitle>
                                    <CardDescription>
                                        Tus archivos cargados
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {userFiles.length > 0 ? (
                                        <div className="space-y-3">
                                            {userFiles.map((file) => {
                                                const FileIcon = getFileIcon(file.name, file.uploadType);

                                                return (
                                                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                                                <FileIcon className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium">{file.name}</p>
                                                                    <Badge variant="outline" className="text-xs text-muted-foreground">Original</Badge>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button size="sm" variant="outline" onClick={() => handleDownload(file.fileKey)}>
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">
                                            No has subido archivos aún
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Creado por</p>
                                <p className="font-medium">{presentation.createdBy?.name || "Desconocido"}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground">Fecha de creación</p>
                                <p className="font-medium">
                                    {new Date(presentation.createdAt).toLocaleDateString("es-AR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                            {presentation.address && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Ubicación</p>
                                        <p className="font-medium">{presentation.address}</p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
