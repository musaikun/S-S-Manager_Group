import { defineStore } from 'pinia'
import type { CalendarState, DateString, HolidayData, CalendarTemplate } from '../types/calendar'

/**
 * カレンダー状態管理ストア
 */
export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDates: new Set<DateString>(),
    holidays: {},
    savedTemplate: null,
    previousMonthData: null
  }),

  getters: {
    /**
     * 選択された日付の配列（ソート済み）
     */
    selectedDatesArray: (state): DateString[] => {
      return Array.from(state.selectedDates).sort()
    },

    /**
     * 選択された日付の数
     */
    selectedCount: (state): number => {
      return state.selectedDates.size
    },

    /**
     * 現在の月情報
     */
    currentMonthInfo: (state) => {
      return {
        year: state.currentYear,
        month: state.currentMonth,
        displayText: `${state.currentYear}年${state.currentMonth + 1}月`
      }
    },

    /**
     * 指定した日付が選択されているか
     */
    isDateSelected: (state) => {
      return (dateString: DateString): boolean => {
        return state.selectedDates.has(dateString)
      }
    },

    /**
     * 指定した日付が祝日か
     */
    isHoliday: (state) => {
      return (dateString: DateString): boolean => {
        return dateString in state.holidays
      }
    },

    /**
     * 祝日名を取得
     */
    getHolidayName: (state) => {
      return (dateString: DateString): string | undefined => {
        return state.holidays[dateString]
      }
    }
  },

  actions: {
    /**
     * 日付を選択/解除
     */
    toggleDate(dateString: DateString) {
      if (this.selectedDates.has(dateString)) {
        this.selectedDates.delete(dateString)
      } else {
        this.selectedDates.add(dateString)
      }
    },

    /**
     * 日付を選択
     */
    selectDate(dateString: DateString) {
      this.selectedDates.add(dateString)
    },

    /**
     * 日付の選択を解除
     */
    deselectDate(dateString: DateString) {
      this.selectedDates.delete(dateString)
    },

    /**
     * 全ての日付を選択（トグル対応）
     */
    selectAll(dates: DateString[]) {
      // 全ての対象日付が選択済みかチェック
      const allSelected = dates.every(date => this.selectedDates.has(date))

      if (allSelected) {
        // 全て選択済みなら解除
        dates.forEach(date => this.selectedDates.delete(date))
      } else {
        // 選択されていない日付がある場合は全て選択
        dates.forEach(date => this.selectedDates.add(date))
      }
    },

    /**
     * 全ての選択を解除
     */
    clearAll() {
      this.selectedDates.clear()
    },

    /**
     * 曜日で選択（トグル対応）
     */
    selectByWeekday(dates: DateString[], targetDayOfWeek: number) {
      // 対象曜日の日付を抽出
      const targetDates = dates.filter(dateString => {
        const date = new Date(dateString)
        return date.getDay() === targetDayOfWeek
      })

      // 対象曜日の日付が全て選択済みかチェック
      const allSelected = targetDates.every(date => this.selectedDates.has(date))

      if (allSelected) {
        // 全て選択済みなら解除
        targetDates.forEach(date => this.selectedDates.delete(date))
      } else {
        // 選択されていない日付がある場合は全て選択
        targetDates.forEach(date => this.selectedDates.add(date))
      }
    },

    /**
     * 月を変更
     */
    setMonth(year: number, month: number) {
      this.currentYear = year
      this.currentMonth = month
    },

    /**
     * 前月に移動
     */
    previousMonth() {
      if (this.currentMonth === 0) {
        this.currentYear--
        this.currentMonth = 11
      } else {
        this.currentMonth--
      }
    },

    /**
     * 次月に移動
     */
    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentYear++
        this.currentMonth = 0
      } else {
        this.currentMonth++
      }
    },

    /**
     * 祝日データを設定
     */
    setHolidays(holidays: HolidayData) {
      this.holidays = holidays
    },

    /**
     * テンプレートを保存
     */
    saveTemplate(name: string) {
      this.savedTemplate = {
        name,
        dates: this.selectedDatesArray,
        createdAt: new Date()
      }
      // LocalStorageに保存
      localStorage.setItem('calendarTemplate', JSON.stringify(this.savedTemplate))
    },

    /**
     * テンプレートを読み込み
     */
    loadTemplate() {
      if (this.savedTemplate) {
        this.clearAll()
        this.savedTemplate.dates.forEach(date => this.selectedDates.add(date))
      } else {
        // LocalStorageから読み込み
        const saved = localStorage.getItem('calendarTemplate')
        if (saved) {
          const template = JSON.parse(saved) as CalendarTemplate
          this.savedTemplate = template
          template.dates.forEach(date => this.selectedDates.add(date))
        }
      }
    },

    /**
     * 前月のデータを保存
     */
    savePreviousMonthData() {
      this.previousMonthData = this.selectedDatesArray
      localStorage.setItem('previousMonthData', JSON.stringify(this.previousMonthData))
    },

    /**
     * 前月のデータをコピー
     */
    copyPreviousMonth() {
      if (this.previousMonthData) {
        // 前月の日付を現在の月にマッピング
        const currentYear = this.currentYear
        const currentMonth = this.currentMonth

        this.previousMonthData.forEach(prevDateString => {
          const prevDate = new Date(prevDateString)
          const day = prevDate.getDate()

          // 現在の月の同じ日に設定（存在する場合）
          const newDate = new Date(currentYear, currentMonth, day)
          if (newDate.getMonth() === currentMonth) {
            const newDateString = newDate.toISOString().split('T')[0]
            this.selectedDates.add(newDateString)
          }
        })
      }
    },

    /**
     * ストアをリセット
     */
    reset() {
      this.selectedDates.clear()
      this.currentYear = new Date().getFullYear()
      this.currentMonth = new Date().getMonth()
    }
  }
})
