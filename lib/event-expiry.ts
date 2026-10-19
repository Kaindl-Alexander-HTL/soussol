import { TZDate } from '@date-fns/tz'
import { VIENNA_TIME_ZONE } from './date-time.ts'

export type ExpirableEvent = { starts_at: string; ends_at: string | null }

// An event is over once its end time has passed. Without an end time it stays
// listed until the end of its calendar day in Vienna, so a run is never hidden
// while it is still happening.
export function isEventOver(event: ExpirableEvent, now: Date): boolean {
  if (event.ends_at) return new Date(event.ends_at).getTime() <= now.getTime()

  const start = new TZDate(new Date(event.starts_at), VIENNA_TIME_ZONE)
  const endOfDay = new TZDate(
    start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0, VIENNA_TIME_ZONE,
  )
  return endOfDay.getTime() <= now.getTime()
}
