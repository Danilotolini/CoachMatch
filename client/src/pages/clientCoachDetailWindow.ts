import { addDaysToYMD, getTodayBrazilYMD } from '@/lib/dateTime'

export function buildStudentCoachScheduleWindow(reference = new Date()) {
  const start = getTodayBrazilYMD(reference)
  const end = addDaysToYMD(start, 21)
  return {
    startDateTime: `${start}T00:00:00-03:00`,
    endDateTime: `${end}T23:59:59-03:00`,
  }
}
