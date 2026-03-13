import type { PendingHITLTask } from '../types'

type PendingTasksPanelProps = {
  tasks: PendingHITLTask[]
  onApprove: (taskId: string) => void
  onReject: (taskId: string) => void
}

export const PendingTasksPanel = ({ tasks, onApprove, onReject }: PendingTasksPanelProps) => {
  if (tasks.length === 0) return null

  return (
    <div
      style={{
        marginBottom: '2rem',
        padding: '1rem',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px'
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', color: '#b45309' }}>⏸️ AI Pending Approval</h3>
      {tasks.map(task => (
        <div
          key={task.id}
          style={{
            background: '#fff',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '0.5rem',
            border: '1px solid #fef3c7'
          }}
        >
          <p style={{ margin: '0 0 0.5rem 0' }}>
            <strong>Message Draft:</strong>
          </p>
          <pre
            style={{
              margin: '0 0 1rem 0',
              whiteSpace: 'pre-wrap',
              background: '#f9f9f9',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            {task.messageBody}
          </pre>
          <div className="row gap-sm">
            <button
              type="button"
              onClick={() => onApprove(task.id)}
              style={{ background: '#10b981', color: 'white', border: 'none' }}
            >
              Approve & Send
            </button>
            <button type="button" onClick={() => onReject(task.id)} className="secondary">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
