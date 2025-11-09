<template>
  <div class="confirm-view">
    <div class="confirm-container">
      <!-- 確認テーブル（ジョブごとにグループ分け） -->
      <div v-for="(group, groupIndex) in workDaysByJob" :key="groupIndex" class="job-group">
        <!-- ジョブヘッダー -->
        <div v-if="group.job" class="job-group-header" :style="{ borderLeftColor: group.job.color }">
          <span class="job-color-indicator" :style="{ backgroundColor: group.job.color }"></span>
          <span class="job-name">{{ group.job.name }}</span>
        </div>
        <div v-else class="job-group-header no-job">
          <span class="job-name">掛け持ちなし</span>
        </div>

        <div class="confirm-table-wrapper">
          <table class="confirm-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>時間</th>
                <th>勤務時間</th>
                <th>設定</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(workDay, index) in group.workDays"
                :key="`${workDay.date}_${workDay.jobId || 'none'}`"
                :class="{ modified: workDay.isModified }"
              >
                <td class="date-cell" :class="{
                  'saturday': workDay.dayOfWeek === 6,
                  'sunday': workDay.dayOfWeek === 0,
                  'holiday': isHoliday(workDay.date)
                }">{{ workDay.displayDate }}</td>
                <td class="time-cell">
                  <span :class="getStartTimeClass(workDay)">{{ workDay.startTime }}</span>
                  <span class="separator">〜</span>
                  <span :class="getEndTimeClass(workDay)">{{ workDay.endTime }}</span>
                </td>
                <td class="hours-cell">
                  <div v-html="formatWorkTime(workDay)"></div>
                </td>
                <td class="status-cell">
                  <span :class="getStatusBadgeClass(workDay)">{{ getStatusText(workDay) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 合計統計と備考の統合カード -->
      <div class="summary-remarks-section">
        <div class="summary-compact">
          <div class="summary-item">
            <span class="summary-label">勤務日数</span>
            <span class="summary-value">{{ totalSummary.workDays }}日</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-item">
            <span class="summary-label">総勤務時間</span>
            <span class="summary-value">{{ formatMinutesToHours(totalSummary.totalWorkMinutes) }}</span>
          </div>
        </div>

        <!-- 備考入力欄 -->
        <div class="remarks-area">
          <label for="remarks" class="remarks-label">備考</label>
          <textarea
            id="remarks"
            v-model="timeRegisterStore.remarks"
            class="remarks-input"
            placeholder="未ログインの場合、氏名の情報は含まれないので入力しましょう"
            rows="4"
          ></textarea>
        </div>
      </div>

      <!-- 提出ボタン -->
      <div class="submit-button-section">
        <button @click="timeRegisterStore.openSubmitModal()" class="submit-btn-main">
          提出する
        </button>
      </div>
    </div>

    <!-- 提出方法選択モーダル -->
    <Teleport to="body">
      <div v-if="showSubmitModal" class="modal-overlay" @click="timeRegisterStore.closeSubmitModal()">
        <div class="modal-content submit-modal" @click.stop>
          <h3 class="modal-title">提出方法を選択</h3>
          <div class="submit-methods">
            <button @click="saveOnly" class="method-btn save-btn">
              <span class="method-icon">💾</span>
              <span class="method-label">保存のみ</span>
            </button>
            <button @click="submitViaEmail" class="method-btn email-btn">
              <span class="method-icon">📧</span>
              <span class="method-label">メールで送信</span>
            </button>
            <button @click="submitViaLine" class="method-btn line-btn">
              <span class="method-icon">💬</span>
              <span class="method-label">LINEで送信</span>
            </button>
            <button @click="downloadCSV" class="method-btn csv-btn">
              <span class="method-icon">📊</span>
              <span class="method-label">CSVダウンロード</span>
            </button>
            <button @click="copyToClipboard" class="method-btn copy-btn">
              <span class="method-icon">📋</span>
              <span class="method-label">コピーする</span>
            </button>
          </div>
          <button @click="timeRegisterStore.closeSubmitModal()" class="close-modal-btn">キャンセル</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTimeRegisterStore } from '../stores/timeRegister'
import { useCalendarStore } from '../stores/calendar'
import { useTimeFormat } from '../composables/useTimeFormat'
import { useTimeCalculation } from '../composables/useTimeCalculation'
import { useHolidays } from '../composables/useHolidays'
import type { WorkDay } from '../types/timeRegister'

const timeRegisterStore = useTimeRegisterStore()
const calendarStore = useCalendarStore()
const { isHoliday } = useHolidays()

const { includeBreak, workDays, showSubmitModal } = storeToRefs(timeRegisterStore)
const { totalSummary } = storeToRefs(timeRegisterStore)

const { formatMinutesToHours } = useTimeFormat()
const { calculateBreakTime } = useTimeCalculation()

// アクティブな勤務日（削除されていない）
const activeWorkDays = computed(() => {
  return workDays.value.filter(wd => !wd.isRemoved)
})

// ジョブごとにグループ化されたWorkDays
const workDaysByJob = computed(() => {
  const grouped: Record<string, { job: any; workDays: WorkDay[] }> = {}

  activeWorkDays.value.forEach((day) => {
    const jobId = day.jobId
    const key = jobId?.toString() || 'none'

    if (!grouped[key]) {
      const job = jobId ? calendarStore.getJobById(jobId) : null
      grouped[key] = {
        job,
        workDays: []
      }
    }

    grouped[key].workDays.push(day)
  })

  return Object.values(grouped)
})

// 勤務時間のフォーマット
const formatWorkTime = (workDay: WorkDay) => {
  // 休憩時間を含めた場合も表示は勤務時間のみ
  if (includeBreak.value) {
    const breakMinutes = calculateBreakTime(workDay.workMinutes)
    const actualMinutes = workDay.workMinutes - breakMinutes
    return formatMinutesToHours(actualMinutes)
  }
  return formatMinutesToHours(workDay.workMinutes)
}

// デフォルト時刻を読み込む
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

// 開始時刻のテキスト色クラスを取得
const getStartTimeClass = (workDay: WorkDay) => {
  const defaultTimes = loadDefaultTimes()
  // デフォルト時刻と同じ場合は黒
  if (workDay.startTime === defaultTimes.startTime) {
    return 'default-time'
  }
  // 設定方法によって色を変える
  switch (workDay.startTimeSetBy) {
    case 'custom':
      return 'custom-time'
    case 'bulk':
      return 'bulk-time'
    case 'base':
      return 'from-base-time'
    default:
      return 'default-time'
  }
}

// 終了時刻のテキスト色クラスを取得
const getEndTimeClass = (workDay: WorkDay) => {
  const defaultTimes = loadDefaultTimes()
  // デフォルト時刻と同じ場合は黒
  if (workDay.endTime === defaultTimes.endTime) {
    return 'default-time'
  }
  // 設定方法によって色を変える
  switch (workDay.endTimeSetBy) {
    case 'custom':
      return 'custom-time'
    case 'bulk':
      return 'bulk-time'
    case 'base':
      return 'from-base-time'
    default:
      return 'default-time'
  }
}

// 設定状態のテキストを取得
const getStatusText = (workDay: WorkDay) => {
  // 個別設定が存在する場合は常に「個別設定」
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') {
    return '個別設定'
  }
  // 過去ベースの設定がある場合
  if (workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base') {
    return '過去ベース'
  }
  // 一括設定がある場合
  if (workDay.startTimeSetBy === 'bulk' || workDay.endTimeSetBy === 'bulk') {
    return '一括設定'
  }
  // デフォルトの場合
  return 'デフォルト'
}

// 設定状態のバッジクラスを取得
const getStatusBadgeClass = (workDay: WorkDay) => {
  // 個別設定が存在する場合は常に「個別設定」
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') {
    return 'custom-badge'
  }
  // 過去ベースの設定がある場合
  if (workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base') {
    return 'base-badge'
  }
  // 一括設定がある場合
  if (workDay.startTimeSetBy === 'bulk' || workDay.endTimeSetBy === 'bulk') {
    return 'bulk-badge'
  }
  // デフォルトの場合
  return 'initial-badge'
}

// シフトデータをLocalStorageに保存
const saveShiftData = () => {
  const shiftData = {
    workDays: activeWorkDays.value,
    totalSummary: totalSummary.value,
    remarks: timeRegisterStore.remarks,
    submittedAt: new Date().toISOString()
  }

  // LocalStorageに保存
  const savedShifts = JSON.parse(localStorage.getItem('savedShifts') || '[]')
  savedShifts.push(shiftData)
  localStorage.setItem('savedShifts', JSON.stringify(savedShifts))
}

// シフトデータをテキスト形式で生成
const generateShiftText = (): string => {
  let text = '【シフト提出】\n\n'

  activeWorkDays.value.forEach(day => {
    text += `${day.displayDate}: ${day.startTime}〜${day.endTime}\n`
  })

  text += `\n【合計】\n`
  text += `勤務日数: ${totalSummary.value.workDays}日\n`

  if (timeRegisterStore.remarks.trim()) {
    text += `\n【備考】\n${timeRegisterStore.remarks}\n`
  }

  return text
}

// 保存のみ
const saveOnly = () => {
  saveShiftData()
  timeRegisterStore.closeSubmitModal()
  alert('シフトを保存しました')
}

// メール送信
const submitViaEmail = () => {
  const subject = encodeURIComponent('シフト提出')
  const body = encodeURIComponent(generateShiftText())
  window.location.href = `mailto:?subject=${subject}&body=${body}`
  saveShiftData()
  timeRegisterStore.closeSubmitModal()
}

// LINE送信
const submitViaLine = () => {
  const text = encodeURIComponent(generateShiftText())
  window.open(`https://line.me/R/share?text=${text}`, '_blank')
  saveShiftData()
  timeRegisterStore.closeSubmitModal()
}

// CSVダウンロード
const downloadCSV = () => {
  let csv = '日付,開始時刻,終了時刻,勤務時間,実働時間,設定\n'

  activeWorkDays.value.forEach(day => {
    const breakMinutes = calculateBreakTime(day.workMinutes)
    const actualMinutes = day.workMinutes - breakMinutes
    const status = getStatusText(day)
    csv += `${day.displayDate},${day.startTime},${day.endTime},${formatMinutesToHours(day.workMinutes)},${formatMinutesToHours(actualMinutes)},${status}\n`
  })

  csv += `\n合計\n`
  csv += `勤務日数,${totalSummary.value.workDays}日\n`
  csv += `総勤務時間,${formatMinutesToHours(totalSummary.value.totalWorkMinutes)}\n`
  csv += `実働時間,${formatMinutesToHours(totalSummary.value.totalActualWorkMinutes)}\n`

  if (timeRegisterStore.remarks.trim()) {
    csv += `\n備考\n${timeRegisterStore.remarks}\n`
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `shift_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  saveShiftData()
  timeRegisterStore.closeSubmitModal()
}

// クリップボードにコピー
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generateShiftText())
    saveShiftData()
    timeRegisterStore.closeSubmitModal()
  } catch (err) {
    console.error('クリップボードへのコピーに失敗:', err)
  }
}
</script>

<style scoped>
.confirm-view {
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.confirm-container {
  max-width: 900px;
  margin: 0 auto;
}

/* 確認テーブル */
.confirm-table-wrapper {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.confirm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  table-layout: fixed;
}

.confirm-table thead {
  background: #f8f9fa;
}

.confirm-table th {
  padding: 0.875rem 0.5rem;
  text-align: left;
  font-weight: 700;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}

.confirm-table th:nth-child(1) {
  width: 20%;
}

.confirm-table th:nth-child(2) {
  width: 30%;
}

.confirm-table th:nth-child(3) {
  width: 32%;
}

.confirm-table th:nth-child(4) {
  width: 18%;
}

.confirm-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.confirm-table tbody tr:hover {
  background: #f9f9f9;
}

.confirm-table td {
  padding: 0.75rem 0.5rem;
  color: #333;
}

.date-cell {
  font-weight: 600;
  white-space: nowrap;
}

.date-cell.saturday {
  color: #2563eb;
}

.date-cell.sunday,
.date-cell.holiday {
  color: #ef4444;
}

.time-cell {
  font-weight: 600;
  color: #667eea;
  white-space: nowrap;
}

.time-cell .separator {
  color: #999;
  margin: 0 0.25rem;
}

/* 時刻テキストの色 */
.default-time {
  color: #333;
  font-weight: 600;
}

.custom-time {
  color: #f59e0b;
  font-weight: 700;
}

.bulk-time {
  color: #3b82f6;
  font-weight: 700;
}

.from-base-time {
  color: #ef4444;
  font-weight: 700;
}

.hours-cell {
  font-weight: 600;
  color: #666;
  font-size: 0.8rem;
  line-height: 1.3;
}

.status-cell {
  text-align: center;
  padding-left: 0.25rem !important;
  padding-right: 0.25rem !important;
}

.initial-badge {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  background: #9ca3af;
  color: white;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
}

.bulk-badge {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  background: #3b82f6;
  color: white;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
}

.custom-badge {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  background: #f59e0b;
  color: white;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
}

.base-badge {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
}

/* 合計統計 */
.total-summary-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.summary-compact {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #666;
}

.summary-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #333;
}

.summary-value.highlight {
  font-size: 1.05rem;
  color: #667eea;
}

.summary-divider {
  width: 1px;
  height: 2.5rem;
  background: #e0e0e0;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .confirm-view {
    padding: 0.75rem;
  }

  .confirm-table-wrapper {
    padding: 1rem;
  }

  .confirm-table {
    font-size: 0.85rem;
  }

  .confirm-table th,
  .confirm-table td {
    padding: 0.5rem;
  }

  .initial-badge,
  .bulk-badge,
  .custom-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }

  .total-summary-section {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .confirm-table-wrapper {
    padding: 0.75rem;
  }

  .confirm-table {
    font-size: 0.75rem;
  }

  .confirm-table th,
  .confirm-table td {
    padding: 0.4rem;
  }

  .initial-badge,
  .bulk-badge,
  .custom-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
  }
}

/* 統合カード */
.summary-remarks-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.remarks-area {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e0e0e0;
}

.remarks-label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
}

.remarks-input {
  width: 100%;
  padding: 0.875rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.remarks-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.remarks-input::placeholder {
  color: #999;
}

/* 提出ボタンセクション */
.submit-button-section {
  padding: 1.5rem 0;
  display: flex;
  justify-content: center;
}

.submit-btn-main {
  padding: 1rem 3rem;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  min-width: 200px;
}

.submit-btn-main:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

.submit-btn-main:active {
  transform: translateY(0);
}

/* モーダル */
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
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #333;
  text-align: center;
}

.submit-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.submit-methods .save-btn {
  grid-column: 1 / -1;
}

.method-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.method-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.method-icon {
  font-size: 2rem;
}

.method-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.close-modal-btn {
  width: 100%;
  padding: 0.875rem;
  background: #f0f0f0;
  color: #666;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-modal-btn:hover {
  background: #e0e0e0;
}
</style>
