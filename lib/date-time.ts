import { TZDate } from '@date-fns/tz'
import { format, isValid } from 'date-fns'
import { enGB } from 'date-fns/locale'

export const VIENNA_TIME_ZONE = 'Europe/Vienna'

function viennaDate(iso: string): TZDate {
  const instant = new Date(iso)
  if (!isValid(instant)) throw new RangeError('Invalid ISO timestamp')
  return new TZDate(instant, VIENNA_TIME_ZONE)
}

export function formatVienna(iso: string, pattern: string): string {
  return format(viennaDate(iso), pattern, { locale: enGB })
}

export function toViennaDatetimeLocal(iso: string): string {
  if (!iso) return ''
  return formatVienna(iso, "yyyy-MM-dd'T'HH:mm")
}

export function fromViennaDatetimeLocal(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new RangeError('Invalid Vienna local date and time')

  const [, year, month, day, hour, minute] = match.map(Number)
  const date = new TZDate(year, month - 1, day, hour, minute, 0, 0, VIENNA_TIME_ZONE)

  if (!isValid(date) || format(date, "yyyy-MM-dd'T'HH:mm") !== value) {
    throw new RangeError('Invalid or nonexistent Vienna local date and time')
  }

  return new Date(date.getTime()).toISOString()
}

export function viennaMonthKey(iso: string): string {
  return formatVienna(iso, 'yyyy-MM')
}
