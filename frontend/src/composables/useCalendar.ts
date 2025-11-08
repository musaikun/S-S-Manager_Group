import { computed } from 'vue'
import { useCalendarStore } from '../stores/calendar'
import type { CalendarCell, DateString } from '../types/calendar'
import {
  formatDateString,
  getDayOfWeek,
  isToday,
  isPast,
  isSameMonth,
  getCalendarDates,
  getMonthDates
} from '../utils/dateUtils'

/**
 * カレンダーロジック用Composable
 */
export function useCalendar() {
  const store = useCalendarStore()

  /**
   * カレンダーに表示する全てのセル情報を生成
   */
  const calendarCells = computed<CalendarCell[]>(() => {
    const { currentYear, currentMonth } = store
    const allDates = getCalendarDates(currentYear, currentMonth)
    const currentMonthDate = new Date(currentYear, currentMonth, 1)

    return allDates.map(date => {
      const dateString = formatDateString(date)
      const dayOfWeek = getDayOfWeek(date)
      const isCurrentMonth = isSameMonth(date, currentMonthDate)

      return {
        date,
        dateString,
        dayOfWeek,
        isCurrentMonth,
        isToday: isToday(date),
        isPast: isPast(date),
        isHoliday: store.isHoliday(dateString),
        holidayName: store.getHolidayName(dateString),
        isSelected: store.isDateSelected(dateString)
      }
    })
  })

  /**
   * 当月のみのセル情報
   */
  const currentMonthCells = computed<CalendarCell[]>(() => {
    return calendarCells.value.filter(cell => cell.isCurrentMonth)
  })

  /**
   * 当月の全日付（DateString配列）
   */
  const currentMonthDates = computed<DateString[]>(() => {
    const { currentYear, currentMonth } = store
    return getMonthDates(currentYear, currentMonth).map(date => formatDateString(date))
  })

  /**
   * 当月の未来の日付のみ（過去を除外）
   */
  const currentMonthFutureDates = computed<DateString[]>(() => {
    return currentMonthCells.value
      .filter(cell => !cell.isPast)
      .map(cell => cell.dateString)
  })

  /**
   * カレンダーを週ごとに分割
   */
  const calendarWeeks = computed<CalendarCell[][]>(() => {
    const weeks: CalendarCell[][] = []
    const cells = calendarCells.value

    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    return weeks
  })

  /**
   * 日付を選択/解除
   */
  const toggleDate = (dateString: DateString) => {
    store.toggleDate(dateString)
  }

  /**
   * 全選択（過去の日付を除外）
   */
  const selectAll = () => {
    store.selectAll(currentMonthFutureDates.value)
  }

  /**
   * 平日のみ選択（土日祝日以外）
   */
  const selectWeekdaysOnly = () => {
    const weekdayDates = currentMonthCells.value
      .filter(cell => {
        // 過去の日付は除外
        if (cell.isPast) return false
        // 月〜金 (1-5) で祝日でない日
        const isWeekday = cell.dayOfWeek >= 1 && cell.dayOfWeek <= 5
        return isWeekday && !cell.isHoliday
      })
      .map(cell => cell.dateString)

    store.selectAll(weekdayDates)
  }

  /**
   * 全解除
   */
  const clearAll = () => {
    store.clearAll()
  }

  /**
   * 曜日で選択（過去の日付を除外）
   */
  const selectByWeekday = (dayOfWeek: number) => {
    store.selectByWeekday(currentMonthFutureDates.value, dayOfWeek)
  }

  /**
   * 月を変更
   */
  const setMonth = (year: number, month: number) => {
    store.setMonth(year, month)
  }

  /**
   * 今月に戻る
   */
  const goToToday = () => {
    const today = new Date()
    store.setMonth(today.getFullYear(), today.getMonth())
  }

  /**
   * 前月に移動
   */
  const previousMonth = () => {
    store.previousMonth()
  }

  /**
   * 次月に移動
   */
  const nextMonth = () => {
    store.nextMonth()
  }

  /**
   * テンプレートを保存
   */
  const saveTemplate = (name: string) => {
    if (store.selectedCount === 0) {
      throw new Error('選択された日付がありません')
    }
    store.saveTemplate(name)
  }

  /**
   * テンプレートを読み込み
   */
  const loadTemplate = () => {
    store.loadTemplate()
  }

  /**
   * 前月のデータをコピー
   */
  const copyPreviousMonth = () => {
    store.copyPreviousMonth()
  }

  /**
   * 現在の状態を前月データとして保存
   */
  const savePreviousMonthData = () => {
    store.savePreviousMonthData()
  }

  /**
   * 当月の平日数（月〜金で祝日でない日）
   */
  const weekdayCount = computed<number>(() => {
    return currentMonthCells.value.filter(cell => {
      // 月〜金 (1-5) で祝日でない日
      const isWeekday = cell.dayOfWeek >= 1 && cell.dayOfWeek <= 5
      return isWeekday && !cell.isHoliday
    }).length
  })

  /**
   * 当月の休日数（土日または祝日）
   */
  const holidayCount = computed<number>(() => {
    return currentMonthCells.value.filter(cell => {
      // 土日 (0, 6) または祝日
      const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6
      return isWeekend || cell.isHoliday
    }).length
  })

  /**
   * 指定曜日の日付が全て選択されているか
   */
  const isWeekdayFullySelected = (dayOfWeek: number): boolean => {
    const targetDates = currentMonthFutureDates.value.filter(dateString => {
      const date = new Date(dateString)
      return date.getDay() === dayOfWeek
    })

    if (targetDates.length === 0) return false
    return targetDates.every(date => store.isDateSelected(date))
  }

  /**
   * 全ての日付が選択されているか
   */
  const isAllSelected = computed<boolean>(() => {
    if (currentMonthFutureDates.value.length === 0) return false
    return currentMonthFutureDates.value.every(date => store.isDateSelected(date))
  })

  /**
   * 平日のみが選択されているか
   */
  const isWeekdaysOnlySelected = computed<boolean>(() => {
    const futureCells = currentMonthCells.value.filter(cell => !cell.isPast)
    if (futureCells.length === 0) return false

    // 平日（月〜金で祝日でない日）を抽出
    const weekdayCells = futureCells.filter(cell => {
      const isWeekday = cell.dayOfWeek >= 1 && cell.dayOfWeek <= 5
      return isWeekday && !cell.isHoliday
    })

    // 非平日（土日祝日）を抽出
    const nonWeekdayCells = futureCells.filter(cell => {
      const isWeekday = cell.dayOfWeek >= 1 && cell.dayOfWeek <= 5
      return !(isWeekday && !cell.isHoliday)
    })

    // 平日がすべて選択されていて、非平日がすべて選択されていない
    const allWeekdaysSelected = weekdayCells.length > 0 && weekdayCells.every(cell => cell.isSelected)
    const noNonWeekdaysSelected = nonWeekdayCells.every(cell => !cell.isSelected)

    return allWeekdaysSelected && noNonWeekdaysSelected
  })

  return {
    // Computed
    calendarCells,
    currentMonthCells,
    currentMonthDates,
    calendarWeeks,
    weekdayCount,
    holidayCount,
    isAllSelected,
    isWeekdaysOnlySelected,

    // Store state (readonly)
    currentYear: computed(() => store.currentYear),
    currentMonth: computed(() => store.currentMonth),
    selectedDates: computed(() => store.selectedDatesArray),
    selectedCount: computed(() => store.selectedCount),
    currentMonthInfo: computed(() => store.currentMonthInfo),

    // Actions
    toggleDate,
    selectAll,
    selectWeekdaysOnly,
    clearAll,
    selectByWeekday,
    setMonth,
    goToToday,
    previousMonth,
    nextMonth,
    saveTemplate,
    loadTemplate,
    copyPreviousMonth,
    savePreviousMonthData,

    // Utils
    isWeekdayFullySelected
  }
}
