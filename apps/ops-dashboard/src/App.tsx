import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type FunnelMetrics = {
  reached: number
  replied: number
  resumed: number
  progressed: number
  converted: number
}

type SessionItem = {
  sessionId: string
  isAgentActive: boolean
  updatedAt: string
}

type EventItem = {
  event: string
  level: 'info' | 'warn' | 'error'
  sessionId?: string
  payload: Record<string, unknown>
  createdAt: string
}

const initialMetrics: FunnelMetrics = {
  reached: 0,
  replied: 0,
  resumed: 0,
  progressed: 0,
  converted: 0
}

const tokenKey = 'nudgeflow_admin_token'

const authFetch = async <T,>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  })

  if (response.status === 401) {
    throw new Error('unauthorized')
  }

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return (await response.json()) as T
}

export function App() {
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [authError, setAuthError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const [metrics, setMetrics] = useState<FunnelMetrics>(initialMetrics)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [dataError, setDataError] = useState<string>('')

  const isAuthenticated = useMemo(() => Boolean(token), [token])

  const loadDashboard = useCallback(async (authToken: string): Promise<void> => {
    setDataError('')
    const [funnel, sessionPayload, eventsPayload] = await Promise.all([
      authFetch<FunnelMetrics>('/metrics/funnel', authToken),
      authFetch<{ sessions: SessionItem[] }>('/dashboard/sessions', authToken),
      authFetch<{ events: EventItem[] }>('/dashboard/events', authToken)
    ])

    setMetrics(funnel)
    setSessions(sessionPayload.sessions)
    setEvents(eventsPayload.events)
  }, [])

  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      const stored = window.sessionStorage.getItem(tokenKey)
      if (!stored) {
        setLoading(false)
        return
      }

      try {
        await authFetch('/auth/me', stored)
        setToken(stored)
        await loadDashboard(stored)
      } catch {
        window.sessionStorage.removeItem(tokenKey)
      } finally {
        setLoading(false)
      }
    }

    bootstrap().catch(() => {
      setLoading(false)
    })
  }, [loadDashboard])

  const login = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAuthError('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      setAuthError('Invalid admin credentials.')
      return
    }

    const payload = (await response.json()) as { token: string }
    window.sessionStorage.setItem(tokenKey, payload.token)
    setToken(payload.token)
    setPassword('')
    await loadDashboard(payload.token)
  }

  const logout = (): void => {
    window.sessionStorage.removeItem(tokenKey)
    setToken(null)
    setMetrics(initialMetrics)
    setSessions([])
    setEvents([])
  }

  if (loading) {
    return <div className="screen center">Checking admin session...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="screen center">
        <form className="card login" onSubmit={login}>
          <h1>Admin Login</h1>
          <p className="muted">Authenticate to load dashboard content.</p>
          <label>
            Username
            <input value={username} onChange={event => setUsername(event.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>
          {authError ? <p className="error">{authError}</p> : null}
          <button type="submit">Sign In</button>
        </form>
      </div>
    )
  }

  return (
    <div className="screen">
      <main>
        <section className="row">
          <div>
            <h1>NudgeFlow Ops</h1>
            <p className="muted">Protected dashboard. Admin auth required.</p>
          </div>
          <div className="row gap-sm">
            <button
              type="button"
              onClick={() => {
                if (!token) return
                loadDashboard(token).catch(() => setDataError('Refresh failed'))
              }}
            >
              Refresh
            </button>
            <button type="button" className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </section>

        {dataError ? <p className="error">{dataError}</p> : null}

        <section className="grid">
          {Object.entries(metrics).map(([label, value]) => (
            <article className="card" key={label}>
              <p className="muted capitalize">{label}</p>
              <h2>{value}</h2>
            </article>
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
      </main>
    </div>
  )
}
