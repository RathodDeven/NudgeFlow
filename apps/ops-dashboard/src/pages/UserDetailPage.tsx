import { cn } from '@/lib/utils'
import type { CsvUser, PendingHITLTask } from '@/types'
import {
  ArrowLeft,
  Calendar,
  History,
  Info,
  MessageSquare,
  PhoneCall,
  Settings as SettingsIcon,
  ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import { ChatPanel } from '../components/ChatPanel'
import { InferencePanel } from '../components/InferencePanel'
import { ManualMessagePanel } from '../components/ManualMessagePanel'
import { PendingTasksPanel } from '../components/PendingTasksPanel'
import { SandboxPanel } from '../components/SandboxPanel'
import { VoiceStatusPanel } from '../components/VoiceStatusPanel'
import { useUserDetailState } from '../components/useUserDetailState'

interface UserDetailPageProps {
  user: CsvUser
  token: string
  onClose: () => void
  onStatusChange: (userId: string, newStatus: string) => void
  pendingTasks: PendingHITLTask[]
  onApprove: (taskId: string) => void
  onReject: (taskId: string) => void
  globalUseWhatsapp: boolean
}

export function UserDetailPage({
  user,
  token,
  onClose,
  onStatusChange,
  pendingTasks,
  onApprove,
  onReject,
  globalUseWhatsapp
}: UserDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'info' | 'voice'>('chat')
  const [preferredCallAt, setPreferredCallAt] = useState('')

  const {
    isSandbox,
    messages,
    isLoading,
    isAgentActive,
    userTasks,
    handleStatusChange,
    handleAgentToggle,
    sandbox,
    manual,
    voiceStatus,
    lastInboundAt
  } = useUserDetailState({ user, token, pendingTasks, onStatusChange, globalUseWhatsapp })

  const preferredCallAtIso = preferredCallAt ? new Date(preferredCallAt).toISOString() : undefined

  const tabs = [
    { id: 'chat', label: 'Conversation', icon: MessageSquare },
    { id: 'info', label: 'User Info', icon: Info },
    { id: 'voice', label: 'Voice/Calls', icon: PhoneCall }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 border border-input bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
              {user.customerId}
            </code>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs font-medium text-muted-foreground">{user.mobile}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={user.status}
            onChange={handleStatusChange}
          >
            <option value={user.status}>{user.status}</option>
            <option value="loan_detail_submitted">Loan Detail Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="credit_decisioning">Credit Decisioning</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center border-b border-border w-full overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'chat' | 'info' | 'voice')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap',
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="min-h-[500px] rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm p-4">
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full gap-6">
                <ChatPanel
                  isLoading={isLoading}
                  isSending={sandbox.isSending}
                  isAgentActive={isAgentActive}
                  messages={messages}
                  userName={user.name}
                  onToggleAgent={handleAgentToggle}
                  manualPanel={
                    <div className="flex flex-col gap-6 mt-4">
                      <ManualMessagePanel
                        isSandbox={isSandbox}
                        useWhatsapp={manual.useWhatsapp}
                        lastInboundAt={lastInboundAt}
                        onInsertTemplate={() => manual.handleSendManualMessage()}
                        status={manual.manualStatus}
                        isSending={manual.isManualSending}
                        message={manual.agentInputMessage}
                        onChange={manual.setAgentInputMessage}
                        onSend={() => manual.handleSendManualMessage()}
                      />

                      {isSandbox && (
                        <SandboxPanel
                          userName={user.name}
                          status={sandbox.sandboxStatus}
                          isSending={sandbox.isSending}
                          message={sandbox.inputMessage}
                          onChange={sandbox.setInputMessage}
                          onSend={sandbox.handleSimulateMessage}
                        />
                      )}
                    </div>
                  }
                />
              </div>
            )}

            {activeTab === 'info' && (
              <div className="space-y-6">
                <InferencePanel user={user} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      Application Timeline
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Submitted At</span>
                        <span className="font-medium">
                          {user.applicationCreatedAt
                            ? new Date(user.applicationCreatedAt).toLocaleString()
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span className="font-medium">
                          {user.applicationUpdatedAt
                            ? new Date(user.applicationUpdatedAt).toLocaleString()
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4 text-primary" />
                      System Metadata
                    </h4>
                    <div className="space-y-3">
                      {user.metadata &&
                        Object.entries(user.metadata)
                          .slice(0, 4)
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs overflow-hidden">
                              <span className="text-muted-foreground truncate mr-2">{k}</span>
                              <span className="font-medium truncate">{String(v)}</span>
                            </div>
                          ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Outreach Control</h4>
                    {voiceStatus.outreachStatus && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {voiceStatus.outreachStatus}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 mt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="call-time">
                        Preferred Call Time (Optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <input
                          id="call-time"
                          type="datetime-local"
                          value={preferredCallAt}
                          onChange={e => setPreferredCallAt(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => voiceStatus.handleStartConversation(preferredCallAtIso)}
                        disabled={voiceStatus.isStartingOutreach}
                        className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50"
                      >
                        Start Outreach
                      </button>
                      <button
                        type="button"
                        onClick={voiceStatus.handleCancelCalls}
                        disabled={voiceStatus.isCancelling}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                <VoiceStatusPanel
                  scheduledActions={voiceStatus.scheduledActions}
                  callAttempts={voiceStatus.callAttempts}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-2">
              <h3 className="font-semibold text-sm">Key Facts</h3>
            </div>
            <div className="p-6 pt-2 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Loan Amount</span>
                <span className="text-lg font-bold">₹{user.loanAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Latest Disposition</span>
                <span className="text-sm font-medium">{user.lastCallDisposition || 'No calls yet'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">High Intent</span>
                <span
                  className={cn(
                    'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase',
                    user.highIntentFlag === 'yes'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {user.highIntentFlag || 'No'}
                </span>
              </div>
              <div className="pt-4 border-t">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-input bg-background hover:bg-accent h-9 px-4 text-xs"
                  onClick={() => setActiveTab('info')}
                >
                  View Full Details
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold text-sm mb-4">Latest Summary</h3>
            <p className="text-xs text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
              {user.callSummaryLatest || 'No call summary available yet for this user.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
