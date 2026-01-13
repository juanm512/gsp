import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

export default async function AdminHomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user has admin role
  const userRole = session.user.role as string;
  if (!["admin", "superadmin"].includes(userRole)) {
    redirect("/login?error=unauthorized");
  }

  // If authenticated admin, go to dashboard
  redirect("/dashboard");
}
