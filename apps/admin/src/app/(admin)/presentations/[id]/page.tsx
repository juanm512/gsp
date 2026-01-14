"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import {
    ArrowLeft,
    Loader2,
    Download,
    Upload,
    Hand,
    User,
    Building2,
    File as FileIconLucide,
    FileVideo,
    Image as ImageIcon,
    Box,
    Clock,
    CheckCircle,
    AlertCircle,
    Star,
    XCircle,
    Eye,
    Maximize2,
    XSquareIcon,
    MoreVertical,
    Trash,
    X,
    StarOff,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card";
import { Badge } from "@acme/ui/badge";
import { Separator } from "@acme/ui/separator";
import { Textarea } from "@acme/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@acme/ui/dialog";
import { Label } from "@acme/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@acme/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";

const statusConfig = {
    draft: { label: "Borrador", color: "bg-slate-500", icon: Clock },
    pending_review: { label: "Pendiente", color: "bg-yellow-500", icon: Clock },
    rejected: { label: "Rechazado", color: "bg-red-500", icon: XCircle },
    approved: { label: "Aprobado", color: "bg-blue-500", icon: CheckCircle },
    processing: { label: "Procesando", color: "bg-purple-500", icon: Loader2 },
    completed: { label: "Completado", color: "bg-green-500", icon: CheckCircle },
    failed: { label: "Fallido", color: "bg-red-500", icon: AlertCircle },
};

const processedFileTypes = [
    { value: "extracted_frames", label: "Frames extraídos (ZIP)" },
    { value: "colmap_data", label: "Datos COLMAP" },
    { value: "ply_raw", label: "PLY sin optimizar" },
    { value: "ply_optimized", label: "PLY optimizado" },
    { value: "splat_file", label: "Archivo .splat" },
    { value: "sog_final", label: "SOG final" },
];

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
        return ImageIcon;
    }
    if (isViewableFile(lower) || type === "gaussian_file") {
        return Box;
    }
    return FileIconLucide;
}

export default function AdminPresentationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const presentationId = params.id as string;
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusReason, setStatusReason] = useState("");
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [selectedFileType, setSelectedFileType] = useState("ply_raw");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);

    const { data: presentation, isLoading } = useQuery(
        trpc.presentation.adminGetById.queryOptions({ presentationId })
    );

    const claimMutation = useMutation(
        trpc.presentation.adminClaim.mutationOptions({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [["presentation"]] }),
        })
    );

    const unclaimMutation = useMutation(
        trpc.presentation.adminUnclaim.mutationOptions({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [["presentation"]] }),
        })
    );

    const updateStatusMutation = useMutation(
        trpc.presentation.adminUpdateStatus.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [["presentation"]] });
                setStatusDialogOpen(false);
                setStatusReason("");
                setPendingStatus(null);
            },
        })
    );

    const setActiveMutation = useMutation(
        trpc.presentation.adminSetActiveFile.mutationOptions({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [["presentation"]] }),
        })
    );

    const initiateUploadMutation = useMutation(
        trpc.presentation.adminInitiateProcessedFileUpload.mutationOptions()
    );

    const confirmUploadMutation = useMutation(
        trpc.presentation.adminConfirmProcessedFileUpload.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [["presentation"]] });
                setIsUploading(false);
                setSelectedFile(null);
            },
        })
    );

    const deleteProcessedFileMutation = useMutation(
        trpc.presentation.adminDeleteProcessedFile.mutationOptions({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [["presentation"]] }),
        })
    );

    const downloadMutation = useMutation(
        trpc.presentation.adminGetDownloadUrl.mutationOptions()
    );

    const handleDownload = async (fileKey: string) => {
        const result = await downloadMutation.mutateAsync({ fileKey });
        window.open(result.url, "_blank");
    };

    const handlePreview = async (file: any) => {
        const result = await downloadMutation.mutateAsync({ fileKey: file.fileKey });

        let type = "unknown";
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(".mp4") || lowerName.endsWith(".mov") || lowerName.endsWith(".avi")) type = "video";
        else if (lowerName.endsWith(".zip")) type = "zip";
        else if (isViewableFile(lowerName)) type = "gs";

        setPreviewFile({
            url: result.url,
            type,
            name: file.name
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUploadStart = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            const initResult = await initiateUploadMutation.mutateAsync({
                presentationId,
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFileType as any,
            });

            const uploadResponse = await fetch(initResult.presignedUrl, {
                method: "PUT",
                body: selectedFile,
                headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
            });

            if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.statusText}`);

            await confirmUploadMutation.mutateAsync({
                presentationId,
                fileType: selectedFileType as any,
                fileKey: initResult.fileKey,
                fileSize: selectedFile.size,
                originalName: selectedFile.name,
            });
        } catch (error) {
            console.error("Upload error:", error);
            setIsUploading(false);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === "rejected" || newStatus === "failed") {
            setPendingStatus(newStatus);
            setStatusDialogOpen(true);
        } else {
            updateStatusMutation.mutate({ presentationId, status: newStatus as any });
        }
    };

    const handleStatusConfirm = () => {
        if (!pendingStatus) return;

        const payload: any = { presentationId, status: pendingStatus as any };
        if (pendingStatus === "rejected") payload.rejectionReason = statusReason;
        if (pendingStatus === "failed") payload.failedReason = statusReason;

        updateStatusMutation.mutate(payload);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!presentation) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-white">Presentación no encontrada</h2>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/presentations")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>
        );
    }

    const status = statusConfig[presentation.status as keyof typeof statusConfig];
    const StatusIcon = status?.icon || Clock;

    const allFiles = [
        ...(presentation.uploads || []).map((u: any) => ({
            id: u.id,
            name: u.originalName,
            fileKey: u.fileKey,
            fileSize: u.fileSize,
            type: "upload" as const,
            uploadType: u.type,
            createdAt: u.createdAt,
        })),
        ...(presentation.processedFiles || []).map((f: any) => ({
            id: f.id,
            name: f.originalName || f.type,
            fileKey: f.fileKey,
            fileSize: f.fileSize,
            type: "processed" as const,
            processedType: f.type,
            uploadedBy: f.uploadedBy,
            createdAt: f.createdAt,
        })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="border-slate-700" onClick={() => router.push("/presentations")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">{presentation.title}</h1>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Building2 className="h-4 w-4" />
                        {presentation.organization?.name}
                        <span>•</span>
                        <User className="h-4 w-4" />
                        {presentation.createdBy?.name}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={presentation.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className={`w-[180px] ${status?.color} border-none text-white font-medium`}>
                            <div className="flex items-center">
                                <StatusIcon className="mr-2 h-4 w-4" />
                                <SelectValue>{status?.label}</SelectValue>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center">
                                            <Icon className="mr-2 h-4 w-4" />
                                            {config.label}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Tabs defaultValue="files" className="w-full">
                        <TabsList className="bg-slate-800 border-slate-700">
                            <TabsTrigger value="files">Archivos</TabsTrigger>
                            <TabsTrigger value="visualizer">Visualizador</TabsTrigger>
                        </TabsList>

                        <TabsContent value="visualizer" className="mt-4">
                            {presentation.activeFileKey ? (
                                <Card className="border-slate-800 bg-slate-900 border-2 border-dashed border-slate-700 overflow-hidden relative group">
                                    <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                                        <Box className="h-16 w-16 mb-4 opacity-50" />
                                        <p className="font-medium text-lg">Visualizador 3D</p>
                                        <p className="text-sm opacity-70">Mostrando: {presentation.activeFileKey.split('/').pop()}</p>
                                    </div>
                                </Card>
                            ) : (
                                <Card className="border-slate-800 bg-slate-900 border-2 border-dashed border-slate-700">
                                    <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-500">
                                        <Box className="h-12 w-12 mb-3 opacity-30" />
                                        <p>No hay archivo activo seleccionado</p>
                                        <p className="text-sm text-slate-500 mt-2 text-center px-4">
                                            Marca un archivo procesado como activo en la pestaña "Archivos" para verlo aquí.
                                        </p>
                                    </div>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="files" className="mt-4 space-y-6">
                            <Card className="border-slate-800 bg-slate-800/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Archivos</CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Todos los archivos de esta presentación
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {allFiles.length > 0 ? (
                                        <div className="space-y-3">
                                            {allFiles.map((file) => {
                                                const uploadType = file.type === "upload" ? file.uploadType : file.processedType;
                                                const FileIcon = getFileIcon(file.name, uploadType);
                                                const canSetActive = isViewableFile(file.name);
                                                const isActive = file.fileKey === presentation.activeFileKey;

                                                return (
                                                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                                                <FileIcon className="h-5 w-5 text-slate-400" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-white">{file.name}</p>
                                                                    {file.type === "upload" && (
                                                                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                                            Usuario
                                                                        </Badge>
                                                                    )}
                                                                    {file.type === "processed" && (
                                                                        <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">
                                                                            Procesado
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-slate-400">
                                                                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isActive && (
                                                                <div className="flex items-center gap-1">
                                                                    <Badge variant="default" className="bg-green-600">
                                                                        <Eye className="mr-1 h-3 w-3" />
                                                                        Visualizando
                                                                    </Badge>

                                                                </div>
                                                            )}

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700">
                                                                        <span className="sr-only">Abrir menú</span>
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator className="bg-slate-700" />

                                                                    <DropdownMenuItem className="focus:bg-slate-800" onClick={() => handlePreview(file)}>
                                                                        <Maximize2 className="mr-2 h-4 w-4" />
                                                                        <span>Vista Previa</span>
                                                                    </DropdownMenuItem>

                                                                    <DropdownMenuItem className="focus:bg-slate-800" onClick={() => handleDownload(file.fileKey)}>
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        <span>Descargar</span>
                                                                    </DropdownMenuItem>

                                                                    {canSetActive && !isActive && (
                                                                        <DropdownMenuItem
                                                                            className="focus:bg-slate-800 text-green-400 group"
                                                                            onClick={() => setActiveMutation.mutate({ presentationId, fileKey: file.fileKey })}
                                                                        >
                                                                            <Star className="mr-2 h-4 w-4 group-hover:fill-green-400" />
                                                                            <span>Establecer como Visualización</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {isActive && (
                                                                        <DropdownMenuItem
                                                                            className="focus:bg-slate-800 text-green-400 group"
                                                                            onClick={() => setActiveMutation.mutate({ presentationId, fileKey: null as any })}
                                                                        >
                                                                            <StarOff className="mr-2 h-4 w-4 group-hover:fill-green-400" />
                                                                            <span>Desactivar Visualización</span>
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {file.type === "processed" && (
                                                                        <>
                                                                            <DropdownMenuSeparator className="bg-slate-700" />
                                                                            <DropdownMenuItem
                                                                                className="focus:bg-red-900/20 text-red-400 hover:text-red-300"
                                                                                onClick={() => deleteProcessedFileMutation.mutate({ processedFileId: file.id })}
                                                                            >
                                                                                <Trash className="mr-2 h-4 w-4" />
                                                                                <span>Eliminar Archivo</span>
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-center text-slate-500 py-8">No hay archivos</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-slate-800 bg-slate-800/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Subir Archivo Procesado</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".zip,.ply,.splat,.sog"
                                        onChange={handleFileSelect}
                                    />
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-white">Tipo de archivo</Label>
                                            <select
                                                value={selectedFileType}
                                                onChange={(e) => setSelectedFileType(e.target.value)}
                                                className="w-full p-2 rounded border border-slate-700 bg-slate-900 text-white"
                                            >
                                                {processedFileTypes.map((t) => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div
                                            className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="flex flex-col items-center">
                                                <Upload className="h-8 w-8 text-slate-500 mb-2" />
                                                {selectedFile ? (
                                                    <p className="text-white font-medium">{selectedFile.name}</p>
                                                ) : (
                                                    <p className="text-slate-300">Click para seleccionar archivo</p>
                                                )}
                                                <p className="text-sm text-slate-500 mt-1">.zip, .ply, .splat, .sog</p>
                                            </div>
                                        </div>

                                        {selectedFile && (
                                            <Button
                                                className="w-full"
                                                onClick={handleUploadStart}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Subiendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="mr-2 h-4 w-4" />
                                                        Subir Archivo
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card className="border-slate-800 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Asignación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!presentation.assignedTo ? (
                                <div className="text-center">
                                    <p className="text-slate-400 mb-4">Esta presentación no tiene admin asignado.</p>
                                    <Button className="w-full" onClick={() => claimMutation.mutate({ presentationId })} disabled={claimMutation.isPending}>
                                        <Hand className="mr-2 h-4 w-4" />
                                        Tomar Tarea
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Asignado a</p>
                                            <p className="text-white font-medium text-lg">{presentation.assignedTo.name}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full border-slate-600" onClick={() => unclaimMutation.mutate({ presentationId })}>
                                        <XSquareIcon className="mr-2 h-4 w-4" />
                                        Liberar Tarea
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Detalles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <p className="text-slate-500">Creador</p>
                                <p className="text-white">{presentation.createdBy?.name}</p>
                                <p className="text-slate-400 text-xs">{presentation.createdBy?.email}</p>
                            </div>
                            <Separator className="bg-slate-700" />
                            <div>
                                <p className="text-slate-500">Creado</p>
                                <p className="text-white">{new Date(presentation.createdAt).toLocaleDateString("es-AR")}</p>
                            </div>
                            {presentation.rejectionReason && (
                                <>
                                    <Separator className="bg-slate-700" />
                                    <div>
                                        <p className="text-red-400">Motivo de rechazo</p>
                                        <p className="text-white">{presentation.rejectionReason}</p>
                                    </div>
                                </>
                            )}
                            {presentation.failedReason && (
                                <>
                                    <Separator className="bg-slate-700" />
                                    <div>
                                        <p className="text-red-400">Motivo de fallo</p>
                                        <p className="text-white">{presentation.failedReason}</p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {pendingStatus === "rejected" ? "Rechazar Presentación" : "Reportar Fallo"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {pendingStatus === "rejected"
                                ? "Indica el motivo para que el usuario pueda corregirlo."
                                : "Describe el error técnico ocurrido durante el procesamiento."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-white">Motivo / Error</Label>
                            <Textarea
                                placeholder="Describe el motivo..."
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                className="border-slate-700 bg-slate-800 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={handleStatusConfirm}
                            disabled={!statusReason || updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 max-w-5xl h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800">
                        <DialogTitle className="text-white flex items-center gap-2">
                            {previewFile?.name}
                            <Badge variant="outline" className="ml-2 text-slate-400 bg-slate-950">
                                {previewFile?.type === 'video' ? 'Video Player' :
                                    previewFile?.type === 'zip' ? 'Image Viewer' :
                                        previewFile?.type === 'gs' ? '3D Viewer' : 'Preview'}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden bg-black flex items-center justify-center relative">
                        {previewFile?.type === 'video' && (
                            <video
                                src={previewFile.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-full"
                            />
                        )}
                        {previewFile?.type === 'zip' && (
                            <div className="text-center text-slate-500">
                                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Visualizador de Imágenes</p>
                                <p className="text-sm">ZIP extraído y carrousel a implementar</p>
                            </div>
                        )}
                        {previewFile?.type === 'gs' && (
                            <div className="text-center text-slate-500">
                                <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Visualizador Gaussian Splatting</p>
                                <p className="text-sm">Implementación pendiente</p>
                            </div>
                        )}
                        {previewFile?.type === 'unknown' && (
                            <div className="text-center text-slate-500">
                                <FileIconLucide className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p>Vista previa no disponible para este tipo de archivo</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
