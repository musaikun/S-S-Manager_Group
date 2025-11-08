import type { TimeString, ParsedTime, Hour12, Period } from '../types/timeRegister'

/**
 * 時間フォーマット用Composable
 */
export function useTimeFormat() {
  /**
   * 時刻文字列をパース
   * @param timeString "09:30" など
   * @returns { hour: 9, minute: 30 }
   */
  const parseTime = (timeString: TimeString): ParsedTime => {
    const [hour, minute] = timeString.split(':').map(Number)
    return { hour, minute }
  }

  /**
   * 時と分から時刻文字列を生成
   * @param hour 0-23
   * @param minute 0-59
   * @returns "09:30" など
   */
  const formatTime = (hour: number, minute: number): TimeString => {
    const hourStr = String(hour).padStart(2, '0')
    const minuteStr = String(minute).padStart(2, '0')
    return `${hourStr}:${minuteStr}`
  }

  /**
   * 24時間制を12時間制に変換
   * @param hour 0-23
   * @returns { hour: 1-12, period: 'am' | 'pm' }
   */
  const to12Hour = (hour: number): Hour12 => {
    if (hour === 0) {
      return { hour: 12, period: 'am' }
    } else if (hour < 12) {
      return { hour, period: 'am' }
    } else if (hour === 12) {
      return { hour: 12, period: 'pm' }
    } else {
      return { hour: hour - 12, period: 'pm' }
    }
  }

  /**
   * 12時間制を24時間制に変換
   * @param hour 1-12
   * @param period 'am' | 'pm'
   * @returns 0-23
   */
  const to24Hour = (hour: number, period: Period): number => {
    if (period === 'am') {
      return hour === 12 ? 0 : hour
    } else {
      return hour === 12 ? 12 : hour + 12
    }
  }

  /**
   * 分を時間表示に変換
   * @param minutes 勤務時間（分）
   * @returns "9時間" や "9時間30分"
   */
  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (mins === 0) {
      return `${hours}時間`
    } else {
      return `${hours}時間${mins}分`
    }
  }

  /**
   * 分を時間表示に変換（小数点付き）
   * @param minutes 勤務時間（分）
   * @returns "9.5時間"
   */
  const formatMinutesToDecimalHours = (minutes: number): string => {
    const hours = (minutes / 60).toFixed(1)
    return `${hours}時間`
  }

  /**
   * 時刻文字列を日本語表示に変換
   * @param timeString "09:30"
   * @returns "午前9時30分" や "午後6時00分"
   */
  const formatTimeJapanese = (timeString: TimeString): string => {
    const { hour, minute } = parseTime(timeString)
    const { hour: hour12, period } = to12Hour(hour)
    const periodText = period === 'am' ? '午前' : '午後'
    return `${periodText}${hour12}時${String(minute).padStart(2, '0')}分`
  }

  return {
    parseTime,
    formatTime,
    to12Hour,
    to24Hour,
    formatMinutesToHours,
    formatMinutesToDecimalHours,
    formatTimeJapanese
  }
}
