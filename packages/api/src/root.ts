import { adminRouter } from "./router/admin";
import { authRouter } from "./router/auth";
import { organizationRouter } from "./router/organization";
import { postRouter } from "./router/post";
import { billingRouter } from "./router/billing";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  organization: organizationRouter,
  post: postRouter,
  billing: billingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
