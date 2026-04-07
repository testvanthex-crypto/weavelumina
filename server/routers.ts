import { router } from "./_core/trpc";
import { createLead, getLeads } from "./db";

export const appRouter = router({
  system: systemRouter,
  leads: router({
    create: {
      input: z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email(),
        plan: z.string().min(1),
        message: z.string().optional(),
      }),
      async resolve({ input }: any) {
        const lead = await createLead({
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          plan: input.plan,
          message: input.message || null,
          status: 'new',
        });
        await notifyOwner({
          title: 'New Lead Submission',
          content: `${input.firstName} ${input.lastName || ''} (${input.email}) is interested in ${input.plan}. Message: ${input.message || 'N/A'}`,
        });
        return lead;
      },
    },
    list: {
      async resolve() {
        return await getLeads();
      },
    },
  }),
});

export type AppRouter = typeof appRouter;
