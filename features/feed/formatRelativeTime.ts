export const formatRelativeTime = (isoDateString: string): string => {
  const date = new Date(isoDateString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (diffInMinutes < 1) {
    return 'now'
  }

  if (diffInHours < 1) {
    return rtf.format(-diffInMinutes, 'minute')
  }

  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour')
  }

  if (diffInDays <= 7) {
    return rtf.format(-diffInDays, 'day')
  }

  const dtf = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })

  return dtf.format(date)
}
