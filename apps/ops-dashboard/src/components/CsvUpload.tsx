import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, FileText, FileUp, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface CsvUploadProps {
  apiBase: string
  token: string
  onUploadComplete: () => void
}

type ParsedRow = Record<string, string>

const parseCSV = (text: string): ParsedRow[] => {
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalised) return []

  const tokeniseLine = (line: string): string[] => {
    const fields: string[] = []
    let i = 0
    while (i <= line.length) {
      if (line[i] === '"') {
        let j = i + 1
        let value = ''
        while (j < line.length) {
          if (line[j] === '"') {
            if (line[j + 1] === '"') {
              value += '"'
              j += 2
            } else {
              j++
              break
            }
          } else {
            value += line[j]
            j++
          }
        }
        fields.push(value.trim())
        if (line[j] === ',') j++
        i = j
      } else {
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
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    setParsedRows([])
    setFileName('')
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (parsedRows.length === 0) return
    setUploading(true)
    setResult(null)

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
        setResult({ type: 'error', message: `Upload failed: ${err.error ?? response.status}` })
        return
      }

      const data = await response.json()
      setResult({
        type: 'success',
        message: `Successfully uploaded ${data.inserted} users (${data.skipped} existing skipped).`
      })
      setParsedRows([])
      setFileName('')
      onUploadComplete()
    } catch (err) {
      setResult({ type: 'error', message: `Error: ${(err as Error).message}` })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!fileName ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click()
            }
          }}
          className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 transition-all hover:bg-muted/50 hover:border-primary/50 cursor-pointer text-center group"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <FileUp className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Click to upload CSV</p>
              <p className="text-xs text-muted-foreground">Properly formatted user drop-off data</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/40 rounded-xl p-6 border border-border animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-foreground leading-none">{fileName}</h4>
                <p className="text-xs text-muted-foreground">{parsedRows.length} rows parsed successfully</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-full hover:bg-background text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {parsedRows.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Data Preview
              </p>
              <div className="p-3 rounded-lg bg-background/50 border border-border flex flex-wrap gap-2 text-xs">
                {parsedRows.slice(0, 5).map((row, i) => (
                  <span
                    key={`${row.name || row.customer_name || 'row'}-${i}`}
                    className="px-2 py-1 rounded bg-muted text-muted-foreground"
                  >
                    {row.name || row.customer_name || 'User'}
                  </span>
                ))}
                {parsedRows.length > 5 && (
                  <span className="px-2 py-1 text-muted-foreground italic">
                    + {parsedRows.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || parsedRows.length === 0}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-11 px-8 font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${parsedRows.length} Users`
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={uploading}
              className="px-4 h-11 border border-input bg-background rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Reselect
            </button>
          </div>
        </div>
      )}

      {result && (
        <div
          className={cn(
            'p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300',
            result.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          )}
        >
          {result.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          )}
          <p className="text-sm font-medium">{result.message}</p>
        </div>
      )}
    </div>
  )
}
