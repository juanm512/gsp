import Link from "next/link";
import { ArrowRight, Building2, FolderKanban, Plus, Users } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { getSession } from "~/auth/server";
import { OrgList } from "~/components/organizations/org-list";

export default async function DashboardPage() {
    const session = await getSession();
    const user = session?.user;

    return (
        <div className="space-y-8">
            {/* Welcome section */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    ¡Hola, {user?.name?.split(" ")[0] || "Usuario"}!
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Bienvenido a tu panel de control de GSP
                </p>
            </div>

            {/* Quick actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/organizations/new">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Nueva Organización</CardTitle>
                                <CardDescription>Crea un nuevo espacio de trabajo</CardDescription>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/organizations">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Mis Organizaciones</CardTitle>
                                <CardDescription>Gestiona tus organizaciones</CardDescription>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="group cursor-pointer opacity-50">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                            <FolderKanban className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Presentaciones</CardTitle>
                            <CardDescription>Próximamente</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Organizations section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Tus Organizaciones
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Organizaciones a las que perteneces
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/organizations">
                            Ver todas
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <OrgList />
            </div>
        </div>
    );
}
