import type { CsvUser } from '../types'

interface UserPickerProps {
  users: CsvUser[]
  onSelect: (user: CsvUser) => void
  selectedUserId: string | null
}

export function UserPicker({ users, onSelect, selectedUserId }: UserPickerProps) {
  const selected = users.find(u => u.id === selectedUserId) ?? null

  if (users.length === 0) {
    return (
      <div
        style={{
          marginBottom: '1rem',
          padding: '10px 14px',
          background: '#fff8e1',
          border: '1px solid #ffe082',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#555'
        }}
      >
        ⚠️ No users loaded yet. Upload a CSV from the <strong>Dashboard</strong> tab first.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <strong>👤 Act as User:</strong>
        <select
          value={selectedUserId ?? ''}
          onChange={e => {
            const user = users.find(u => u.id === e.target.value)
            if (user) onSelect(user)
          }}
          style={{ flex: 1, maxWidth: '320px' }}
        >
          <option value="" disabled>
            Select a user from CSV...
          </option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} — ₹{u.loanAmount.toLocaleString('en-IN')} ({u.status})
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div
          style={{
            background: '#f0faf7',
            border: '1px solid #b2dfdb',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.9rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 16px'
          }}
        >
          <span>
            <strong>Name:</strong> {selected.name}
          </span>
          <span>
            <strong>Firm:</strong> {selected.firmName}
          </span>
          <span>
            <strong>Mobile:</strong> {selected.mobile}
          </span>
          <span>
            <strong>Loan:</strong> ₹{selected.loanAmount.toLocaleString('en-IN')}
          </span>
          <span>
            <strong>Stage:</strong> {selected.status.toLowerCase()}
          </span>
          <span>
            <strong>ID:</strong> <code style={{ fontSize: '0.8rem' }}>{selected.customerId}</code>
          </span>
        </div>
      )}
    </div>
  )
}
