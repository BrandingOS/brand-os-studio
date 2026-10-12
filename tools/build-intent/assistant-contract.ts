import { z } from 'zod';
import { requestSchema } from './model';

export const assistantInputSchema = z.object({
  request: requestSchema,
  message: z.string().trim().min(1).max(12000),
  locale: z.enum(['ar', 'en']),
  logoPresent: z.boolean().optional(),
}).strict();
export const assistantOutputSchema = z.object({
  reply: z.string().min(1).max(16000),
  change: z.object({
    title: z.string().min(1).max(200), intent: z.string().min(1).max(16000),
    kind: z.enum(['feature', 'fix', 'small']),
    checks: z.array(z.string().min(1).max(1000)).min(1).max(20),
    prototypeTitle: z.string().min(1).max(200),
    prototypeHtml: z.string().min(1).max(100000),
  }).strict().nullable(),
}).strict();
export type AssistantOutput = z.infer<typeof assistantOutputSchema>;
