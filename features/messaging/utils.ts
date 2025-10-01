import { DateTime } from 'luxon'

export function formatTimestamp(inputUtc: string, timeZone: string): string {
  const now = DateTime.now().setZone(timeZone)
  const dt = DateTime.fromFormat(inputUtc, 'yyyy-MM-dd HH:mm:ss.SSS', { zone: 'utc' }).setZone(
    timeZone
  )

  const isToday = now.hasSame(dt, 'day')
  const isYesterday = now.minus({ days: 1 }).hasSame(dt, 'day')
  const isThisYear = now.hasSame(dt, 'year')
  const daysAgo = now.diff(dt, 'days').days

  if (isToday) return dt.toFormat('h:mm a') // e.g. 2:32 PM

  if (isYesterday) return 'Yesterday'

  if (daysAgo < 7) return dt.weekdayLong || ''

  if (isThisYear) return dt.toFormat('MM/dd') // e.g. 03/14

  return dt.toFormat('MM/dd/yyyy') // e.g. 03/14/2023
}

export function randomColors(n: number): string[] {
  return Array.from({ length: n }, () => {
    const h = Math.floor(Math.random() * 360)
    return hslToHex(h, 50, 50)
  })
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  s /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)))
      .toString(16)
      .padStart(2, '0')
  return `#${f(0)}${f(8)}${f(4)}`
}
