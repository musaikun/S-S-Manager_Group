import type { TimeString, BreakTimeResult, BreakTimeRule } from '../types/timeRegister'
import { useTimeFormat } from './useTimeFormat'

/**
 * 時間計算用Composable
 */
export function useTimeCalculation() {
  const { parseTime } = useTimeFormat()

  /**
   * 休憩時間のルール
   */
  const breakRules: BreakTimeRule[] = [
    { minWorkMinutes: 0, maxWorkMinutes: 6 * 60, breakMinutes: 0 },
    { minWorkMinutes: 6 * 60, maxWorkMinutes: 8 * 60, breakMinutes: 45 },
    { minWorkMinutes: 8 * 60, maxWorkMinutes: null, breakMinutes: 60 }
  ]

  /**
   * 開始時刻と終了時刻から勤務時間（分）を計算
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @returns 勤務時間（分）
   */
  const calculateWorkMinutes = (startTime: TimeString, endTime: TimeString): number => {
    const start = parseTime(startTime)
    const end = parseTime(endTime)

    let startMinutes = start.hour * 60 + start.minute
    let endMinutes = end.hour * 60 + end.minute

    // 終了時刻が開始時刻より前の場合は翌日とみなす（日付をまたぐ勤務）
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }

    return endMinutes - startMinutes
  }

  /**
   * 勤務時間から休憩時間を計算
   * @param workMinutes 勤務時間（分）
   * @returns 休憩時間（分）
   */
  const calculateBreakTime = (workMinutes: number): number => {
    for (const rule of breakRules) {
      if (workMinutes >= rule.minWorkMinutes) {
        if (rule.maxWorkMinutes === null || workMinutes < rule.maxWorkMinutes) {
          return rule.breakMinutes
        }
      }
    }
    return 0
  }

  /**
   * 勤務時間と休憩時間から実労働時間を計算
   * @param workMinutes 勤務時間（分）
   * @returns { breakMinutes, actualWorkMinutes }
   */
  const calculateBreakTimeResult = (workMinutes: number): BreakTimeResult => {
    const breakMinutes = calculateBreakTime(workMinutes)
    const actualWorkMinutes = Math.max(0, workMinutes - breakMinutes)

    return {
      breakMinutes,
      actualWorkMinutes
    }
  }

  /**
   * 時刻が妥当かチェック
   * @param hour 0-23
   * @param minute 0-59
   * @returns 妥当ならtrue
   */
  const isValidTime = (hour: number, minute: number): boolean => {
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
  }

  /**
   * 終了時刻が開始時刻より後かチェック（翌日考慮）
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @returns 有効ならtrue
   */
  const isValidTimeRange = (startTime: TimeString, endTime: TimeString): boolean => {
    const workMinutes = calculateWorkMinutes(startTime, endTime)
    return workMinutes > 0 && workMinutes <= 24 * 60
  }

  /**
   * 休憩時間のルールを取得
   * @returns ルールの配列
   */
  const getBreakRules = (): BreakTimeRule[] => {
    return breakRules
  }

  /**
   * 日付から月内の週番号を計算（1-6）
   * 日曜日を週の始まりとして計算
   * @param dateString YYYY-MM-DD形式の日付文字列
   * @returns 週番号（1-6）
   */
  const getWeekNumber = (dateString: string): number => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth()

    // 月の1日を取得
    const firstDay = new Date(year, month, 1)

    // 月の1日が属する週の日曜日を取得
    const firstDayOfWeek = firstDay.getDay() // 0 (日曜) - 6 (土曜)
    const firstSunday = new Date(firstDay)
    firstSunday.setDate(firstDay.getDate() - firstDayOfWeek)

    // 対象日付と最初の日曜日の差分（日数）
    const diffTime = date.getTime() - firstSunday.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // 週番号を計算（1始まり）
    const weekNumber = Math.floor(diffDays / 7) + 1

    return weekNumber
  }

  /**
   * 指定月に存在する週の数を取得
   * @param year 年
   * @param month 月（0-11）
   * @returns 週の数（4-6）
   */
  const getWeeksInMonth = (year: number, month: number): number => {
    // 月の最終日を取得
    const lastDay = new Date(year, month + 1, 0)
    const lastDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    // 最終日の週番号が月の週数
    return getWeekNumber(lastDateString)
  }

  return {
    calculateWorkMinutes,
    calculateBreakTime,
    calculateBreakTimeResult,
    isValidTime,
    isValidTimeRange,
    getBreakRules,
    getWeekNumber,
    getWeeksInMonth
  }
}
