const CALL_WINDOWS = [
  { startMinutes: 10 * 60, endMinutes: 11 * 60 + 30 },
  { startMinutes: 18 * 60, endMinutes: 21 * 60 }
]

const getZonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date)

  const lookup = (type: string) => Number(parts.find(part => part.type === type)?.value ?? '0')
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: lookup('hour'),
    minute: lookup('minute'),
    second: lookup('second')
  }
}

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = getZonedParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

const makeDateInTimeZone = (
  params: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
): Date => {
  const utc = new Date(Date.UTC(params.year, params.month - 1, params.day, params.hour, params.minute, 0))
  const offset = getTimeZoneOffsetMs(utc, timeZone)
  return new Date(utc.getTime() - offset)
}

const addZonedDays = (parts: ReturnType<typeof getZonedParts>, days: number, timeZone: string) => {
  const base = makeDateInTimeZone(
    { year: parts.year, month: parts.month, day: parts.day, hour: 12, minute: 0 },
    timeZone
  )
  const shifted = new Date(base.getTime() + days * 86_400_000)
  return getZonedParts(shifted, timeZone)
}

const alignToWindow = (desired: Date, timeZone: string): Date => {
  const parts = getZonedParts(desired, timeZone)
  const minutes = parts.hour * 60 + parts.minute
  const [morning, evening] = CALL_WINDOWS

  if (minutes >= morning.startMinutes && minutes <= morning.endMinutes) return desired
  if (minutes >= evening.startMinutes && minutes <= evening.endMinutes) return desired

  if (minutes < morning.startMinutes) {
    return makeDateInTimeZone(
      { year: parts.year, month: parts.month, day: parts.day, hour: 10, minute: 0 },
      timeZone
    )
  }

  if (minutes < evening.startMinutes) {
    return makeDateInTimeZone(
      { year: parts.year, month: parts.month, day: parts.day, hour: 18, minute: 0 },
      timeZone
    )
  }

  const nextDay = addZonedDays(parts, 1, timeZone)
  return makeDateInTimeZone(
    { year: nextDay.year, month: nextDay.month, day: nextDay.day, hour: 10, minute: 0 },
    timeZone
  )
}

export const resolveScheduledAt = (desired: Date, timeZone: string): Date => alignToWindow(desired, timeZone)

export const getVoiceCallTargetTime = (params: { preferredAt?: string; timezone: string }): string => {
  const target = params.preferredAt ? new Date(params.preferredAt) : new Date()
  const aligned = resolveScheduledAt(target, params.timezone)
  return aligned.toISOString()
}
