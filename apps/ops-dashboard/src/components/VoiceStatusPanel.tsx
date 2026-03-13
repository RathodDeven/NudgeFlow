import type { CallAttempt, ScheduledAction } from '../types'

const formatTime = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const getRetryRemaining = (action: ScheduledAction) => {
  const retryIndex = Number(action.metadata?.retry_index ?? 0)
  const maxRetries = Number(action.metadata?.max_retries ?? 0)
  if (!Number.isFinite(maxRetries) || maxRetries <= 0) return null
  return Math.max(0, maxRetries - retryIndex)
}

type VoiceStatusPanelProps = {
  scheduledActions: ScheduledAction[]
  callAttempts: CallAttempt[]
}

export const VoiceStatusPanel = ({ scheduledActions, callAttempts }: VoiceStatusPanelProps) => {
  const nextAction = [...scheduledActions]
    .filter(action => ['scheduled', 'queued', 'pending', 'processing'].includes(action.status))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0]

  const retryRemaining = nextAction ? getRetryRemaining(nextAction) : null

  return (
    <div
      style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        background: '#f8fafc'
      }}
    >
      <h3 style={{ marginTop: 0 }}>📞 Voice Timeline</h3>
      <div style={{ marginBottom: '1rem' }}>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Next scheduled call
        </p>
        {nextAction ? (
          <p style={{ margin: 0 }}>
            <strong>{nextAction.actionSubtype ?? nextAction.actionType}</strong> — {nextAction.status} —{' '}
            {formatTime(nextAction.dueAt)}
            {retryRemaining !== null ? ` (retries left: ${retryRemaining})` : ''}
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No upcoming calls.
          </p>
        )}
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Scheduled Calls
        </p>
        {scheduledActions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No scheduled calls.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {scheduledActions.map(action => (
              <li key={action.id} style={{ marginBottom: '0.35rem' }}>
                <strong>{action.actionSubtype ?? action.actionType}</strong> — {action.status} —{' '}
                {formatTime(action.dueAt)}
                {action.retryCount > 0 ? ` (retry ${action.retryCount})` : ''}
                {action.lastError ? ` — ${action.lastError}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Recent Call Attempts
        </p>
        {callAttempts.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No call attempts yet.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {callAttempts.map(attempt => (
              <li key={attempt.id} style={{ marginBottom: '0.35rem' }}>
                {formatTime(attempt.createdAt)} — {attempt.disposition ?? 'unknown'}
                {attempt.durationSeconds ? ` — ${attempt.durationSeconds}s` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
