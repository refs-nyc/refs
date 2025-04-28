import { DateTime } from "luxon";

export default function formatTimestamp(inputUtc: string, timeZone: string): string
{
  const now = DateTime.now().setZone(timeZone);
  const dt = DateTime.fromFormat(inputUtc, 'yyyy-MM-dd HH:mm:ss.SSS', { zone: 'utc' }).setZone(timeZone);

  const isToday = now.hasSame(dt, 'day');
  const isYesterday = now.minus({ days: 1 }).hasSame(dt, 'day');
  const isThisYear = now.hasSame(dt, 'year');
  const daysAgo = now.diff(dt, 'days').days;

  if (isToday) return dt.toFormat('HH:mm'); // e.g. 14:32

  if (isYesterday) return 'Yesterday';

  if (daysAgo < 7) return dt.weekdayLong || '';

  if (isThisYear) return dt.toFormat('dd/MM'); // e.g. 14/03

  return dt.toFormat('dd/MM/yyyy'); // e.g. 14/03/2023
}