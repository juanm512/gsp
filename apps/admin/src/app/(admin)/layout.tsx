import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AdminHeader } from "~/components/layout/header";
import { AdminSidebar } from "~/components/layout/sidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    // Check if user is authenticated
    if (!session) {
        redirect("/login");
    }

    // Check if user has admin role
    const userRole = session.user.role as string;
    if (!["admin", "superadmin"].includes(userRole)) {
        redirect("/login?error=unauthorized");
    }

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar userRole={userRole} />

            {/* Main content area */}
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <AdminHeader user={session.user} />

                {/* Page content */}
                <main className="flex-1 overflow-auto bg-slate-900 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
