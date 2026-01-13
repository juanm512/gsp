"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { authClient } from "~/auth/client";

type InvitationStatus = "loading" | "pending" | "accepted" | "rejected" | "error" | "expired";

export default function InvitationPage() {
    const params = useParams();
    const router = useRouter();
    const invitationId = params.id as string;

    const [status, setStatus] = useState<InvitationStatus>("loading");
    const [invitation, setInvitation] = useState<{
        organizationName?: string;
        inviterName?: string;
        role?: string;
    }>({});
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        checkInvitation();
    }, [invitationId]);

    const checkInvitation = async () => {
        try {
            // Check if user is logged in
            const session = await authClient.getSession();
            if (!session.data) {
                // Redirect to login with return URL
                router.push(`/login?redirect=/invitations/${invitationId}`);
                return;
            }

            // For now, we'll show pending status
            // In a real implementation, you'd fetch invitation details from an API
            setStatus("pending");
            setInvitation({
                organizationName: "Organización",
                inviterName: "Usuario",
                role: "miembro",
            });
        } catch {
            setStatus("error");
            setError("Error al cargar la invitación");
        }
    };

    const handleAccept = async () => {
        setIsProcessing(true);
        try {
            const result = await authClient.organization.acceptInvitation({
                invitationId,
            });

            if (result.error) {
                setError(result.error.message ?? "Error al aceptar la invitación");
                setStatus("error");
                return;
            }

            setStatus("accepted");
        } catch {
            setError("Error al aceptar la invitación");
            setStatus("error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        setIsProcessing(true);
        try {
            const result = await authClient.organization.rejectInvitation({
                invitationId,
            });

            if (result.error) {
                setError(result.error.message ?? "Error al rechazar la invitación");
                setStatus("error");
                return;
            }

            setStatus("rejected");
        } catch {
            setError("Error al rechazar la invitación");
            setStatus("error");
        } finally {
            setIsProcessing(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Cargando invitación...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === "accepted") {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl">¡Invitación Aceptada!</CardTitle>
                        <CardDescription>
                            Te has unido a {invitation.organizationName} exitosamente
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => router.push("/")} className="w-full">
                            Ir al Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (status === "rejected") {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Invitación Rechazada</CardTitle>
                        <CardDescription>
                            Has rechazado la invitación a {invitation.organizationName}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => router.push("/")} variant="outline" className="w-full">
                            Ir al Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (status === "error" || status === "expired") {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-2xl">
                            {status === "expired" ? "Invitación Expirada" : "Error"}
                        </CardTitle>
                        <CardDescription>
                            {error || "La invitación no es válida o ha expirado"}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => router.push("/")} variant="outline" className="w-full">
                            Ir al Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Invitación a Organización</CardTitle>
                    <CardDescription>
                        {invitation.inviterName} te ha invitado a unirte a{" "}
                        <strong>{invitation.organizationName}</strong> como{" "}
                        <strong>{invitation.role}</strong>
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={handleReject}
                        disabled={isProcessing}
                        className="flex-1"
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Rechazar"
                        )}
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="flex-1"
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Aceptar"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
