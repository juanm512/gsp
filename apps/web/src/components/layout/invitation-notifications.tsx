"use client";

import { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

type Invitation = {
    id: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    organizationLogo: string | null;
    role: string | null;
    status: string;
    expiresAt: Date;
    createdAt: Date;
};

export function InvitationNotifications() {
    const trpc = useTRPC();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Use tRPC to get pending invitations for the current user
    const { data, refetch, isLoading } = useQuery(
        trpc.organization.getMyPendingInvitations.queryOptions()
    );

    const invitations: Invitation[] = (data ?? []) as Invitation[];

    const handleAccept = async (invitationId: string) => {
        setActionLoading(invitationId);
        try {
            await authClient.organization.acceptInvitation({
                invitationId,
            });
            // Refetch invitations
            refetch();
        } catch (error) {
            console.error("Error accepting invitation:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (invitationId: string) => {
        setActionLoading(invitationId);
        try {
            await authClient.organization.rejectInvitation({
                invitationId,
            });
            // Refetch invitations
            refetch();
        } catch (error) {
            console.error("Error rejecting invitation:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const hasInvitations = invitations.length > 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "relative",
                        hasInvitations && "text-primary"
                    )}
                >
                    <Bell className={cn(
                        "h-5 w-5",
                        hasInvitations && "animate-pulse"
                    )} />
                    {hasInvitations && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {invitations.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="p-2">
                    <h3 className="font-semibold text-sm px-2 py-1">
                        Invitaciones Pendientes
                    </h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                ) : invitations.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No tienes invitaciones pendientes
                    </div>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="mx-2 mb-2 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-3"
                            >
                                <div className="flex items-start gap-3">
                                    {invitation.organizationLogo ? (
                                        <img
                                            src={invitation.organizationLogo}
                                            alt={invitation.organizationName}
                                            className="h-10 w-10 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg font-bold">
                                            {invitation.organizationName?.charAt(0) || "O"}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {invitation.organizationName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Rol: {invitation.role === "admin" ? "Administrador" : "Miembro"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleAccept(invitation.id)}
                                        disabled={actionLoading === invitation.id}
                                    >
                                        <Check className="mr-1 h-4 w-4" />
                                        Aceptar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleReject(invitation.id)}
                                        disabled={actionLoading === invitation.id}
                                    >
                                        <X className="mr-1 h-4 w-4" />
                                        Rechazar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
