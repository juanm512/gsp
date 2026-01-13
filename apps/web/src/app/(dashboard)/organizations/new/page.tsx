import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { CreateOrgForm } from "~/components/organizations/create-org-form";

export default function NewOrganizationPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Back button */}
            <Button asChild variant="ghost" size="sm">
                <Link href="/organizations">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Organizaciones
                </Link>
            </Button>

            {/* Form card */}
            <Card>
                <CardHeader>
                    <CardTitle>Crear Nueva Organización</CardTitle>
                    <CardDescription>
                        Las organizaciones te permiten gestionar proyectos y colaboradores
                        en un espacio compartido.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateOrgForm />
                </CardContent>
            </Card>
        </div>
    );
}
