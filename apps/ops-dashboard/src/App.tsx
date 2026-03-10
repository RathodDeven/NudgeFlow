import { useCallback, useEffect, useMemo, useState } from 'react'
import { authFetch, initialMetrics, tokenKey } from './api/client'
import { CsvUpload } from './components/CsvUpload'
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
        createdAt: new Date().toISOString(),
        callPriority: 'P1',
        callReason: 'User reported bill mismatch — needs fallback document guidance',
        blockerCode: 'bill_mismatch',
        userName: 'KAMINI MANILAL PATEL',
        firmName: 'KAMINI IMITATION',
        mobile: '9328620693',
        loanAmount: 80000,
        pendingStep: 'Upload electricity bill (or alternate docs)',
        callScript:
          'Hi Kamini ji, main Neha bol rahi hoon ClickPe se.\n\nAapka loan ₹80,000 approved hai, bas documents upload karna hai.\n\nAgar electricity bill aapke naam pe nahi hai, toh aap:\n1. Relationship proof (ration card / rent agreement)\n2. Father ka Aadhaar card\n\nYe dono upload kar dijiye, main aapki application aage move kar dungi.\n\nKya aap abhi upload kar sakte hain?'
      },
      {
        id: 'mock-task-2',
        externalUserId: 'LS_POIOUY_gzEUMGLdyY',
        stage: 'fresh_loan',
        messageBody:
          'Hi Surinder! Neha here from ClickPe. Your 1 Lakh loan offer is waiting. Please upload your documents to proceed.',
        status: 'drafting_required',
        createdAt: new Date().toISOString(),
        callPriority: 'P2',
        callReason: 'No stage movement for 1 day after WhatsApp contact',
        blockerCode: 'confused',
        userName: 'SURINDER SINGH',
        firmName: 'Surinder',
        mobile: '6026021647',
        loanAmount: 100000,
        pendingStep: 'Upload Udyam card + electricity bill',
        callScript:
          'Hi Surinder ji, main Neha bol rahi hoon ClickPe se.\n\nAapka ₹1,00,000 ka loan offer ready hai. Aage badhne ke liye bas 2 documents chahiye:\n1. Udyam card\n2. Electricity bill\n\nKya aapko upload karne mein koi dikkat aa rahi hai? Main link bhej sakti hoon.'
      },
      {
        id: 'mock-task-3',
        externalUserId: 'LS_POIOUY_hePDmpckPD',
        stage: 'loan_detail_submitted',
        messageBody:
          'Rahul, aapke documents submit ho gaye hain! Ab digital verification baaki hai — DigiLocker, Aadhaar KYC, selfie.',
        status: 'drafting_required',
        createdAt: new Date().toISOString(),
        callPriority: 'P3',
        callReason: 'Documents submitted but verification not started for 2 days',
        blockerCode: 'technical_issue',
        userName: 'RAHUL DAS',
        firmName: 'RAHUL STORE',
        mobile: '8250496570',
        loanAmount: 95000,
        pendingStep: 'Complete DigiLocker + KYC + selfie + shop photo',
        callScript:
          'Hi Rahul ji, main Neha bol rahi hoon ClickPe se.\n\nAapke documents submit ho chuke hain — bahut accha!\n\nAb digital verification karna hai:\n1. DigiLocker verify karein\n2. Aadhaar KYC complete karein\n3. Selfie dein\n4. Shop ki photo upload karein\n\nKya koi technical issue aa raha hai? Main abhi link bhej sakti hoon.'
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

  const handleMarkCalled = (taskId: string) => {
    setPendingTasks(prev => prev.map(t => (t.id === taskId ? { ...t, called: true } : t)))
    setDataError('Call marked as completed!')
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
            onMarkCalled={handleMarkCalled}
            fakeOverrideStatus={fakeOverrideStatus}
            csvUploadSlot={
              token ? (
                <CsvUpload
                  apiBase="/api"
                  token={token}
                  onUploadComplete={() => token && loadDashboard(token)}
                />
              ) : null
            }
          />
        ) : (
          <SimulatorTab />
        )}
      </main>
    </div>
  )
}
