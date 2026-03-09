import { useCallback, useEffect, useMemo, useState } from 'react'
import { authFetch, initialMetrics, tokenKey } from './api/client'
import { DashboardTab } from './components/DashboardTab'
import { Login } from './components/Login'
import { SimulatorTab } from './components/SimulatorTab'
import type { EventItem, FunnelMetrics, PendingHITLTask, SessionItem } from './types'

export function App() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const [metrics, setMetrics] = useState<FunnelMetrics>(initialMetrics)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [pendingTasks, setPendingTasks] = useState<PendingHITLTask[]>([])
  const [dataError, setDataError] = useState<string>('')
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'simulator'>('dashboard')

  const isAuthenticated = useMemo(() => Boolean(token), [token])

  const loadDashboard = useCallback(async (authToken: string): Promise<void> => {
    setDataError('')
    const [funnel, sessionPayload, eventsPayload] = await Promise.all([
      authFetch<FunnelMetrics>('/metrics/funnel', authToken).catch(() => initialMetrics),
      authFetch<{ sessions: SessionItem[] }>('/dashboard/sessions', authToken).catch(() => ({
        sessions: []
      })),
      authFetch<{ events: EventItem[] }>('/dashboard/events', authToken).catch(() => ({ events: [] }))
    ])

    setMetrics(funnel)
    setSessions(sessionPayload.sessions)
    setEvents(eventsPayload.events)

    // Mock loading pending HITL tasks
    setPendingTasks([
      {
        id: 'mock-task-1',
        externalUserId: 'LS_POIOUY_VdEswDiAJl',
        stage: 'fresh_loan',
        messageBody:
          'Hi! Main Neha bol rahi hoon ClickPe se. Aapka loan application thoda baaki hai, document upload kijiye kripya.',
        status: 'drafting_required',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-task-2',
        externalUserId: 'LS_POIOUY_gzEUMGLdyY',
        stage: 'fresh_loan',
        messageBody:
          'Hi Surinder! Neha here from ClickPe. Your 1 Lakh loan offer is waiting. Please upload your documents to proceed.',
        status: 'drafting_required',
        createdAt: new Date().toISOString()
      }
    ])
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

  const handleLogin = async (newToken: string) => {
    window.sessionStorage.setItem(tokenKey, newToken)
    setToken(newToken)
    await loadDashboard(newToken)
  }

  const logout = (): void => {
    window.sessionStorage.removeItem(tokenKey)
    setToken(null)
    setMetrics(initialMetrics)
    setSessions([])
    setEvents([])
    setPendingTasks([])
  }

  const handleApprove = (taskId: string) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId))
    setDataError('Message Approved and Queued for Sending!')
    setTimeout(() => setDataError(''), 3000)
  }

  const handleReject = (taskId: string) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId))
    setDataError('Task Rejected.')
    setTimeout(() => setDataError(''), 3000)
  }

  const fakeOverrideStatus = (userId: string, newStatus: string) => {
    setDataError(`Status for ${userId} manually overridden to ${newStatus}.`)
    setTimeout(() => setDataError(''), 3000)
  }

  if (loading) {
    return <div className="screen center">Checking admin session...</div>
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
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
              className={currentTab === 'dashboard' ? '' : 'secondary'}
              onClick={() => setCurrentTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={currentTab === 'simulator' ? '' : 'secondary'}
              onClick={() => setCurrentTab('simulator')}
            >
              Sandbox Simulator
            </button>

            <div style={{ width: '1px', background: '#ccc', margin: '0 8px' }} />

            <button
              type="button"
              onClick={() => {
                if (!token) return
                loadDashboard(token).catch(() => setDataError('Refresh failed'))
              }}
            >
              Refresh Data
            </button>
            <button type="button" className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </section>

        {dataError ? <p className="error">{dataError}</p> : null}

        {currentTab === 'dashboard' ? (
          <DashboardTab
            metrics={metrics}
            sessions={sessions}
            events={events}
            pendingTasks={pendingTasks}
            onApprove={handleApprove}
            onReject={handleReject}
            fakeOverrideStatus={fakeOverrideStatus}
          />
        ) : (
          <SimulatorTab />
        )}
      </main>
    </div>
  )
}
