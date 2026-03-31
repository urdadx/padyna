import { publicProcedure, router } from "../index";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),
});
