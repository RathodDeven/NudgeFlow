import type { CsvUser } from '../types'
import { BrainCircuit, Info, ListTree, MessageSquareText } from 'lucide-react'

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export const InferencePanel = ({ user }: { user: CsvUser }) => {
  const extracted = user.inferenceExtractedData ?? {}
  const entries = Object.entries(extracted)

  return (
    <div className="space-y-6">
      {/* Core Inference Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Intent Class', value: user.inferredIntent, icon: BrainCircuit },
          { label: 'High Intent', value: user.highIntentFlag, icon: Info },
          { label: 'Disposition', value: user.lastCallDisposition, icon: ListTree },
          { label: 'Follow-up', value: user.followUpAt, icon: MessageSquareText },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
            </div>
            <p className="text-sm font-bold break-words">
              {toDisplay(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Extracted Analytics */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extracted Analytics</h4>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No extracted analytics captured yet.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map(([key, value]) => (
              <div key={key} className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <span className="block text-[10px] font-semibold text-muted-foreground mb-1 break-words">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="block text-xs font-medium break-words">
                  {toDisplay(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
