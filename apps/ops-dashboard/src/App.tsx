import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  authFetch,
  downloadInferredUsersCsv,
  getUntouchedCount,
  initialMetrics,
  startUntouchedBatch,
  tokenKey
} from './api/client'
import { CsvUpload } from './components/CsvUpload'
import { DashboardTab } from './components/DashboardTab'
import { Login } from './components/Login'
import { UserDetailView } from './components/UserDetailView'
import type { CsvUser, EventItem, FunnelMetrics, PendingHITLTask, SessionItem } from './types'

const toDisplayMobile = (phoneE164: string): string => {
  const digits = String(phoneE164 ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  return digits
}

export function App() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const [metrics, setMetrics] = useState<FunnelMetrics>(initialMetrics)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [pendingTasks, setPendingTasks] = useState<PendingHITLTask[]>([])
  const [csvUsers, setCsvUsers] = useState<CsvUser[]>([])
  const [untouchedCount, setUntouchedCount] = useState<number>(0)
  const [isBatchStarting, setIsBatchStarting] = useState<boolean>(false)
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false)
  const [scheduleAtLocal, setScheduleAtLocal] = useState<string>('')
  const [dataError, setDataError] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<CsvUser | null>(null)

  const isAuthenticated = useMemo(() => Boolean(token), [token])

  const loadDashboard = useCallback(async (authToken: string): Promise<void> => {
    setDataError('')
    const [funnel, sessionPayload, eventsPayload, untouched] = await Promise.all([
      authFetch<FunnelMetrics>('/metrics/funnel', authToken).catch(() => initialMetrics),
      authFetch<{ sessions: SessionItem[] }>('/dashboard/sessions', authToken).catch(() => ({
        sessions: []
      })),
      authFetch<{ events: EventItem[] }>('/dashboard/events', authToken).catch(() => ({ events: [] })),
      getUntouchedCount(authToken).catch(() => ({ count: 0 }))
    ])

    setMetrics(funnel)
    setSessions(sessionPayload.sessions)
    setEvents(eventsPayload.events)
    setUntouchedCount(untouched.count)
    setPendingTasks([])

    // Load real CSV users from API (populated via CSV upload)
    authFetch<{
      users: Array<{
        id: string
        externalUserId: string
        fullName: string | null
        phoneE164: string
        currentStage?: string
        loanAmount?: number
        firmName?: string
        metadata?: Record<string, unknown>
        applicationCreatedAt?: string
        applicationUpdatedAt?: string
        inferredIntent?: string | null
        highIntentFlag?: string | null
        followUpAt?: string | null
        callSummaryLatest?: string | null
        callNotesLatest?: string | null
        lastCallAt?: string | null
        lastCallDisposition?: string | null
        inferenceExtractedData?: Record<string, unknown>
        inferenceContextDetails?: Record<string, unknown>
      }>
    }>('/users', authToken)
      .then(res =>
        setCsvUsers(
          res.users.map(u => ({
            id: u.id,
            customerId: u.externalUserId,
            name: u.fullName ?? 'Unknown',
            firmName: u.firmName ?? '',
            mobile: toDisplayMobile(u.phoneE164),
            status: (u.currentStage ?? 'fresh_loan').toUpperCase(),
            loanAmount: u.loanAmount ?? 0,
            metadata: u.metadata,
            applicationCreatedAt: u.applicationCreatedAt,
            applicationUpdatedAt: u.applicationUpdatedAt,
            inferredIntent: u.inferredIntent,
            highIntentFlag: u.highIntentFlag,
            followUpAt: u.followUpAt,
            callSummaryLatest: u.callSummaryLatest,
            callNotesLatest: u.callNotesLatest,
            lastCallAt: u.lastCallAt,
            lastCallDisposition: u.lastCallDisposition,
            inferenceExtractedData: u.inferenceExtractedData,
            inferenceContextDetails: u.inferenceContextDetails
          }))
        )
      )
      .catch(() => setCsvUsers([]))
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
    setCsvUsers([])
    setUntouchedCount(0)
    setSelectedUser(null)
  }

  const handleBatchStartUntouched = async (): Promise<void> => {
    if (!token || isBatchStarting) return
    const proceed = window.confirm(`Run Bolna batch now for ${untouchedCount} untouched users?`)
    if (!proceed) return

    setIsBatchStarting(true)
    setDataError('')
    try {
      const res = await startUntouchedBatch(token, { runMode: 'run_now' })
      const message = res.batchError
        ? `Batch request failed: ${res.batchError}`
        : `Batch ${res.batch?.batchId ?? 'created'} ${res.batch?.state ?? 'scheduled'} (${res.batch?.csvRows ?? 0} rows)`
      setDataError(message)
      await loadDashboard(token)
    } catch (error) {
      setDataError(`Batch start failed: ${(error as Error).message}`)
    } finally {
      setIsBatchStarting(false)
      setTimeout(() => setDataError(''), 6000)
    }
  }

  const handleBatchScheduleUntouched = async (): Promise<void> => {
    if (!token || isBatchStarting || !scheduleAtLocal) return

    const scheduledAtIso = new Date(scheduleAtLocal).toISOString()
    const proceed = window.confirm(
      `Schedule Bolna batch for ${untouchedCount} untouched users at ${new Date(scheduledAtIso).toLocaleString()}?`
    )
    if (!proceed) return

    setIsBatchStarting(true)
    setDataError('')
    try {
      const res = await startUntouchedBatch(token, { runMode: 'schedule', scheduledAt: scheduledAtIso })
      const message = res.batchError
        ? `Batch schedule failed: ${res.batchError}`
        : `Batch ${res.batch?.batchId ?? 'created'} scheduled at ${res.batch?.scheduledAt ?? scheduledAtIso}`
      setDataError(message)
      await loadDashboard(token)
    } catch (error) {
      setDataError(`Batch schedule failed: ${(error as Error).message}`)
    } finally {
      setIsBatchStarting(false)
      setTimeout(() => setDataError(''), 6000)
    }
  }

  const handleExportInferredCsv = async (filters?: {
    intent?: string
    highIntent?: string
  }): Promise<void> => {
    if (!token || isExportingCsv) return
    setIsExportingCsv(true)
    setDataError('')
    try {
      const blob = await downloadInferredUsersCsv(token, filters)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'inferred-users-latest.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setDataError('Inferred users CSV exported.')
    } catch (error) {
      setDataError(`CSV export failed: ${(error as Error).message}`)
    } finally {
      setIsExportingCsv(false)
      setTimeout(() => setDataError(''), 4000)
    }
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
    setCsvUsers(prev =>
      prev.map(u =>
        u.customerId === userId || u.id === userId ? { ...u, status: newStatus.toUpperCase() } : u
      )
    )
    if (selectedUser && (selectedUser.id === userId || selectedUser.customerId === userId)) {
      setSelectedUser({ ...selectedUser, status: newStatus.toUpperCase() })
    }
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
            <div className="row gap-xs" style={{ alignItems: 'center' }}>
              <p className="muted">Protected dashboard. Admin auth required.</p>
              <span
                className={`badge ${process.env.NODE_ENV === 'production' ? 'off' : 'on'}`}
                style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}
              >
                {process.env.NODE_ENV === 'production' ? '● Production' : '● Sandbox'}
              </span>
            </div>
          </div>
          <div className="row gap-sm">
            <button
              type="button"
              className={!selectedUser ? '' : 'secondary'}
              onClick={() => {
                setSelectedUser(null)
              }}
            >
              Dashboard
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

        {selectedUser ? (
          <UserDetailView
            user={selectedUser}
            token={token ?? ''}
            onClose={() => setSelectedUser(null)}
            onStatusChange={fakeOverrideStatus}
            pendingTasks={pendingTasks}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
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
            csvUsers={csvUsers}
            onUserSelect={user => setSelectedUser(user)}
            untouchedCount={untouchedCount}
            isBatchStarting={isBatchStarting}
            isExportingCsv={isExportingCsv}
            scheduleAtLocal={scheduleAtLocal}
            onScheduleAtLocalChange={setScheduleAtLocal}
            onBatchRunNowUntouched={handleBatchStartUntouched}
            onBatchScheduleUntouched={handleBatchScheduleUntouched}
            onExportInferredCsv={handleExportInferredCsv}
          />
        )}
      </main>
    </div>
  )
}
