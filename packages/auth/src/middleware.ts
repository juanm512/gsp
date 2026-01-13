// Middleware utilities for route protection
// Can be used in Next.js middleware.ts files

export { betterFetch } from "better-auth/client";

// Helper to check if user has required role
export function hasRole(
  userRole: string | null | undefined,
  requiredRoles: string[],
): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

// Role constants for easy reference
export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
} as const;
