import { useCallback, useState } from 'react'
import { authFetch } from '../api/client'
import type { CallAttempt, ScheduledAction } from '../types'

type VoiceStatusParams = {
  userId: string
  token: string
}

export const useVoiceStatus = ({ userId, token }: VoiceStatusParams) => {
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([])
  const [callAttempts, setCallAttempts] = useState<CallAttempt[]>([])
  const [outreachStatus, setOutreachStatus] = useState('')
  const [isStartingOutreach, setIsStartingOutreach] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const refreshVoiceStatus = useCallback(() => {
    return authFetch<{ scheduledActions: ScheduledAction[]; callAttempts: CallAttempt[] }>(
      `/users/${userId}/voice-status`,
      token
    )
      .then(res => {
        setScheduledActions(res.scheduledActions)
        setCallAttempts(res.callAttempts)
      })
      .catch((err: unknown) => {
        console.error('Failed to load voice status', err)
      })
  }, [userId, token])

  const handleStartConversation = useCallback(
    async (preferredCallAt?: string) => {
      setIsStartingOutreach(true)
      setOutreachStatus('')
      try {
        await authFetch(`/users/${userId}/start-conversation`, token, {
          method: 'POST',
          body: JSON.stringify({ preferredCallAt: preferredCallAt || undefined })
        })
        setOutreachStatus('✅ Outreach started')
        await refreshVoiceStatus()
      } catch (err: unknown) {
        setOutreachStatus(`❌ Failed: ${(err as Error).message}`)
      } finally {
        setIsStartingOutreach(false)
        setTimeout(() => setOutreachStatus(''), 5000)
      }
    },
    [refreshVoiceStatus, token, userId]
  )

  const handleCancelCalls = useCallback(async () => {
    setIsCancelling(true)
    setOutreachStatus('')
    try {
      await authFetch(`/users/${userId}/calls/cancel`, token, {
        method: 'POST',
        body: JSON.stringify({ reason: 'manual_cancel' })
      })
      setOutreachStatus('✅ Calls cancelled')
      await refreshVoiceStatus()
    } catch (err: unknown) {
      setOutreachStatus(`❌ Cancel failed: ${(err as Error).message}`)
    } finally {
      setIsCancelling(false)
      setTimeout(() => setOutreachStatus(''), 5000)
    }
  }, [refreshVoiceStatus, token, userId])

  return {
    scheduledActions,
    callAttempts,
    outreachStatus,
    isStartingOutreach,
    isCancelling,
    refreshVoiceStatus,
    handleStartConversation,
    handleCancelCalls
  }
}
