import Fastify from 'fastify'
import { env } from './context'
import { registerAuthRoutes } from './routes/auth'
import { registerDashboardRoutes } from './routes/dashboard'
import { registerIngestionRoutes } from './routes/ingestion'
import { registerMetricsRoutes } from './routes/metrics'
import { registerOutreachRoutes } from './routes/outreach'
import { registerSessionRoutes } from './routes/sessions'
import { registerStatusRoutes } from './routes/status'
import { registerTenantRoutes } from './routes/tenants'
import { registerUserMessageRoutes } from './routes/user-messages'
import { registerUserRoutes } from './routes/users'
import { registerVoiceRoutes } from './routes/voice'
import { registerWebhookRoutes } from './routes/webhooks'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  }
})

app.get('/health', async () => ({ ok: true, service: 'api-gateway' }))

registerAuthRoutes(app)
registerIngestionRoutes(app)
registerWebhookRoutes(app)
registerVoiceRoutes(app)
registerStatusRoutes(app)
registerSessionRoutes(app)
registerMetricsRoutes(app)
registerOutreachRoutes(app)
registerTenantRoutes(app)
registerDashboardRoutes(app)
registerUserRoutes(app)
registerUserMessageRoutes(app)

app
  .listen({ host: '0.0.0.0', port: env.PORT })
  .then(() => app.log.info(`api-gateway listening on ${env.PORT}`))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
