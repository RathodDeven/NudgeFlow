import { EventLogger } from '@nudges/observability'

export const eventLogger = new EventLogger()

export const sessionState = new Map<string, { isAgentActive: boolean; updatedAt: string }>()
