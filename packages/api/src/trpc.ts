/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import type { Auth, Session } from "@acme/auth";
import type { db as DbClient } from "@acme/db/client";
import { db } from "@acme/db/client";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

/**
 * Explicit context type to avoid TypeScript trying to serialize
 * complex internal Better Auth types (TS2742, TS4023, TS7056).
 * 
 * Note: authApi is intentionally excluded from this interface because
 * its type contains internal Better Auth types that can't be serialized.
 * If you need authApi in a procedure, access it through the auth instance
 * passed to createTRPCContext.
 */
export interface TRPCContext {
  session: Session | null;
  db: typeof DbClient;
  headers: Headers;
}

export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
}): Promise<TRPCContext> => {
  const session = await opts.auth.api.getSession({
    headers: opts.headers,
  });
  return {
    session,
    db,
    headers: opts.headers,
  };
};
/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Admin procedure
 *
 * Only accessible to users with role "admin" or "superadmin".
 * Used for admin panel operations like managing presentations.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const userRole = (ctx.session.user as { role?: string }).role;

  if (!userRole || !["admin", "superadmin"].includes(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userRole: userRole as "admin" | "superadmin",
    },
  });
});

/**
 * Super Admin procedure
 *
 * Only accessible to users with role "superadmin".
 * Used for user management operations.
 */
export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const userRole = (ctx.session.user as { role?: string }).role;

  if (userRole !== "superadmin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userRole: "superadmin" as const,
    },
  });
});
