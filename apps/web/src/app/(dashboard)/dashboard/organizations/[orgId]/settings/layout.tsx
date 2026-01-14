"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    CreditCard,
    Settings,
    Users,
} from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Separator } from "@acme/ui/separator";

import { authClient } from "~/auth/client";

type Organization = {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
};

const settingsNav = [
    { name: "General", href: "", icon: Settings },
    { name: "Miembros", href: "/members", icon: Users },
    { name: "Suscripción", href: "/subscription", icon: CreditCard },
];

export default function OrgSettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const orgId = params.orgId as string;
    const [org, setOrg] = useState<Organization | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAccess();
    }, [orgId]);

    const checkAccess = async () => {
        try {
            // Set org as active to get full access
            await authClient.organization.setActive({
                organizationId: orgId,
            });

            // Get org details
            const orgsResult = await authClient.organization.list();
            if (orgsResult.data) {
                const found = orgsResult.data.find((o) => o.id === orgId);
                setOrg(found || null);
            }

            // Check if user is owner
            const session = await authClient.getSession();
            const memberResult = await authClient.organization.getActiveMember();

            if (memberResult.data?.role === "owner") {
                setIsOwner(true);
            } else {
                // Redirect if not owner
                router.push(`/dashboard/organizations/${orgId}`);
            }
        } catch (error) {
            console.error("Error checking access:", error);
            router.push("/dashboard/organizations");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!isOwner) {
        return null;
    }

    const basePath = `/dashboard/organizations/${orgId}/settings`;

    return (
        <div className="space-y-6">
            {/* Back button */}
            <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/organizations/${orgId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a {org?.name || "Organización"}
                </Link>
            </Button>

            {/* Header */}
            <div className="flex items-center gap-4">
                {org?.logo ? (
                    <img
                        src={org.logo}
                        alt={org.name}
                        className="h-12 w-12 rounded-xl object-cover"
                    />
                ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-6 w-6" />
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Configuración de {org?.name}
                    </h1>
                    <p className="text-muted-foreground">
                        Administra tu organización
                    </p>
                </div>
            </div>

            <Separator />

            {/* Settings layout */}
            <div className="flex flex-col gap-8 lg:flex-row">
                {/* Sidebar nav */}
                <nav className="lg:w-48">
                    <ul className="flex flex-row gap-2 lg:flex-col">
                        {settingsNav.map((item) => {
                            const href = `${basePath}${item.href}`;
                            const isActive =
                                item.href === ""
                                    ? pathname === basePath
                                    : pathname.startsWith(href);

                            return (
                                <li key={item.name}>
                                    <Link
                                        href={href}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Content */}
                <div className="flex-1">{children}</div>
            </div>
        </div>
    );
}
