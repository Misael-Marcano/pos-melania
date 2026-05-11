import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl:  z.string().url(),
  planCode:   z.enum(['starter', 'standard', 'enterprise']).optional(),
});

export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>;

export const createPortalSessionSchema = z.object({
  returnUrl: z.string().url(),
});

export type CreatePortalSessionDto = z.infer<typeof createPortalSessionSchema>;
