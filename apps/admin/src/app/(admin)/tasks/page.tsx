import { ClipboardList, Plus, Search } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import { Input } from "@acme/ui/input";

export default function TasksPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Tareas de Procesamiento
                    </h1>
                    <p className="text-slate-400">
                        Cola de tareas pendientes y en progreso
                    </p>
                </div>
                <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Tarea
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                        placeholder="Buscar tareas..."
                        className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
                    />
                </div>
                <select className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="processing">Procesando</option>
                    <option value="completed">Completado</option>
                    <option value="failed">Fallido</option>
                </select>
            </div>

            {/* Task tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
                <Button variant="ghost" className="text-primary">
                    Pendientes (0)
                </Button>
                <Button variant="ghost" className="text-slate-400">
                    Procesando (0)
                </Button>
                <Button variant="ghost" className="text-slate-400">
                    Completadas (0)
                </Button>
                <Button variant="ghost" className="text-slate-400">
                    Fallidas (0)
                </Button>
            </div>

            {/* Empty state */}
            <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                        <ClipboardList className="h-8 w-8 text-slate-500" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-white">
                        No hay tareas pendientes
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Las tareas de procesamiento aparecerán aquí cuando los usuarios suban contenido
                    </p>
                </CardContent>
            </Card>

            {/* Info card */}
            <Card className="border-blue-900/50 bg-blue-950/20">
                <CardHeader>
                    <CardTitle className="text-blue-400">Panel de Tareas</CardTitle>
                    <CardDescription className="text-blue-300/70">
                        Este panel mostrará las tareas de procesamiento de presentaciones 3D.
                        Cada tarea incluye: descarga de archivos, procesamiento COLMAP,
                        entrenamiento Gaussian Splatting, y subida de resultados.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
