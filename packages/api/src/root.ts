import { adminRouter } from "./router/admin";
import { authRouter } from "./router/auth";
import { billingRouter } from "./router/billing";
import { organizationRouter } from "./router/organization";
import { presentationRouter } from "./router/presentation";
import { pipelineRouter } from "./router/pipeline";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  organization: organizationRouter,
  billing: billingRouter,
  presentation: presentationRouter,
  pipeline: pipelineRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
