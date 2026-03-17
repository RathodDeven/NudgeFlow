import { cn } from '@/lib/utils'
import type { CsvUser } from '@/types'
import {
  ArrowRight,
  Calendar,
  Clock,
  Download,
  MoreHorizontal,
  Phone,
  Search,
  Upload,
  UserPlus,
  Users as UsersIcon
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

interface UsersPageProps {
  csvUsers: CsvUser[]
  onUserSelect: (user: CsvUser) => void
  csvUploadSlot?: ReactNode
  isExportingCsv: boolean
  onExportInferredCsv: (filters?: { intent?: string; highIntent?: string }) => void
  untouchedCount: number
  onBatchRunNowUntouched: () => void
  onBatchScheduleUntouched: (time: string) => void
  isBatchStarting: boolean
}

export function UsersPage({
  csvUsers,
  onUserSelect,
  csvUploadSlot,
  isExportingCsv,
  onExportInferredCsv,
  untouchedCount,
  onBatchRunNowUntouched,
  onBatchScheduleUntouched,
  isBatchStarting
}: UsersPageProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'untouched'>('untouched')
  const [searchTerm, setSearchTerm] = useState('')
  const [intentFilter, setIntentFilter] = useState('')
  const [highIntentFilter, setHighIntentFilter] = useState('')
  const [scheduleAtLocal, setScheduleAtLocal] = useState('')

  const untouchedUsers = useMemo(() => {
    return csvUsers.filter(
      u => (!u.status || u.status === 'FRESH_LOAN') && !u.lastCallAt && !u.inferredIntent
    )
  }, [csvUsers])

  const displayedUsers = activeTab === 'all' ? csvUsers : untouchedUsers

  const filteredUsers = useMemo(() => {
    return displayedUsers.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.mobile.includes(searchTerm)

      const matchesIntent = !intentFilter || user.inferredIntent === intentFilter
      const matchesHighIntent = !highIntentFilter || user.highIntentFlag === highIntentFilter

      return matchesSearch && matchesIntent && matchesHighIntent
    })
  }, [displayedUsers, searchTerm, intentFilter, highIntentFilter])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage and monitor loan applications and user interactions.</p>
        </div>
        <div className="flex items-center gap-2 text-left">
          <button
            type="button"
            onClick={() =>
              onExportInferredCsv({
                intent: intentFilter || undefined,
                highIntent: highIntentFilter || undefined
              })
            }
            disabled={isExportingCsv}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent h-9 px-4 py-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <UsersIcon className="h-4 w-4" />
          All Users
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">{csvUsers.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('untouched')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'untouched'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <UserPlus className="h-4 w-4" />
          Untouched
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
            {untouchedCount}
          </span>
        </button>
      </div>

      {activeTab === 'untouched' && (
        <div className="grid gap-6 md:grid-cols-2">
          {csvUploadSlot && (
            <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Bulk Upload</h3>
              </div>
              {csvUploadSlot}
            </div>
          )}

          <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-left">Batch Outreach</h3>
            </div>

            <div className="space-y-4 text-left">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm text-muted-foreground mb-3">
                  Start outreach for <span className="font-bold text-foreground">{untouchedCount}</span> users
                  who haven't been contacted yet.
                </p>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2 font-semibold shadow-md transition-all disabled:opacity-50"
                  disabled={isBatchStarting || untouchedCount === 0}
                  onClick={onBatchRunNowUntouched}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {isBatchStarting ? 'Starting...' : 'Run Batch Now'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or Schedule</span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={scheduleAtLocal}
                    onChange={e => setScheduleAtLocal(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onBatchScheduleUntouched(scheduleAtLocal)}
                  disabled={isBatchStarting || untouchedCount === 0 || !scheduleAtLocal}
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background h-11 px-4 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search users..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={intentFilter}
          onChange={e => setIntentFilter(e.target.value)}
        >
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

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={highIntentFilter}
          onChange={e => setHighIntentFilter(e.target.value)}
        >
          <option value="">All High Intent</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-left">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/50">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">User</th>
                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">
                  Loan Amount
                </th>
                <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Intent</th>
                <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/30 cursor-pointer',
                      user.highIntentFlag === 'yes' && 'bg-green-50/30 hover:bg-green-100/30'
                    )}
                    onClick={() => onUserSelect(user)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onUserSelect(user)
                      }
                    }}
                  >
                    <td className="p-4 px-6 align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.name}</span>
                        <code className="text-[10px] text-muted-foreground">{user.customerId}</code>
                      </div>
                    </td>
                    <td className="p-4 px-6 align-middle">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{user.mobile}</span>
                      </div>
                    </td>
                    <td className="p-4 px-6 align-middle">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 px-6 align-middle font-medium">
                      ₹{user.loanAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 px-6 align-middle">
                      {user.inferredIntent ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border tracking-wider',
                            user.highIntentFlag === 'yes'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {user.inferredIntent}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs italic">Pending</span>
                      )}
                    </td>
                    <td className="p-4 px-6 align-middle text-right">
                      <button
                        type="button"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
