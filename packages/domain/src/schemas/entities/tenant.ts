import { z } from 'zod'

export const tenantSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(2),
  displayName: z.string().min(2),
  timezone: z.string().default('Asia/Kolkata'),
  knowledgePath: z.string(),
  createdAt: z.string().datetime()
})

export type Tenant = z.infer<typeof tenantSchema>
