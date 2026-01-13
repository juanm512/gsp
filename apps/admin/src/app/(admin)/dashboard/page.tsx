import { ClipboardList, FolderKanban, Users, Zap } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    Dashboard
                </h1>
                <p className="text-slate-400">
                    Resumen de actividad y tareas pendientes
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-800 bg-slate-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">
                            Tareas Pendientes
                        </CardTitle>
                        <ClipboardList className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-slate-500">En cola de procesamiento</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">
                            Procesando
                        </CardTitle>
                        <Zap className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-slate-500">Tareas en progreso</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">
                            Presentaciones
                        </CardTitle>
                        <FolderKanban className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-slate-500">Total en el sistema</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">
                            Usuarios
                        </CardTitle>
                        <Users className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-slate-500">Registrados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-800 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-white">Tareas Recientes</CardTitle>
                        <CardDescription className="text-slate-400">
                            Últimas tareas de procesamiento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8">
                            <ClipboardList className="h-12 w-12 text-slate-600" />
                            <p className="mt-4 text-sm text-slate-500">
                                No hay tareas recientes
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-white">Actividad del Sistema</CardTitle>
                        <CardDescription className="text-slate-400">
                            Eventos recientes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8">
                            <Zap className="h-12 w-12 text-slate-600" />
                            <p className="mt-4 text-sm text-slate-500">
                                Sin actividad reciente
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
