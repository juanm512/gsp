import { HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default function AdminHomePage() {
  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            GSP <span className="text-primary">Admin</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Panel de administración - Gaussian Splatting Platform
          </p>
          <AuthShowcase />
        </div>
      </main>
    </HydrateClient>
  );
}
