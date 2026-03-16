import { AlertCircle, CheckCircle2, Circle, Clock, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
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

type VoiceStatusPanelProps = {
  scheduledActions: ScheduledAction[]
  callAttempts: CallAttempt[]
}

export const VoiceStatusPanel = ({ scheduledActions, callAttempts }: VoiceStatusPanelProps) => {
  const sortedScheduled = [...scheduledActions].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  )

  const sortedAttempts = [...callAttempts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="space-y-8 p-4">
      {/* Visual Timeline Section */}
      <div className="relative">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
          <PhoneOutgoing className="h-4 w-4" />
          Voice Interaction Roadmap
        </h3>

        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-blue-200 before:to-transparent">
          {/* Upcoming / Scheduled */}
          {sortedScheduled.length === 0 && sortedAttempts.length === 0 && (
            <div className="flex items-center gap-6 relative ml-2 text-muted-foreground italic text-sm">
              No interaction history or scheduled events.
            </div>
          )}

          {sortedScheduled.map(action => (
            <div key={action.id} className="relative flex items-center gap-6 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 border-4 border-white shadow-sm shrink-0 z-10 transition-transform group-hover:scale-110">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 bg-white p-3 rounded-xl border shadow-sm transition-all group-hover:shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-700 capitalize">
                    {action.actionSubtype || action.actionType}
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">
                    {action.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Due: {formatTime(action.dueAt)}
                  {action.retryCount > 0 && (
                    <span className="text-orange-600 font-semibold">• Retry {action.retryCount}</span>
                  )}
                </div>
                {action.lastError && (
                  <div className="mt-2 text-[10px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {action.lastError}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Past Attempts */}
          {sortedAttempts.map(attempt => (
            <div key={attempt.id} className="relative flex items-center gap-6 group">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow-sm shrink-0 z-10 transition-transform group-hover:scale-110 ${
                  attempt.disposition === 'answered' ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                {attempt.disposition === 'answered' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <PhoneIncoming className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className="flex-1 bg-white/60 p-3 rounded-xl border border-dashed shadow-sm transition-all group-hover:shadow-md backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold uppercase ${
                      attempt.disposition === 'answered' ? 'text-green-700' : 'text-muted-foreground'
                    }`}
                  >
                    Call {attempt.disposition || 'Attempt'}
                  </span>
                  {attempt.durationSeconds && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {attempt.durationSeconds}s
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground italic">{formatTime(attempt.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
