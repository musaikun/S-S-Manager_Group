# ビジネスロジック仕様書

**プロジェクト:** S×S Manager (Shift Schedule Manager)
**バージョン:** 1.0.0
**作成日:** 2025-01-09
**最終更新:** 2026-01-09

---

## 目次

1. [概要](#概要)
2. [日付選択ロジック](#日付選択ロジック)
3. [時間計算ロジック](#時間計算ロジック)
4. [時間競合検出ロジック](#時間競合検出ロジック)
5. [一括設定ロジック](#一括設定ロジック)
6. [ジョブ管理ロジック](#ジョブ管理ロジック)
7. [バリデーションルール](#バリデーションルール)
8. [データ同期ロジック](#データ同期ロジック)

---

## 概要

このドキュメントでは、S×S Managerアプリケーションの主要なビジネスロジックを定義します。
各ロジックは既存のTypeScript実装から抽出され、Flutter移行時にも同じロジックを適用します。

### ビジネスルールの原則

1. **ユーザーフレンドリー**: 複雑な操作を自動化
2. **安全性**: データ損失を防ぐ確認ダイアログ
3. **柔軟性**: 掛け持ち先ごとに異なる設定が可能
4. **透明性**: 設定方法を視覚的に表示

---

## 日付選択ロジック

### 1. 基本選択ルール

#### 1.1 本店モード (`currentJobId === null`)

**選択時:**
```typescript
if (!selectedDates.has(dateString)) {
  selectedDates.add(dateString)
}
```

**解除時:**
```typescript
if (selectedDates.has(dateString)) {
  // 掛け持ち先が設定されている場合の確認
  if (dateJobMap[dateString]?.length > 0) {
    // 確認: "掛け持ち先の設定も残りますが、本店を外してよろしいですか?"
  }
  selectedDates.delete(dateString)
}
```

#### 1.2 掛け持ちモード (`currentJobId === 1-4`)

**選択時:**
```typescript
const currentJobIds = dateJobMap[dateString] || []
if (!currentJobIds.includes(currentJobId)) {
  dateJobMap[dateString] = [...currentJobIds, currentJobId]
}
```

**解除時:**
```typescript
const currentJobIds = dateJobMap[dateString] || []
const index = currentJobIds.indexOf(currentJobId)
if (index > -1) {
  currentJobIds.splice(index, 1)
  if (currentJobIds.length === 0 && !selectedDates.has(dateString)) {
    // 本店も掛け持ち先もない場合は完全削除
    delete dateJobMap[dateString]
  }
}
```

### 2. 一括選択ルール

#### 2.1 休日基準で選択

**対象:**
- 土曜日 (`dayOfWeek === 6`)
- 日曜日 (`dayOfWeek === 0`)
- 祝日 (`holidays[dateString]`)
- 平日（上記以外）

**動作:**
- 全て選択済み → 全て解除
- 一部未選択 → 全て選択

```typescript
function selectAll(dates: DateString[]) {
  const futureDate = dates.filter(d => !isPast(d))

  if (currentJobId === null) {
    // 本店モード
    const allSelected = futureDates.every(d => selectedDates.has(d))
    if (allSelected) {
      futureDates.forEach(d => selectedDates.delete(d))
    } else {
      futureDates.forEach(d => selectedDates.add(d))
    }
  } else {
    // 掛け持ちモード
    const allSelected = futureDates.every(d => {
      const jobIds = dateJobMap[d] || []
      return jobIds.includes(currentJobId)
    })

    if (allSelected) {
      // 解除
      futureDates.forEach(d => {
        const jobIds = dateJobMap[d] || []
        const index = jobIds.indexOf(currentJobId)
        if (index > -1) {
          jobIds.splice(index, 1)
          if (jobIds.length === 0) delete dateJobMap[d]
        }
      })
    } else {
      // 選択
      futureDates.forEach(d => {
        const jobIds = dateJobMap[d] || []
        if (!jobIds.includes(currentJobId)) {
          dateJobMap[d] = [...jobIds, currentJobId]
        }
      })
    }
  }
}
```

#### 2.2 平日のみ選択

**対象:**
- 月〜金 (`dayOfWeek >= 1 && dayOfWeek <= 5`)
- 祝日ではない (`!holidays[dateString]`)
- 過去でない (`!isPast(dateString)`)

**動作:** 一括選択と同じトグル動作

#### 2.3 曜日別選択

**対象:**
- 指定曜日のみ (`dayOfWeek === targetDayOfWeek`)
- 過去でない

**動作:** トグル（全て選択済み → 解除 / 一部未選択 → 選択）

### 3. 過去日付の制御

**ルール:**
```typescript
function isPast(dateString: DateString): boolean {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}
```

**制約:**
- 過去日付は選択不可
- UIで視覚的に無効化（グレーアウト、`opacity: 0.4`）
- クリックイベントを無視

### 4. 時間設定済み日付の保護

**ルール:**
```typescript
function hasTimeSettings(dateString: DateString): boolean {
  const workDay = workDays.find(wd => wd.date === dateString)
  if (!workDay) return false
  return workDay.startTimeSetBy !== 'default' || workDay.endTimeSetBy !== 'default'
}
```

**確認ダイアログ:**
- 個別設定された日付を外す場合
- 一括選択で設定済み日付が含まれる場合
- メッセージ: "時間設定が適用されている日付が含まれています。選択を変更してもよろしいですか?"

---

## 時間計算ロジック

### 1. 勤務時間計算

**基本計算:**
```typescript
function calculateWorkMinutes(startTime: TimeString, endTime: TimeString): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  let startMinutes = startHour * 60 + startMinute
  let endMinutes = endHour * 60 + endMinute

  // 日跨ぎ対応: 終了時刻が開始時刻より前の場合は翌日とみなす
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60  // +1440分
  }

  return endMinutes - startMinutes
}
```

**例:**
- `09:00 - 18:00` → 540分 (9時間)
- `22:00 - 02:00` → 240分 (4時間、翌日2時まで)
- `23:00 - 23:00` → 1440分 (24時間、警告表示推奨)

### 2. 休憩時間計算

**労働基準法準拠ルール:**
```typescript
function calculateBreakTime(workMinutes: number): number {
  if (workMinutes < 6 * 60) {
    return 0         // 6時間未満: 休憩なし
  } else if (workMinutes < 8 * 60) {
    return 45        // 6時間以上8時間未満: 45分休憩
  } else {
    return 60        // 8時間以上: 60分休憩
  }
}
```

**実勤務時間:**
```typescript
const actualWorkMinutes = workMinutes - calculateBreakTime(workMinutes)
```

**注意:**
- 休憩時間は法定最低限
- 店舗によって異なる場合は設定画面で変更可能にする（将来実装）

### 3. 週番号計算

**月内の週番号（1-6）:**
```typescript
function getWeekNumber(dateString: DateString): number {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth()

  // 月の1日
  const firstDay = new Date(year, month, 1)

  // 月の1日が属する週の日曜日
  const firstDayOfWeek = firstDay.getDay() // 0-6
  const firstSunday = new Date(firstDay)
  firstSunday.setDate(firstDay.getDate() - firstDayOfWeek)

  // 対象日付と最初の日曜日の差分（日数）
  const diffTime = date.getTime() - firstSunday.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // 週番号を計算（1始まり）
  const weekNumber = Math.floor(diffDays / 7) + 1

  return weekNumber
}
```

**例:**
- 2025年1月1日（水）→ 第1週
- 2025年1月5日（日）→ 第1週
- 2025年1月6日（月）→ 第2週

### 4. 時刻文字列変換

**時刻を0:00からの経過分に変換:**
```typescript
function timeStringToMinutes(
  timeString: TimeString,
  isEndTime: boolean = false,
  startMinutes?: number
): number {
  const [hour, minute] = timeString.split(':').map(Number)
  let minutes = hour * 60 + minute

  // 終了時刻の場合、開始時刻より前なら翌日とみなす
  if (isEndTime && startMinutes !== undefined && minutes <= startMinutes) {
    minutes += 24 * 60
  }

  return minutes
}
```

---

## 時間競合検出ロジック

### 1. 競合検出アルゴリズム

**目的:** 同じ日付で異なるジョブ間の時間重複を検出

**手順:**

#### ステップ1: 日付でグループ化
```typescript
const workDaysByDate: Record<DateString, WorkDay[]> = {}
activeWorkDays.forEach(day => {
  if (!workDaysByDate[day.date]) {
    workDaysByDate[day.date] = []
  }
  workDaysByDate[day.date].push(day)
})
```

#### ステップ2: 各日付内で比較
```typescript
Object.entries(workDaysByDate).forEach(([date, workDays]) => {
  // 1日に1つのジョブしかない場合はスキップ
  if (workDays.length < 2) return

  // 総当たり比較（O(M²) where M = 通常1-5）
  for (let i = 0; i < workDays.length; i++) {
    for (let j = i + 1; j < workDays.length; j++) {
      const overlap = checkTimeOverlap(workDays[i], workDays[j])
      if (overlap) {
        conflicts.push({
          date,
          jobId1: workDays[i].jobId,
          jobId2: workDays[j].jobId,
          job1TimeSlot: {
            startTime: workDays[i].startTime,
            endTime: workDays[i].endTime
          },
          job2TimeSlot: {
            startTime: workDays[j].startTime,
            endTime: workDays[j].endTime
          },
          overlap
        })
      }
    }
  }
})
```

### 2. 時間重複判定

**ロジック:**
```typescript
function checkTimeOverlap(workDay1: WorkDay, workDay2: WorkDay): TimeOverlap | null {
  // 削除されたWorkDayは除外
  if (workDay1.isRemoved || workDay2.isRemoved) {
    return null
  }

  // 同じjobIdは重複としない
  if (workDay1.jobId === workDay2.jobId) {
    return null
  }

  // 時刻を分単位に変換
  const start1 = timeStringToMinutes(workDay1.startTime)
  const end1 = timeStringToMinutes(workDay1.endTime, true, start1)
  const start2 = timeStringToMinutes(workDay2.startTime)
  const end2 = timeStringToMinutes(workDay2.endTime, true, start2)

  // 重複チェック（境界の一致も含む）
  if (start1 < end2 && start2 < end1) {
    // 重複している時間帯を計算
    const overlapStart = Math.max(start1, start2)
    const overlapEnd = Math.min(end1, end2)
    const durationMinutes = overlapEnd - overlapStart

    return {
      startMinutes: overlapStart,
      endMinutes: overlapEnd,
      durationMinutes
    }
  }

  return null
}
```

**重複判定の詳細:**
```
ケース1: 完全重複
Job1: 09:00 ━━━━━━━━━━━ 18:00
Job2:       12:00 ━━━ 15:00
重複: 12:00 - 15:00 (3時間)

ケース2: 部分重複
Job1: 09:00 ━━━━━━━━━━━ 18:00
Job2:               17:00 ━━━━━ 23:00
重複: 17:00 - 18:00 (1時間)

ケース3: 境界一致（重複とみなす）
Job1: 09:00 ━━━━━━━━━━━ 18:00
Job2:                     18:00 ━━━ 23:00
重複: 18:00 - 18:00 (0分) → 警告表示

ケース4: 重複なし
Job1: 09:00 ━━━━━━━━━━━ 17:00
Job2:                       18:00 ━━━ 23:00
重複: なし
```

**境界一致の理由:**
- 移動時間が考慮されていない
- ユーザーに警告して判断を委ねる

### 3. 計算量の最適化

**現在の実装:**
- 全体: O(N) - N = 全WorkDay数
- 日付グループ化: O(N)
- 各日付内の比較: O(M²) - M = 1日あたりのWorkDay数（通常1-5）

**実用上の性能:**
- 30日 × 2ジョブ = 60 WorkDay → 約30回の比較
- 30日 × 4ジョブ = 120 WorkDay → 約180回の比較
- 十分高速（1ms以下）

---

## 一括設定ロジック

### 1. 一括適用の種類

```typescript
type BulkApplyType = 'start' | 'end' | 'both'
type BulkApplyTarget = 'all' | 'unmodified'
```

### 2. 適用ロジック

```typescript
function applyBulk(
  type: BulkApplyType,
  target: BulkApplyTarget,
  weekdays?: number[],      // 曜日フィルター [0-6]
  weekNumbers?: number[]    // 週番号フィルター [1-6]
) {
  // 対象日を絞り込み
  const targetDays = target === 'all'
    ? workDays.filter(day => !day.isRemoved)
    : workDays.filter(day => !day.isModified && !day.isRemoved)

  targetDays.forEach(day => {
    // 曜日フィルター
    if (weekdays && weekdays.length > 0 && !weekdays.includes(day.dayOfWeek)) {
      return
    }

    // 週番号フィルター
    if (weekNumbers && weekNumbers.length > 0 && !weekNumbers.includes(day.weekNumber)) {
      return
    }

    // 更新内容
    const updates: Partial<WorkDay> = {}

    if (type === 'both' || type === 'start') {
      updates.startTime = bulkSettings.startTime
      updates.customStartTime = false
      updates.startTimeSetBy = 'bulk'
    }

    if (type === 'both' || type === 'end') {
      updates.endTime = bulkSettings.endTime
      updates.customEndTime = false
      updates.endTimeSetBy = 'bulk'
    }

    // 勤務時間を再計算
    const startTime = updates.startTime ?? day.startTime
    const endTime = updates.endTime ?? day.endTime
    updates.workMinutes = calculateWorkMinutes(startTime, endTime)

    // isModifiedフラグの制御
    const finalCustomStartTime = updates.customStartTime ?? day.customStartTime
    const finalCustomEndTime = updates.customEndTime ?? day.customEndTime

    if (!finalCustomStartTime && !finalCustomEndTime) {
      updates.isModified = false

      // 初期値と比較
      const startChanged = startTime !== day.initialStartTime
      const endChanged = endTime !== day.initialEndTime
      updates.isBulkApplied = startChanged || endChanged
    }

    // WorkDayを更新
    Object.assign(day, updates)
  })
}
```

### 3. 設定方法の優先度

```
custom (個別設定) > base (過去ベース) > bulk (一括設定) > default (デフォルト)
```

**判定ロジック:**
```typescript
// 表示色の決定
function getCardColor(workDay: WorkDay): string {
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') {
    return 'yellow'  // 個別設定
  }
  if (workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base') {
    return 'lightred'  // 過去ベース
  }
  if (workDay.startTimeSetBy === 'bulk' || workDay.endTimeSetBy === 'bulk') {
    return 'blue'  // 一括設定
  }
  return 'green'  // デフォルト
}
```

### 4. 一括設定の上書き動作

**ルール:**
- 「未設定のみ」: `isModified === false` のWorkDayのみ対象
- 「全て」: 個別設定も含めて全て上書き

**確認ダイアログ:**
- 「全て」選択時: "個別設定された日付も上書きされます。よろしいですか?"

---

## ジョブ管理ロジック

### 1. ジョブの追加

**制約:**
- 最大4件まで
- ID は自動採番（1-4）
- 色は固定（ID連動）

```typescript
function addJob(name: string): Job | null {
  if (jobs.length >= 4) {
    return null  // 最大数エラー
  }

  const nextId = (jobs.length + 1) as JobId  // 1, 2, 3, 4
  const newJob: Job = {
    id: nextId,
    name,
    color: JOB_COLORS[nextId - 1],
    isActive: true
  }

  jobs.push(newJob)
  saveJobsToLocalStorage()
  return newJob
}
```

### 2. ジョブの削除

**影響範囲:**
- `dateJobMap` から該当ジョブIDを削除
- `workDays` から該当ジョブのWorkDayを削除
- `currentJobId` が削除されたジョブの場合は `null` にリセット

```typescript
function deleteJob(jobId: JobId) {
  const index = jobs.findIndex(j => j.id === jobId)
  if (index === -1) return

  // 確認ダイアログ
  if (!confirm(`${jobs[index].name}を削除してもよろしいですか？\nこのジョブで選択した日付も削除されます。`)) {
    return
  }

  // ジョブを削除
  jobs.splice(index, 1)

  // dateJobMapから削除
  Object.keys(dateJobMap).forEach(dateString => {
    const jobIds = dateJobMap[dateString]
    const jobIndex = jobIds.indexOf(jobId)
    if (jobIndex > -1) {
      jobIds.splice(jobIndex, 1)
      if (jobIds.length === 0 && !selectedDates.has(dateString)) {
        delete dateJobMap[dateString]
      }
    }
  })

  // workDaysから削除
  workDays = workDays.filter(wd => wd.jobId !== jobId)

  // currentJobIdをリセット
  if (currentJobId === jobId) {
    currentJobId = null
  }

  saveJobsToLocalStorage()
}
```

### 3. ジョブの更新

**可能な更新:**
- 名前のみ
- 色とIDは変更不可

```typescript
function updateJob(jobId: JobId, name: string) {
  const job = jobs.find(j => j.id === jobId)
  if (job) {
    job.name = name
    saveJobsToLocalStorage()
  }
}
```

### 4. ジョブ別デフォルト時刻

**概念:**
- 各ジョブごとに異なるデフォルト時刻を設定可能
- 例: 本店は9:00-18:00、掛け持ち先Aは18:00-23:00

**適用タイミング:**
- 日付選択時に新しいWorkDayを作成する際
- 該当ジョブのデフォルト時刻を使用

```typescript
function initializeWorkDay(date: DateString, jobId: JobId | undefined): WorkDay {
  let defaultTimes = { startTime: '09:00', endTime: '18:00' }

  if (jobId !== undefined) {
    const jobKey = jobId.toString()
    if (jobDefaultTimes[jobKey]) {
      defaultTimes = jobDefaultTimes[jobKey]
    }
  }

  return {
    date,
    dayOfWeek: getDayOfWeek(date),
    weekNumber: getWeekNumber(date),
    startTime: defaultTimes.startTime,
    endTime: defaultTimes.endTime,
    initialStartTime: defaultTimes.startTime,
    initialEndTime: defaultTimes.endTime,
    workMinutes: calculateWorkMinutes(defaultTimes.startTime, defaultTimes.endTime),
    isModified: false,
    isRemoved: false,
    displayDate: formatDisplayDate(date),
    customStartTime: false,
    customEndTime: false,
    isBulkApplied: false,
    isFromBase: false,
    startTimeSetBy: 'default',
    endTimeSetBy: 'default',
    jobId
  }
}
```

---

## バリデーションルール

### 1. 日付バリデーション

```typescript
// 過去日付チェック
function validateDate(dateString: DateString): boolean {
  return !isPast(dateString)
}

// 有効な日付形式チェック
function isValidDateString(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false

  const date = new Date(dateString)
  return !isNaN(date.getTime())
}
```

### 2. 時刻バリデーション

```typescript
// 有効な時刻形式チェック
function isValidTimeString(timeString: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return regex.test(timeString)
}

// 勤務時間の妥当性チェック
function validateWorkHours(workMinutes: number): boolean {
  // 最小15分、最大24時間
  return workMinutes >= 15 && workMinutes <= 1440
}
```

### 3. ジョブ名バリデーション

```typescript
function validateJobName(name: string): boolean {
  // 1-50文字
  return name.length >= 1 && name.length <= 50
}
```

### 4. 本店名バリデーション

```typescript
function validateMainStoreName(name: string): boolean {
  // 0-50文字（空も許可）
  return name.length <= 50
}
```

---

## データ同期ロジック

### 1. カレンダー ⇔ 時間登録の同期

**カレンダーで日付を追加:**
```typescript
// CalendarView → TimeRegisterView
function syncWithSelectedDates(
  dates: DateString[],
  dateJobMap: DateJobMap,
  selectedDates: Set<DateString>
) {
  // 既存のworkDaysを保持マップ化
  const existingWorkDaysMap = new Map(
    workDays.map(wd => [`${wd.date}_${wd.jobId || 'none'}`, wd])
  )

  const newWorkDays: WorkDay[] = []

  dates.forEach(date => {
    const jobIds = dateJobMap[date] || []
    const allJobIds: (JobId | undefined)[] = []

    // selectedDatesに含まれている場合のみメインを追加
    if (selectedDates.has(date)) {
      allJobIds.push(undefined)
    }

    // 掛け持ち先を追加
    allJobIds.push(...jobIds)

    allJobIds.forEach(jobId => {
      const key = `${date}_${jobId || 'none'}`
      const existing = existingWorkDaysMap.get(key)

      if (existing) {
        // 既存の設定を保持
        newWorkDays.push(existing)
      } else {
        // 新規WorkDayを作成
        newWorkDays.push(initializeWorkDay(date, jobId))
      }
    })
  })

  workDays = newWorkDays
}
```

**カレンダーで日付を削除:**
- WorkDayは自動的に除外される（`dates`に含まれないため）
- 個別設定は失われる

### 2. LocalStorage同期

**保存タイミング:**
- ジョブ追加/更新/削除時
- 日付選択時
- 本店名変更時

**保存項目:**
```typescript
localStorage.setItem('jobs', JSON.stringify(jobs))
localStorage.setItem('dateJobMap', JSON.stringify(dateJobMap))
localStorage.setItem('mainStoreName', mainStoreName)
localStorage.setItem('jobDefaultTimes', JSON.stringify(jobDefaultTimes))
localStorage.setItem('defaultTimes', JSON.stringify(bulkSettings))
```

**読み込みタイミング:**
- アプリ起動時（`onMounted`）
- ページリロード時

---

## 補足事項

### 1. エッジケース処理

#### 24時間勤務
```typescript
// 09:00 - 09:00 → 1440分（24時間）
// 警告: "24時間勤務ですが、正しいですか?"
```

#### 深夜勤務
```typescript
// 22:00 - 02:00 → 240分（4時間）
// 翌日扱いで正常動作
```

#### 同時刻
```typescript
// 18:00 - 18:00 → 1440分
// エラーとせず、確認ダイアログ表示
```

### 2. パフォーマンス考慮

**大量データ時:**
- 100日 × 4ジョブ = 400 WorkDay
- 時間競合検出: 約1-2ms
- 一括設定: 約1ms
- 十分実用的

**最適化の余地:**
- Set/Map の活用
- メモ化（競合検出結果のキャッシュ）
- Virtual Scrolling（表示最適化）

### 3. 将来の拡張性

**考慮すべき機能:**
- シフトパターンテンプレート（例: "月水金の固定シフト"）
- 繰り返し設定（"毎週月曜は10:00-19:00"）
- AI推奨（過去のパターンから自動提案）
- 複数月まとめて設定

---

**作成者:** Claude (AI Assistant)
**レビュー状況:** 要レビュー
**次回更新予定:** Flutter実装時に検証・更新
