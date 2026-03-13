import type { CsvUser } from '../types'

export type UserHeaderProps = {
  user: CsvUser
  onClose: () => void
  onStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export const UserHeader = ({ user, onClose, onStatusChange }: UserHeaderProps) => {
  return (
    <div
      className="row"
      style={{
        borderBottom: '1px solid #eee',
        paddingBottom: '1rem',
        marginBottom: '1rem',
        alignItems: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="button" className="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>{user.name}</h2>
        <span className="badge info">{user.status}</span>
      </div>
      <div className="row gap-sm" style={{ alignItems: 'center' }}>
        <label htmlFor="status-override" className="muted" style={{ fontSize: '0.85rem' }}>
          Override Status:
        </label>
        <select
          id="status-override"
          value={user.status.toLowerCase()}
          onChange={onStatusChange}
          style={{ padding: '4px 8px', fontSize: '0.9rem' }}
        >
          <option value="journey_started">Journey Started</option>
          <option value="offer">Offer</option>
          <option value="fresh_loan">Fresh Loan</option>
          <option value="document_upload">Document Upload</option>
          <option value="loan_detail_submitted">Loan Detail Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="credit_decisioning">Credit Decisioning</option>
          <option value="approved">Approved</option>
          <option value="disbursal">Disbursal</option>
        </select>
      </div>
    </div>
  )
}
