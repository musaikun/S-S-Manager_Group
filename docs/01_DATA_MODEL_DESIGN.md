# データモデル設計書

**プロジェクト:** S×S Manager (Shift Schedule Manager)
**バージョン:** 1.0.0
**作成日:** 2025-01-09
**最終更新:** 2025-01-09

---

## 目次

1. [概要](#概要)
2. [エンティティ関連図](#エンティティ関連図)
3. [エンティティ詳細](#エンティティ詳細)
4. [データ型定義](#データ型定義)
5. [バリデーションルール](#バリデーションルール)
6. [データフロー](#データフロー)

---

## 概要

S×S Managerは複数のアルバイト先を掛け持ちする従業員向けのシフト管理アプリケーションです。
このドキュメントでは、アプリケーションで使用される全データモデルの詳細仕様を定義します。

### 設計方針

- **型安全性**: TypeScript/Dartによる厳格な型定義
- **正規化**: データの重複を最小化
- **拡張性**: 将来の機能追加に対応可能な設計
- **パフォーマンス**: 効率的なデータアクセスパターン

---

## エンティティ関連図

```
┌─────────────┐
│    User     │
│ (将来実装)  │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴──────┐         ┌─────────────┐
│  Calendar   │◇────────│   Holiday   │
│   State     │  使用   │    Data     │
└──────┬──────┘         └─────────────┘
       │ 1
       │
       │ 1
┌──────┴───────┐
│  DateJobMap  │
└──────┬───────┘
       │ N
       │
       │ 1
┌──────┴──────┐         ┌──────────────┐
│     Job     │         │  JobColor    │
│             │─────────│  (固定値)    │
└─────────────┘  使用   └──────────────┘

┌──────────────┐        ┌──────────────┐
│ TimeRegister │        │   WorkDay    │
│    State     │◇───────│              │
└──────────────┘  含む  └──────┬───────┘
                               │
                               │ 参照
                               ↓
                        ┌──────────────┐
                        │ BulkSettings │
                        │ (時間設定)   │
                        └──────────────┘

                        ┌──────────────┐
                        │ConflictInfo  │
                        │ (時間競合)   │
                        └──────────────┘
```

---

## エンティティ詳細

### 1. Calendar State (カレンダー状態)

**責務:** カレンダーの表示状態、選択された日付、ジョブ管理

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `currentYear` | `number` | ✅ | 現在年 | 表示中の年 (例: 2025) |
| `currentMonth` | `number` | ✅ | 現在月 | 表示中の月 (0-11, 0=1月) |
| `selectedDates` | `Set<DateString>` | ✅ | 空Set | 本店で選択された日付のSet |
| `holidays` | `HolidayData` | ✅ | `{}` | 日本の祝日データ |
| `savedTemplate` | `CalendarTemplate \| null` | ✅ | `null` | 保存されたカレンダーテンプレート |
| `previousMonthData` | `DateString[] \| null` | ✅ | `null` | 前月のデータ（コピー機能用） |
| `dateJobMap` | `DateJobMap` | ✅ | `{}` | 日付と掛け持ちジョブのマッピング |
| `jobs` | `Job[]` | ✅ | `[]` | 掛け持ちジョブ一覧（最大4件） |
| `currentJobId` | `JobId \| null` | ✅ | `null` | 現在選択中のジョブID (null=本店) |
| `mainStoreName` | `string` | ✅ | `''` | 本店の名前 |

**ビジネスルール:**
- `currentMonth`は0-11の範囲（JavaScriptのDate仕様に準拠）
- `jobs`の最大数は4件
- `selectedDates`は本店の選択のみを格納
- `dateJobMap`は掛け持ちジョブの選択を格納

**永続化:**
- LocalStorage: `jobs`, `dateJobMap`, `mainStoreName`, `calendarTemplate`, `previousMonthData`

---

### 2. Job (掛け持ちジョブ)

**責務:** 掛け持ち先のアルバイト情報

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `id` | `JobId` (1\|2\|3\|4) | ✅ | - | ジョブID（1-4の固定値） |
| `name` | `string` | ✅ | - | ジョブ名（店舗名など） |
| `color` | `JobColor` | ✅ | - | 蛍光色（ID連動） |
| `isActive` | `boolean` | ✅ | `true` | 有効フラグ |

**固定カラーマッピング:**
```typescript
const JOB_COLORS: JobColor[] = [
  '#FFFF00',  // ID 1: 蛍光黄色
  '#39FF14',  // ID 2: 蛍光緑
  '#FF10F0',  // ID 3: 蛍光ピンク
  '#00FFFF'   // ID 4: 蛍光水色
]
```

**バリデーション:**
- `name`: 1-50文字
- `id`: 1-4の範囲
- `color`: JOB_COLORSの値のいずれか

---

### 3. DateJobMap (日付とジョブのマッピング)

**責務:** 各日付にどの掛け持ちジョブが割り当てられているかを管理

**型定義:**
```typescript
type DateJobMap = Record<DateString, JobId[]>
```

**例:**
```typescript
{
  "2025-01-15": [1, 3],      // 1月15日: ジョブ1と3
  "2025-01-16": [2],         // 1月16日: ジョブ2のみ
  "2025-01-17": [1, 2, 3, 4] // 1月17日: 全ジョブ
}
```

**ビジネスルール:**
- 同じ日付に複数のジョブを割り当て可能（掛け持ち）
- 本店（`currentJobId=null`）の選択は`selectedDates`に格納
- 空配列の場合は該当キーを削除

---

### 4. WorkDay (勤務日)

**責務:** 各日付の勤務時間設定と状態管理

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `date` | `DateString` | ✅ | - | 勤務日 (YYYY-MM-DD形式) |
| `dayOfWeek` | `0\|1\|2\|3\|4\|5\|6` | ✅ | - | 曜日 (0=日曜) |
| `weekNumber` | `number` | ✅ | - | 月内の週番号 (1-6) |
| `startTime` | `TimeString` | ✅ | "09:00" | 開始時刻 (HH:mm) |
| `endTime` | `TimeString` | ✅ | "18:00" | 終了時刻 (HH:mm) |
| `initialStartTime` | `TimeString` | ✅ | "09:00" | 初期開始時刻 |
| `initialEndTime` | `TimeString` | ✅ | "18:00" | 初期終了時刻 |
| `workMinutes` | `number` | ✅ | - | 勤務時間（分） |
| `isModified` | `boolean` | ✅ | `false` | 個別設定されたか |
| `isRemoved` | `boolean` | ✅ | `false` | シフトから外されたか |
| `displayDate` | `string` | ✅ | - | 表示用日付 (例: "1/15(月)") |
| `customStartTime` | `boolean` | ✅ | `false` | 開始時刻が個別設定か |
| `customEndTime` | `boolean` | ✅ | `false` | 終了時刻が個別設定か |
| `isBulkApplied` | `boolean` | ✅ | `false` | 一括設定が適用されたか |
| `isFromBase` | `boolean` | ✅ | `false` | 過去ベースから作成されたか |
| `startTimeSetBy` | `'default'\|'bulk'\|'custom'\|'base'` | ✅ | 'default' | 開始時刻の設定方法 |
| `endTimeSetBy` | `'default'\|'bulk'\|'custom'\|'base'` | ✅ | 'default' | 終了時刻の設定方法 |
| `jobId` | `JobId \| undefined` | ❌ | `undefined` | 掛け持ちジョブID (undefined=本店) |

**計算フィールド:**
- `workMinutes` = `endTime` - `startTime` (分単位、日跨ぎ対応)
- `weekNumber` = 月の1日の日曜日からの週数

**設定方法の優先度:**
```
custom > base > bulk > default
```

**ビジネスルール:**
- 終了時刻が開始時刻より前の場合は翌日とみなす
- `isRemoved=true`の場合、集計から除外される
- 同じ日付でも`jobId`が異なれば別のWorkDayとして管理

---

### 5. BulkSettings (一括時間設定)

**責務:** 複数日付への一括時間設定

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `startTime` | `TimeString` | ✅ | "09:00" | 一括適用する開始時刻 |
| `endTime` | `TimeString` | ✅ | "18:00" | 一括適用する終了時刻 |

**適用対象:**
```typescript
type BulkApplyType = 'start' | 'end' | 'both'
type BulkApplyTarget = 'all' | 'unmodified'
```

**適用フィルター:**
- 曜日指定: `number[]` (例: [1, 3, 5] = 月水金)
- 週番号指定: `number[]` (例: [1, 3] = 第1週と第3週)

---

### 6. JobDefaultTimes (ジョブ別デフォルト時刻)

**責務:** 掛け持ちジョブごとのデフォルト時刻設定

**型定義:**
```typescript
type JobDefaultTimes = Record<string, BulkSettings>
```

**例:**
```typescript
{
  "1": { startTime: "10:00", endTime: "19:00" }, // ジョブ1のデフォルト
  "2": { startTime: "18:00", endTime: "23:00" }, // ジョブ2のデフォルト
  "3": { startTime: "09:00", endTime: "17:00" }  // ジョブ3のデフォルト
}
```

**永続化:**
- LocalStorage: `jobDefaultTimes`

---

### 7. ConflictInfo (時間競合情報)

**責務:** 異なるジョブ間の時間重複検出

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `date` | `DateString` | ✅ | 競合している日付 |
| `jobId1` | `JobId \| undefined` | ✅ | ジョブ1のID (undefined=本店) |
| `jobId2` | `JobId \| undefined` | ✅ | ジョブ2のID (undefined=本店) |
| `job1TimeSlot` | `{ startTime, endTime }` | ✅ | ジョブ1の時間帯 |
| `job2TimeSlot` | `{ startTime, endTime }` | ✅ | ジョブ2の時間帯 |
| `overlap` | `TimeOverlap` | ✅ | 重複情報 |

**TimeOverlap:**
```typescript
interface TimeOverlap {
  startMinutes: number   // 重複開始時刻（0:00からの分数）
  endMinutes: number     // 重複終了時刻（0:00からの分数）
  durationMinutes: number // 重複時間（分）
}
```

**検出ロジック:**
```typescript
// 境界の一致も重複とみなす
if (start1 < end2 && start2 < end1) {
  // 重複あり
}
```

---

### 8. Holiday Data (祝日データ)

**責務:** 日本の祝日情報

**型定義:**
```typescript
type HolidayData = Record<DateString, string>
```

**例:**
```typescript
{
  "2025-01-01": "元日",
  "2025-01-13": "成人の日",
  "2025-02-11": "建国記念の日",
  "2025-02-23": "天皇誕生日"
}
```

**データソース:**
- API: `https://holidays-jp.github.io/api/v1/date.json`
- キャッシュ期間: 1週間
- LocalStorage: `holidays_cache`

---

### 9. CalendarTemplate (カレンダーテンプレート)

**責務:** よく使う日付選択パターンの保存

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | `string` | ✅ | テンプレート名 |
| `dates` | `DateString[]` | ✅ | 保存された日付一覧 |
| `createdAt` | `Date` | ✅ | 作成日時 |

**永続化:**
- LocalStorage: `calendarTemplate`

---

### 10. TotalSummary (合計サマリー)

**責務:** 全体の勤務統計（算出値）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `workDays` | `number` | 総勤務日数 |
| `totalWorkMinutes` | `number` | 総勤務時間（分、休憩除く前） |
| `totalActualWorkMinutes` | `number` | 実勤務時間（分、休憩除く後） |
| `totalBreakMinutes` | `number` | 総休憩時間（分） |

**休憩時間計算ルール:**
```typescript
if (workMinutes < 6 * 60) {
  return 0        // 6時間未満: 休憩なし
} else if (workMinutes < 8 * 60) {
  return 45       // 6-8時間: 45分休憩
} else {
  return 60       // 8時間以上: 60分休憩
}
```

---

### 11. JobSummary (ジョブ別サマリー)

**責務:** ジョブごとの勤務統計（算出値）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `jobId` | `JobId \| undefined` | ジョブID (undefined=本店) |
| `workDays` | `number` | 勤務日数 |
| `totalWorkMinutes` | `number` | 総勤務時間（分） |
| `totalActualWorkMinutes` | `number` | 実勤務時間（分） |
| `totalBreakMinutes` | `number` | 総休憩時間（分） |

---

## データ型定義

### 基本型

```typescript
// 日付文字列 (ISO 8601形式)
type DateString = string  // "YYYY-MM-DD" (例: "2025-01-15")

// 時刻文字列 (24時間形式)
type TimeString = string  // "HH:mm" (例: "09:30")

// ジョブID (1-4の固定値)
type JobId = 1 | 2 | 3 | 4

// ジョブカラー (蛍光色)
type JobColor = '#FFFF00' | '#39FF14' | '#FF10F0' | '#00FFFF'

// 曜日 (0=日曜, 6=土曜)
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

// 時刻設定方法
type TimeSetMethod = 'default' | 'bulk' | 'custom' | 'base'

// 一括適用タイプ
type BulkApplyType = 'start' | 'end' | 'both'

// 一括適用対象
type BulkApplyTarget = 'all' | 'unmodified'
```

### 曜日マッピング

```typescript
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
```

---

## バリデーションルール

### DateString

- **形式:** `YYYY-MM-DD`
- **正規表現:** `/^\d{4}-\d{2}-\d{2}$/`
- **範囲:** 有効な日付であること
- **例:** ✅ "2025-01-15" / ❌ "2025-13-01" (13月は不正)

### TimeString

- **形式:** `HH:mm`
- **正規表現:** `/^([01]\d|2[0-3]):([0-5]\d)$/`
- **範囲:** 00:00 - 23:59
- **例:** ✅ "09:30" / ❌ "25:00" (25時は不正)

### Job Name

- **長さ:** 1-50文字
- **文字種:** 制限なし（絵文字可）
- **必須:** ✅

### Main Store Name

- **長さ:** 0-50文字
- **デフォルト:** "本店"

### WorkMinutes

- **範囲:** 0 - 1440分（24時間）
- **計算:** 終了時刻 - 開始時刻
- **日跨ぎ:** 終了時刻 < 開始時刻の場合、+1440分

---

## データフロー

### カレンダー選択フロー

```
1. ユーザーが日付をクリック
   ↓
2. toggleDate() 実行
   ↓
3. currentJobId に応じて処理分岐
   - null (本店): selectedDates を更新
   - 1-4 (掛け持ち): dateJobMap を更新
   ↓
4. LocalStorage に保存
   ↓
5. TimeRegisterStore に同期
   - syncWithSelectedDates() 実行
   - WorkDay[] を生成/更新
```

### 時間設定フロー

```
1. 一括設定ボタンクリック
   ↓
2. applyBulk() 実行
   - 対象: all or unmodified
   - フィルター: weekdays, weekNumbers
   ↓
3. 各WorkDayを更新
   - startTimeSetBy = 'bulk'
   - endTimeSetBy = 'bulk'
   ↓
4. 個別設定ボタンクリック
   ↓
5. updateWorkDay() 実行
   - startTimeSetBy = 'custom'
   - endTimeSetBy = 'custom'
   ↓
6. 競合検出
   - timeConflicts getter が自動計算
   - ConflictInfo[] を返す
```

### データ永続化フロー

```
LocalStorage保存項目:
┌────────────────────────────────────┐
│ jobs                (Job[])        │
│ dateJobMap          (DateJobMap)   │
│ mainStoreName       (string)       │
│ calendarTemplate    (Template)     │
│ previousMonthData   (DateString[]) │
│ jobDefaultTimes     (JobDefaults)  │
│ defaultTimes        (BulkSettings) │
│ holidays_cache      (HolidayData)  │
└────────────────────────────────────┘

※ selectedDates と workDays はセッションのみ
※ バックエンド実装後はサーバー永続化に移行
```

---

## 将来の拡張予定

### Phase 1: バックエンド連携

```typescript
// 追加予定エンティティ
interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'owner'
  storeIds: string[]
}

interface Store {
  id: string
  name: string
  ownerId: string
  employees: string[]
}

interface Shift {
  id: string
  userId: string
  storeId: string
  date: DateString
  startTime: TimeString
  endTime: TimeString
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
}
```

### Phase 2: 管理者機能

```typescript
interface ShiftAggregate {
  date: DateString
  storeId: string
  shifts: Shift[]
  totalEmployees: number
  totalWorkHours: number
}

interface Report {
  id: string
  storeId: string
  period: { start: DateString; end: DateString }
  type: 'monthly' | 'weekly' | 'custom'
  data: ReportData
}
```

---

## 補足事項

### パフォーマンス考慮

- **時間競合検出:** O(N) で日付グループ化、各日付内でO(M²)比較（M=通常1-4）
- **LocalStorage:** 全データで約10-50KB（容量制限5-10MBに対し十分余裕あり）
- **状態管理:** Piniaによるリアクティブ更新（Vueの最適化機構を活用）

### ブラウザ互換性

- **LocalStorage:** IE8+, 全モダンブラウザ対応
- **Set型:** IE11非対応（Polyfill必要な場合あり）
- **Date API:** 全ブラウザ対応

---

**作成者:** Claude (AI Assistant)
**レビュー状況:** 要レビュー
**次回更新予定:** バックエンドAPI設計完了後
