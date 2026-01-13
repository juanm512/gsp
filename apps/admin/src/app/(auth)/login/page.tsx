import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { AdminLoginForm } from "~/components/auth/admin-login-form";

export default function AdminLoginPage() {
    return (
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Panel de Administración</CardTitle>
                <CardDescription className="text-slate-400">
                    Acceso exclusivo para administradores
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AdminLoginForm />
            </CardContent>
        </Card>
    );
}
