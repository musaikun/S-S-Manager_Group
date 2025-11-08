import { defineStore } from 'pinia'
import type {
  TimeRegisterState,
  WorkDay,
  BulkSettings,
  TotalSummary,
  TimePickerState,
  BulkApplyType,
  BulkApplyTarget,
  TimePickerMode,
  TimeString
} from '../types/timeRegister'
import type { DateString } from '../types/calendar'

// LocalStorageからデフォルト時刻を読み込む
const loadDefaultTimes = () => {
  const saved = localStorage.getItem('defaultTimes')
  if (saved) {
    const parsed = JSON.parse(saved)
    return {
      startTime: parsed.startTime || '09:00',
      endTime: parsed.endTime || '18:00'
    }
  }
  return {
    startTime: '09:00',
    endTime: '18:00'
  }
}

/**
 * 時間登録ストア
 */
export const useTimeRegisterStore = defineStore('timeRegister', {
  state: (): TimeRegisterState => {
    const defaultTimes = loadDefaultTimes()
    return {
      workDays: [],
      bulkSettings: {
        startTime: defaultTimes.startTime,
        endTime: defaultTimes.endTime
      },
      includeBreak: false,
      remarks: '',
      showSubmitModal: false,
      timePicker: {
        isOpen: false,
        mode: 'card',
        currentCardIndex: null,
        selectedStartTime: defaultTimes.startTime,
        selectedEndTime: defaultTimes.endTime
      }
    }
  },

  getters: {
    /**
     * 削除されていない勤務日のみ取得
     */
    activeWorkDays: (state): WorkDay[] => {
      return state.workDays.filter(day => !day.isRemoved)
    },

    /**
     * 合計情報を計算
     */
    totalSummary: (state): TotalSummary => {
      const activeWorkDays = state.workDays.filter(day => !day.isRemoved)

      const totalWorkMinutes = activeWorkDays.reduce(
        (sum, day) => sum + day.workMinutes,
        0
      )

      // 休憩時間の計算
      let totalBreakMinutes = 0
      let totalActualWorkMinutes = 0

      if (state.includeBreak) {
        activeWorkDays.forEach(day => {
          const breakMinutes = calculateBreakTime(day.workMinutes)
          totalBreakMinutes += breakMinutes
          totalActualWorkMinutes += day.workMinutes - breakMinutes
        })
      } else {
        totalActualWorkMinutes = totalWorkMinutes
      }

      return {
        workDays: activeWorkDays.length,
        totalWorkMinutes,
        totalActualWorkMinutes,
        totalBreakMinutes
      }
    },

    /**
     * インデックスで勤務日を取得
     */
    workDayByIndex: (state) => {
      return (index: number): WorkDay | undefined => {
        return state.workDays[index]
      }
    },

    /**
     * 個別設定された勤務日のみ取得
     */
    modifiedWorkDays: (state): WorkDay[] => {
      return state.workDays.filter(day => day.isModified && !day.isRemoved)
    },

    /**
     * 個別設定されていない勤務日のみ取得
     */
    unmodifiedWorkDays: (state): WorkDay[] => {
      return state.workDays.filter(day => !day.isModified && !day.isRemoved)
    }
  },

  actions: {
    /**
     * カレンダーから選択された日付を設定
     */
    initializeFromDates(dates: DateString[]) {
      this.workDays = dates.map((date, index) => {
        const dateObj = new Date(date)
        const dayOfWeek = dateObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
        const weekNumber = getWeekNumber(date)

        return {
          date,
          dayOfWeek,
          weekNumber,
          startTime: this.bulkSettings.startTime,
          endTime: this.bulkSettings.endTime,
          initialStartTime: this.bulkSettings.startTime,
          initialEndTime: this.bulkSettings.endTime,
          workMinutes: calculateWorkMinutes(this.bulkSettings.startTime, this.bulkSettings.endTime),
          isModified: false,
          isRemoved: false,
          displayDate: formatDisplayDate(dateObj, dayOfWeek),
          customStartTime: false,
          customEndTime: false,
          isBulkApplied: false,
          isFromBase: false,
          startTimeSetBy: 'default',
          endTimeSetBy: 'default'
        }
      })
    },

    /**
     * カレンダーの選択状態と同期（個別設定を保持）
     */
    syncWithSelectedDates(dates: DateString[]) {
      // 既存のworkDaysを日付でマップ化
      const existingWorkDaysMap = new Map(
        this.workDays.map(wd => [wd.date, wd])
      )

      // 新しいworkDaysを作成
      this.workDays = dates.map(date => {
        const existing = existingWorkDaysMap.get(date)

        if (existing) {
          // 既存の設定を保持
          return existing
        } else {
          // 新しく追加された日付
          const dateObj = new Date(date)
          const dayOfWeek = dateObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
          const weekNumber = getWeekNumber(date)

          return {
            date,
            dayOfWeek,
            weekNumber,
            startTime: this.bulkSettings.startTime,
            endTime: this.bulkSettings.endTime,
            initialStartTime: this.bulkSettings.startTime,
            initialEndTime: this.bulkSettings.endTime,
            workMinutes: calculateWorkMinutes(this.bulkSettings.startTime, this.bulkSettings.endTime),
            isModified: false,
            isRemoved: false,
            displayDate: formatDisplayDate(dateObj, dayOfWeek),
            customStartTime: false,
            customEndTime: false,
            isBulkApplied: false,
            isFromBase: false,
            startTimeSetBy: 'default',
            endTimeSetBy: 'default'
          }
        }
      })
    },

    /**
     * 勤務日を更新
     */
    updateWorkDay(index: number, updates: Partial<WorkDay>) {
      if (index >= 0 && index < this.workDays.length) {
        const workDay = this.workDays[index]

        // 時刻が変更された場合、勤務時間を再計算
        const startTime = updates.startTime ?? workDay.startTime
        const endTime = updates.endTime ?? workDay.endTime
        const workMinutes = calculateWorkMinutes(startTime, endTime)

        // 実際に時間が変更されたかチェック
        const startTimeChanged = updates.startTime !== undefined && updates.startTime !== workDay.startTime
        const endTimeChanged = updates.endTime !== undefined && updates.endTime !== workDay.endTime

        // 開始時間・終了時間が変更された場合のみ、カスタムフラグを立てる
        const customStartTime = startTimeChanged ? true : workDay.customStartTime
        const customEndTime = endTimeChanged ? true : workDay.customEndTime

        // いずれかの時間が変更された場合のみisModifiedをtrueにする
        const isModified = startTimeChanged || endTimeChanged ? true : workDay.isModified

        // 設定方法の追跡
        let startTimeSetBy = workDay.startTimeSetBy
        let endTimeSetBy = workDay.endTimeSetBy

        // isFromBaseが明示的に渡された場合（過去ベースから作成）
        if (updates.isFromBase === true) {
          if (startTimeChanged) startTimeSetBy = 'base'
          if (endTimeChanged) endTimeSetBy = 'base'
        } else {
          // 個別設定による変更（TimeRegisterViewからの直接変更）
          if (startTimeChanged) startTimeSetBy = 'custom'
          if (endTimeChanged) endTimeSetBy = 'custom'
        }

        this.workDays[index] = {
          ...workDay,
          ...updates,
          startTime,
          endTime,
          workMinutes,
          isModified,
          customStartTime,
          customEndTime,
          startTimeSetBy,
          endTimeSetBy,
          isBulkApplied: workDay.isBulkApplied // 一括設定フラグは保持
        }
      }
    },

    /**
     * 勤務日を削除（シフトから外す）
     */
    removeWorkDay(index: number) {
      if (index >= 0 && index < this.workDays.length) {
        this.workDays[index].isRemoved = true
      }
    },

    /**
     * 勤務日の削除/復活を切り替え
     */
    toggleRemoveDay(index: number) {
      if (index >= 0 && index < this.workDays.length) {
        this.workDays[index].isRemoved = !this.workDays[index].isRemoved
      }
    },

    /**
     * 一括設定を更新
     */
    updateBulkSettings(settings: Partial<BulkSettings>) {
      this.bulkSettings = {
        ...this.bulkSettings,
        ...settings
      }
    },

    /**
     * 一括適用
     */
    applyBulk(
      type: BulkApplyType,
      target: BulkApplyTarget,
      weekdays?: number[],
      weekNumbers?: number[]
    ) {
      const targetDays = target === 'all'
        ? this.workDays.filter(day => !day.isRemoved)
        : this.workDays.filter(day => !day.isModified && !day.isRemoved)

      targetDays.forEach((day, index) => {
        const actualIndex = this.workDays.indexOf(day)

        // 曜日指定がある場合はフィルタリング
        if (weekdays !== undefined && weekdays.length > 0 && !weekdays.includes(day.dayOfWeek)) {
          return
        }

        // 週番号指定がある場合はフィルタリング
        if (weekNumbers !== undefined && weekNumbers.length > 0 && !weekNumbers.includes(day.weekNumber)) {
          return
        }

        const updates: Partial<WorkDay> = {}

        if (type === 'both' || type === 'start') {
          updates.startTime = this.bulkSettings.startTime
          // 開始時間を一括設定で上書きする場合、customStartTimeをfalseに
          updates.customStartTime = false
          // 一括設定で変更されたことを記録
          updates.startTimeSetBy = 'bulk'
        }
        if (type === 'both' || type === 'end') {
          updates.endTime = this.bulkSettings.endTime
          // 終了時間を一括設定で上書きする場合、customEndTimeをfalseに
          updates.customEndTime = false
          // 一括設定で変更されたことを記録
          updates.endTimeSetBy = 'bulk'
        }

        // 勤務時間を再計算
        const startTime = updates.startTime ?? day.startTime
        const endTime = updates.endTime ?? day.endTime
        updates.workMinutes = calculateWorkMinutes(startTime, endTime)

        // 両方のカスタムフラグがfalseになる場合、isModifiedもfalseにする
        const finalCustomStartTime = updates.customStartTime ?? day.customStartTime
        const finalCustomEndTime = updates.customEndTime ?? day.customEndTime

        if (!finalCustomStartTime && !finalCustomEndTime) {
          updates.isModified = false
          // 初期値と比較して、変わっていない場合はisBulkApplied=false
          const startChanged = startTime !== day.initialStartTime
          const endChanged = endTime !== day.initialEndTime
          updates.isBulkApplied = startChanged || endChanged
        } else {
          // どちらかがカスタムの場合はisModifiedを維持
          updates.isModified = true
          updates.isBulkApplied = false // カスタムの場合は一括設定フラグをfalse
        }

        this.workDays[actualIndex] = {
          ...day,
          ...updates
        }
      })
    },

    /**
     * 休憩時間の加味を切り替え
     */
    toggleBreak() {
      this.includeBreak = !this.includeBreak
    },

    /**
     * 備考欄を更新
     */
    updateRemarks(newRemarks: string) {
      this.remarks = newRemarks
    },

    /**
     * 時間ピッカーを開く
     */
    openTimePicker(mode: TimePickerMode, cardIndex?: number) {
      if (mode === 'card' && cardIndex !== undefined) {
        const workDay = this.workDays[cardIndex]
        this.timePicker = {
          isOpen: true,
          mode,
          currentCardIndex: cardIndex,
          selectedStartTime: workDay.startTime,
          selectedEndTime: workDay.endTime
        }
      } else if (mode === 'bulk-start' || mode === 'bulk-end') {
        this.timePicker = {
          isOpen: true,
          mode,
          currentCardIndex: null,
          selectedStartTime: this.bulkSettings.startTime,
          selectedEndTime: this.bulkSettings.endTime
        }
      }
    },

    /**
     * 時間ピッカーを閉じる
     */
    closeTimePicker() {
      this.timePicker.isOpen = false
      this.timePicker.currentCardIndex = null
    },

    /**
     * 時間ピッカーで選択した時刻を更新
     */
    updateSelectedTime(startTime: TimeString, endTime: TimeString) {
      this.timePicker.selectedStartTime = startTime
      this.timePicker.selectedEndTime = endTime
    },

    /**
     * 時間ピッカーの選択を確定
     */
    confirmTimePicker() {
      if (this.timePicker.mode === 'card' && this.timePicker.currentCardIndex !== null) {
        this.updateWorkDay(this.timePicker.currentCardIndex, {
          startTime: this.timePicker.selectedStartTime,
          endTime: this.timePicker.selectedEndTime
        })
      } else if (this.timePicker.mode === 'bulk-start') {
        this.updateBulkSettings({
          startTime: this.timePicker.selectedStartTime
        })
      } else if (this.timePicker.mode === 'bulk-end') {
        this.updateBulkSettings({
          endTime: this.timePicker.selectedEndTime
        })
      }
      this.closeTimePicker()
    },

    /**
     * ストアをリセット
     */
    reset() {
      this.workDays = []
      this.bulkSettings = {
        startTime: '09:00',
        endTime: '18:00'
      }
      this.includeBreak = false
      this.remarks = ''
      this.showSubmitModal = false
      this.timePicker = {
        isOpen: false,
        mode: 'card',
        currentCardIndex: null,
        selectedStartTime: '09:00',
        selectedEndTime: '18:00'
      }
    },

    /**
     * 提出モーダルを開く
     */
    openSubmitModal() {
      this.showSubmitModal = true
    },

    /**
     * 提出モーダルを閉じる
     */
    closeSubmitModal() {
      this.showSubmitModal = false
    }
  }
})

// ===== ヘルパー関数 =====

/**
 * 時刻文字列から勤務時間（分）を計算
 */
function calculateWorkMinutes(startTime: TimeString, endTime: TimeString): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  let startMinutes = startHour * 60 + startMinute
  let endMinutes = endHour * 60 + endMinute

  // 終了時刻が開始時刻より前の場合は翌日とみなす
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  return endMinutes - startMinutes
}

/**
 * 勤務時間から休憩時間を計算
 */
function calculateBreakTime(workMinutes: number): number {
  if (workMinutes < 6 * 60) {
    return 0
  } else if (workMinutes < 8 * 60) {
    return 45
  } else {
    return 60
  }
}

/**
 * 日付オブジェクトから表示用文字列を生成
 */
function formatDisplayDate(date: Date, dayOfWeek: number): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土']
  const dayLabel = dayLabels[dayOfWeek]

  return `${month}/${day}(${dayLabel})`
}

/**
 * 日付から月内の週番号を計算（1-6）
 * 日曜日を週の始まりとして計算
 */
function getWeekNumber(dateString: string): number {
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
