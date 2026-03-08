export type EventLevel = 'info' | 'warn' | 'error'

export type DomainEvent = {
  event: string
  level: EventLevel
  tenantId?: string
  userId?: string
  sessionId?: string
  payload: Record<string, unknown>
  createdAt: string
}

export class EventLogger {
  private readonly events: DomainEvent[] = []

  log(event: Omit<DomainEvent, 'createdAt'>): DomainEvent {
    const row: DomainEvent = {
      ...event,
      createdAt: new Date().toISOString()
    }
    this.events.push(row)
    return row
  }

  list(): DomainEvent[] {
    return [...this.events]
  }
}

export type FunnelMetrics = {
  reached: number
  replied: number
  resumed: number
  progressed: number
  converted: number
}

export const deriveFunnelMetrics = (events: DomainEvent[]): FunnelMetrics => {
  const has = (key: string) => events.filter(event => event.event === key).length
  return {
    reached: has('message_outbound_sent'),
    replied: has('message_inbound_received'),
    resumed: has('application_resumed'),
    progressed: has('application_progressed'),
    converted: has('application_converted')
  }
}
