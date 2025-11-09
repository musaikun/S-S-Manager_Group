/**
 * 時間登録関連の型定義
 */

import type { DateString, DayOfWeek, JobId } from './calendar'

/**
 * 時刻（HH:MM形式）
 */
export type TimeString = string // "09:00", "18:30" など

/**
 * 時間帯（開始時刻と終了時刻）
 */
export interface TimeSlot {
  startTime: TimeString
  endTime: TimeString
}

/**
 * 勤務日情報
 */
export interface WorkDay {
  /** 日付（YYYY-MM-DD形式） */
  date: DateString
  /** 曜日（0: 日曜 ~ 6: 土曜） */
  dayOfWeek: DayOfWeek
  /** 週番号（1-6） */
  weekNumber: number
  /** 開始時刻 */
  startTime: TimeString
  /** 終了時刻 */
  endTime: TimeString
  /** 初期開始時刻（比較用） */
  initialStartTime: TimeString
  /** 初期終了時刻（比較用） */
  initialEndTime: TimeString
  /** 勤務時間（分） */
  workMinutes: number
  /** 個別に修正されたか */
  isModified: boolean
  /** シフトから外されたか */
  isRemoved: boolean
  /** 表示用日付文字列（例: "11/15(金)"） */
  displayDate: string
  /** 開始時間が個別設定されたか */
  customStartTime: boolean
  /** 終了時間が個別設定されたか */
  customEndTime: boolean
  /** 一括設定が適用されたか */
  isBulkApplied: boolean
  /** 過去のシフトベースから作成されたか */
  isFromBase?: boolean
  /** 開始時刻の設定方法 */
  startTimeSetBy: 'default' | 'bulk' | 'custom' | 'base'
  /** 終了時刻の設定方法 */
  endTimeSetBy: 'default' | 'bulk' | 'custom' | 'base'
  /** ジョブID（掛け持ち機能使用時） */
  jobId?: JobId
}

/**
 * 休憩時間の計算結果
 */
export interface BreakTimeResult {
  /** 休憩時間（分） */
  breakMinutes: number
  /** 実労働時間（分） */
  actualWorkMinutes: number
}

/**
 * 休憩時間のルール
 */
export interface BreakTimeRule {
  /** 最小勤務時間（分） */
  minWorkMinutes: number
  /** 最大勤務時間（分）- nullは無制限 */
  maxWorkMinutes: number | null
  /** 休憩時間（分） */
  breakMinutes: number
}

/**
 * 一括設定用の時間設定
 */
export interface BulkSettings {
  /** 開始時刻 */
  startTime: TimeString
  /** 終了時刻 */
  endTime: TimeString
}

/**
 * 一括適用の種類
 */
export type BulkApplyType = 'both' | 'start' | 'end'

/**
 * 一括適用のターゲット
 */
export type BulkApplyTarget = 'all' | 'modifiedOnly'

/**
 * 時間ピッカーのモード
 */
export type TimePickerMode = 'card' | 'bulk-start' | 'bulk-end'

/**
 * 時間ピッカーの状態
 */
export interface TimePickerState {
  /** モーダルが開いているか */
  isOpen: boolean
  /** 現在のモード */
  mode: TimePickerMode
  /** 編集中のカードのインデックス（card modeの場合） */
  currentCardIndex: number | null
  /** 選択中の開始時刻 */
  selectedStartTime: TimeString
  /** 選択中の終了時刻 */
  selectedEndTime: TimeString
}

/**
 * 合計表示用の情報
 */
export interface TotalSummary {
  /** 出勤日数 */
  workDays: number
  /** 合計勤務時間（分） */
  totalWorkMinutes: number
  /** 合計実労働時間（分）- 休憩を引いた時間 */
  totalActualWorkMinutes: number
  /** 合計休憩時間（分） */
  totalBreakMinutes: number
}

/**
 * 時間登録画面の状態
 */
export interface TimeRegisterState {
  /** 勤務日のリスト */
  workDays: WorkDay[]
  /** 一括設定 */
  bulkSettings: BulkSettings
  /** 休憩時間を加味するか */
  includeBreak: boolean
  /** 備考欄 */
  remarks: string
  /** 提出モーダルが開いているか */
  showSubmitModal: boolean
  /** 時間ピッカーの状態 */
  timePicker: TimePickerState
}

/**
 * 時刻を時と分に分解した結果
 */
export interface ParsedTime {
  /** 時（0-23） */
  hour: number
  /** 分（0-59） */
  minute: number
}

/**
 * 午前/午後の区分
 */
export type Period = 'am' | 'pm'

/**
 * 時刻選択用の時間（12時間制）
 */
export interface Hour12 {
  /** 12時間制の時（1-12） */
  hour: number
  /** 午前/午後 */
  period: Period
}

/**
 * 確認ダイアログの表示内容
 */
export interface ConfirmDialogData {
  /** 勤務日の一覧 */
  workDays: WorkDay[]
  /** 合計情報 */
  summary: TotalSummary
}

/**
 * 進捗ステップ
 */
export type ProgressStep = 'calendar' | 'time-register' | 'confirm'

/**
 * 進捗ステップの情報
 */
export interface ProgressStepInfo {
  /** ステップID */
  id: ProgressStep
  /** ステップ番号 */
  number: number
  /** ステップラベル */
  label: string
  /** 完了済みか */
  completed: boolean
  /** アクティブか */
  active: boolean
  /** クリック可能か */
  clickable: boolean
}

/**
 * 時間重複の情報
 */
export interface TimeOverlap {
  /** 重複開始時刻（分単位、0:00からの経過分） */
  startMinutes: number
  /** 重複終了時刻（分単位、0:00からの経過分） */
  endMinutes: number
  /** 重複時間（分） */
  durationMinutes: number
}

/**
 * 時間重複の詳細情報
 */
export interface ConflictInfo {
  /** 対象日付 */
  date: DateString
  /** 重複しているジョブID（1つ目） */
  jobId1: JobId
  /** 重複しているジョブID（2つ目） */
  jobId2: JobId
  /** ジョブ1の時間帯 */
  job1TimeSlot: TimeSlot
  /** ジョブ2の時間帯 */
  job2TimeSlot: TimeSlot
  /** 重複している時間帯 */
  overlap: TimeOverlap
}
