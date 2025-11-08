/**
 * カレンダー関連の型定義
 */

/**
 * 日付文字列 (YYYY-MM-DD形式)
 */
export type DateString = string

/**
 * 曜日 (0: 日曜 ~ 6: 土曜)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * カレンダーセル情報
 */
export interface CalendarCell {
  date: Date
  dateString: DateString
  dayOfWeek: DayOfWeek
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
  isHoliday: boolean
  holidayName?: string
  isSelected: boolean
}

/**
 * 祝日データ (日付 => 祝日名)
 */
export type HolidayData = Record<DateString, string>

/**
 * カレンダーテンプレート
 */
export interface CalendarTemplate {
  name: string
  dates: DateString[]
  createdAt: Date
}

/**
 * カレンダー表示設定
 */
export interface CalendarSettings {
  showWeekNumber: boolean
  startOfWeek: DayOfWeek
  highlightToday: boolean
}

/**
 * 月情報
 */
export interface MonthInfo {
  year: number
  month: number // 0-11
  displayText: string // "2025年1月"
}

/**
 * カレンダー状態
 */
export interface CalendarState {
  currentYear: number
  currentMonth: number
  selectedDates: Set<DateString>
  holidays: HolidayData
  savedTemplate: CalendarTemplate | null
  previousMonthData: DateString[] | null
}
