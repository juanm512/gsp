"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { Button } from "@acme/ui/button";

import { authClient } from "~/auth/client";
import { OrgCard } from "./org-card";

type Organization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    createdAt?: Date;
};

export function OrgList() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            const result = await authClient.organization.list();
            if (result.data) {
                setOrganizations(result.data);
            }
        } catch (error) {
            console.error("Error loading organizations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-48 animate-pulse rounded-xl border bg-slate-100 dark:bg-slate-800"
                    />
                ))}
            </div>
        );
    }

    if (organizations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No tienes organizaciones</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Crea tu primera organización para empezar a gestionar tus
                    presentaciones.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard/organizations/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Organización
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
                <OrgCard key={org.id} org={org} />
            ))}
        </div>
    );
}
