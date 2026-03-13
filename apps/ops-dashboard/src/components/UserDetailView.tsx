import { useState } from 'react'
import type { CsvUser, PendingHITLTask } from '../types'
import { ChatPanel } from './ChatPanel'
import { ManualMessagePanel } from './ManualMessagePanel'
import { PendingTasksPanel } from './PendingTasksPanel'
import { SandboxPanel } from './SandboxPanel'
import { UserHeader } from './UserHeader'
import { UserInfoGrid } from './UserInfoGrid'
import { VoiceStatusPanel } from './VoiceStatusPanel'
import { useUserDetailState } from './useUserDetailState'

interface UserDetailViewProps {
  user: CsvUser
  token: string
  onClose: () => void
  onStatusChange: (userId: string, newStatus: string) => void
  pendingTasks: PendingHITLTask[]
  onApprove: (taskId: string) => void
  onReject: (taskId: string) => void
}

export function UserDetailView({
  user,
  token,
  onClose,
  onStatusChange,
  pendingTasks,
  onApprove,
  onReject
}: UserDetailViewProps) {
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
    voiceStatus
  } = useUserDetailState({ user, token, pendingTasks, onStatusChange })

  const [preferredCallAt, setPreferredCallAt] = useState('')

  const preferredCallAtIso = preferredCallAt ? new Date(preferredCallAt).toISOString() : undefined

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <UserHeader user={user} onClose={onClose} onStatusChange={handleStatusChange} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}
      >
        <button
          type="button"
          onClick={() => voiceStatus.handleStartConversation(preferredCallAtIso)}
          disabled={voiceStatus.isStartingOutreach}
        >
          Start Conversation
        </button>
        <button
          type="button"
          className="secondary"
          onClick={voiceStatus.handleCancelCalls}
          disabled={voiceStatus.isCancelling}
        >
          Cancel Calls
        </button>
        <label className="muted" style={{ fontSize: '0.85rem' }} htmlFor="preferred-call-at">
          Preferred call time (optional):
        </label>
        <input
          id="preferred-call-at"
          type="datetime-local"
          value={preferredCallAt}
          onChange={e => setPreferredCallAt(e.target.value)}
          style={{ padding: '6px 8px', fontSize: '0.85rem' }}
        />
        {voiceStatus.outreachStatus && <span className="muted">{voiceStatus.outreachStatus}</span>}
      </div>

      <UserInfoGrid user={user} />

      <PendingTasksPanel tasks={userTasks} onApprove={onApprove} onReject={onReject} />

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <ChatPanel
          isLoading={isLoading}
          isSending={sandbox.isSending}
          isAgentActive={isAgentActive}
          messages={messages}
          userName={user.name}
          onToggleAgent={handleAgentToggle}
          manualPanel={
            <ManualMessagePanel
              isSandbox={isSandbox}
              useWhatsapp={manual.useWhatsapp}
              onToggleWhatsapp={manual.setUseWhatsapp}
              onInsertTemplate={() =>
                manual.handleSendManualMessage(
                  `Namaste ${user.name}!\n\nWe saw you dropped off during the ${user.status} step. Do you need any help?`
                )
              }
              status={manual.manualStatus}
              isSending={manual.isManualSending}
              message={manual.agentInputMessage}
              onChange={manual.setAgentInputMessage}
              onSend={() => manual.handleSendManualMessage()}
            />
          }
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

      <VoiceStatusPanel
        scheduledActions={voiceStatus.scheduledActions}
        callAttempts={voiceStatus.callAttempts}
      />
    </div>
  )
}
