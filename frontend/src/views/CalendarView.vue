<template>
  <div class="calendar-view">
    <!-- スワイプチュートリアル -->
    <SwipeTutorial />

    <!-- カレンダーカード -->
      <div class="calendar-card">
        <!-- 選択中ジョブバナー -->
        <div class="current-job-banner" :style="{ backgroundColor: getCurrentJobColor() }">
          <span class="banner-text" :style="{ color: getCurrentJobTextColor() }">{{ getCurrentJobName() }}を選択しています</span>
        </div>

        <!-- ヘッダー：年月 -->
        <div class="calendar-header">
          <h1 class="current-month">{{ currentMonthInfo.displayText }}</h1>
        </div>

        <!-- 月選択ボタン：今月・来月 -->
        <div class="month-buttons">
          <button @click="setThisMonth" class="month-btn" :class="{ active: isThisMonth }">
            今月
          </button>
          <button @click="setNextMonth" class="month-btn" :class="{ active: isNextMonth }">
            来月
          </button>
        </div>

        <!-- 掛け持ち設定アコーディオン -->
        <JobManager />

        <!-- アクションボタン：休日基準で選択・平日のみ選択・クリア -->
        <div class="action-buttons">
          <button @click="handleSelectAll" class="action-btn" :class="{ selected: isAllSelected }">休日基準で選択</button>
          <button @click="handleSelectWeekdaysOnly" class="action-btn" :class="{ selected: isWeekdaysOnlySelected }">平日のみ選択</button>
          <button @click="handleClearAll" class="action-btn">クリア</button>
        </div>

        <!-- 曜日一括選択ボタン -->
        <div class="weekday-selection-section">
          <div class="weekday-selection-label">※曜日別で一括選択</div>
          <div class="weekday-buttons">
            <button
              v-for="(day, index) in weekdays"
              :key="index"
              @click="handleSelectByWeekday(index)"
              class="weekday-btn"
              :class="{ selected: isWeekdayFullySelected(index) }"
            >
              {{ day }}
            </button>
          </div>
        </div>

        <!-- 曜日ヘッダー -->
        <div class="calendar-weekdays">
          <div
            v-for="(day, index) in weekdays"
            :key="index"
            class="weekday-header"
            :class="{
              sunday: index === 0,
              saturday: index === 6
            }"
          >
            {{ day }}
          </div>
        </div>

        <!-- 日付セル -->
        <div class="calendar-dates">
          <div
            v-for="cell in calendarCells"
            :key="cell.dateString"
            class="date-cell"
            :class="{
              'other-month': !cell.isCurrentMonth,
              'today': cell.isToday,
              'past': cell.isPast,
              'holiday': cell.isHoliday,
              'saturday': cell.dayOfWeek === 6,
              'sunday': cell.dayOfWeek === 0,
              'selected': cell.isSelected,
              'removed': isRemovedDate(cell.dateString),
              'from-base': isFromBase(cell.dateString),
              'custom-time': hasCustomTime(cell.dateString),
              'bulk-applied': hasBulkApplied(cell.dateString)
            }"
            @click="handleDateClick(cell)"
          >
            <div class="date-number">{{ cell.date.getDate() }}</div>
            <!-- ジョブドット表示 -->
            <div v-if="getJobDotsForDate(cell.dateString).length > 0" class="job-dots">
              <span
                v-for="jobId in getJobDotsForDate(cell.dateString)"
                :key="jobId"
                class="job-dot"
                :class="{ 'main-store-dot': jobId === null }"
                :style="{ backgroundColor: getJobColor(jobId) }"
              ></span>
            </div>
          </div>
        </div>

        <!-- 統計情報 -->
        <div class="calendar-stats">
          <div class="stat-summary">
            <span class="stat-label">選択日数:</span>
            <span class="stat-value">{{ selectedCount }}日</span>
          </div>
        </div>
      </div>

    <!-- クリア確認モーダル -->
    <Teleport to="body">
      <div v-if="showClearModal" class="modal-overlay" @click="closeClearModal">
        <div class="modal-content clear-modal" @click.stop>
          <h3 class="modal-title">選択をクリアしますか？</h3>
          <div class="modal-message">
            <p>現在 <strong>{{ selectedCount }}日</strong> が選択されています。</p>
            <p v-if="hasAnyTimeSettings">時間設定が適用されている日付が含まれています。</p>
            <p class="warning-text">クリアするとすべての選択と時間設定が削除されます。</p>
          </div>
          <div class="modal-buttons">
            <button @click="closeClearModal" class="cancel-btn">キャンセル</button>
            <button @click="confirmClear" class="confirm-clear-btn">クリアする</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCalendar } from '../composables/useCalendar'
import { useHolidays } from '../composables/useHolidays'
import { useCalendarStore } from '../stores/calendar'
import { useTimeRegisterStore } from '../stores/timeRegister'
import type { CalendarCell } from '../types/calendar'
import SwipeTutorial from '../components/SwipeTutorial.vue'
import JobManager from '../components/JobManager.vue'

const store = useCalendarStore()
const timeRegisterStore = useTimeRegisterStore()

// 今月と来月の情報
const today = new Date()
const thisMonth = { year: today.getFullYear(), month: today.getMonth() }
const nextMonthDate = new Date(thisMonth.year, thisMonth.month + 1, 1)
const nextMonth = { year: nextMonthDate.getFullYear(), month: nextMonthDate.getMonth() }

// Composables
const {
  calendarCells,
  currentMonthInfo,
  selectedCount,
  weekdayCount,
  holidayCount,
  isAllSelected,
  isWeekdaysOnlySelected,
  isWeekdayFullySelected,
  toggleDate,
  selectAll,
  selectWeekdaysOnly,
  clearAll,
  selectByWeekday,
  setMonth
} = useCalendar()

const { fetchHolidaysWithCache, holidays: holidaysData } = useHolidays()

// ローカル状態
const weekdays = ['日', '月', '火', '水', '木', '金', '土']
const showClearModal = ref(false)

// 今月・来月の判定
const isThisMonth = computed(() => {
  return store.currentYear === thisMonth.year && store.currentMonth === thisMonth.month
})

const isNextMonth = computed(() => {
  return store.currentYear === nextMonth.year && store.currentMonth === nextMonth.month
})

// 初期化
onMounted(async () => {
  // 祝日データを取得してストアに保存
  await fetchHolidaysWithCache()
  store.setHolidays(holidaysData.value)

  // ジョブデータをLocalStorageから読み込み
  store.loadJobsFromLocalStorage()
})

// イベントハンドラ
const handleDateClick = (cell: CalendarCell) => {
  if (!cell.isCurrentMonth) return
  if (cell.isPast) return // 過去の日付は選択できない

  // 掛け持ちモードの場合は確認ダイアログをスキップ
  const isJobMode = store.currentJobId !== null

  // 日付を外す場合（選択済み→未選択）、設定がある場合は確認
  if (store.isDateSelected(cell.dateString) && !isJobMode) {
    const workDay = timeRegisterStore.workDays.find(wd => wd.date === cell.dateString)

    // デフォルト以外の設定が適用されている場合は確認
    if (workDay && (workDay.startTimeSetBy !== 'default' || workDay.endTimeSetBy !== 'default')) {
      if (!confirm('この日には時間設定が適用されています。\n日付を外してもよろしいですか？')) {
        return // キャンセルされた場合は何もしない
      }
    }
  }

  toggleDate(cell.dateString)
}

const setThisMonth = () => {
  setMonth(thisMonth.year, thisMonth.month)
}

const setNextMonth = () => {
  setMonth(nextMonth.year, nextMonth.month)
}

// シフトを外した日付かどうかを判定
const isRemovedDate = (dateString: string): boolean => {
  const workDay = timeRegisterStore.workDays.find(wd => wd.date === dateString)
  return workDay?.isRemoved ?? false
}

// 過去のシフトベースから作成された日付かどうかを判定（個別設定がない場合）
const isFromBase = (dateString: string): boolean => {
  const workDay = timeRegisterStore.workDays.find(wd => wd.date === dateString)
  if (!workDay || workDay.isRemoved) return false
  // 個別設定が存在する場合はfalse（個別設定が優先）
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') return false
  // 過去ベースの設定がある場合
  return workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base'
}

// 個別設定された日付かどうかを判定
const hasCustomTime = (dateString: string): boolean => {
  const workDay = timeRegisterStore.workDays.find(wd => wd.date === dateString)
  if (!workDay || workDay.isRemoved) return false
  // 個別設定が存在する場合
  return workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom'
}

// 一括設定が適用された日付かどうかを判定（個別設定や過去ベースがない場合）
const hasBulkApplied = (dateString: string): boolean => {
  const workDay = timeRegisterStore.workDays.find(wd => wd.date === dateString)
  if (!workDay || workDay.isRemoved) return false
  // 個別設定が存在する場合はfalse（個別設定が優先）
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') return false
  // 過去ベースの場合もfalse（過去ベースが優先）
  if (workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base') return false
  // 一括設定がある場合
  return workDay.startTimeSetBy === 'bulk' || workDay.endTimeSetBy === 'bulk'
}

// 時間設定がある日付かどうかをチェック
const hasTimeSettings = (dateString: string): boolean => {
  const workDay = timeRegisterStore.workDays.find(wd => wd.date === dateString)
  if (!workDay) return false
  // デフォルト以外の設定方法がある場合
  return workDay.startTimeSetBy !== 'default' || workDay.endTimeSetBy !== 'default'
}

// 指定した日付に設定されているジョブIDの配列を取得（本店を含む）
const getJobDotsForDate = (dateString: string) => {
  const jobIds = store.getJobsForDate(dateString)
  const isSelected = store.selectedDates.has(dateString)

  if (!isSelected) {
    return jobIds  // 本店未選択の場合は掛け持ち先のみ（通常は空配列）
  }

  // 本店が選択されている場合
  if (jobIds.length === 0) {
    return [null] as any[]  // 本店のみ
  } else {
    return [null, ...jobIds] as any[]  // 本店 + 掛け持ち先の両方を表示
  }
}

// 指定したジョブIDの色を取得（本店の場合は白）
const getJobColor = (jobId: number | null) => {
  if (jobId === null) {
    return '#FFFFFF' // 本店は白
  }
  const job = store.getJobById(jobId as any)
  return job?.color || '#999'
}

// 現在選択中のジョブ名を取得
const getCurrentJobName = () => {
  if (store.currentJobId === null) {
    return store.mainStoreDisplayName
  }
  const job = store.getJobById(store.currentJobId)
  return job?.name || ''
}

// 現在選択中のジョブの色を取得
const getCurrentJobColor = () => {
  if (store.currentJobId === null) {
    return '#FFFFFF' // 本店は白
  }
  const job = store.getJobById(store.currentJobId)
  return job?.color || '#999'
}

// 現在選択中のジョブの文字色を取得
const getCurrentJobTextColor = () => {
  if (store.currentJobId === null) {
    return '#000000' // 本店（白背景）は黒文字
  }
  return '#000000' // 掛け持ち先（蛍光色背景）も黒文字
}

// 休日基準で選択（確認付き）
const handleSelectAll = () => {
  // 掛け持ちモードの場合は確認ダイアログをスキップ
  const isJobMode = store.currentJobId !== null

  if (!isJobMode) {
    // 選択を解除する日付を確認
    const currentMonthCells = calendarCells.value.filter(cell => cell.isCurrentMonth && !cell.isPast)
    const datesToDeselect = currentMonthCells.filter(cell => cell.isSelected).map(cell => cell.dateString)

    // 時間設定がある日付が含まれているか確認
    const hasSettings = datesToDeselect.some(date => hasTimeSettings(date))

    if (hasSettings && datesToDeselect.length > 0) {
      if (!confirm('時間設定が適用されている日付が含まれています。\n選択を変更してもよろしいですか？')) {
        return
      }
    }
  }

  selectAll()
}

// 平日のみ選択（確認付き）
const handleSelectWeekdaysOnly = () => {
  const currentMonthCells = calendarCells.value.filter(cell => cell.isCurrentMonth && !cell.isPast)

  // 選択を解除される日付（土日祝日）を取得
  const datesToDeselect = currentMonthCells
    .filter(cell => {
      const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6
      const isHoliday = cell.isHoliday
      return cell.isSelected && (isWeekend || isHoliday)
    })
    .map(cell => cell.dateString)

  // 時間設定がある日付が含まれているか確認
  const hasSettings = datesToDeselect.some(date => hasTimeSettings(date))

  if (hasSettings && datesToDeselect.length > 0) {
    if (!confirm('時間設定が適用されている日付が含まれています。\n選択を変更してもよろしいですか？')) {
      return
    }
  }

  selectWeekdaysOnly()
}

// クリア確認モーダルを開く
const handleClearAll = () => {
  // 選択がない場合は何もしない
  if (selectedCount.value === 0) {
    return
  }
  showClearModal.value = true
}

// クリア確認モーダルを閉じる
const closeClearModal = () => {
  showClearModal.value = false
}

// クリア実行
const confirmClear = () => {
  // すべての日付をクリア（掛け持ち設定も含む）
  store.selectedDates.clear()
  store.dateJobMap = {}

  // LocalStorageに保存（画面遷移時に古いデータが復活しないようにするため）
  store.saveJobsToLocalStorage()

  // 時間登録の状態もクリア
  timeRegisterStore.workDays = []
  timeRegisterStore.remarks = ''

  closeClearModal()
}

// 時間設定があるかどうかを判定
const hasAnyTimeSettings = computed(() => {
  const selectedDates = calendarCells.value.filter(cell => cell.isSelected).map(cell => cell.dateString)
  return selectedDates.some(date => hasTimeSettings(date))
})

// 曜日別選択（確認付き）
const handleSelectByWeekday = (dayOfWeek: number) => {
  // 掛け持ちモードの場合は確認ダイアログをスキップ
  const isJobMode = store.currentJobId !== null

  const currentMonthCells = calendarCells.value.filter(cell => cell.isCurrentMonth && !cell.isPast)

  // 対象曜日の日付を取得
  const targetDates = currentMonthCells.filter(cell => cell.dayOfWeek === dayOfWeek).map(cell => cell.dateString)

  // すでに全て選択されている場合は解除される
  const allSelected = targetDates.every(date => store.isDateSelected(date))

  if (allSelected && !isJobMode) {
    // 時間設定がある日付が含まれているか確認
    const hasSettings = targetDates.some(date => hasTimeSettings(date))

    if (hasSettings) {
      const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土']
      if (!confirm(`時間設定が適用されている${weekdayLabels[dayOfWeek]}曜日が含まれています。\n選択を解除してもよろしいですか？`)) {
        return
      }
    }
  }

  selectByWeekday(dayOfWeek)
}
</script>

<style scoped>
.calendar-view {
  height: 100%;
  color: #333;
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
  padding: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
}

/* カレンダーカード */
.calendar-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1rem;
  animation: fadeIn 0.5s ease-in;
  position: relative;
}

/* 選択中ジョブバナー */
.current-job-banner {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0.75rem 1.5rem;
  margin: -1rem -1rem 1rem -1rem;
  border-radius: 16px 16px 0 0;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-text {
  /* color is set dynamically via :style */
  font-weight: bold;
  font-size: 1.1rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ヘッダー */
.calendar-header {
  text-align: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
}

.current-month {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

/* 月選択ボタン */
.month-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.month-btn {
  padding: 0.5rem 1.5rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  font-size: 1rem;
}

.month-btn:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
}

.month-btn.active {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* グループ化設定アコーディオン */
.grouping-section {
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.grouping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.3s ease;
  user-select: none;
}

.grouping-header:hover {
  background: #e9ecef;
}

.grouping-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.grouping-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.help-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  border: none;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-icon-btn:hover {
  background: #764ba2;
  transform: scale(1.1);
}

.accordion-icon {
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 700;
}

.grouping-content {
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
}

.grouping-note {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}

/* アコーディオントランジション */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

/* アクションボタン */
.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1.5rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  color: #333;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
}

.action-btn.selected {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 曜日一括選択セクション */
.weekday-selection-section {
  margin-bottom: 0.5rem;
}

.weekday-selection-label {
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  margin-bottom: 0.3rem;
}

.weekday-buttons {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.weekday-btn {
  padding: 0.5rem 0.25rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  color: #333;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  white-space: nowrap;
  text-align: center;
}

.weekday-btn:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
}

.weekday-btn.selected {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 統計情報 */
.calendar-stats {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  text-align: center;
}

.stat-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  color: #666;
  font-weight: 600;
}

.stat-value {
  font-size: 1.25rem;
  color: #667eea;
  font-weight: 700;
}

.stat-comment {
  font-size: 0.875rem;
  color: #999;
  font-style: italic;
}

/* 曜日ヘッダー */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.weekday-header {
  text-align: center;
  padding: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: #666;
}

.weekday-header.sunday {
  color: #ff6ba3;
}

.weekday-header.saturday {
  color: #6ba3ff;
}

/* カレンダー日付グリッド */
.calendar-dates {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.date-cell {
  aspect-ratio: 1;
  padding: 0.5rem;
  border-radius: 8px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 2px solid transparent;
}

.date-cell:hover:not(.other-month):not(.past):not(.selected) {
  background: rgba(102, 126, 234, 0.1);
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
}

.date-cell.other-month {
  background: transparent;
  color: #ccc;
  cursor: not-allowed;
  border: none;
}

.date-cell.other-month:hover {
  transform: none;
  box-shadow: none;
  background: transparent;
}

.date-cell.past {
  opacity: 0.4;
  cursor: not-allowed;
  background: #e0e0e0;
}

.date-cell.past:hover {
  transform: none;
  box-shadow: none;
}

.date-cell.today:not(.past) {
  border: 2px solid #667eea;
}

.date-cell.selected {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  font-weight: 700;
}

/* 過去のシフトベースから作成された日付 - 薄い赤 */
.date-cell.selected.from-base {
  background: linear-gradient(135deg, #fca5a5, #fecaca);
  color: #991b1b;
}

/* 個別設定された日付 - 黄色 */
.date-cell.selected.custom-time {
  background: linear-gradient(135deg, #fbbf24, #fcd34d);
  color: #78350f;
}

/* 一括設定が適用された日付 - 青色 */
.date-cell.selected.bulk-applied {
  background: linear-gradient(135deg, #60a5fa, #93c5fd);
  color: #1e3a8a;
}

.date-cell.removed {
  background: #e0e0e0;
  color: #999;
  opacity: 0.6;
}

.date-cell.removed.selected {
  background: linear-gradient(135deg, #9ca3af, #d1d5db);
  color: #666;
}

.date-cell.saturday:not(.selected):not(.holiday):not(.past) .date-number {
  color: #6ba3ff;
}

.date-cell.sunday:not(.selected):not(.holiday):not(.past) .date-number {
  color: #ff6ba3;
}

.date-cell.holiday:not(.selected):not(.past) .date-number {
  color: #ff0000;
  font-weight: 700;
}

.date-number {
  font-size: 1.125rem;
  font-weight: 600;
}

/* ジョブドット表示 */
.job-dots {
  position: absolute;
  bottom: 0.25rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.2rem;
  align-items: center;
  justify-content: center;
}

.job-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

/* 本店ドット（白）に枠線を追加 */
.main-store-dot {
  border: 1.5px solid #666;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

/* レスポンシブ */
@media (max-width: 768px) {
  .calendar-view {
    padding: 0.75rem;
  }

  .calendar-card {
    padding: 1rem;
  }

  .calendar-header {
    flex-direction: column;
    gap: 1rem;
  }

  .month-buttons {
    justify-content: center;
  }

  .current-month {
    font-size: 1.5rem;
  }

  .month-btn {
    padding: 0.4rem 1rem;
    font-size: 0.875rem;
  }

  .action-buttons {
    gap: 0.4rem;
  }

  .action-btn {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }

  .weekday-buttons {
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .weekday-btn {
    padding: 0.4rem 0.15rem;
    font-size: 0.75rem;
  }

  .calendar-stats {
    gap: 1rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .stat-item {
    gap: 0.3rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .calendar-dates {
    gap: 0.25rem;
  }

  .date-cell {
    padding: 0.25rem;
  }

  .date-number {
    font-size: 0.9rem;
  }
}

/* ヘルプモーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
  max-width: 400px;
  width: 100%;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.help-modal {
  max-width: 400px;
}

.modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #667eea;
  text-align: center;
}

.help-content {
  margin-bottom: 1.5rem;
}

.help-content p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
  color: #333;
  line-height: 1.6;
}

.close-btn {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* クリア確認モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #333;
  text-align: center;
}

.modal-message {
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.modal-message p {
  margin: 0.5rem 0;
  color: #555;
  font-size: 0.95rem;
}

.modal-message strong {
  color: #667eea;
  font-weight: 700;
}

.warning-text {
  color: #ef4444 !important;
  font-weight: 600;
  margin-top: 1rem !important;
}

.modal-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-clear-btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.confirm-clear-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.confirm-clear-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.confirm-clear-btn:active {
  transform: translateY(0);
}
</style>
