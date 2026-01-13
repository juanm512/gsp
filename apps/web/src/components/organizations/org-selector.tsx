"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@acme/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";

import { authClient } from "~/auth/client";

type Organization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
};

export function OrgSelector() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            const result = await authClient.organization.list();
            if (result.data) {
                setOrganizations(result.data);
                // Get active organization from session
                const session = await authClient.getSession();
                if (session.data?.session?.activeOrganizationId) {
                    const active = result.data.find(
                        (org) => org.id === session.data?.session?.activeOrganizationId
                    );
                    setActiveOrg(active || null);
                }
            }
        } catch (error) {
            console.error("Error loading organizations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectOrg = async (org: Organization) => {
        try {
            await authClient.organization.setActive({
                organizationId: org.id,
            });
            setActiveOrg(org);
            // Refresh the page to update context
            window.location.reload();
        } catch (error) {
            console.error("Error setting active organization:", error);
        }
    };

    if (isLoading) {
        return (
            <Button variant="ghost" className="gap-2" disabled>
                <Building2 className="h-4 w-4" />
                <span className="max-w-[150px] truncate">Cargando...</span>
            </Button>
        );
    }

    if (organizations.length === 0) {
        return (
            <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/organizations/new">
                    <Plus className="h-4 w-4" />
                    Crear Organización
                </Link>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">
                        {activeOrg?.name || "Seleccionar organización"}
                    </span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleSelectOrg(org)}
                        className="flex items-center justify-between"
                    >
                        <span className="truncate">{org.name}</span>
                        {activeOrg?.id === org.id && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/organizations" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Ver todas
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/organizations/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Crear nueva
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
