"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    Crown,
    Loader2,
    MoreHorizontal,
    Plus,
    Shield,
    Trash2,
    User,
    UserPlus,
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { authClient } from "~/auth/client";

type Member = {
    id: string;
    userId: string;
    role: "owner" | "admin" | "member";
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
};

type Invitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date;
};

const roleLabels: Record<string, { label: string; icon: typeof Crown }> = {
    owner: { label: "Dueño", icon: Crown },
    admin: { label: "Administrador", icon: Shield },
    member: { label: "Miembro", icon: User },
};

export default function OrgMembersPage() {
    const params = useParams();
    const orgId = params.orgId as string;

    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
    const [isInviting, setIsInviting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, [orgId]);

    const loadData = async () => {
        try {
            // Set org as active
            await authClient.organization.setActive({
                organizationId: orgId,
            });

            // Get members
            const membersResult = await authClient.organization.listMembers();
            if (membersResult.data && 'members' in membersResult.data) {
                setMembers(membersResult.data.members as Member[]);
            }

            // Get pending invitations
            const invitationsResult = await authClient.organization.listInvitations();
            if (invitationsResult.data) {
                setInvitations(invitationsResult.data.filter(
                    (inv) => inv.status === "pending"
                ) as Invitation[]);
            }
        } catch (error) {
            console.error("Error loading members:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsInviting(true);

        try {
            const result = await authClient.organization.inviteMember({
                email: inviteEmail,
                role: inviteRole,
            });

            if (result.error) {
                setMessage({ type: "error", text: result.error.message ?? "Error al invitar" });
                return;
            }

            setMessage({ type: "success", text: `Invitación enviada a ${inviteEmail}` });
            setInviteEmail("");
            setShowInviteForm(false);
            loadData();
        } catch {
            setMessage({ type: "error", text: "Error al enviar la invitación" });
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            await authClient.organization.removeMember({
                memberIdOrEmail: memberId,
            });
            loadData();
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        try {
            await authClient.organization.cancelInvitation({
                invitationId,
            });
            loadData();
        } catch (error) {
            console.error("Error canceling invitation:", error);
        }
    };

    const handleUpdateRole = async (memberId: string, role: "admin" | "member") => {
        try {
            await authClient.organization.updateMemberRole({
                memberId,
                role,
            });
            loadData();
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Miembros</h2>
                    <p className="text-sm text-muted-foreground">
                        Gestiona quién tiene acceso a esta organización
                    </p>
                </div>
                <Button onClick={() => setShowInviteForm(!showInviteForm)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invitar
                </Button>
            </div>

            {/* Invite form */}
            {showInviteForm && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Invitar Miembro</CardTitle>
                        <CardDescription>
                            Envía una invitación por email
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="usuario@email.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        disabled={isInviting}
                                    />
                                </div>
                            </div>

                            {message && (
                                <div
                                    className={`rounded-md p-3 text-sm ${message.type === "success"
                                        ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                                        : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                                        }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowInviteForm(false)}
                                    disabled={isInviting}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isInviting || !inviteEmail}>
                                    {isInviting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Enviar Invitación"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Members list */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Miembros Actuales</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {members.map((member) => {
                            const RoleIcon = roleLabels[member.role]?.icon || User;
                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-3">
                                        {member.user.image ? (
                                            <img
                                                src={member.user.image}
                                                alt={member.user.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium">{member.user.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {member.user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                                            <RoleIcon className="h-3 w-3" />
                                            {roleLabels[member.role]?.label || member.role}
                                        </div>

                                        {member.role !== "owner" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Pending invitations */}
            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Invitaciones Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y">
                            {invitations.map((invitation) => (
                                <div
                                    key={invitation.id}
                                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                            <UserPlus className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{invitation.email}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Invitado como {roleLabels[invitation.role]?.label || invitation.role}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCancelInvitation(invitation.id)}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
