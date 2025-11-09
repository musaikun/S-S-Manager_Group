import { defineStore } from 'pinia'
import type { CalendarState, DateString, HolidayData, CalendarTemplate, Job, JobId, JobColor } from '../types/calendar'

/**
 * ジョブの固定色（蛍光色）
 * 1: 蛍光黄色, 2: 蛍光緑, 3: 蛍光ピンク, 4: 蛍光水色
 */
const JOB_COLORS: JobColor[] = ['#FFFF00', '#39FF14', '#FF10F0', '#00FFFF']

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
    previousMonthData: null,
    dateJobMap: {},
    jobs: [],
    currentJobId: null,
    mainStoreName: ''
  }),

  getters: {
    /**
     * 選択された日付の配列（ソート済み）
     */
    selectedDatesArray: (state): DateString[] => {
      return Array.from(state.selectedDates).sort()
    },

    /**
     * 選択された日付の数（本店と掛け持ち先の両方を含む）
     */
    selectedCount: (state): number => {
      // 本店の選択日付と掛け持ち先の選択日付を合わせてユニークな日付数を取得
      const allSelectedDates = new Set<DateString>()

      // 本店の選択日付を追加
      state.selectedDates.forEach(date => allSelectedDates.add(date))

      // 掛け持ち先の選択日付を追加
      Object.keys(state.dateJobMap).forEach(date => {
        if (state.dateJobMap[date].length > 0) {
          allSelectedDates.add(date)
        }
      })

      return allSelectedDates.size
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
     * 指定した日付が選択されているか（メインまたは掛け持ちのいずれか）
     */
    isDateSelected: (state) => {
      return (dateString: DateString): boolean => {
        const hasMainSelection = state.selectedDates.has(dateString)
        const hasSideJobSelection = (state.dateJobMap[dateString] || []).length > 0
        return hasMainSelection || hasSideJobSelection
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
    },

    /**
     * アクティブなジョブ一覧
     */
    activeJobs: (state): Job[] => {
      return state.jobs.filter(job => job.isActive)
    },

    /**
     * 指定したIDのジョブを取得
     */
    getJobById: (state) => {
      return (jobId: JobId): Job | undefined => {
        return state.jobs.find(job => job.id === jobId)
      }
    },

    /**
     * 指定した日付に設定されているジョブIDの配列を取得
     */
    getJobsForDate: (state) => {
      return (dateString: DateString): JobId[] => {
        return state.dateJobMap[dateString] || []
      }
    },

    /**
     * 指定した日付が現在のジョブで選択されているか
     */
    isDateSelectedForCurrentJob: (state) => {
      return (dateString: DateString): boolean => {
        if (state.currentJobId === null) {
          // 掛け持ちなしモードの場合は従来通り
          return state.selectedDates.has(dateString)
        }
        const jobIds = state.dateJobMap[dateString] || []
        return jobIds.includes(state.currentJobId)
      }
    },

    /**
     * 本店名を取得（未設定の場合は'本店'）
     */
    mainStoreDisplayName: (state): string => {
      return state.mainStoreName || '本店'
    }
  },

  actions: {
    /**
     * 日付を選択/解除（Job対応版）
     */
    toggleDate(dateString: DateString) {
      if (this.currentJobId === null) {
        // 本店モードの場合
        const jobIds = this.dateJobMap[dateString] || []

        if (this.selectedDates.has(dateString) && jobIds.length === 0) {
          // 本店のみで選択されている場合は解除
          this.selectedDates.delete(dateString)
        } else if (this.selectedDates.has(dateString) && jobIds.length > 0) {
          // 本店+掛け持ち先の場合は、本店のみ解除
          // 掛け持ち先は残る
          this.selectedDates.delete(dateString)
        } else {
          // 未選択の場合は本店として選択
          this.selectedDates.add(dateString)
        }
      } else {
        // 掛け持ちモードの場合
        const currentJobIds = this.dateJobMap[dateString] || []
        const index = currentJobIds.indexOf(this.currentJobId)

        if (index > -1) {
          // 既に選択されている場合は削除（新しい配列を作成）
          const newJobIds = [...currentJobIds]
          newJobIds.splice(index, 1)

          if (newJobIds.length === 0 && !this.selectedDates.has(dateString)) {
            // 掛け持ち先もメインも無い場合は完全に削除
            delete this.dateJobMap[dateString]
          } else if (newJobIds.length === 0) {
            // メインのみ残っている場合
            delete this.dateJobMap[dateString]
          } else {
            this.dateJobMap[dateString] = newJobIds
          }
        } else {
          // 選択されていない場合は追加（新しい配列を作成）
          // 掛け持ちモードでは selectedDates には追加しない
          this.dateJobMap[dateString] = [...currentJobIds, this.currentJobId]
        }
      }

      // LocalStorageに保存
      this.saveJobsToLocalStorage()
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
     * 全ての日付を選択（トグル対応、Job対応版）
     */
    selectAll(dates: DateString[]) {
      if (this.currentJobId === null) {
        // 掛け持ちなしモードの場合は従来通り
        const allSelected = dates.every(date => this.selectedDates.has(date))

        if (allSelected) {
          // 全て選択済みなら解除
          dates.forEach(date => this.selectedDates.delete(date))
        } else {
          // 選択されていない日付がある場合は全て選択
          dates.forEach(date => this.selectedDates.add(date))
        }
      } else {
        // 掛け持ちモードの場合
        // 全ての対象日付が現在のジョブで選択済みかチェック
        const allSelected = dates.every(date => {
          const jobIds = this.dateJobMap[date] || []
          return jobIds.includes(this.currentJobId!)
        })

        if (allSelected) {
          // 全て選択済みなら現在のジョブを解除
          dates.forEach(date => {
            const jobIds = this.dateJobMap[date] || []
            const index = jobIds.indexOf(this.currentJobId!)
            if (index > -1) {
              jobIds.splice(index, 1)
              if (jobIds.length === 0) {
                delete this.dateJobMap[date]
                // 掛け持ちモードでは selectedDates は触らない
              } else {
                this.dateJobMap[date] = jobIds
              }
            }
          })
        } else {
          // 選択されていない日付に現在のジョブを追加
          dates.forEach(date => {
            const jobIds = this.dateJobMap[date] || []
            if (!jobIds.includes(this.currentJobId!)) {
              // 掛け持ちモードでは selectedDates には追加しない
              this.dateJobMap[date] = [...jobIds, this.currentJobId!]
            }
          })
        }
      }
    },

    /**
     * 全ての選択を解除（Job対応版）
     */
    clearAll() {
      if (this.currentJobId === null) {
        // 掛け持ちなしモードの場合は従来通り
        this.selectedDates.clear()
      } else {
        // 掛け持ちモードの場合は現在のジョブのみクリア
        Object.keys(this.dateJobMap).forEach(dateString => {
          const jobIds = this.dateJobMap[dateString]
          const index = jobIds.indexOf(this.currentJobId!)
          if (index > -1) {
            jobIds.splice(index, 1)
            if (jobIds.length === 0) {
              delete this.dateJobMap[dateString]
              // 掛け持ちモードでは selectedDates は触らない
            }
          }
        })
      }
    },

    /**
     * 曜日で選択（トグル対応、Job対応版）
     */
    selectByWeekday(dates: DateString[], targetDayOfWeek: number) {
      // 対象曜日の日付を抽出
      const targetDates = dates.filter(dateString => {
        const date = new Date(dateString)
        return date.getDay() === targetDayOfWeek
      })

      if (this.currentJobId === null) {
        // 掛け持ちなしモードの場合は従来通り
        const allSelected = targetDates.every(date => this.selectedDates.has(date))

        if (allSelected) {
          // 全て選択済みなら解除
          targetDates.forEach(date => this.selectedDates.delete(date))
        } else {
          // 選択されていない日付がある場合は全て選択
          targetDates.forEach(date => this.selectedDates.add(date))
        }
      } else {
        // 掛け持ちモードの場合
        // 対象曜日の日付が全て現在のジョブで選択済みかチェック
        const allSelected = targetDates.every(date => {
          const jobIds = this.dateJobMap[date] || []
          return jobIds.includes(this.currentJobId!)
        })

        if (allSelected) {
          // 全て選択済みなら現在のジョブを解除
          targetDates.forEach(date => {
            const jobIds = this.dateJobMap[date] || []
            const index = jobIds.indexOf(this.currentJobId!)
            if (index > -1) {
              jobIds.splice(index, 1)
              if (jobIds.length === 0) {
                delete this.dateJobMap[date]
                // 掛け持ちモードでは selectedDates は触らない
              } else {
                this.dateJobMap[date] = jobIds
              }
            }
          })
        } else {
          // 選択されていない日付に現在のジョブを追加
          targetDates.forEach(date => {
            const jobIds = this.dateJobMap[date] || []
            if (!jobIds.includes(this.currentJobId!)) {
              // 掛け持ちモードでは selectedDates には追加しない
              this.dateJobMap[date] = [...jobIds, this.currentJobId!]
            }
          })
        }
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
    },

    /**
     * ジョブを追加
     */
    addJob(name: string): Job | null {
      if (this.jobs.length >= 4) {
        return null // 最大4つまで
      }

      const nextId = (this.jobs.length + 1) as JobId
      const newJob: Job = {
        id: nextId,
        name,
        color: JOB_COLORS[nextId - 1],
        isActive: true
      }

      this.jobs.push(newJob)
      this.saveJobsToLocalStorage()
      return newJob
    },

    /**
     * ジョブを更新
     */
    updateJob(jobId: JobId, name: string) {
      const job = this.jobs.find(j => j.id === jobId)
      if (job) {
        job.name = name
        this.saveJobsToLocalStorage()
      }
    },

    /**
     * ジョブを削除
     */
    deleteJob(jobId: JobId) {
      const index = this.jobs.findIndex(j => j.id === jobId)
      if (index > -1) {
        this.jobs.splice(index, 1)

        // 関連する日付マッピングを削除
        Object.keys(this.dateJobMap).forEach(dateString => {
          const jobIds = this.dateJobMap[dateString]
          const jobIndex = jobIds.indexOf(jobId)
          if (jobIndex > -1) {
            jobIds.splice(jobIndex, 1)
            if (jobIds.length === 0) {
              delete this.dateJobMap[dateString]
              this.selectedDates.delete(dateString)
            }
          }
        })

        // 現在のジョブIDがクリアされたジョブの場合は解除
        if (this.currentJobId === jobId) {
          this.currentJobId = null
        }

        this.saveJobsToLocalStorage()
      }
    },

    /**
     * 現在のジョブIDを設定
     */
    setCurrentJobId(jobId: JobId | null) {
      this.currentJobId = jobId
    },

    /**
     * ジョブをLocalStorageに保存
     */
    saveJobsToLocalStorage() {
      localStorage.setItem('jobs', JSON.stringify(this.jobs))
      localStorage.setItem('dateJobMap', JSON.stringify(this.dateJobMap))
    },

    /**
     * ジョブをLocalStorageから読み込み
     */
    loadJobsFromLocalStorage() {
      const savedJobs = localStorage.getItem('jobs')
      if (savedJobs) {
        this.jobs = JSON.parse(savedJobs)
      }

      const savedDateJobMap = localStorage.getItem('dateJobMap')
      if (savedDateJobMap) {
        this.dateJobMap = JSON.parse(savedDateJobMap)
      }
    },

    /**
     * 本店名を設定
     */
    setMainStoreName(name: string) {
      this.mainStoreName = name
      this.saveMainStoreToLocalStorage()
    },

    /**
     * 本店名をLocalStorageに保存
     */
    saveMainStoreToLocalStorage() {
      localStorage.setItem('mainStoreName', this.mainStoreName)
    },

    /**
     * 本店名をLocalStorageから読み込み
     */
    loadMainStoreFromLocalStorage() {
      const savedMainStoreName = localStorage.getItem('mainStoreName')
      if (savedMainStoreName) {
        this.mainStoreName = savedMainStoreName
      }
    }
  }
})
