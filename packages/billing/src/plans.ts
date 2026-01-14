export const PLANS = {
    FREE: {
        id: "free",
        name: "Gratuito",
        description: "Para empezar a explorar",
        features: [
            "1 organización",
            "3 presentaciones",
            "100 MB almacenamiento",
            "Soporte por email"
        ],
    },
    PRO: {
        id: "pro",
        name: "Profesional",
        description: "Para equipos en crecimiento",
        // Replace with your actual Polar Product ID
        productId: "878e516b-1d50-4b45-9032-8a5933e8efca",
        price: "$29",
        features: [
            "5 organizaciones",
            "Presentaciones ilimitadas",
            "10 GB almacenamiento",
            "Colaboradores ilimitados",
            "Soporte prioritario"
        ],
    },
} as const;
