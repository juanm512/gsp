import { adminRouter } from "./router/admin";
import { authRouter } from "./router/auth";
import { organizationRouter } from "./router/organization";
import { postRouter } from "./router/post";
import { billingRouter } from "./router/billing";
import { presentationRouter } from "./router/presentation";
import { pipelineRouter } from "./router/pipeline";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  organization: organizationRouter,
  post: postRouter,
  billing: billingRouter,
  presentation: presentationRouter,
  pipeline: pipelineRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
