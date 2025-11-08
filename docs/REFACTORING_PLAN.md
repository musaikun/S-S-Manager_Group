# リファクタリング計画書

## 📋 旧プロジェクトの分析結果

### カレンダー機能 (741行、32関数)
**主な機能:**
- URL/SessionStorageから状態復元
- 祝日API連携 (https://holidays-jp.github.io/api/v1/date.json)
- カレンダー描画
- 日付選択/解除
- テンプレート保存/読み込み
- 前月コピー
- 一括選択（曜日別、全選択）
- 確認ダイアログ
- シフト提出

**問題点:**
- 741行の単一ファイル（モノリシック）
- グローバル変数の多用
- 直接的なDOM操作
- URLパラメータによる状態管理（脆弱）
- イベントリスナーの管理不足

### 時間登録機能 (1034行、23関数)
**主な機能:**
- 時間ピッカー（モーダル）
- カード表示（各日付）
- 一括適用機能
- 合計時間計算
- シフト提出

**問題点:**
- 1034行の単一ファイル（モノリシック）
- グローバル変数の多用
- 複雑なUI状態管理
- 直接的なDOM操作

---

## 🎯 Vue 3 リファクタリング設計

### 1. ディレクトリ構成

```
frontend/src/
├── views/
│   ├── HomeView.vue           # トップページ
│   ├── CalendarView.vue       # カレンダーメインビュー
│   └── TimeRegisterView.vue   # 時間登録メインビュー
├── components/
│   ├── calendar/
│   │   ├── CalendarGrid.vue       # カレンダー本体
│   │   ├── CalendarHeader.vue     # 月選択ヘッダー
│   │   ├── CalendarDateCell.vue   # 日付セル
│   │   ├── CalendarSelectedList.vue # 選択済みリスト
│   │   ├── CalendarToolbar.vue    # 一括選択ツールバー
│   │   ├── TemplateDialog.vue     # テンプレート保存ダイアログ
│   │   └── ConfirmDialog.vue      # 確認ダイアログ
│   └── timeregister/
│       ├── TimeCard.vue           # 時間カード
│       ├── TimeCardList.vue       # カードリスト
│       ├── TimePicker.vue         # 時間ピッカーモーダル
│       ├── TimePickerHour.vue     # 時間選択
│       ├── TimePickerMinute.vue   # 分選択
│       ├── BulkApplyDialog.vue    # 一括適用ダイアログ
│       └── TotalHoursDisplay.vue  # 合計時間表示
├── composables/
│   ├── useCalendar.ts         # カレンダーロジック
│   ├── useHolidays.ts         # 祝日取得
│   ├── useTemplate.ts         # テンプレート管理
│   ├── useTimeRegister.ts     # 時間登録ロジック
│   └── useShiftSubmit.ts      # シフト提出
├── stores/
│   ├── calendar.ts            # Pinia: カレンダー状態
│   └── timeRegister.ts        # Pinia: 時間登録状態
├── types/
│   ├── calendar.ts            # カレンダー型定義
│   └── timeRegister.ts        # 時間登録型定義
└── utils/
    ├── dateUtils.ts           # 日付操作ユーティリティ
    └── timeUtils.ts           # 時間操作ユーティリティ
```

---

## 🔧 コンポーネント詳細設計

### CalendarView の構成

```vue
<template>
  <div class="calendar-view">
    <CalendarHeader
      v-model:year="year"
      v-model:month="month"
    />
    <CalendarToolbar
      @select-weekday="selectWeekday"
      @select-all="selectAll"
      @clear-all="clearAll"
      @load-template="loadTemplate"
      @save-template="saveTemplate"
    />
    <CalendarGrid
      :year="year"
      :month="month"
      :selected-dates="selectedDates"
      :holidays="holidays"
      @toggle-date="toggleDate"
    />
    <CalendarSelectedList
      :selected-dates="selectedDates"
      @remove-date="removeDate"
    />
    <button @click="navigateToTimeRegister">次へ</button>
  </div>
</template>
```

### TimeRegisterView の構成

```vue
<template>
  <div class="time-register-view">
    <TotalHoursDisplay :total-hours="totalHours" />
    <TimeCardList
      :dates="selectedDates"
      :time-data="timeData"
      @open-picker="openTimePicker"
      @update-time="updateTime"
    />
    <TimePicker
      v-if="showPicker"
      :target-date="targetDate"
      :initial-time="initialTime"
      @confirm="confirmTime"
      @cancel="closePicker"
    />
    <BulkApplyDialog
      v-if="showBulkDialog"
      @apply="applyBulk"
      @cancel="closeBulkDialog"
    />
    <button @click="submitShift">提出</button>
  </div>
</template>
```

---

## 📦 Pinia Store設計

### calendar.ts

```typescript
interface CalendarState {
  selectedDates: Set<string>
  currentYear: number
  currentMonth: number
  holidays: Record<string, string>
  savedTemplate: string[] | null
}

export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    selectedDates: new Set(),
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    holidays: {},
    savedTemplate: null
  }),
  actions: {
    toggleDate(dateStr: string) { /* ... */ },
    selectWeekday(dayOfWeek: number) { /* ... */ },
    clearAll() { /* ... */ },
    saveTemplate() { /* ... */ },
    loadTemplate() { /* ... */ }
  }
})
```

### timeRegister.ts

```typescript
interface TimeData {
  date: string
  startTime: string
  endTime: string
  modified: boolean
}

interface TimeRegisterState {
  timeDataList: TimeData[]
  showPicker: boolean
  targetDate: string | null
}

export const useTimeRegisterStore = defineStore('timeRegister', {
  state: (): TimeRegisterState => ({
    timeDataList: [],
    showPicker: false,
    targetDate: null
  }),
  getters: {
    totalHours: (state) => { /* 計算 */ }
  },
  actions: {
    updateTime(date: string, start: string, end: string) { /* ... */ },
    applyBulk(type: 'start' | 'end', time: string) { /* ... */ }
  }
})
```

---

## 🎨 Composables設計

### useCalendar.ts

```typescript
export function useCalendar() {
  const store = useCalendarStore()

  const renderCalendar = (year: number, month: number) => {
    // カレンダー描画ロジック
  }

  const isHoliday = (dateStr: string): boolean => {
    return dateStr in store.holidays
  }

  return {
    renderCalendar,
    isHoliday
  }
}
```

### useHolidays.ts

```typescript
export function useHolidays() {
  const holidays = ref<Record<string, string>>({})
  const loading = ref(false)

  const fetchHolidays = async () => {
    loading.value = true
    try {
      const response = await fetch('https://holidays-jp.github.io/api/v1/date.json')
      holidays.value = await response.json()
    } catch (error) {
      console.error('祝日データ取得失敗:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    holidays,
    loading,
    fetchHolidays
  }
}
```

---

## 🔄 移行戦略

### Phase 1: 基本構造（1週間）
1. ✅ トップページ実装済み
2. ⏳ カレンダーView骨組み作成
3. ⏳ 時間登録View骨組み作成
4. ⏳ Pinia Store基本実装
5. ⏳ Router設定

### Phase 2: カレンダー実装（1-2週間）
1. CalendarGrid コンポーネント
2. 日付選択/解除機能
3. 祝日表示
4. 一括選択機能
5. テンプレート保存/読み込み
6. 前月コピー機能

### Phase 3: 時間登録実装（1-2週間）
1. TimeCard コンポーネント
2. TimePicker モーダル
3. 時間選択UI
4. 一括適用機能
5. 合計時間計算

### Phase 4: 統合＆テスト（1週間）
1. ページ間遷移
2. データ永続化（localStorage → Pinia persist）
3. エラーハンドリング
4. レスポンシブ対応
5. アニメーション追加

### Phase 5: Backend連携（1週間）
1. REST API実装
2. シフト提出API
3. 認証機能
4. データ同期

---

## 📝 主な改善点

### 状態管理
- ❌ URLパラメータ → ✅ Pinia Store
- ❌ SessionStorage → ✅ Pinia Persist Plugin
- ❌ グローバル変数 → ✅ Reactive State

### コード品質
- ❌ 単一ファイル741行 → ✅ 小さなコンポーネント
- ❌ 直接DOM操作 → ✅ Vue Reactivity
- ❌ イベントリスナー手動管理 → ✅ Vue イベントシステム
- ❌ 型なし → ✅ TypeScript型安全

### 再利用性
- ✅ Composablesで共通ロジック抽出
- ✅ 小さなコンポーネントで再利用可能
- ✅ 型定義で保守性向上

---

## 🚀 次のステップ

1. **CalendarView基本実装**
2. **Pinia Store作成**
3. **型定義作成**
4. **useCalendar composable実装**
5. **CalendarGridコンポーネント実装**

準備が整いましたら、Phase 2から開始します！
