<template>
  <div class="shift-calendar-view">
    <!-- ヘッダー -->
    <div class="shift-header">
      <button @click="goBack" class="back-btn">← 戻る</button>
      <h1 class="page-title">シフト確認</h1>
    </div>

    <!-- 期間表示 -->
    <div class="period-section">
      <div class="period-navigation">
        <button @click="previousPeriod" class="period-nav-btn">‹ 前月</button>
        <div class="current-period">
          <span class="period-text">{{ currentPeriodText }}</span>
        </div>
        <button @click="nextPeriod" class="period-nav-btn">次月 ›</button>
      </div>
    </div>

    <!-- カレンダーカード -->
    <div class="calendar-card">
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
            'saturday': cell.dayOfWeek === 6,
            'sunday': cell.dayOfWeek === 0,
            'has-shift': cell.hasShift
          }"
          @click="handleDateClick(cell)"
        >
          <div class="date-number">{{ cell.date.getDate() }}</div>
          <!-- 出勤日マーク -->
          <div v-if="cell.hasShift" class="shift-marker">●</div>
        </div>
      </div>
    </div>

    <!-- サマリー情報 -->
    <div class="summary-card">
      <h3 class="summary-title">この期間の勤務情報</h3>
      <div class="summary-items">
        <div class="summary-item">
          <span class="summary-label">📅 勤務日数:</span>
          <span class="summary-value">{{ workDaysCount }}日</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">⏰ 合計時間:</span>
          <span class="summary-value">{{ totalHours }}時間</span>
        </div>
      </div>
      <p class="summary-note">※日付をタップで詳細表示（今後実装予定）</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 曜日
const weekdays = ['日', '月', '火', '水', '木', '金', '土']

// 現在の年月
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth()) // 0-11

// モックシフトデータ
const mockShifts = ref([
  { date: '2025-01-06', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-07', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-09', startTime: '10:00', endTime: '19:00', jobName: '厨房', hours: 8 },
  { date: '2025-01-10', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-13', startTime: '09:00', endTime: '17:00', jobName: 'カフェ', hours: 7 },
  { date: '2025-01-14', startTime: '10:00', endTime: '19:00', jobName: '厨房', hours: 8 },
  { date: '2025-01-16', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-17', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-20', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-21', startTime: '10:00', endTime: '19:00', jobName: '厨房', hours: 8 },
  { date: '2025-01-23', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-24', startTime: '09:00', endTime: '17:00', jobName: 'カフェ', hours: 7 },
  { date: '2025-01-27', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-28', startTime: '10:00', endTime: '19:00', jobName: '厨房', hours: 8 },
  { date: '2025-01-30', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
  { date: '2025-01-31', startTime: '09:00', endTime: '18:00', jobName: 'カフェ', hours: 8 },
])

// 現在の期間テキスト
const currentPeriodText = computed(() => {
  return `${currentYear.value}年${currentMonth.value + 1}月`
})

// カレンダーセルの生成
const calendarCells = computed(() => {
  const cells: any[] = []
  const year = currentYear.value
  const month = currentMonth.value

  // 月初と月末
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // カレンダーの開始日（前月の日付を含む）
  const startDayOfWeek = firstDay.getDay()
  const calendarStart = new Date(firstDay)
  calendarStart.setDate(firstDay.getDate() - startDayOfWeek)

  // カレンダーの終了日（次月の日付を含む）
  const endDayOfWeek = lastDay.getDay()
  const calendarEnd = new Date(lastDay)
  calendarEnd.setDate(lastDay.getDate() + (6 - endDayOfWeek))

  // セルを生成
  const currentDate = new Date(calendarStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  while (currentDate <= calendarEnd) {
    const dateString = formatDateString(currentDate)
    const isCurrentMonth = currentDate.getMonth() === month
    const isToday = currentDate.getTime() === today.getTime()
    const isPast = currentDate < today
    const hasShift = mockShifts.value.some(shift => shift.date === dateString)

    cells.push({
      date: new Date(currentDate),
      dateString,
      isCurrentMonth,
      isToday,
      isPast,
      hasShift,
      dayOfWeek: currentDate.getDay()
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return cells
})

// 勤務日数
const workDaysCount = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  return mockShifts.value.filter(shift => {
    const shiftDate = new Date(shift.date)
    return shiftDate >= startDate && shiftDate <= endDate
  }).length
})

// 合計時間
const totalHours = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  return mockShifts.value
    .filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate >= startDate && shiftDate <= endDate
    })
    .reduce((sum, shift) => sum + shift.hours, 0)
})

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 前月に移動
 */
function previousPeriod() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

/**
 * 次月に移動
 */
function nextPeriod() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

/**
 * 日付クリック時の処理
 */
function handleDateClick(cell: any) {
  if (cell.hasShift) {
    alert(`${cell.dateString} の詳細表示（今後実装予定）`)
  }
}

/**
 * 戻るボタン
 */
function goBack() {
  router.push('/')
}

onMounted(() => {
  // 初期化処理
})
</script>

<style scoped>
.shift-calendar-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1b1b15, #2f3a2a, #3e2f1d, #1f2b1f);
  background-size: 400% 400%;
  animation: bgFlow 25s ease infinite;
  padding: 1rem;
  padding-bottom: 2rem;
  color: #fff;
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
}

@keyframes bgFlow {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

/* === ヘッダー === */
.shift-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

/* === 期間セクション === */
.period-section {
  margin-bottom: 1.5rem;
}

.period-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.period-nav-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  font-weight: 600;
}

.period-nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.current-period {
  flex: 1;
  text-align: center;
}

.period-text {
  font-size: 1.25rem;
  font-weight: 700;
}

/* === カレンダーカード === */
.calendar-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.5rem;
}

/* === 曜日ヘッダー === */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.weekday-header {
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
}

.weekday-header.sunday {
  color: #ff6b6b;
}

.weekday-header.saturday {
  color: #4dabf7;
}

/* === 日付セル === */
.calendar-dates {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.date-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  border: 2px solid transparent;
}

.date-cell:hover {
  background: rgba(255, 255, 255, 0.1);
}

.date-cell.other-month {
  opacity: 0.3;
}

.date-cell.today {
  border-color: #ffd43b;
  background: rgba(255, 212, 59, 0.1);
}

.date-cell.past {
  opacity: 0.6;
}

.date-cell.sunday .date-number {
  color: #ff6b6b;
}

.date-cell.saturday .date-number {
  color: #4dabf7;
}

.date-cell.has-shift {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
}

.date-cell.has-shift:hover {
  background: rgba(16, 185, 129, 0.3);
}

.date-number {
  font-size: 0.875rem;
  font-weight: 600;
}

.shift-marker {
  position: absolute;
  bottom: 4px;
  font-size: 0.5rem;
  color: #10b981;
}

/* === サマリーカード === */
.summary-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.summary-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
}

.summary-note {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  text-align: center;
}

/* === レスポンシブ === */
@media (max-width: 480px) {
  .shift-calendar-view {
    padding: 0.5rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .period-text {
    font-size: 1rem;
  }

  .calendar-card {
    padding: 1rem;
  }

  .date-number {
    font-size: 0.75rem;
  }
}
</style>
