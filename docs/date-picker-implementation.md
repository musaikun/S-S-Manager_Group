# 日付選択実装ガイド

このプロジェクトの日付選択機能を他のセッションで再現する際に必要な情報をまとめたドキュメントです。

---

## 📦 1. 依存関係とライブラリ

**重要：サードパーティの日付ピッカーライブラリは使用していません**

このプロジェクトは**完全カスタム実装**です。以下のフレームワークのみを使用：

```json
{
  "vue": "^3.5.22",
  "vue-router": "^4.5.0",
  "pinia": "^2.3.0",
  "axios": "^1.13.2",
  "@line/liff": "^2.27.3"
}
```

HTMLの標準 `<input type="date">` も使用していません。

---

## 🏗️ 2. アーキテクチャ構成

### 主要ファイル構造

```
frontend/src/
├── types/
│   └── calendar.ts              # 型定義
├── utils/
│   └── dateUtils.ts             # 日付操作ユーティリティ
├── composables/
│   ├── useCalendar.ts           # カレンダーロジック
│   ├── useTimeFormat.ts         # 時間フォーマッティング
│   └── useTimeCalculation.ts   # 勤務時間計算
├── stores/
│   └── calendar.ts              # 状態管理（Pinia）
└── views/
    ├── CalendarView.vue         # カレンダーUI（月間表示）
    ├── TimeRegisterView.vue     # 時刻設定UI
    └── ShiftCalendarView.vue    # シフト確認UI
```

---

## 📝 3. 型定義（`types/calendar.ts`）

```typescript
// 基本型
export type DateString = string  // "YYYY-MM-DD"
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0=日曜
export type JobId = 1 | 2 | 3 | 4

// カレンダーセル
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

// ジョブ情報（掛け持ち対応）
export interface Job {
  id: JobId
  name: string
  color: JobColor  // 蛍光色
  isActive: boolean
}

// 日付とジョブのマッピング
export type DateJobMap = Record<DateString, JobId[]>

// 祝日データ
export type HolidayData = Record<DateString, string>
```

**実装ファイル:** `frontend/src/types/calendar.ts`

---

## 🛠️ 4. 日付ユーティリティ（`utils/dateUtils.ts`）

### 主要な関数

```typescript
// フォーマット変換
formatDateString(date: Date): DateString              // Date → "2025-01-15"
parseDateString(dateString: DateString): Date         // "2025-01-15" → Date
formatDisplayDate(date: Date): string                 // Date → "1/15(水)"
formatLongDate(date: Date): string                    // Date → "2025年1月15日(水)"

// 日付判定
isToday(date: Date): boolean
isPast(date: Date): boolean
isSameDay(date1: Date, date2: Date): boolean
isWeekend(date: Date): boolean
isSaturday(date: Date): boolean
isSunday(date: Date): boolean

// カレンダー生成
getCalendarDates(year: number, month: number): Date[] // 前月・当月・翌月を含む
getMonthDates(year: number, month: number): Date[]    // 当月のみ
getDaysInMonth(year: number, month: number): number

// ソート
sortDates(dates: Date[]): Date[]
sortDateStrings(dateStrings: DateString[]): DateString[]
```

### 実装例

```typescript
// frontend/src/utils/dateUtils.ts:10-14
export function formatDateString(date: Date): DateString {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// frontend/src/utils/dateUtils.ts:28-33
export function formatDisplayDate(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${month}/${day}(${weekday})`
}

// frontend/src/utils/dateUtils.ts:130-158
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
```

**実装ファイル:** `frontend/src/utils/dateUtils.ts`

---

## 🎯 5. カレンダーロジック（`composables/useCalendar.ts`）

### 主要な機能

```typescript
// カレンダーセル生成（前月・当月・翌月を含む42日分）
const calendarCells = computed<CalendarCell[]>(() => {
  const allDates = getCalendarDates(currentYear, currentMonth)
  return allDates.map(date => ({
    date,
    dateString: formatDateString(date),
    dayOfWeek: getDayOfWeek(date),
    isCurrentMonth: isSameMonth(date, currentMonthDate),
    isToday: isToday(date),
    isPast: isPast(date),
    isHoliday: store.isHoliday(dateString),
    isSelected: store.isDateSelected(dateString)
  }))
})

// 週単位で分割（7日×6週 = 42セル）
const calendarWeeks = computed<CalendarCell[][]>(() => {
  const weeks = []
  for (let i = 0; i < calendarCells.value.length; i += 7) {
    weeks.push(calendarCells.value.slice(i, i + 7))
  }
  return weeks
})
```

### 選択機能

```typescript
// 個別選択/解除
toggleDate(dateString: DateString)

// 一括操作
selectAll()                               // 全選択（過去除く）
selectWeekdaysOnly()                      // 平日のみ選択（月〜金で祝日でない日）
selectByWeekday(dayOfWeek: number)        // 曜日指定選択
clearAll()                                // 全解除

// ナビゲーション
previousMonth()
nextMonth()
goToToday()
setMonth(year: number, month: number)
```

### 集計機能

```typescript
// 当月の平日数（月〜金で祝日でない日）
const weekdayCount = computed<number>(() => {
  return currentMonthCells.value.filter(cell => {
    const isWeekday = cell.dayOfWeek >= 1 && cell.dayOfWeek <= 5
    return isWeekday && !cell.isHoliday
  }).length
})

// 当月の休日数（土日または祝日）
const holidayCount = computed<number>(() => {
  return currentMonthCells.value.filter(cell => {
    const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6
    return isWeekend || cell.isHoliday
  }).length
})
```

**実装ファイル:** `frontend/src/composables/useCalendar.ts`

---

## 🎨 6. UIコンポーネントの実装パターン

### カレンダーグリッド（CalendarView.vue）

```vue
<template>
  <div class="calendar">
    <!-- ヘッダー（曜日） -->
    <div class="calendar-header">
      <div v-for="day in ['日','月','火','水','木','金','土']"
           :key="day" class="weekday-cell">
        {{ day }}
      </div>
    </div>

    <!-- 日付グリッド（7×6 = 42セル） -->
    <div class="calendar-grid">
      <div
        v-for="cell in calendarCells"
        :key="cell.dateString"
        class="date-cell"
        :class="{
          'other-month': !cell.isCurrentMonth,
          'today': cell.isToday,
          'past': cell.isPast,
          'weekend': cell.dayOfWeek === 0 || cell.dayOfWeek === 6,
          'holiday': cell.isHoliday,
          'selected': cell.isSelected
        }"
        @click="handleDateClick(cell)"
      >
        <span class="date-number">{{ cell.date.getDate() }}</span>
        <span v-if="cell.isHoliday" class="holiday-name">
          {{ cell.holidayName }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCalendar } from '@/composables/useCalendar'
import type { CalendarCell } from '@/types/calendar'

const { calendarCells, toggleDate } = useCalendar()

const handleDateClick = (cell: CalendarCell) => {
  // 過去の日付と他月はクリック無効
  if (!cell.isCurrentMonth || cell.isPast) return
  toggleDate(cell.dateString)
}
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.date-cell {
  aspect-ratio: 1;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.date-cell.selected {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: transparent;
}

.date-cell.past {
  opacity: 0.4;
  cursor: not-allowed;
}

.date-cell.holiday {
  color: #ff4444;
}

.date-cell.weekend {
  background-color: #f5f5f5;
}
</style>
```

### 時刻選択モーダル（TimeRegisterView.vue）

```vue
<template>
  <div v-if="showTimeModal" class="modal-overlay" @click="closeModal">
    <div class="time-picker-modal" @click.stop>
      <h3>{{ modalType === 'start' ? '開始時刻' : '終了時刻' }}</h3>

      <!-- 午前/午後切り替え -->
      <div class="period-toggle">
        <button
          :class="{ active: !isAfternoon }"
          @click="isAfternoon = false"
        >
          午前 (0-11時)
        </button>
        <button
          :class="{ active: isAfternoon }"
          @click="isAfternoon = true"
        >
          午後 (12-23時)
        </button>
      </div>

      <!-- 時間選択（6列×2行 = 12時間） -->
      <div class="hour-selector-grid">
        <button
          v-for="hour in hourButtons"
          :key="hour"
          class="hour-btn"
          :class="{ active: selectedHour === hour }"
          @click="selectedHour = hour"
        >
          {{ hour }}
        </button>
      </div>

      <!-- 分選択（0, 15, 30, 45） -->
      <div class="minute-selector-grid">
        <button
          v-for="minute in [0, 15, 30, 45]"
          :key="minute"
          class="minute-btn"
          :class="{ active: selectedMinute === minute }"
          @click="selectedMinute = minute"
        >
          {{ String(minute).padStart(2, '0') }}分
        </button>
      </div>

      <!-- 確定ボタン -->
      <button class="confirm-btn" @click="applyTime">
        {{ formatTime(selectedHour, selectedMinute) }} に設定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showTimeModal = ref(false)
const modalType = ref<'start' | 'end'>('start')
const isAfternoon = ref(false)
const selectedHour = ref(9)
const selectedMinute = ref(0)

const hourButtons = computed(() => {
  return isAfternoon.value
    ? [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
})

const formatTime = (hour: number, minute: number) => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const applyTime = () => {
  const timeStr = formatTime(selectedHour.value, selectedMinute.value)
  // 時刻を適用する処理
  showTimeModal.value = false
}

const closeModal = () => {
  showTimeModal.value = false
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.time-picker-modal {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 90vw;
  width: 400px;
}

.period-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 1rem;
}

.hour-selector-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 1rem;
}

.minute-selector-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 1rem;
}

.hour-btn, .minute-btn {
  padding: 1rem;
  border: 1.5px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  min-width: 44px;
}

.hour-btn.active, .minute-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: transparent;
}

.confirm-btn {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}
</style>
```

---

## ⚙️ 7. 状態管理（Pinia Store）

```typescript
// stores/calendar.ts
import { defineStore } from 'pinia'
import type { CalendarState, DateString, JobId } from '@/types/calendar'

export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDates: new Set<DateString>(),
    holidays: {},
    dateJobMap: {},  // 掛け持ち対応
    jobs: [],
    currentJobId: null,
    mainStoreName: '',
    savedTemplate: null,
    previousMonthData: null
  }),

  getters: {
    selectedCount: (state) => state.selectedDates.size,

    selectedDatesArray: (state) => Array.from(state.selectedDates),

    isDateSelected: (state) => (date: DateString) =>
      state.selectedDates.has(date),

    isHoliday: (state) => (date: DateString) =>
      date in state.holidays,

    getHolidayName: (state) => (date: DateString) =>
      state.holidays[date],

    currentMonthInfo: (state) => ({
      year: state.currentYear,
      month: state.currentMonth,
      displayText: `${state.currentYear}年${state.currentMonth + 1}月`
    }),

    getJobsForDate: (state) => (date: DateString) =>
      state.dateJobMap[date] || []
  },

  actions: {
    toggleDate(dateString: DateString) {
      if (this.selectedDates.has(dateString)) {
        this.selectedDates.delete(dateString)
      } else {
        this.selectedDates.add(dateString)
      }
    },

    selectAll(dates: DateString[]) {
      dates.forEach(date => this.selectedDates.add(date))
    },

    clearAll() {
      this.selectedDates.clear()
    },

    selectByWeekday(dates: DateString[], dayOfWeek: number) {
      dates.forEach(dateString => {
        const date = new Date(dateString)
        if (date.getDay() === dayOfWeek) {
          this.selectedDates.add(dateString)
        }
      })
    },

    previousMonth() {
      if (this.currentMonth === 0) {
        this.currentMonth = 11
        this.currentYear--
      } else {
        this.currentMonth--
      }
    },

    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentMonth = 0
        this.currentYear++
      } else {
        this.currentMonth++
      }
    },

    setMonth(year: number, month: number) {
      this.currentYear = year
      this.currentMonth = month
    },

    saveTemplate(name: string) {
      this.savedTemplate = {
        name,
        dates: Array.from(this.selectedDates),
        createdAt: new Date()
      }
    },

    loadTemplate() {
      if (this.savedTemplate) {
        this.selectedDates = new Set(this.savedTemplate.dates)
      }
    },

    savePreviousMonthData() {
      this.previousMonthData = Array.from(this.selectedDates)
    },

    copyPreviousMonth() {
      if (this.previousMonthData) {
        this.selectedDates = new Set(this.previousMonthData)
      }
    }
  }
})
```

**実装ファイル:** `frontend/src/stores/calendar.ts`

---

## 🎨 8. スタイリングの特徴

### ブランドカラー（グラデーション）

```css
/* 選択状態のグラデーション */
background: linear-gradient(135deg, #667eea, #764ba2);
```

### 掛け持ち機能用の蛍光色

```css
/* 蛍光色パレット */
--job-yellow: #FFFF00;  /* 蛍光黄色 */
--job-green: #39FF14;   /* 蛍光緑 */
--job-pink: #FF10F0;    /* 蛍光ピンク */
--job-cyan: #00FFFF;    /* 蛍光水色 */
```

### レスポンシブ対応

```css
/* モバイル最適化 */
@media (max-width: 768px) {
  .date-cell {
    font-size: 0.8rem;
    padding: 0.25rem;
  }

  .hour-btn, .minute-btn {
    font-size: 0.9rem;
    padding: 0.75rem;
  }
}

/* タブレット対応 */
@media (min-width: 769px) and (max-width: 1024px) {
  .calendar-grid {
    max-width: 600px;
    margin: 0 auto;
  }
}
```

### タッチターゲットサイズ

```css
/* アクセシビリティ：最低44px×44pxのタッチターゲット */
.hour-btn, .minute-btn, .date-cell {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 🔧 9. 主要な機能仕様

### 1. 日付選択

- ✅ 過去の日付は選択不可（`isPast` チェック）
- ✅ 他月の日付は選択不可（`isCurrentMonth` チェック）
- ✅ 祝日表示対応（赤文字で表示）
- ✅ 今日の日付をハイライト
- ✅ 週末（土日）の背景色変更

### 2. 一括操作

- ✅ **全選択**：過去の日付を除く当月の全日付を選択
- ✅ **平日のみ選択**：月〜金で祝日でない日のみ選択
- ✅ **曜日指定選択**：特定の曜日のみ選択
- ✅ **全解除**：選択をすべてクリア

### 3. 掛け持ち対応（複数ジョブ管理）

- ✅ 最大4つのジョブ（勤務先）を管理
- ✅ 1日に複数のジョブを割り当て可能
- ✅ 各ジョブを蛍光色で視覚的に区別
- ✅ ジョブごとに個別の時刻設定

### 4. 時刻選択

- ✅ 24時間制（午前0-11時 / 午後12-23時）
- ✅ 15分単位（0, 15, 30, 45分）
- ✅ ボタンベースUI（モバイル最適化）
- ✅ 開始時刻・終了時刻の個別設定
- ✅ 一括時刻設定機能

### 5. テンプレート機能

- ✅ 選択パターンの保存
- ✅ 保存したパターンの読み込み
- ✅ 前月データのコピー

### 6. カレンダーナビゲーション

- ✅ 前月・次月への移動
- ✅ 今日の日付にジャンプ
- ✅ 年月の直接指定

---

## 📌 10. 再現時のチェックリスト

### 環境構築

- [ ] Node.js 18+ のインストール
- [ ] Vue 3 + TypeScript + Vite プロジェクトの作成
- [ ] Pinia のインストールと設定
- [ ] Vue Router のセットアップ

### コアファイルの実装

- [ ] `types/calendar.ts` の型定義を作成
- [ ] `utils/dateUtils.ts` のユーティリティ関数を実装
- [ ] `composables/useCalendar.ts` のロジックを実装
- [ ] `stores/calendar.ts` の Pinia ストアを設定

### UIコンポーネントの実装

- [ ] カレンダーグリッド（7列×6行）のレイアウト作成
- [ ] 日付セルのクリックハンドラー実装
- [ ] 時刻選択モーダルの実装
- [ ] 一括操作ボタンの実装

### スタイリング

- [ ] グラデーションスタイルの適用
- [ ] レスポンシブデザインの実装
- [ ] タッチターゲットサイズの確保
- [ ] 蛍光色パレットの定義（掛け持ち機能用）

### オプション機能

- [ ] 祝日データAPIの接続
- [ ] テンプレート保存機能の実装
- [ ] 掛け持ち機能の実装
- [ ] PDF出力機能の実装（オプション）

---

## 💡 11. 重要な設計上の判断

### なぜカスタム実装を選んだか？

#### ❌ 採用しなかった選択肢

1. **HTML標準の `<input type="date">`**
   - ブラウザごとに見た目が異なる
   - モバイルでのカスタマイズが困難
   - 複数日選択ができない

2. **サードパーティライブラリ（vue-datepicker等）**
   - バンドルサイズが大きい
   - シフト管理特有の機能（掛け持ち対応等）に対応していない
   - カスタマイズが制限される

#### ✅ カスタム実装のメリット

1. **モバイル最適化**
   - タッチ操作に特化したUI
   - 大きなタップ領域（44px×44px以上）
   - スムーズなアニメーション

2. **シフト管理特化**
   - 複数日の一括選択
   - 平日のみ選択
   - 掛け持ち対応（複数ジョブ管理）
   - 時刻の15分単位設定

3. **パフォーマンス**
   - 不要な機能を含まない軽量実装
   - バンドルサイズの最小化
   - 高速なレンダリング

4. **メンテナンス性**
   - プロジェクト固有の要件に柔軟に対応
   - 外部依存の削減
   - TypeScript による型安全性

### 日付フォーマットの統一理由

#### 内部形式：`YYYY-MM-DD`（ISO 8601）

- データベースとの互換性
- ソート処理が容易（文字列比較で正しく並ぶ）
- タイムゾーンの影響を受けにくい
- 国際標準規格

#### 表示形式：`M/d(曜)` または `YYYY年MM月DD日(曜)`

- 日本のユーザーに馴染みやすい
- コンパクトで視認性が高い
- 曜日情報を常に表示

---

## 🚀 12. 実装の順序

カスタム日付ピッカーを実装する際の推奨順序：

### Phase 1: 基盤構築

1. 型定義の作成（`types/calendar.ts`）
2. ユーティリティ関数の実装（`utils/dateUtils.ts`）
3. Pinia ストアの基本構造作成

### Phase 2: コアロジック

4. `useCalendar` Composable の実装
5. カレンダーセル生成ロジック
6. 日付選択/解除機能

### Phase 3: UI実装

7. カレンダーグリッドの基本レイアウト
8. 日付セルのスタイリング
9. クリックイベントの実装

### Phase 4: 拡張機能

10. 一括操作機能（全選択、平日のみ等）
11. 月間ナビゲーション
12. 時刻選択モーダル

### Phase 5: 高度な機能

13. 掛け持ち機能
14. テンプレート保存/読み込み
15. 祝日API連携

### Phase 6: 最適化

16. レスポンシブデザインの調整
17. アニメーションの追加
18. パフォーマンスチューニング

---

## 📚 13. 参考リソース

### 主要実装ファイルの場所

| 機能 | ファイルパス |
|------|------------|
| 型定義 | `frontend/src/types/calendar.ts` |
| 日付ユーティリティ | `frontend/src/utils/dateUtils.ts` |
| カレンダーロジック | `frontend/src/composables/useCalendar.ts` |
| 状態管理 | `frontend/src/stores/calendar.ts` |
| カレンダーUI | `frontend/src/views/CalendarView.vue` |
| 時刻選択UI | `frontend/src/views/TimeRegisterView.vue` |

### 外部ドキュメント

- [Vue 3 公式ドキュメント](https://ja.vuejs.org/)
- [Pinia 公式ドキュメント](https://pinia.vuejs.org/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/)
- [ISO 8601 日付フォーマット](https://en.wikipedia.org/wiki/ISO_8601)

---

## ⚠️ 14. よくある落とし穴と解決策

### 問題1: 日付のタイムゾーン問題

**症状:** `new Date('2025-01-15')` が前日になる

**原因:** ブラウザがUTCとして解釈し、ローカルタイムゾーンに変換

**解決策:**
```typescript
// ❌ 悪い例
new Date('2025-01-15')  // タイムゾーンにより前日になる可能性

// ✅ 良い例
new Date('2025-01-15T00:00:00')  // 明示的にローカル時刻を指定
new Date(2025, 0, 15)  // コンストラクタで直接指定（月は0始まり）
```

### 問題2: 月の0始まり問題

**症状:** `new Date(2025, 1, 15)` が2月15日になる

**原因:** JavaScriptの月は0-11で表現される

**解決策:**
```typescript
// 常に明示的に +1 または -1 を使用
const month = 0  // 1月
const date = new Date(year, month, 1)
const displayText = `${year}年${month + 1}月`  // "2025年1月"
```

### 問題3: `Set` の状態管理がリアクティブにならない

**症状:** `selectedDates` の変更がUIに反映されない

**原因:** Piniaは `Set` の変更を自動検知できない

**解決策:**
```typescript
// ❌ 悪い例
state.selectedDates.add(date)  // リアクティブにならない

// ✅ 良い例
state.selectedDates = new Set([...state.selectedDates, date])
// または
state.selectedDates.add(date)
this.selectedDates = new Set(this.selectedDates)  // 強制的に再代入
```

### 問題4: 過去の日付が選択できてしまう

**症状:** 昨日や過去の日付をクリックしても選択される

**原因:** `isPast` チェックが不適切

**解決策:**
```typescript
export function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)  // 時刻をリセット
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate < today  // <= ではなく < を使用（今日は過去ではない）
}
```

---

## 🎓 15. まとめ

このプロジェクトの日付選択実装は、以下の特徴を持つカスタムソリューションです：

✅ **サードパーティライブラリ不使用** - Vue 3のネイティブ機能のみで実装
✅ **モバイルファースト** - タッチ操作に最適化されたUI/UX
✅ **シフト管理特化** - 複数日選択、掛け持ち対応、一括操作
✅ **型安全** - TypeScriptによる完全な型定義
✅ **メンテナンス性** - 明確なアーキテクチャとドキュメント

このドキュメントの情報があれば、他のセッションでも同等の日付選択機能を再現できます。

---

**最終更新:** 2026-01-22
**バージョン:** 1.0.0
