import { loadEnv } from '@nudges/config'
import { enforceMessagingPolicy } from '@nudges/safety-compliance'
import { type ConnectionOptions, Queue, Worker } from 'bullmq'

const env = loadEnv()
const redisUrl = new URL(env.REDIS_URL)

const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined
}

export const followupQueue = new Queue('followup_queue', { connection })

type FollowupJob = {
  sessionId: string
  tenantTimezone: string
  attempt: number
  blocked: boolean
  optedOut: boolean
  isAgentActive: boolean
}

new Worker<FollowupJob>(
  'followup_queue',
  async job => {
    const policy = enforceMessagingPolicy({
      now: new Date(),
      timezone: job.data.tenantTimezone,
      startHour: env.CONTACT_START_HOUR,
      endHour: env.CONTACT_END_HOUR,
      attemptsInWindow: job.data.attempt,
      maxAttempts: env.MAX_ATTEMPTS,
      blocked: job.data.blocked,
      optedOut: job.data.optedOut,
      isAgentActive: job.data.isAgentActive
    })

    if (!policy.allowed) {
      return { status: 'skipped', reasons: policy.reasons }
    }

    return {
      status: 'ready',
      sessionId: job.data.sessionId,
      action: 'poll_status_then_send'
    }
  },
  { connection }
)

const bootstrap = async (): Promise<void> => {
  await followupQueue.add(
    'seed-followup',
    {
      sessionId: crypto.randomUUID(),
      tenantTimezone: 'Asia/Kolkata',
      attempt: 1,
      blocked: false,
      optedOut: false,
      isAgentActive: true
    },
    { delay: 1000 }
  )
}

bootstrap().catch(error => {
  console.error(error)
  process.exit(1)
})
