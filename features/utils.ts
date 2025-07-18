import { DateTime } from 'luxon'

export const formatDateString = (date: Date) => {
  return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss.SSS') + 'Z'
}
