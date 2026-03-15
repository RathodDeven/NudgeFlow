import type { EventItem, FunnelMetrics, SessionItem } from '@/types'
import { Activity, AlertCircle, ArrowUpRight, Calendar, Clock, Users as UsersIcon } from 'lucide-react'
import { useMemo } from 'react'

interface OverviewPageProps {
  metrics: FunnelMetrics
  sessions: SessionItem[]
  events: EventItem[]
}

export function OverviewPage({ metrics, sessions, events }: OverviewPageProps) {
  const metricCards = useMemo(() => {
    return Object.entries(metrics).map(([label, value]) => {
      let displayValue = value as React.ReactNode
      let icon = <Activity className="h-4 w-4 text-muted-foreground" />

      if ((label === 'windowStart' || label === 'windowEnd') && typeof value === 'string') {
        displayValue = new Date(value).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        icon = <Calendar className="h-4 w-4 text-muted-foreground" />
      } else if (label.toLowerCase().includes('count') || label.toLowerCase().includes('total')) {
        icon = <UsersIcon className="h-4 w-4 text-muted-foreground" />
      }

      return { id: label, label, value: displayValue, icon }
    })
  }, [metrics])

  const recentEvents = useMemo(() => {
    return [...events].slice(-10).reverse()
  }, [events])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            A high-level summary of your system's performance and activity.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(card => (
          <div key={card.id} className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium capitalize">
                {card.label.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              {card.icon}
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0">
            <h3 className="tracking-tight text-base font-semibold">Active Sessions</h3>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active sessions yet.</p>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <code className="text-xs font-mono">{session.sessionId}</code>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        session.isAgentActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-orange-50 text-orange-700 border border-orange-100'
                      }`}
                    >
                      {session.isAgentActive ? 'agent active' : 'human takeover'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0">
            <h3 className="tracking-tight text-base font-semibold">Recent Events</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No events yet.</p>
              ) : (
                recentEvents.map((event, index) => (
                  <div
                    key={`${event.event}-${index}`}
                    className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{event.event}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          event.level === 'error'
                            ? 'bg-red-100 text-red-700'
                            : event.level === 'warn'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {event.level}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
