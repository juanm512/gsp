import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content area */}
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <Header user={session.user} />

                {/* Page content */}
                <main className="flex-1 overflow-auto bg-slate-50 p-6 dark:bg-slate-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
