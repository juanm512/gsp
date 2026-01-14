import Link from "next/link";
import { ArrowRight, Building2, ChevronRight, Users } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

interface OrgCardProps {
    org: {
        id: string;
        name: string;
        slug: string;
        logo?: string | null;
        createdAt?: Date;
        metadata?: {
            memberCount?: number;
        };
    };
}

export function OrgCard({ org }: OrgCardProps) {
    return (
        <Card className="group transition-shadow hover:shadow-md">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {org.logo ? (
                            <img
                                src={org.logo}
                                alt={org.name}
                                className="h-10 w-10 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Building2 className="h-5 w-5" />
                            </div>
                        )}
                        <div>
                            <CardTitle className="text-lg">{org.name}</CardTitle>
                            <CardDescription className="text-xs">
                                /{org.slug}
                            </CardDescription>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{org.metadata?.memberCount || 1} miembro(s)</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href={`/dashboard/organizations/${org.id}`}>
                        Ver detalles
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
