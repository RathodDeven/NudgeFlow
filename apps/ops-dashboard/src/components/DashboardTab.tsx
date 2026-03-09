import type { EventItem, FunnelMetrics, PendingHITLTask, SessionItem } from '../types'

interface DashboardTabProps {
  metrics: FunnelMetrics
  sessions: SessionItem[]
  events: EventItem[]
  pendingTasks: PendingHITLTask[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  fakeOverrideStatus: (userId: string, newStatus: string) => void
}

export function DashboardTab({
  metrics,
  sessions,
  events,
  pendingTasks,
  onApprove,
  onReject,
  fakeOverrideStatus
}: DashboardTabProps) {
  return (
    <>
      <section className="grid">
        {Object.entries(metrics).map(([label, value]) => (
          <article className="card" key={label}>
            <p className="muted capitalize">{label}</p>
            <h2>{value}</h2>
          </article>
        ))}
      </section>

      <section
        className="card"
        style={{ marginBottom: '2rem', border: '2px solid var(--primary-color, #007bff)' }}
      >
        <h2>Human-in-the-Loop Pending Approvals</h2>
        <p className="muted">Messages drafted by Neha waiting for your review.</p>
        {pendingTasks.length === 0 ? <p className="muted">No pending tasks.</p> : null}
        {pendingTasks.map(task => (
          <div
            key={task.id}
            style={{ padding: '1rem', borderBottom: '1px solid #ccc', marginBottom: '1rem' }}
          >
            <div className="row">
              <strong>
                User ID: {task.externalUserId} | Stage: <span className="badge info">{task.stage}</span>
              </strong>
              <select onChange={e => fakeOverrideStatus(task.externalUserId, e.target.value)} defaultValue="">
                <option value="" disabled>
                  Manual Override Status...
                </option>
                <option value="under_review">Mark Under Review</option>
                <option value="credit_decisioning">Mark Credit Decisioning</option>
                <option value="converted">Mark Converted/Closed</option>
              </select>
            </div>
            <p
              style={{
                fontStyle: 'italic',
                background: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                color: '#333'
              }}
            >
              "{task.messageBody}"
            </p>
            <div className="row gap-sm" style={{ marginTop: '0.5rem' }}>
              <button type="button" onClick={() => onApprove(task.id)}>
                Approve & Send
              </button>
              <button type="button" className="secondary" onClick={() => onReject(task.id)}>
                Reject / Close
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Active Sessions</h2>
          {sessions.length === 0 ? <p className="muted">No sessions yet.</p> : null}
          {sessions.map(session => (
            <div key={session.sessionId} className="list-row">
              <code>{session.sessionId}</code>
              <span className={session.isAgentActive ? 'badge on' : 'badge off'}>
                {session.isAgentActive ? 'agent active' : 'human takeover'}
              </span>
            </div>
          ))}
        </article>

        <article className="card">
          <h2>Recent Events</h2>
          {events.length === 0 ? <p className="muted">No events yet.</p> : null}
          {events
            .slice(-12)
            .reverse()
            .map((event, index) => (
              <div key={`${event.event}-${index}`} className="list-row">
                <span>
                  <strong>{event.event}</strong>
                  <span className="muted"> {new Date(event.createdAt).toLocaleString()}</span>
                </span>
                <span className={`badge ${event.level}`}>{event.level}</span>
              </div>
            ))}
        </article>
      </section>
    </>
  )
}
