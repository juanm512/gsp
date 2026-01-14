"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    FolderKanban,
    Plus,
    Settings,
    Users,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { authClient } from "~/auth/client";

type Organization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    createdAt?: Date;
};

export default function OrganizationDetailPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    const [org, setOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrganization();
    }, [orgId]);

    const loadOrganization = async () => {
        try {
            // Set this org as active to get its details
            await authClient.organization.setActive({
                organizationId: orgId,
            });

            const result = await authClient.organization.list();
            if (result.data) {
                const found = result.data.find((o) => o.id === orgId);
                setOrg(found || null);
            }
        } catch (error) {
            console.error("Error loading organization:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="space-y-6">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard/organizations">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Organizaciones
                    </Link>
                </Button>
                <Card>
                    <CardContent className="py-16 text-center">
                        <p className="text-muted-foreground">Organización no encontrada</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back button */}
            <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/organizations">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Organizaciones
                </Link>
            </Button>

            {/* Org header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {org.logo ? (
                        <img
                            src={org.logo}
                            alt={org.name}
                            className="h-16 w-16 rounded-xl object-cover"
                        />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Building2 className="h-8 w-8" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
                        <p className="text-muted-foreground">/{org.slug}</p>
                    </div>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/organizations/${orgId}/settings`}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración
                    </Link>
                </Button>
            </div>

            {/* Quick actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="group cursor-pointer opacity-50">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FolderKanban className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Presentaciones</CardTitle>
                            <CardDescription>Próximamente</CardDescription>
                        </div>
                    </CardHeader>
                </Card>

                <Link href={`/dashboard/organizations/${orgId}/settings/members`}>
                    <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Miembros</CardTitle>
                                <CardDescription>Gestionar equipo</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href={`/dashboard/organizations/${orgId}/settings/members`}>
                    <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Invitar</CardTitle>
                                <CardDescription>Añadir miembros</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

            {/* Presentations section placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Presentaciones</CardTitle>
                    <CardDescription>
                        Las presentaciones de esta organización aparecerán aquí
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
                        <FolderKanban className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-sm text-muted-foreground">
                            No hay presentaciones todavía
                        </p>
                        <Button className="mt-4" disabled>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Presentación
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
