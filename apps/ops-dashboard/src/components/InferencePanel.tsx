import type { CsvUser } from '../types'

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export const InferencePanel = ({ user }: { user: CsvUser }) => {
  const extracted = user.inferenceExtractedData ?? {}
  const entries = Object.entries(extracted)

  return (
    <section className="card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Latest Call Inference</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '0.75rem'
        }}
      >
        <div>
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            Intent Class
          </p>
          <p style={{ margin: 0 }}>
            <strong>{toDisplay(user.inferredIntent)}</strong>
          </p>
        </div>
        <div>
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            High Intent
          </p>
          <p style={{ margin: 0 }}>
            <strong>{toDisplay(user.highIntentFlag)}</strong>
          </p>
        </div>
        <div>
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            Last Call Disposition
          </p>
          <p style={{ margin: 0 }}>
            <strong>{toDisplay(user.lastCallDisposition)}</strong>
          </p>
        </div>
        <div>
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            Follow-up At
          </p>
          <p style={{ margin: 0 }}>
            <strong>{toDisplay(user.followUpAt)}</strong>
          </p>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>
        Call Summary
      </p>
      <p style={{ marginTop: 0 }}>{toDisplay(user.callSummaryLatest)}</p>

      <p className="muted" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>
        Notes
      </p>
      <p style={{ marginTop: 0 }}>{toDisplay(user.callNotesLatest)}</p>

      <p className="muted" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>
        Extracted Analytics
      </p>
      {entries.length === 0 ? (
        <p className="muted" style={{ marginTop: 0 }}>
          No extracted analytics captured yet.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {entries.map(([key, value]) => (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem' }}>
              <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>
                {key}
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{toDisplay(value)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
