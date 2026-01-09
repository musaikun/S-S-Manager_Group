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
          <span class="job-color-indicator main-store-indicator"></span>
          <span class="job-name">{{ calendarStore.mainStoreDisplayName }}</span>
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
                v-for="workDay in group.workDays"
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

        <!-- 掛け持ち先ごとの統計（コンパクト版） -->
        <div v-if="jobSummaries.length > 1" class="job-statistics-compact">
          <div class="job-stat-compact-row" v-for="summary in jobSummaries" :key="summary.jobId || 'none'">
            <span
              class="job-stat-dot"
              :style="{
                backgroundColor: summary.jobId ? calendarStore.getJobById(summary.jobId)?.color : '#FFFFFF',
                border: summary.jobId ? 'none' : '1.5px solid #666',
                boxShadow: summary.jobId ? 'none' : '0 0 2px rgba(0, 0, 0, 0.5)'
              }"
            ></span>
            <span class="job-stat-compact-name">
              {{ summary.jobId ? calendarStore.getJobById(summary.jobId)?.name : calendarStore.mainStoreDisplayName }}
            </span>
            <span class="job-stat-compact-value">{{ formatMinutesToHours(summary.totalWorkMinutes) }} / {{ summary.workDays }}日</span>
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
      <div v-if="showSubmitModal" class="modal-overlay" @click="closeSubmitModal">
        <div class="modal-content submit-modal" @click.stop>
          <!-- ステップ1: ジョブ選択（複数ジョブの場合のみ） -->
          <div v-if="submitStep === 'job-selection' && hasMultipleJobs">
            <h3 class="modal-title">提出する掛け持ち先を選択</h3>
            <div class="job-selection-list">
              <button
                @click="selectJobForSubmit('all')"
                class="job-selection-btn"
                :class="{ selected: selectedJobForSubmit === 'all' }"
              >
                <span class="job-selection-icon">📊</span>
                <span class="job-selection-label">すべての掛け持ち先</span>
                <span class="job-selection-count">{{ activeWorkDays.length }}件</span>
              </button>
              <button
                v-for="summary in jobSummaries"
                :key="summary.jobId || 'none'"
                @click="selectJobForSubmit(summary.jobId)"
                class="job-selection-btn"
                :class="{ selected: selectedJobForSubmit === summary.jobId }"
              >
                <span
                  v-if="summary.jobId"
                  class="job-selection-indicator"
                  :style="{ backgroundColor: calendarStore.getJobById(summary.jobId)?.color }"
                ></span>
                <span
                  v-else
                  class="job-selection-indicator main-store-selection-indicator"
                ></span>
                <span class="job-selection-label">
                  {{ summary.jobId ? calendarStore.getJobById(summary.jobId)?.name : calendarStore.mainStoreDisplayName }}
                </span>
                <span class="job-selection-count">{{ summary.workDays }}日</span>
              </button>
            </div>
            <div class="modal-buttons-row">
              <button @click="closeSubmitModal" class="close-modal-btn">キャンセル</button>
              <button @click="submitStep = 'method'" class="continue-btn">次へ</button>
            </div>
          </div>

          <!-- ステップ2: 提出方法選択 -->
          <div v-else>
            <h3 class="modal-title">
              {{ getSubmitTitle() }}
            </h3>
            <div class="submit-methods">
              <button @click="saveOnly" class="method-btn save-btn">
                <span class="method-icon">💾</span>
                <span class="method-label">保存のみ</span>
              </button>
              <button @click="downloadPDF" class="method-btn pdf-btn">
                <span class="method-icon">📄</span>
                <span class="method-label">PDF作成</span>
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
            <div class="modal-buttons-row">
              <button v-if="hasMultipleJobs" @click="submitStep = 'job-selection'" class="back-btn">戻る</button>
              <button @click="closeSubmitModal" class="close-modal-btn">キャンセル</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTimeRegisterStore } from '../stores/timeRegister'
import { useCalendarStore } from '../stores/calendar'
import { useTimeFormat } from '../composables/useTimeFormat'
import { useTimeCalculation } from '../composables/useTimeCalculation'
import { useHolidays } from '../composables/useHolidays'
import type { WorkDay } from '../types/timeRegister'
import type { JobId } from '../types/calendar'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const timeRegisterStore = useTimeRegisterStore()
const calendarStore = useCalendarStore()
const { isHoliday } = useHolidays()

const { includeBreak, workDays, showSubmitModal } = storeToRefs(timeRegisterStore)
const { totalSummary, jobSummaries } = storeToRefs(timeRegisterStore)

const { formatMinutesToHours } = useTimeFormat()
const { calculateBreakTime } = useTimeCalculation()

// 提出用のジョブ選択状態
const selectedJobForSubmit = ref<JobId | null | 'all'>('all')
const submitStep = ref<'job-selection' | 'method'>('job-selection')

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

// 日付順にソートされたWorkDays
const sortedWorkDays = computed(() => {
  return [...activeWorkDays.value].sort((a, b) => {
    return a.date.localeCompare(b.date)
  })
})

// ユニークな日付の数
const uniqueDatesCount = computed(() => {
  const uniqueDates = new Set(activeWorkDays.value.map(wd => wd.date))
  return uniqueDates.size
})

// 複数のジョブがあるか
const hasMultipleJobs = computed(() => {
  return jobSummaries.value.length > 1
})

// 提出対象のWorkDays（選択されたジョブのみ）
const workDaysForSubmit = computed(() => {
  if (selectedJobForSubmit.value === 'all') {
    return activeWorkDays.value
  }
  // メイン店舗の場合は jobId が undefined なので、undefined と null の両方をチェック
  const targetJobId = selectedJobForSubmit.value
  return activeWorkDays.value.filter(wd => {
    // nullとundefinedを同一視する
    if ((targetJobId === null || targetJobId === undefined) && (wd.jobId === null || wd.jobId === undefined)) {
      return true
    }
    return wd.jobId === targetJobId
  })
})

// ジョブを選択
const selectJobForSubmit = (jobId: JobId | null | 'all' | undefined) => {
  if (jobId === undefined) {
    selectedJobForSubmit.value = null
  } else {
    selectedJobForSubmit.value = jobId as JobId | null | 'all'
  }
}

// 提出モーダルのタイトルを取得
const getSubmitTitle = (): string => {
  if (selectedJobForSubmit.value === 'all') {
    return '提出方法を選択'
  }
  if (selectedJobForSubmit.value === null) {
    return `提出方法を選択（${calendarStore.mainStoreDisplayName}）`
  }
  const job = calendarStore.getJobById(selectedJobForSubmit.value)
  return `提出方法を選択（${job?.name || '不明'}）`
}

// モーダルを閉じる
const closeSubmitModal = () => {
  timeRegisterStore.closeSubmitModal()
  // モーダルを閉じる際にステップとジョブ選択をリセット
  setTimeout(() => {
    submitStep.value = hasMultipleJobs.value ? 'job-selection' : 'method'
    selectedJobForSubmit.value = 'all'
  }, 300)
}

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
  // 各workDayにjobNameとjobColorを追加（保存時点の掛け持ち先名称と色を保持）
  const workDaysWithJobName = workDaysForSubmit.value.map(workDay => {
    if (workDay.jobId !== undefined) {
      const job = calendarStore.getJobById(workDay.jobId)
      return {
        ...workDay,
        jobName: job?.name || '',
        jobColor: job?.color || '#999'
      }
    } else {
      return {
        ...workDay,
        jobName: calendarStore.mainStoreDisplayName,
        jobColor: '#FFFFFF'
      }
    }
  })

  const shiftData = {
    workDays: workDaysWithJobName,
    totalSummary: totalSummary.value,
    remarks: timeRegisterStore.remarks,
    submittedAt: new Date().toISOString(),
    jobId: selectedJobForSubmit.value !== 'all' ? selectedJobForSubmit.value : undefined
  }

  // LocalStorageに保存
  const savedShifts = JSON.parse(localStorage.getItem('savedShifts') || '[]')
  savedShifts.push(shiftData)
  localStorage.setItem('savedShifts', JSON.stringify(savedShifts))
}

// シフトデータをテキスト形式で生成
const generateShiftText = (): string => {
  let text = '【シフト提出】\n\n'

  // 提出対象のジョブ名を表示
  if (selectedJobForSubmit.value !== 'all') {
    const jobName = selectedJobForSubmit.value === null
      ? calendarStore.mainStoreDisplayName
      : calendarStore.getJobById(selectedJobForSubmit.value)?.name
    text += `【${jobName}】\n`
  }

  // ジョブごとにグループ分けして表示（'all'の場合のみ）
  if (selectedJobForSubmit.value === 'all' && hasMultipleJobs.value) {
    const filteredGroups = workDaysByJob.value.filter(group => {
      return group.workDays.some(day => workDaysForSubmit.value.includes(day))
    })

    filteredGroups.forEach(group => {
      if (group.job) {
        text += `【${group.job.name}】\n`
      } else {
        text += `【${calendarStore.mainStoreDisplayName}】\n`
      }

      const groupDays = group.workDays.filter(day => workDaysForSubmit.value.includes(day))
      groupDays.forEach(day => {
        text += `${day.displayDate}: ${day.startTime}〜${day.endTime}\n`
      })
      text += '\n'
    })
  } else {
    // 単一ジョブまたは掛け持ちなしの場合
    workDaysForSubmit.value.forEach(day => {
      text += `${day.displayDate}: ${day.startTime}〜${day.endTime}\n`
    })
    text += '\n'
  }

  // 合計統計
  const totalDays = workDaysForSubmit.value.length
  const totalMinutes = workDaysForSubmit.value.reduce((sum, day) => sum + day.workMinutes, 0)

  text += `【合計】\n`
  text += `勤務日数: ${totalDays}日\n`
  text += `総勤務時間: ${formatMinutesToHours(totalMinutes)}\n`

  if (timeRegisterStore.remarks.trim()) {
    text += `\n【備考】\n${timeRegisterStore.remarks}\n`
  }

  return text
}

// 保存のみ
const saveOnly = () => {
  if (!confirm('このシフトを保存しますか？')) {
    return
  }
  saveShiftData()
  closeSubmitModal()
  const jobInfo = getJobInfoForAlert()
  alert(`シフトを保存しました${jobInfo}\n\n※ 選択データは保持されています。引き続き編集や他の方法での提出が可能です。`)
}

// アラート用のジョブ情報を取得
const getJobInfoForAlert = (): string => {
  if (selectedJobForSubmit.value === 'all') {
    return ''
  }
  if (selectedJobForSubmit.value === null) {
    return `（${calendarStore.mainStoreDisplayName}）`
  }
  const job = calendarStore.getJobById(selectedJobForSubmit.value)
  return `（${job?.name || '不明'}）`
}

// メール送信
const submitViaEmail = () => {
  const subject = encodeURIComponent('シフト提出')
  const body = encodeURIComponent(generateShiftText())
  window.location.href = `mailto:?subject=${subject}&body=${body}`
  closeSubmitModal()

  // 提出後に保存確認
  if (confirm('このシフトを保存しますか？')) {
    saveShiftData()
  }
}

// LINE送信
const submitViaLine = () => {
  const text = encodeURIComponent(generateShiftText())
  window.open(`https://line.me/R/share?text=${text}`, '_blank')
  closeSubmitModal()

  // 提出後に保存確認
  if (confirm('このシフトを保存しますか？')) {
    saveShiftData()
  }
}

// CSVダウンロード
const downloadCSV = () => {
  let csv = '日付,開始時刻,終了時刻,勤務時間,実働時間,設定,掛け持ち先\n'

  workDaysForSubmit.value.forEach(day => {
    const breakMinutes = calculateBreakTime(day.workMinutes)
    const actualMinutes = day.workMinutes - breakMinutes
    const status = getStatusText(day)
    const jobName = day.jobId ? calendarStore.getJobById(day.jobId)?.name : calendarStore.mainStoreDisplayName
    csv += `${day.displayDate},${day.startTime},${day.endTime},${formatMinutesToHours(day.workMinutes)},${formatMinutesToHours(actualMinutes)},${status},${jobName}\n`
  })

  // 合計統計
  const totalDays = workDaysForSubmit.value.length
  const totalMinutes = workDaysForSubmit.value.reduce((sum, day) => sum + day.workMinutes, 0)
  const totalBreakMinutes = workDaysForSubmit.value.reduce((sum, day) => sum + calculateBreakTime(day.workMinutes), 0)
  const totalActualMinutes = totalMinutes - totalBreakMinutes

  csv += `\n合計\n`
  csv += `勤務日数,${totalDays}日\n`
  csv += `総勤務時間,${formatMinutesToHours(totalMinutes)}\n`
  csv += `実働時間,${formatMinutesToHours(totalActualMinutes)}\n`

  if (timeRegisterStore.remarks.trim()) {
    csv += `\n備考\n${timeRegisterStore.remarks}\n`
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  const jobSuffix = selectedJobForSubmit.value !== 'all' ? `_${selectedJobForSubmit.value || 'none'}` : ''
  link.setAttribute('download', `shift_${new Date().toISOString().split('T')[0]}${jobSuffix}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  closeSubmitModal()
  alert('CSVファイルをダウンロードしました\n\n※ 選択データは保持されています。引き続き編集や他の方法での提出が可能です。')

  // ダウンロード後に保存確認
  if (confirm('このシフトを保存しますか？')) {
    saveShiftData()
  }
}

// クリップボードにコピー
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generateShiftText())
    closeSubmitModal()
    alert('シフト情報をコピーしました\n\n※ 選択データは保持されています。引き続き編集や他の方法での提出が可能です。')

    // コピー後に保存確認
    if (confirm('このシフトを保存しますか？')) {
      saveShiftData()
    }
  } catch (err) {
    console.error('クリップボードへのコピーに失敗:', err)
    alert('コピーに失敗しました')
  }
}

// PDFダウンロード
const downloadPDF = () => {
  try {
    // A4サイズのPDFを作成
    const doc = new jsPDF()

    // 提出対象のジョブ名を取得
    let jobName = 'すべて'
    if (selectedJobForSubmit.value !== 'all') {
      jobName = selectedJobForSubmit.value === null
        ? calendarStore.mainStoreDisplayName
        : calendarStore.getJobById(selectedJobForSubmit.value)?.name || '不明'
    }

    // タイトル（日本語対応のためフォントは後で追加予定）
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    // 英語でタイトル
    doc.setFontSize(18)
    doc.text('Shift Schedule', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.text(`Month: ${currentYear}/${currentMonth}`, 20, 35)
    doc.text(`Job: ${jobName}`, 20, 45)
    doc.text(`Submitted: ${new Date().toLocaleDateString('ja-JP')}`, 20, 55)

    // テーブルデータを準備
    const tableData: any[] = []

    // ジョブごとにグループ分け
    if (selectedJobForSubmit.value === 'all' && hasMultipleJobs.value) {
      workDaysByJob.value.forEach(group => {
        const groupName = group.job?.name || calendarStore.mainStoreDisplayName
        const groupDays = group.workDays.filter(day => workDaysForSubmit.value.includes(day))

        // グループヘッダー
        tableData.push([{ content: `[${groupName}]`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }])

        // データ行
        groupDays.forEach(day => {
          tableData.push([
            day.displayDate,
            `${day.startTime} - ${day.endTime}`,
            formatMinutesToHours(day.workMinutes),
            getStatusText(day)
          ])
        })
      })
    } else {
      // 単一ジョブまたは掛け持ちなし
      workDaysForSubmit.value.forEach(day => {
        tableData.push([
          day.displayDate,
          `${day.startTime} - ${day.endTime}`,
          formatMinutesToHours(day.workMinutes),
          getStatusText(day)
        ])
      })
    }

    // テーブル描画
    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Time', 'Hours', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: 'bold'
      }
    })

    // 合計統計
    const finalY = (doc as any).lastAutoTable?.finalY || 100
    const totalDays = workDaysForSubmit.value.length
    const totalMinutes = workDaysForSubmit.value.reduce((sum, day) => sum + day.workMinutes, 0)

    doc.setFontSize(11)
    doc.text('Summary:', 20, finalY)
    doc.text(`Total Days: ${totalDays}`, 20, finalY + 8)
    doc.text(`Total Hours: ${formatMinutesToHours(totalMinutes)}`, 20, finalY + 16)

    // 備考
    if (timeRegisterStore.remarks.trim()) {
      doc.text('Remarks:', 20, finalY + 28)
      const splitRemarks = doc.splitTextToSize(timeRegisterStore.remarks, 170)
      doc.setFontSize(9)
      doc.text(splitRemarks, 20, finalY + 36)
    }

    // フッター
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('Powered by S x S Manager', 105, pageHeight - 10, { align: 'center' })
    doc.text('https://github.com/musaikun/S-S-Manager_Group', 105, pageHeight - 5, { align: 'center' })

    // ファイル名生成
    const jobSuffix = selectedJobForSubmit.value !== 'all' ? `_${jobName}` : ''
    const fileName = `shift_${currentYear}${String(currentMonth).padStart(2, '0')}${jobSuffix}.pdf`

    // PDFダウンロード
    doc.save(fileName)

    closeSubmitModal()
    alert('PDFファイルをダウンロードしました\n\n※ 選択データは保持されています。引き続き編集や他の方法での提出が可能です。')

    // ダウンロード後に保存確認
    if (confirm('このシフトを保存しますか？')) {
      saveShiftData()
    }
  } catch (err) {
    console.error('PDF生成に失敗:', err)
    alert('PDF生成に失敗しました')
  }
}

// 初期化: カレンダーから直接遷移した場合にworkDaysを初期化
const initializeWorkDaysIfNeeded = () => {
  const selectedDates = Array.from(calendarStore.selectedDates)
  const dateJobMap = calendarStore.dateJobMap
  const selectedDatesSet = calendarStore.selectedDates

  // すべての日付を統合（メイン選択 + 掛け持ち選択）
  const allDates = new Set([
    ...selectedDates,
    ...Object.keys(dateJobMap)
  ])
  const allDatesArray = Array.from(allDates).sort()

  // workDaysが空で、カレンダーで日付が選択されている場合は初期化
  if (timeRegisterStore.workDays.length === 0 && allDatesArray.length > 0) {
    timeRegisterStore.initializeFromDates(allDatesArray, dateJobMap, selectedDatesSet)
  }
}

// マウント時に初期化
onMounted(() => {
  initializeWorkDaysIfNeeded()
})
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

/* 掛け持ち先別統計（コンパクト版） */
.job-statistics-compact {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.job-stat-compact-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.job-stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.job-stat-compact-name {
  font-weight: 600;
  color: #555;
  min-width: 80px;
}

.job-stat-compact-value {
  font-weight: 600;
  color: #333;
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

/* ジョブ選択リスト */
.job-selection-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.job-selection-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.job-selection-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateX(4px);
}

.job-selection-btn.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff, #eff6ff);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.job-selection-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.job-selection-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.main-store-selection-indicator {
  background-color: #FFFFFF;
  border: 1.5px solid #666;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.job-selection-label {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.job-selection-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: #667eea;
  background: #eff6ff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

/* モーダルボタン行 */
.modal-buttons-row {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.continue-btn,
.back-btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.continue-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.continue-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.back-btn {
  background: #f0f0f0;
  color: #666;
}

.back-btn:hover {
  background: #e0e0e0;
}

/* ジョブグループ */
.job-group {
  margin-bottom: 1.5rem;
}

.job-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 8px;
  border-left: 4px solid;
  font-weight: bold;
}

.job-group-header.no-job {
  border-left-color: #9ca3af;
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(209, 213, 219, 0.1));
}

.job-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.main-store-indicator {
  background-color: #FFFFFF;
  border: 1.5px solid #666;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.job-name {
  font-size: 1.05rem;
  color: #333;
}
</style>
