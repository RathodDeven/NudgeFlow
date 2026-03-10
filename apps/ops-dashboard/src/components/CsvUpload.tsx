import { useState } from 'react'

interface CsvUploadProps {
  apiBase: string
  token: string
  onUploadComplete: () => void
}

type ParsedRow = Record<string, string>

/**
 * RFC 4180-compliant CSV parser.
 * Handles: quoted fields with embedded commas, escaped quotes (""),
 * CRLF/LF line endings, and leading/trailing whitespace on headers.
 */
const parseCSV = (text: string): ParsedRow[] => {
  // Normalise line endings
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalised) return []

  // Tokenise the whole file respecting quoted fields
  const tokeniseLine = (line: string): string[] => {
    const fields: string[] = []
    let i = 0
    while (i <= line.length) {
      if (line[i] === '"') {
        // Quoted field — scan forward for closing quote
        let j = i + 1
        let value = ''
        while (j < line.length) {
          if (line[j] === '"') {
            if (line[j + 1] === '"') {
              // Escaped quote
              value += '"'
              j += 2
            } else {
              j++ // skip closing quote
              break
            }
          } else {
            value += line[j]
            j++
          }
        }
        fields.push(value.trim())
        // Skip comma separator
        if (line[j] === ',') j++
        i = j
      } else {
        // Unquoted field — read until next comma
        const end = line.indexOf(',', i)
        if (end === -1) {
          fields.push(line.slice(i).trim())
          break
        }
        fields.push(line.slice(i, end).trim())
        i = end + 1
      }
    }
    return fields
  }

  const lines = normalised.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = tokeniseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = tokeniseLine(lines[i])
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
