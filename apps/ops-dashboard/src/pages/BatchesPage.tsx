import { cn } from '@/lib/utils'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Square,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { deleteBatch, listBatches, stopBatch } from '../api/client'
import type { BolnaBatchItem } from '../types'

interface BatchesPageProps {
  token: string
}

export function BatchesPage({ token }: BatchesPageProps) {
  const [batches, setBatches] = useState<BolnaBatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listBatches(token)
      setBatches(res.batches)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const handleStop = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to stop this batch?')) return
    setActionLoading(batchId)
    try {
      await stopBatch(token, batchId)
      await fetchBatches()
    } catch (err) {
      alert(`Failed to stop batch: ${(err as Error).message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return
    setActionLoading(batchId)
    try {
      await deleteBatch(token, batchId)
      await fetchBatches()
    } catch (err) {
      alert(`Failed to delete batch: ${(err as Error).message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'executed':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Executed
          </span>
        )
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <Calendar className="h-3 w-3" />
            Scheduled
          </span>
        )
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        )
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Square className="h-3 w-3" />
            Stopped
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  const filteredBatches = batches.filter(
    b =>
      b.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.file_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Batches</h2>
          <p className="text-muted-foreground">
            Manage your outgoing voice call batches and monitor their progress.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchBatches}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID or Filename..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 font-semibold">Batch Details</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Contacts</th>
                <th className="px-6 py-4 font-semibold text-center">Execution Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary/50" />
                    Fetching batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No batches found.
                  </td>
                </tr>
              ) : (
                filteredBatches.map(batch => (
                  <tr key={batch.batch_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {batch.file_name || 'Manual Batch'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {batch.batch_id}
                        </span>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {batch.humanized_created_at}
                          </span>
                          {batch.scheduled_at && (
                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                              <Calendar className="h-3 w-3" />
                              {new Date(batch.scheduled_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(batch.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{batch.valid_contacts}</span>
                        <span className="text-xs text-muted-foreground">of {batch.total_contacts}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-center gap-2 max-w-[200px] mx-auto">
                        {batch.execution_status ? (
                          <>
                            {batch.execution_status.completed > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-green-50 text-[10px] font-bold text-green-700 border border-green-100">
                                {batch.execution_status.completed} DONE
                              </span>
                            )}
                            {batch.execution_status.ringing > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100 animate-pulse">
                                {batch.execution_status.ringing} RING
                              </span>
                            )}
                            {batch.execution_status['in-progress'] > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-100">
                                {batch.execution_status['in-progress']} CALL
                              </span>
                            )}
                            {Object.values(batch.execution_status).reduce((a, b) => a + b, 0) === 0 && (
                              <span className="text-xs text-muted-foreground italic">
                                No current activity
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Pending...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {['scheduled', 'queued', 'ringing', 'in-progress'].includes(
                          batch.status.toLowerCase()
                        ) && (
                          <button
                            type="button"
                            onClick={() => handleStop(batch.batch_id)}
                            disabled={actionLoading === batch.batch_id}
                            title="Stop Batch"
                            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === batch.batch_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(batch.batch_id)}
                          disabled={actionLoading === batch.batch_id}
                          title="Delete Batch"
                          className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                        >
                          {actionLoading === batch.batch_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
