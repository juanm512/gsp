"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Building2,
    Calendar,
    Loader2,
    MoreHorizontal,
    RefreshCw,
    Search,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import { Input } from "@acme/ui/input";

import { useTRPC } from "~/trpc/react";
import { Badge } from "@acme/ui/badge";

type OrganizationData = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    metadata: string | null;
    plan?: string | null;
};

export function OrganizationsTable() {
    const trpc = useTRPC();
    const [search, setSearch] = useState("");

    const { data, isLoading, refetch } = useQuery(
        trpc.admin.listOrganizations.queryOptions({
            limit: 50,
            search: search || undefined,
        })
    );

    const organizations = (data?.organizations ?? []) as OrganizationData[];

    if (isLoading) {
        return (
            <Card className="border-slate-800 bg-slate-800/50">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-800 bg-slate-800/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-white">Organizaciones</CardTitle>
                        <CardDescription className="text-slate-400">
                            {data?.total ?? 0} organizaciones registradas
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="border-slate-700 text-slate-300"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Actualizar
                    </Button>
                </div>

                <div className="flex gap-4 pt-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar organización..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-slate-700">
                    {organizations.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                            No se encontraron organizaciones
                        </div>
                    ) : (
                        organizations.map((org) => (
                            <div
                                key={org.id}
                                className="flex items-center justify-between py-4"
                            >
                                <div className="flex items-center gap-4">
                                    {org.logo ? (
                                        <img
                                            src={org.logo}
                                            alt={org.name}
                                            className="h-10 w-10 rounded-lg object-cover bg-slate-800"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-slate-400">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-white">{org.name}</p>
                                        <p className="text-sm text-slate-400">/{org.slug}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <Badge
                                        variant={org.plan === "pro" ? "default" : org.plan === "enterprise" ? "secondary" : "outline"}
                                        className={
                                            org.plan === "pro"
                                                ? "bg-violet-600 text-white"
                                                : org.plan === "enterprise"
                                                    ? "bg-amber-600 text-white"
                                                    : "border-slate-600 text-slate-400"
                                        }
                                    >
                                        {org.plan === "pro" ? "Pro" : org.plan === "enterprise" ? "Enterprise" : "Free"}
                                    </Badge>
                                    <div className="flex items-center text-sm text-slate-500">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {new Date(org.createdAt).toLocaleDateString()}
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-400 hover:text-white"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem disabled>
                                                Ver Detalles
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
