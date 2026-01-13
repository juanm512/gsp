import { Separator } from "@acme/ui/separator";

import { getSession } from "~/auth/server";
import { ProfileForm } from "~/components/settings/profile-form";
import { PasswordForm } from "~/components/settings/password-form";
import { DangerZone } from "~/components/settings/danger-zone";

export default async function SettingsPage() {
    const session = await getSession();
    const user = session?.user;

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground">
                    Administra tu cuenta y preferencias
                </p>
            </div>

            {/* Profile section */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Perfil</h2>
                    <p className="text-sm text-muted-foreground">
                        Actualiza tu información personal
                    </p>
                </div>
                <ProfileForm
                    user={{
                        id: user?.id ?? "",
                        name: user?.name ?? "",
                        email: user?.email ?? "",
                        image: user?.image,
                    }}
                />
            </section>

            <Separator />

            {/* Password section */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Contraseña</h2>
                    <p className="text-sm text-muted-foreground">
                        Cambia tu contraseña de acceso
                    </p>
                </div>
                <PasswordForm />
            </section>

            <Separator />

            {/* Danger zone */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                        Zona de Peligro
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Acciones irreversibles de tu cuenta
                    </p>
                </div>
                <DangerZone />
            </section>
        </div>
    );
}
