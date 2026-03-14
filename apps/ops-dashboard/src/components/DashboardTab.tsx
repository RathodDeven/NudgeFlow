import { type ReactNode, useState } from 'react'
import type { CsvUser, EventItem, FunnelMetrics, PendingHITLTask, SessionItem } from '../types'

const priorityStyles: Record<string, { bg: string; color: string; label: string }> = {
  P1: { bg: '#fee2e2', color: '#dc2626', label: '🔴 P1 — Call Now' },
  P2: { bg: '#fff7ed', color: '#ea580c', label: '🟠 P2 — Next Block' },
  P3: { bg: '#fefce8', color: '#ca8a04', label: '🟡 P3 — Scheduled' }
}

interface DashboardTabProps {
  metrics: FunnelMetrics
  sessions: SessionItem[]
  events: EventItem[]
  pendingTasks: PendingHITLTask[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onMarkCalled: (id: string) => void
  fakeOverrideStatus: (userId: string, newStatus: string) => void
  csvUsers: CsvUser[]
  csvUploadSlot?: ReactNode
  onUserSelect?: (user: CsvUser) => void
  untouchedCount: number
  isBatchStarting: boolean
  isExportingCsv: boolean
  scheduleAtLocal: string
  onScheduleAtLocalChange: (value: string) => void
  onBatchRunNowUntouched: () => void
  onBatchScheduleUntouched: () => void
  onExportInferredCsv: (filters?: { intent?: string; highIntent?: string }) => void
}

export function DashboardTab({
  metrics,
  sessions,
  events,
  pendingTasks,
  onApprove,
  onReject,
  onMarkCalled,
  fakeOverrideStatus,
  csvUsers,
  csvUploadSlot,
  onUserSelect,
  untouchedCount,
  isBatchStarting,
  isExportingCsv,
  scheduleAtLocal,
  onScheduleAtLocalChange,
  onBatchRunNowUntouched,
  onBatchScheduleUntouched,
  onExportInferredCsv
}: DashboardTabProps) {
  const callQueue = pendingTasks.filter(t => t.callPriority && t.callPriority !== 'none')
  const [expandedScript, setExpandedScript] = useState<string | null>(null)
  const [intentFilter, setIntentFilter] = useState('')
  const [highIntentFilter, setHighIntentFilter] = useState('')

  return (
    <>
      <section className="grid">
        {Object.entries(metrics).map(([label, value]) => {
          let displayValue = value as React.ReactNode
          if ((label === 'windowStart' || label === 'windowEnd') && typeof value === 'string') {
            displayValue = `${new Date(value).toLocaleDateString()} ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          }
          return (
            <article className="card" key={label}>
              <p className="muted capitalize">{label}</p>
              <h2 style={label.startsWith('window') ? { fontSize: '1.2rem' } : undefined}>{displayValue}</h2>
            </article>
          )
        })}
      </section>

      {csvUploadSlot && (
        <section className="card" style={{ marginBottom: '2rem' }}>
          <h2>📤 Upload Users (CSV)</h2>
          <p className="muted">Upload a CSV from ClickPe to import users into the database.</p>
          {csvUploadSlot}
        </section>
      )}

      <section className="card" style={{ marginBottom: '2rem' }}>
        <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h2>Batch Outreach</h2>
            <p className="muted" style={{ marginTop: 4 }}>
              Untouched users: <strong>{untouchedCount}</strong>
            </p>
          </div>
          <div className="row gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <select value={intentFilter} onChange={e => setIntentFilter(e.target.value)}>
              <option value="">All Intent Classes</option>
              <option value="continue_now">continue_now</option>
              <option value="continue_later_today">continue_later_today</option>
              <option value="continue_later_date">continue_later_date</option>
              <option value="not_interested">not_interested</option>
              <option value="already_completed">already_completed</option>
              <option value="needs_help">needs_help</option>
              <option value="wrong_number">wrong_number</option>
              <option value="unreachable">unreachable</option>
            </select>
            <select value={highIntentFilter} onChange={e => setHighIntentFilter(e.target.value)}>
              <option value="">All High Intent</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
            <button
              type="button"
              onClick={onBatchRunNowUntouched}
              disabled={isBatchStarting || untouchedCount === 0}
              title={
                untouchedCount === 0 ? 'No untouched users available' : 'Start outreach for untouched users'
              }
            >
              {isBatchStarting ? 'Starting Batch...' : 'Run Now (Untouched)'}
            </button>
            <input
              type="datetime-local"
              value={scheduleAtLocal}
              onChange={e => onScheduleAtLocalChange(e.target.value)}
              aria-label="Batch schedule date time"
            />
            <button
              type="button"
              className="secondary"
              onClick={onBatchScheduleUntouched}
              disabled={isBatchStarting || untouchedCount === 0 || !scheduleAtLocal}
            >
              {isBatchStarting ? 'Scheduling...' : 'Schedule Batch (Untouched)'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                onExportInferredCsv({
                  intent: intentFilter || undefined,
                  highIntent: highIntentFilter || undefined
                })
              }
              disabled={isExportingCsv}
            >
              {isExportingCsv ? 'Preparing CSV...' : 'Export Inferred Users CSV'}
            </button>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: '2rem' }}>
        <h2>👥 All Ingested Users ({csvUsers.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Customer ID</th>
                <th style={{ padding: '8px' }}>Mobile</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px' }}>Loan Amount</th>
                <th style={{ padding: '8px' }}>Application Submitted</th>
                <th style={{ padding: '8px' }}>Application Updated</th>
              </tr>
            </thead>
            <tbody>
              {csvUsers.map(user => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid #eee',
                    cursor: onUserSelect ? 'pointer' : 'default'
                  }}
                  onClick={() => onUserSelect?.(user)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onUserSelect?.(user)
                    }
                  }}
                  tabIndex={onUserSelect ? 0 : undefined}
                  className={onUserSelect ? 'hover-row' : ''}
                >
                  <td style={{ padding: '8px' }}>{user.name}</td>
                  <td style={{ padding: '8px' }}>
                    <code>{user.customerId}</code>
                  </td>
                  <td style={{ padding: '8px' }}>{user.mobile}</td>
                  <td style={{ padding: '8px' }}>
                    <span className="badge info">{user.status}</span>
                  </td>
                  <td style={{ padding: '8px' }}>₹{user.loanAmount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px', fontSize: '0.85rem' }} className="muted">
                    {user.applicationCreatedAt
                      ? `${new Date(user.applicationCreatedAt).toLocaleDateString()} ${new Date(user.applicationCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : '-'}
                  </td>
                  <td style={{ padding: '8px', fontSize: '0.85rem' }} className="muted">
                    {user.applicationUpdatedAt
                      ? `${new Date(user.applicationUpdatedAt).toLocaleDateString()} ${new Date(user.applicationUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {callQueue.length > 0 && (
        <section className="card" style={{ marginBottom: '2rem', border: '2px solid #ea580c' }}>
          <h2>📞 Call Queue — Manual Calls Required</h2>
          <p className="muted">Users who need a phone call. Use the script below for each call.</p>
          {callQueue
            .sort((a, b) => (a.callPriority ?? '').localeCompare(b.callPriority ?? ''))
            .map(task => {
              const style = priorityStyles[task.callPriority ?? '']
              const isExpanded = expandedScript === task.id
              return (
                <div
                  key={`call-${task.id}`}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    borderRadius: '8px',
                    background: style?.bg ?? '#f5f5f5',
                    borderLeft: `4px solid ${style?.color ?? '#999'}`
                  }}
                >
                  <div className="row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem' }}>{task.userName ?? task.externalUserId}</strong>
                      {task.firmName && (
                        <span className="muted" style={{ marginLeft: '8px' }}>
                          ({task.firmName})
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: style?.color ?? '#333', fontSize: '0.85rem' }}>
                      {style?.label ?? task.callPriority}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '4px 16px',
                      margin: '8px 0',
                      fontSize: '0.9rem'
                    }}
                  >
                    {task.mobile && (
                      <span>
                        📱 <strong>{task.mobile}</strong>
                      </span>
                    )}
                    <span>
                      Stage: <span className="badge info">{task.stage}</span>
                    </span>
                    {task.pendingStep && (
                      <span>
                        ⏳ Pending: <strong>{task.pendingStep}</strong>
                      </span>
                    )}
                    {task.loanAmount && <span>💰 Loan: ₹{task.loanAmount.toLocaleString('en-IN')}</span>}
                  </div>

                  {task.callReason && (
                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                      <strong>Reason:</strong> {task.callReason}
                    </p>
                  )}
                  {task.blockerCode && (
                    <p style={{ margin: '2px 0', fontSize: '0.85rem' }} className="muted">
                      Blocker: <code>{task.blockerCode}</code>
                    </p>
                  )}

                  {task.callScript && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        onClick={() => setExpandedScript(isExpanded ? null : task.id)}
                      >
                        {isExpanded ? '▼ Hide Call Script' : '▶ Show Call Script'}
                      </button>
                      {isExpanded && (
                        <pre
                          style={{
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            padding: '10px',
                            marginTop: '6px',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5
                          }}
                        >
                          {task.callScript}
                        </pre>
                      )}
                    </div>
                  )}

                  <div className="row gap-sm" style={{ marginTop: '10px' }}>
                    {!task.called ? (
                      <button type="button" onClick={() => onMarkCalled(task.id)}>
                        ✅ Mark Called
                      </button>
                    ) : (
                      <span className="badge on" style={{ padding: '6px 12px' }}>
                        ✓ Called
                      </span>
                    )}
                    <select
                      onChange={e => fakeOverrideStatus(task.externalUserId, e.target.value)}
                      defaultValue=""
                      style={{ fontSize: '0.85rem' }}
                    >
                      <option value="" disabled>
                        Override Status...
                      </option>
                      <option value="loan_detail_submitted">Loan Detail Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="credit_decisioning">Credit Decisioning</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>
                </div>
              )
            })}
        </section>
      )}

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
                {task.userName ?? task.externalUserId} | Stage:{' '}
                <span className="badge info">{task.stage}</span>
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
