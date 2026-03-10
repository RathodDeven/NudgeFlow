import type { CsvUser } from '../types'

/**
 * Mock users parsed from dropoffs.csv for sandbox testing.
 * In production, these would come from the API / ingestion worker.
 */
const CSV_USERS: CsvUser[] = [
  {
    id: 'FBLS69951627185448',
    customerId: 'LS_POIOUY_VdEswDiAJl',
    name: 'KAMINI MANILAL PATEL',
    firmName: 'KAMINI IMITATION',
    mobile: '9328620693',
    status: 'FRESH_LOAN',
    loanAmount: 80000
  },
  {
    id: 'FBLS69964944022337',
    customerId: 'LS_POIOUY_gzEUMGLdyY',
    name: 'SURINDER SINGH',
    firmName: 'Surinder',
    mobile: '6026021647',
    status: 'FRESH_LOAN',
    loanAmount: 100000
  },
  {
    id: 'FBLS70096665895772',
    customerId: 'LS_POIOUY_hePDmpckPD',
    name: 'RAHUL DAS',
    firmName: 'RAHUL STORE',
    mobile: '8250496570',
    status: 'FRESH_LOAN',
    loanAmount: 95000
  },
  {
    id: 'FBLS70101262950895',
    customerId: 'LS_POIOUY_jmRdijhwyS',
    name: 'BIRANCHIBIPIN NARAYAN NAHAK',
    firmName: 'rk fabricks',
    mobile: '9512261643',
    status: 'FRESH_LOAN',
    loanAmount: 85000
  },
  {
    id: 'FBLS70139210578836',
    customerId: 'LS_POIOUY_kLMnopQrst',
    name: 'VINOD KUMAR',
    firmName: 'VINOD HARDWARE',
    mobile: '9876001234',
    status: 'FRESH_LOAN',
    loanAmount: 120000
  }
]

interface UserPickerProps {
  onSelect: (user: CsvUser) => void
  selectedUserId: string | null
}

export function UserPicker({ onSelect, selectedUserId }: UserPickerProps) {
  const selected = CSV_USERS.find(u => u.id === selectedUserId) ?? null

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <strong>👤 Act as User:</strong>
        <select
          value={selectedUserId ?? ''}
          onChange={e => {
            const user = CSV_USERS.find(u => u.id === e.target.value)
            if (user) onSelect(user)
          }}
          style={{ flex: 1, maxWidth: '320px' }}
        >
          <option value="" disabled>
            Select a user from CSV...
          </option>
          {CSV_USERS.map(u => (
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
