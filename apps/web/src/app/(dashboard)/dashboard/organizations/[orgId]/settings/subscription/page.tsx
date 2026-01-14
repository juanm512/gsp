"use client";

import { useParams } from "next/navigation";
import {
    Check,
    CreditCard,
    Loader2,
    Sparkles,
    Zap,
} from "lucide-react";

import { Button } from "@acme/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@acme/ui/card";

const plans = [
    {
        id: "free",
        name: "Gratuito",
        price: "$0",
        period: "/mes",
        description: "Para empezar a explorar",
        features: [
            "1 organización",
            "3 presentaciones",
            "100 MB almacenamiento",
            "Soporte por email",
        ],
        icon: Sparkles,
        current: true,
    },
    {
        id: "pro",
        name: "Profesional",
        price: "$29",
        period: "/mes",
        description: "Para equipos en crecimiento",
        features: [
            "5 organizaciones",
            "Presentaciones ilimitadas",
            "10 GB almacenamiento",
            "Colaboradores ilimitados",
            "Soporte prioritario",
            "Analytics avanzados",
        ],
        icon: Zap,
        popular: true,
    },
    {
        id: "enterprise",
        name: "Empresa",
        price: "Contactar",
        period: "",
        description: "Para grandes organizaciones",
        features: [
            "Organizaciones ilimitadas",
            "Presentaciones ilimitadas",
            "Almacenamiento ilimitado",
            "SSO / SAML",
            "SLA garantizado",
            "Soporte dedicado",
            "On-premise disponible",
        ],
        icon: CreditCard,
    },
];

export default function OrgSubscriptionPage() {
    const params = useParams();
    const orgId = params.orgId as string;

    const currentPlan = plans.find((p) => p.current);

    return (
        <div className="space-y-6">
            {/* Current plan */}
            <Card>
                <CardHeader>
                    <CardTitle>Plan Actual</CardTitle>
                    <CardDescription>
                        Tu organización está en el plan {currentPlan?.name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                {currentPlan && <currentPlan.icon className="h-6 w-6 text-primary" />}
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {currentPlan?.price}
                                    <span className="text-base font-normal text-muted-foreground">
                                        {currentPlan?.period}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {currentPlan?.description}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline">
                            Gestionar facturación
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Usage stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Uso Actual</CardTitle>
                    <CardDescription>
                        Recursos utilizados en tu plan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Presentaciones</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">0</span>
                                <span className="text-sm text-muted-foreground">/ 3</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-2 w-0 rounded-full bg-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Almacenamiento</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">0</span>
                                <span className="text-sm text-muted-foreground">/ 100 MB</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-2 w-0 rounded-full bg-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Miembros</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">1</span>
                                <span className="text-sm text-muted-foreground">/ ilimitados</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-2 w-[5%] rounded-full bg-primary" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Available plans */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Planes Disponibles</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative ${plan.popular
                                    ? "border-primary shadow-md"
                                    : ""
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                                    Más popular
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <plan.icon className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                                </div>
                                <div className="mt-2">
                                    <span className="text-3xl font-bold">{plan.price}</span>
                                    <span className="text-muted-foreground">{plan.period}</span>
                                </div>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            <Check className="h-4 w-4 text-green-600" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {plan.current ? (
                                    <Button variant="outline" className="w-full" disabled>
                                        Plan actual
                                    </Button>
                                ) : plan.id === "enterprise" ? (
                                    <Button variant="outline" className="w-full">
                                        Contactar ventas
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        variant={plan.popular ? "default" : "outline"}
                                    >
                                        Actualizar
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
