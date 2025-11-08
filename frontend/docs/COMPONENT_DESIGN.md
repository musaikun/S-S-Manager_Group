# コンポーネント設計書

## 全体構成

```
App.vue
├── ProgressIndicator.vue (共通ヘッダー)
└── RouterView
    ├── HomeView.vue (トップページ)
    ├── CalendarView.vue (カレンダー - ステップ1)
    └── TimeRegisterView.vue (時間登録 - ステップ2)
        ├── BulkSettings.vue (一括設定アコーディオン)
        │   ├── BulkTimeDisplay.vue (開始・終了時間表示)
        │   └── WeekdayBulkButtons.vue (曜日別一括設定ボタン)
        ├── WorkDayList.vue (勤務日リスト)
        │   └── WorkDayCard.vue × N (個別カード)
        ├── BreakTimeToggle.vue (休憩時間切り替え)
        ├── TotalSummary.vue (合計表示)
        └── ActionButtons.vue (戻る・次へボタン)

Modals/Dialogs (全画面共通)
├── TimePickerModal.vue (時間設定モーダル)
├── ThreeChoiceDialog.vue (3択ダイアログ)
├── ConfirmDialog.vue (確認ダイアログ)
└── HelpDialog.vue (ヘルプダイアログ)
```

---

## 各コンポーネント詳細

### 1. **ProgressIndicator.vue** (共通ヘッダー)

**役割:** 全画面共通の進捗表示

**Props:**
- `currentStep: ProgressStep` - 現在のステップ ('calendar' | 'time-register' | 'confirm')

**表示内容:**
```
[✓ 日付選択] ━━ [2 時間設定] ━━ [3 確認・提出]
```

**スタイル:**
- 完了: 緑色チェックマーク
- アクティブ: 紫色、数字表示
- 未完了: グレー、数字表示

---

### 2. **TimeRegisterView.vue** (メイン画面)

**役割:** 時間登録画面全体の統括

**使用するStore:**
- `useTimeRegisterStore`
- `useCalendarStore` (選択された日付を取得)

**ライフサイクル:**
```typescript
onMounted(() => {
  // カレンダーから選択された日付を取得
  const selectedDates = calendarStore.selectedDatesArray
  timeRegisterStore.initializeFromDates(selectedDates)
})
```

**子コンポーネント:**
- BulkSettings
- WorkDayList
- BreakTimeToggle
- TotalSummary
- ActionButtons

---

### 3. **BulkSettings.vue** (一括設定アコーディオン)

**役割:** 一括設定セクション全体

**Props:** なし

**State:**
- `isOpen: boolean` - アコーディオンの開閉状態

**機能:**
- アコーディオンの開閉
- 一括設定時間の表示・編集
- 適用ボタン（全日・開始のみ・終了のみ）
- 曜日別一括設定

**子コンポーネント:**
- BulkTimeDisplay
- WeekdayBulkButtons

---

### 4. **BulkTimeDisplay.vue** (一括設定の時間表示)

**役割:** 開始・終了時間の表示と編集トリガー

**Props:** なし

**表示:**
```
開始: [09:00]  終了: [18:00]
```

**イベント:**
- クリックで TimePickerModal を開く

---

### 5. **WeekdayBulkButtons.vue** (曜日別一括設定)

**役割:** 曜日別に一括設定を適用

**表示:**
```
設定した時間を曜日別に設定
[日] [月] [火] [水] [木] [金] [土]
```

**イベント:**
- クリックで該当曜日に一括適用
- 3択ダイアログ表示

---

### 6. **WorkDayList.vue** (勤務日リスト)

**役割:** 勤務日カードのリスト表示

**Props:** なし

**Computed:**
- `activeWorkDays` - 削除されていない勤務日

**子コンポーネント:**
- WorkDayCard × N

---

### 7. **WorkDayCard.vue** (個別カード)

**役割:** 各勤務日の情報を表示

**Props:**
- `workDay: WorkDay` - 勤務日情報
- `index: number` - インデックス

**表示:**
```
┌──────────────────────────┐
│ 11/15(金)  09:00 ～ 18:00 │
│        💼 9時間          │
└──────────────────────────┘
```

**スタイル:**
- 個別設定済み: 黄色背景
- 通常: 白背景

**イベント:**
- クリックで TimePickerModal を開く

---

### 8. **TimePickerModal.vue** (時間設定モーダル)

**役割:** 時刻の選択

**Props:** なし（Storeから状態を取得）

**機能:**
- 午前/午後トグルスイッチ
- 時選択（1-12）
- 分選択（00, 15, 30, 45）
- リアルタイムプレビュー
- 勤務時間表示

**ボタン:**
- 設定する
- キャンセル
- シフトを外す (カードモードのみ)

---

### 9. **BreakTimeToggle.vue** (休憩時間切り替え)

**役割:** 休憩時間を加味するか切り替え

**表示:**
```
☐ 休憩を加味した時間を表示する  ❓
```

**イベント:**
- チェックボックス変更で `toggleBreak()`
- ヘルプアイコンクリックで HelpDialog 表示

---

### 10. **TotalSummary.vue** (合計表示)

**役割:** 合計情報の表示

**Computed:**
- `totalSummary` - Storeから取得

**表示（休憩なし）:**
```
出勤日: 10日
勤務時間: 90時間
```

**表示（休憩あり）:**
```
出勤日: 10日
実労働時間: 82.5時間
休憩: 450分
```

---

### 11. **ActionButtons.vue** (アクションボタン)

**役割:** 画面下部のボタン

**ボタン:**
- ← カレンダーに戻る
- 確認して提出 →

**イベント:**
- カレンダーに戻る: 左スライド遷移
- 確認して提出: ConfirmDialog 表示

---

### 12. **ThreeChoiceDialog.vue** (3択ダイアログ)

**役割:** 一括設定時の選択

**表示:**
```
一括設定の確認
個別設定した日も変更しますか？

[個別設定した日以外を変更]
[すべて変更]
[キャンセル]
```

---

### 13. **ConfirmDialog.vue** (確認ダイアログ)

**役割:** 提出前の最終確認

**表示:**
```
シフト提出内容の最終確認

11/1(金) 09:00～18:00 (9時間)
11/2(土) 10:00～16:00 (6時間)
...

合計勤務日数: 10日
合計勤務時間: 90時間

[修正] [提出]
```

---

### 14. **HelpDialog.vue** (ヘルプダイアログ)

**役割:** 休憩時間ルールの説明

**表示:**
```
休憩時間のルール

6時間未満      0分
6～8時間未満   45分
8時間以上      60分
```

---

## State Management (Pinia Store)

### TimeRegisterStore

**State:**
- `workDays: WorkDay[]`
- `bulkSettings: BulkSettings`
- `includeBreak: boolean`
- `timePicker: TimePickerState`

**Getters:**
- `activeWorkDays`
- `totalSummary`
- `modifiedWorkDays`
- `unmodifiedWorkDays`

**Actions:**
- `initializeFromDates(dates)`
- `updateWorkDay(index, updates)`
- `removeWorkDay(index)`
- `applyBulk(type, target, dayOfWeek?)`
- `toggleBreak()`
- `openTimePicker(mode, cardIndex?)`
- `closeTimePicker()`
- `confirmTimePicker()`

---

## Routing & Transitions

### ルート定義

```typescript
{
  path: '/',
  name: 'home',
  component: HomeView
},
{
  path: '/calendar',
  name: 'calendar',
  component: CalendarView
},
{
  path: '/time-register',
  name: 'time-register',
  component: TimeRegisterView
}
```

### スライドトランジション

```vue
<router-view v-slot="{ Component }">
  <transition :name="transitionName" mode="out-in">
    <component :is="Component" />
  </transition>
</router-view>
```

**トランジション名:**
- 前進: `slide-left` (左から右へ)
- 後退: `slide-right` (右から左へ)

---

## 実装の優先順位

### フェーズ1: 基本構造
1. ProgressIndicator.vue ✅
2. TimeRegisterView.vue (骨組み)
3. WorkDayCard.vue
4. TotalSummary.vue

### フェーズ2: 時間設定
1. TimePickerModal.vue
2. 個別カードの編集機能

### フェーズ3: 一括設定
1. BulkSettings.vue
2. ThreeChoiceDialog.vue
3. 一括適用ロジック

### フェーズ4: 高度な機能
1. BreakTimeToggle.vue
2. HelpDialog.vue
3. ConfirmDialog.vue
4. スライドトランジション
