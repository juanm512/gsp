import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";

import { Button } from "@acme/ui/button";
import { ThemeToggle } from "@acme/ui/theme";

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            GSP
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Registrarse</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="container flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Gaussian{" "}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Splatting
            </span>{" "}
            Platform
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            Crea presentaciones 3D inmersivas a partir de videos o imágenes.
            Transforma tus espacios en experiencias interactivas.
          </p>
          <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                Comenzar Gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 border-slate-600 text-slate-300">
              <Link href="#demo">
                <Play className="h-4 w-4" />
                Ver Demo
              </Link>
            </Button>
          </div>
        </div>

        {/* Placeholder for 3D viewer preview */}
        <div className="mt-16 w-full max-w-4xl">
          <div className="aspect-video rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur">
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-500">Vista previa del visor 3D</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
