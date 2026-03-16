import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VITE_ENABLE_SANDBOX: z.coerce.boolean().default(true),
  PORT: z.coerce.number().default(3000),
  TZ: z.string().default('Asia/Kolkata'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().nullish(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_ROUTINE: z.string().default('gpt-5-nano-2025-08-07'),
  OPENAI_MODEL_COMPLEX: z.string().default('gpt-5-mini-2025-08-07'),
  SARVAM_API_KEY: z.string().optional(),
  SARVAM_BASE_URL: z.string().default('https://api.sarvam.ai'),
  BOLNA_API_KEY: z.string().optional(),
  BOLNA_BASE_URL: z.string().default('https://api.bolna.ai'),
  BOLNA_AGENT_ID: z.string().optional(),
  BOLNA_FROM_NUMBER: z.string().optional(),
  GUPSHUP_API_KEY: z.string().optional(),
  GUPSHUP_BASE_URL: z.string().default('https://api.gupshup.io'),
  API_GATEWAY_URL: z.string().default('http://localhost:3000'),
  LENDER_STATUS_API_BASE_URL: z.string().default('https://sandbox.lender.local'),
  LENDER_STATUS_API_KEY: z.string().optional(),
  AGENT_SKILLS_DIR: z.string().default('skills'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('change_me'),
  DASHBOARD_AUTH_SECRET: z.string().default('change_me_please'),
  CONTACT_START_HOUR: z.coerce.number().default(8),
  CONTACT_END_HOUR: z.coerce.number().default(19),
  MAX_ATTEMPTS: z.coerce.number().default(3),
  FOLLOWUP_WINDOW_DAYS: z.coerce.number().default(7),
  COOLDOWN_HOURS: z.coerce.number().default(24)
})

export type AppEnv = z.infer<typeof envSchema>

import * as dotenv from 'dotenv'
dotenv.config({ path: '../../.env' })
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => envSchema.parse(source)

export const isWithinContactWindow = (
  now: Date,
  startHour = 8,
  endHour = 19,
  timeZone = 'Asia/Kolkata'
): boolean => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    hour12: false,
    timeZone
  }).formatToParts(now)
  const hourPart = parts.find(entry => entry.type === 'hour')?.value
  const hour = Number(hourPart ?? '0')
  return hour >= startHour && hour < endHour
}
