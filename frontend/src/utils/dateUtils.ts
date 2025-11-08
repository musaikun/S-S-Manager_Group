import type { DateString, DayOfWeek } from '../types/calendar'

/**
 * 日付操作ユーティリティ関数
 */

/**
 * DateをYYYY-MM-DD形式の文字列に変換
 */
export function formatDateString(date: Date): DateString {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * YYYY-MM-DD形式の文字列をDateに変換
 */
export function parseDateString(dateString: DateString): Date {
  return new Date(dateString)
}

/**
 * M/d(曜) 形式で表示
 * 例: "1/15(水)"
 */
export function formatDisplayDate(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${month}/${day}(${weekday})`
}

/**
 * YYYY年MM月DD日(曜) 形式で表示
 * 例: "2025年1月15日(水)"
 */
export function formatLongDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${year}年${month}月${day}日(${weekday})`
}

/**
 * 曜日を取得 (0: 日曜 ~ 6: 土曜)
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek
}

/**
 * 曜日名を取得
 */
export function getDayOfWeekName(dayOfWeek: DayOfWeek): string {
  return ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek]
}

/**
 * 今日かどうか
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

/**
 * 今日を含めて過去の日付かどうか
 */
export function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate <= today
}

/**
 * 土曜日かどうか
 */
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6
}

/**
 * 日曜日かどうか
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

/**
 * 週末（土日）かどうか
 */
export function isWeekend(date: Date): boolean {
  return isSaturday(date) || isSunday(date)
}

/**
 * 指定した年月の日数を取得
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * 指定した年月の最初の日を取得
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

/**
 * 指定した年月の最後の日を取得
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

/**
 * 指定した年月のカレンダーに表示する全ての日付を取得
 * （前月・当月・翌月の一部を含む）
 */
export function getCalendarDates(year: number, month: number): Date[] {
  const dates: Date[] = []
  const firstDay = getFirstDayOfMonth(year, month)
  const firstDayOfWeek = firstDay.getDay()

  // 前月の日付（最初の週を埋める）
  const prevMonthLastDay = new Date(year, month, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(prevMonthLastDay)
    date.setDate(prevMonthLastDay.getDate() - i)
    dates.push(date)
  }

  // 当月の日付
  const daysInMonth = getDaysInMonth(year, month)
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day))
  }

  // 翌月の日付（最後の週を埋める）
  const remainingDays = 7 - (dates.length % 7)
  if (remainingDays < 7) {
    for (let day = 1; day <= remainingDays; day++) {
      dates.push(new Date(year, month + 1, day))
    }
  }

  return dates
}

/**
 * 指定した年月の全ての日付を取得（当月のみ）
 */
export function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = []
  const daysInMonth = getDaysInMonth(year, month)

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day))
  }

  return dates
}

/**
 * 2つの日付が同じ日かどうか
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * 2つの日付が同じ月かどうか
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  )
}

/**
 * 日付の配列を昇順にソート
 */
export function sortDates(dates: Date[]): Date[] {
  return dates.sort((a, b) => a.getTime() - b.getTime())
}

/**
 * 日付文字列の配列を昇順にソート
 */
export function sortDateStrings(dateStrings: DateString[]): DateString[] {
  return dateStrings.sort()
}

/**
 * 月の週数を取得（第何週か）
 */
export function getWeekOfMonth(date: Date): number {
  const firstDay = getFirstDayOfMonth(date.getFullYear(), date.getMonth())
  const firstDayOfWeek = firstDay.getDay()
  const day = date.getDate()
  return Math.ceil((day + firstDayOfWeek) / 7)
}
