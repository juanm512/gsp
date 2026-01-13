import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
                <CardDescription>
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ForgotPasswordForm />
            </CardContent>
        </Card>
    );
}
