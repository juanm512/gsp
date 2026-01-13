import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

export function createClient(baseURL?: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient(), adminClient()],
  });
}

// Export types for convenience
export type AuthClient = ReturnType<typeof createClient>;
