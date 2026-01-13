import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { UserTable } from "~/components/users/user-table";

export default async function UsersPage() {
    const session = await getSession();

    // Extra check: only superadmin can access
    if (session?.user.role !== "superadmin") {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    Gestión de Usuarios
                </h1>
                <p className="text-slate-400">
                    Administra roles y permisos de usuarios
                </p>
            </div>

            {/* User table */}
            <UserTable />
        </div>
    );
}
