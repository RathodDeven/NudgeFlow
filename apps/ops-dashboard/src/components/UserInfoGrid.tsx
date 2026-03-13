import type { CsvUser } from '../types'

export const UserInfoGrid = ({ user }: { user: CsvUser }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: '8px'
      }}
    >
      <div>
        <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
          Mobile
        </p>
        <p style={{ margin: 0 }}>
          <strong>{user.mobile}</strong>
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
          Customer ID
        </p>
        <p style={{ margin: 0 }}>
          <code>{user.customerId}</code>
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
          Loan Amount
        </p>
        <p style={{ margin: 0 }}>
          <strong>₹{user.loanAmount.toLocaleString('en-IN')}</strong>
        </p>
      </div>
      {user.firmName && (
        <div>
          <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
            Firm Name
          </p>
          <p style={{ margin: 0 }}>
            <strong>{user.firmName}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
