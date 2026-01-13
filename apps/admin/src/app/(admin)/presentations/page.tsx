import { FolderKanban, Plus, Search } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import { Input } from "@acme/ui/input";

export default function PresentationsPage() {
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
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                        placeholder="Buscar presentaciones..."
                        className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
                    />
                </div>
                <select className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
                    <option value="all">Todos los estados</option>
                    <option value="draft">Borrador</option>
                    <option value="processing">Procesando</option>
                    <option value="published">Publicado</option>
                </select>
            </div>

            {/* Empty state */}
            <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                        <FolderKanban className="h-8 w-8 text-slate-500" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-white">
                        No hay presentaciones
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Las presentaciones creadas por usuarios aparecerán aquí
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
