import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@acme/ui/button";

import { OrgList } from "~/components/organizations/org-list";

export default function OrganizationsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Organizaciones</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus organizaciones y sus miembros
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/organizations/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Organización
                    </Link>
                </Button>
            </div>

            {/* Organization list */}
            <OrgList />
        </div>
    );
}
