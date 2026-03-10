import { useState } from 'react'

interface CsvUploadProps {
  apiBase: string
  token: string
  onUploadComplete: () => void
}

type ParsedRow = Record<string, string>

const parseCSV = (text: string): ParsedRow[] => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/^["']+|["']+$/g, '').trim())
    const row: ParsedRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }
  return rows
}

export function CsvUpload({ apiBase, token, onUploadComplete }: CsvUploadProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult('')

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (parsedRows.length === 0) return
    setUploading(true)
    setResult('')

    try {
      const response = await fetch(`${apiBase}/users/upload-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rows: parsedRows })
      })

      if (!response.ok) {
        const err = await response.json()
        setResult(`❌ Upload failed: ${err.error ?? response.status}`)
        return
      }

      const data = await response.json()
      setResult(`✅ Uploaded! ${data.inserted} inserted, ${data.skipped} skipped (${data.total} total)`)
      setParsedRows([])
      setFileName('')
      onUploadComplete()
    } catch (err) {
      setResult(`❌ Error: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="row gap-sm" style={{ marginBottom: '0.75rem' }}>
        <input type="file" accept=".csv" onChange={handleFileChange} style={{ flex: 1 }} />
        <button type="button" onClick={handleUpload} disabled={uploading || parsedRows.length === 0}>
          {uploading ? 'Uploading...' : `📤 Upload ${parsedRows.length} Users`}
        </button>
      </div>

      {fileName && parsedRows.length > 0 && (
        <div
          style={{
            background: '#f0faf7',
            border: '1px solid #b2dfdb',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '0.85rem',
            marginBottom: '0.5rem'
          }}
        >
          <strong>{fileName}</strong> — {parsedRows.length} rows parsed. Preview:{' '}
          {parsedRows
            .slice(0, 3)
            .map(r => r.name || r.full_name || 'Unknown')
            .join(', ')}
          {parsedRows.length > 3 && ` ...and ${parsedRows.length - 3} more`}
        </div>
      )}

      {result && (
        <p
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: result.startsWith('✅') ? '#dcf8c6' : '#fee2e2',
            fontSize: '0.85rem'
          }}
        >
          {result}
        </p>
      )}
    </div>
  )
}
