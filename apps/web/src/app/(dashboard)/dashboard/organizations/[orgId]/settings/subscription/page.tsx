"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
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

const plansConfig = {
    free: {
        popular: false,
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
        limits: { presentations: 3, storage: 100, members: 5 },
        icon: Sparkles,
    },
    pro: {
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
        limits: { presentations: Infinity, storage: 10240, members: Infinity },
        icon: Zap,
        popular: true,
    },
    enterprise: {
        popular: false,
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
        limits: { presentations: Infinity, storage: Infinity, members: Infinity },
        icon: CreditCard,
    },
};

export default function OrgSubscriptionPage() {
    const params = useParams();
    const orgId = params.orgId as string;

    const trpc = useTRPC();
    const router = useRouter();

    // Fetch subscription data
    const { data: subscription, isLoading } = useQuery(
        trpc.billing.getSubscription.queryOptions({ organizationId: orgId })
    );

    const currentPlanId = subscription?.plan || "free";
    const currentPlan = plansConfig[currentPlanId as keyof typeof plansConfig] || plansConfig.free;
    const memberCount = subscription?.memberCount || 1;

    const checkoutMutation = useMutation(
        trpc.billing.createCheckout.mutationOptions({
            onSuccess: (data) => {
                if (data.url) {
                    router.push(data.url);
                }
            },
            onError: (err) => {
                console.error("Checkout error:", err);
                alert("Error al iniciar el pago");
            },
        })
    );

    const portalMutation = useMutation(
        trpc.billing.getCustomerPortalUrl.mutationOptions({
            onSuccess: (data) => {
                if (data.url) {
                    window.open(data.url, "_blank");
                }
            },
            onError: (err) => {
                console.error("Portal error:", err);
                alert("Error al abrir el portal de facturación");
            },
        })
    );

    const handleManageBilling = () => {
        portalMutation.mutate({ organizationId: orgId });
    };

    const handleUpgrade = (planId: string) => {
        if (planId === "pro") {
            checkoutMutation.mutate({
                plan: "pro",
                organizationId: orgId,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const plans = Object.values(plansConfig);

    return (
        <div className="space-y-6">
            {/* Current plan */}
            <Card>
                <CardHeader>
                    <CardTitle>Plan Actual</CardTitle>
                    <CardDescription>
                        Tu organización está en el plan {currentPlan.name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                <currentPlan.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {currentPlan.price}
                                    <span className="text-base font-normal text-muted-foreground">
                                        {currentPlan.period}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {currentPlan.description}
                                </p>
                            </div>
                        </div>
                        {subscription?.polarSubscriptionId && (
                            <Button
                                variant="outline"
                                onClick={handleManageBilling}
                                disabled={portalMutation.isPending}
                            >
                                {portalMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Cargando...
                                    </>
                                ) : (
                                    "Gestionar facturación"
                                )}
                            </Button>
                        )}
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
                                <span className="text-sm text-muted-foreground">
                                    / {currentPlan.limits.presentations === Infinity ? "∞" : currentPlan.limits.presentations}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-2 w-0 rounded-full bg-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Almacenamiento</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">0</span>
                                <span className="text-sm text-muted-foreground">
                                    / {currentPlan.limits.storage === Infinity ? "∞" : `${currentPlan.limits.storage >= 1024 ? `${currentPlan.limits.storage / 1024} GB` : `${currentPlan.limits.storage} MB`}`}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-2 w-0 rounded-full bg-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Miembros</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">{memberCount}</span>
                                <span className="text-sm text-muted-foreground">
                                    / {currentPlan.limits.members === Infinity ? "∞" : currentPlan.limits.members}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                    className="h-2 rounded-full bg-primary transition-all"
                                    style={{
                                        width: currentPlan.limits.members === Infinity
                                            ? "5%"
                                            : `${Math.min((memberCount / currentPlan.limits.members) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Available plans */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Planes Disponibles</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        return (
                            <Card
                                key={plan.id}
                                className={`relative ${plan.popular ? "border-primary shadow-md" : ""}`}
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
                                    {isCurrent ? (
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
                                            onClick={() => handleUpgrade(plan.id)}
                                            disabled={checkoutMutation.isPending}
                                        >
                                            {checkoutMutation.isPending && plan.id === "pro" ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Procesando...
                                                </>
                                            ) : (
                                                "Actualizar"
                                            )}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
