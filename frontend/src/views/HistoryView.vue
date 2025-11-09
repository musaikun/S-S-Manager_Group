<template>
  <div class="history-view">
    <div class="history-header">
      <button @click="handleBack" class="back-btn">
        <span class="back-icon">←</span>
      </button>
      <h1 class="history-title">過去の作成記録</h1>
      <div class="spacer"></div>
    </div>

    <div class="history-container">
      <!-- 記録が無い場合 -->
      <div v-if="savedShifts.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p class="empty-text">まだ作成記録がありません</p>
        <p class="empty-subtext">シフトを作成・保存すると、ここに記録が保存されます</p>
        <div class="empty-actions">
          <button @click="goToCalendar" class="empty-btn calendar-btn">
            カレンダーへ
          </button>
        </div>
      </div>

      <!-- 記録一覧 -->
      <div v-else class="history-list">
        <div
          v-for="(shift, index) in savedShifts"
          :key="index"
          class="history-card"
          @click="openDetail(shift, index)"
        >
          <div class="card-content">
            <span class="card-text">
              <span v-if="shift.isFavorite" class="favorite-star">★</span>保存された日　{{ formatDate(shift.submittedAt) }}
            </span>
            <span class="card-arrow">→</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 詳細モーダル -->
    <Teleport to="body">
      <div v-if="selectedShift" class="modal-overlay" @click="closeDetail">
        <div class="modal-content detail-modal" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ getMonthLabel(selectedShift) }}</h2>
            <button @click="closeDetail" class="close-btn">×</button>
          </div>

          <div class="modal-body">
            <!-- 基本情報 -->
            <div class="detail-section">
              <h3 class="section-title">基本情報</h3>
              <div class="detail-info">
                <div class="detail-row">
                  <span class="detail-label">保存日時</span>
                  <span class="detail-value">{{ formatDate(selectedShift.submittedAt) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">勤務日数</span>
                  <span class="detail-value">{{ selectedShift.totalSummary.workDays }}日</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">総勤務時間</span>
                  <span class="detail-value">{{ formatMinutesToHours(selectedShift.totalSummary.totalWorkMinutes) }}</span>
                </div>
              </div>
            </div>

            <!-- シフト詳細 -->
            <div class="detail-section">
              <h3 class="section-title">シフト詳細</h3>
              <div v-for="(group, groupIndex) in workDaysByJob" :key="groupIndex" class="job-group">
                <!-- ジョブヘッダー -->
                <div v-if="group.job" class="job-group-header" :style="{ borderLeftColor: group.job.color }">
                  <span class="job-color-indicator" :style="{ backgroundColor: group.job.color }"></span>
                  <span class="job-name">{{ group.job.name }}</span>
                </div>
                <div v-else class="job-group-header no-job">
                  <span class="job-name">{{ calendarStore.mainStoreDisplayName }}</span>
                </div>

                <div class="shift-detail-list">
                  <div
                    v-for="day in group.workDays"
                    :key="`${day.date}_${day.jobId || 'none'}`"
                    class="shift-detail-item"
                  >
                    <span class="shift-date">{{ day.displayDate }}</span>
                    <span class="shift-time">{{ day.startTime }}〜{{ day.endTime }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 備考 -->
            <div v-if="selectedShift.remarks" class="detail-section">
              <h3 class="section-title">備考</h3>
              <p class="remarks-text">{{ selectedShift.remarks }}</p>
            </div>

            <!-- アクション -->
            <div class="action-section">
              <button @click="toggleFavorite" class="action-btn favorite-action-btn" :class="{ 'favorite-active': selectedShift.isFavorite }">
                <span class="action-icon">{{ selectedShift.isFavorite ? '⭐' : '☆' }}</span>
                <span class="action-label">{{ selectedShift.isFavorite ? 'お気に入り解除' : 'お気に入り' }}</span>
              </button>
              <button @click="createFromBase" class="action-btn create-btn">
                <span class="action-icon">📝</span>
                <span class="action-label">ベースに作成</span>
              </button>
              <button @click="shareShift" class="action-btn share-btn">
                <span class="action-icon">📤</span>
                <span class="action-label">共有</span>
              </button>
              <button @click="deleteShift" class="action-btn delete-btn">
                <span class="action-icon">🗑️</span>
                <span class="action-label">削除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 共有モーダル -->
    <Teleport to="body">
      <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
        <div class="modal-content share-modal" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">共有方法を選択</h2>
            <button @click="closeShareModal" class="close-btn">×</button>
          </div>

          <div class="modal-body">
            <div class="share-options">
              <button @click="shareViaLine" class="share-option-btn line-btn">
                <span class="share-icon">💬</span>
                <span class="share-label">LINE</span>
              </button>
              <button @click="shareViaEmail" class="share-option-btn email-btn">
                <span class="share-icon">✉️</span>
                <span class="share-label">メール</span>
              </button>
              <button @click="copyToClipboard" class="share-option-btn copy-btn">
                <span class="share-icon">📋</span>
                <span class="share-label">コピー</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTimeFormat } from '../composables/useTimeFormat'

const router = useRouter()
const { formatMinutesToHours } = useTimeFormat()

import { useCalendarStore } from '../stores/calendar'
import { useTimeRegisterStore } from '../stores/timeRegister'

const calendarStore = useCalendarStore()
const timeRegisterStore = useTimeRegisterStore()

interface SavedShift {
  workDays: any[]
  totalSummary: any
  remarks: string
  submittedAt: string
  isFavorite?: boolean
}

const savedShifts = ref<SavedShift[]>([])
const selectedShift = ref<SavedShift | null>(null)
const selectedIndex = ref<number>(-1)
const showShareModal = ref<boolean>(false)

// シフト詳細をjobIdでグループ化
const workDaysByJob = computed(() => {
  if (!selectedShift.value) return []

  const grouped: Record<string, { job: any; workDays: any[] }> = {}

  selectedShift.value.workDays.forEach((day) => {
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

const handleBack = () => {
  router.push('/calendar')
}

const goToCalendar = () => {
  router.push('/calendar')
}

const goToHome = () => {
  router.push('/')
}

const loadShifts = () => {
  const saved = localStorage.getItem('savedShifts')
  if (saved) {
    savedShifts.value = JSON.parse(saved).reverse() // 新しい順
  }
}

const getMonthLabel = (shift: SavedShift): string => {
  if (!shift.workDays || shift.workDays.length === 0) {
    return '不明'
  }
  // 最初の勤務日から月を取得
  const firstDate = shift.workDays[0].date
  const date = new Date(firstDate)
  return `${date.getFullYear()}年${date.getMonth() + 1}月のシフト`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return `${year}年${month}月${day}日 ${hours}時${minutes}分`
}

const openDetail = (shift: SavedShift, index: number) => {
  selectedShift.value = shift
  selectedIndex.value = savedShifts.value.length - 1 - index // reverse済みなのでインデックスを逆算
}

const closeDetail = () => {
  selectedShift.value = null
  selectedIndex.value = -1
}

const toggleFavorite = () => {
  if (!selectedShift.value) return

  selectedShift.value.isFavorite = !selectedShift.value.isFavorite

  // LocalStorageを更新
  const allShifts = JSON.parse(localStorage.getItem('savedShifts') || '[]')
  allShifts[selectedIndex.value] = selectedShift.value
  localStorage.setItem('savedShifts', JSON.stringify(allShifts))

  loadShifts()
}

const createFromBase = () => {
  if (!selectedShift.value) return

  // 現在のカレンダーの月を取得
  const currentYear = calendarStore.currentYear
  const currentMonth = calendarStore.currentMonth

  // 掛け持ち先名称の変更を検出
  const changedJobs: Array<{ oldName: string; newName: string }> = []
  selectedShift.value.workDays.forEach(savedDay => {
    if (savedDay.jobId !== undefined && savedDay.jobName) {
      const currentJob = calendarStore.getJobById(savedDay.jobId)
      if (currentJob && currentJob.name !== savedDay.jobName) {
        // 既に同じ組み合わせが存在しないか確認（重複を避ける）
        const exists = changedJobs.some(
          item => item.oldName === savedDay.jobName && item.newName === currentJob.name
        )
        if (!exists) {
          changedJobs.push({ oldName: savedDay.jobName, newName: currentJob.name })
        }
      }
    }
  })

  // 掛け持ち先名称が変更されている場合、確認ダイアログを表示
  if (changedJobs.length > 0) {
    let message = '以下の掛け持ち先の名称が変更されています：\n\n'
    changedJobs.forEach(job => {
      message += `・保存時: ${job.oldName} → 現在: ${job.newName}\n`
    })
    message += '\n現在の設定で復元しますがよろしいですか？'

    if (!confirm(message)) {
      return
    }
  }

  // 確認ダイアログを表示（キャンセル時は何もしない）
  const monthLabel = `${currentYear}年${currentMonth + 1}月`
  if (!confirm(`現在選択中の${monthLabel}に作成しますがよろしいですか？`)) {
    return
  }

  // 確認後にカレンダーの選択をクリア
  calendarStore.selectedDates.clear()
  calendarStore.dateJobMap = {}

  // 保存されたシフトの各勤務日について、同じ曜日・週番号の日付を見つける
  const datesToSelect: string[] = []
  const dateJobMap: Record<string, number[]> = {} // 日付 -> jobId[] のマッピング

  selectedShift.value.workDays.forEach(savedDay => {
    const targetDayOfWeek = savedDay.dayOfWeek
    const targetWeekNumber = savedDay.weekNumber
    const savedJobId = savedDay.jobId

    // 掛け持ち先が削除されていないか確認
    if (savedJobId !== undefined) {
      const jobExists = calendarStore.getJobById(savedJobId)
      if (!jobExists) {
        // 掛け持ち先が削除されている場合はスキップ
        return
      }
    }

    // 現在の月の全ての日付をチェック
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      // ローカルタイムゾーンで正しい日付文字列を生成
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const dayStr = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${dayStr}`
      const dayOfWeek = date.getDay()

      // 週番号を計算
      const firstDay = new Date(currentYear, currentMonth, 1)
      const firstDayOfWeek = firstDay.getDay()
      const firstSunday = new Date(firstDay)
      firstSunday.setDate(firstDay.getDate() - firstDayOfWeek)
      const diffTime = date.getTime() - firstSunday.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const weekNumber = Math.floor(diffDays / 7) + 1

      // 曜日と週番号が一致する場合、選択リストに追加
      if (dayOfWeek === targetDayOfWeek && weekNumber === targetWeekNumber) {
        // 過去の日付は除外
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (date >= today) {
          if (!datesToSelect.includes(dateString)) {
            datesToSelect.push(dateString)
          }

          // 掛け持ち情報を保持
          if (savedJobId !== undefined) {
            if (!dateJobMap[dateString]) {
              dateJobMap[dateString] = []
            }
            if (!dateJobMap[dateString].includes(savedJobId)) {
              dateJobMap[dateString].push(savedJobId)
            }
          }
        }
      }
    }
  })

  // メイン選択の日付を特定（掛け持ち情報がないor元々メインで選択されていた日付）
  const mainDates = new Set<string>()
  selectedShift.value!.workDays.forEach(workDay => {
    if (workDay.jobId === undefined) {
      const targetDayOfWeek = workDay.dayOfWeek
      const targetWeekNumber = workDay.weekNumber

      // 現在の月の全ての日付をチェック
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const dayStr = String(date.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${dayStr}`
        const dayOfWeek = date.getDay()

        // 週番号を計算
        const firstDay = new Date(currentYear, currentMonth, 1)
        const firstDayOfWeek = firstDay.getDay()
        const firstSunday = new Date(firstDay)
        firstSunday.setDate(firstDay.getDate() - firstDayOfWeek)
        const diffTime = date.getTime() - firstSunday.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const weekNumber = Math.floor(diffDays / 7) + 1

        // 曜日と週番号が一致する場合
        if (dayOfWeek === targetDayOfWeek && weekNumber === targetWeekNumber) {
          // 過去の日付は除外
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (date >= today) {
            mainDates.add(dateString)
          }
        }
      }
    }
  })

  // メイン選択のみをselectedDatesに追加
  mainDates.forEach(date => {
    calendarStore.selectedDates.add(date)
  })

  // 掛け持ち情報をdateJobMapに設定（各日付ごとに個別に設定）
  Object.keys(dateJobMap).forEach(dateString => {
    calendarStore.dateJobMap[dateString] = [...dateJobMap[dateString]]
  })

  // LocalStorageに保存（画面遷移時に消えないようにするため）
  calendarStore.saveJobsToLocalStorage()

  // 選択された日付でworkDaysを初期化（掛け持ち情報を含む）
  timeRegisterStore.initializeFromDates(datesToSelect, calendarStore.dateJobMap, calendarStore.selectedDates)

  // 保存されたシフトの時間を適用
  timeRegisterStore.workDays.forEach((workDay, index) => {
    // 同じ曜日・週番号・jobIdの保存されたシフトを探す
    const matchedSavedDay = selectedShift.value!.workDays.find(
      savedDay =>
        savedDay.dayOfWeek === workDay.dayOfWeek &&
        savedDay.weekNumber === workDay.weekNumber &&
        savedDay.jobId === workDay.jobId
    )

    if (matchedSavedDay) {
      // 時間を適用し、ベースから作成されたことをマーク
      timeRegisterStore.updateWorkDay(index, {
        startTime: matchedSavedDay.startTime,
        endTime: matchedSavedDay.endTime,
        isFromBase: true
      })
    }
  })

  // 備考欄も復元
  if (selectedShift.value!.remarks) {
    timeRegisterStore.remarks = selectedShift.value!.remarks
  }

  // 詳細モーダルを閉じて、カレンダー画面へ遷移
  closeDetail()
  router.push('/calendar')

  alert(`${datesToSelect.length}日のシフトをベースに作成しました`)
}

const generateShiftText = (): string => {
  if (!selectedShift.value) return ''

  // シフトデータをテキスト形式で生成
  let text = `【${getMonthLabel(selectedShift.value)}】\n\n`

  selectedShift.value.workDays.forEach(day => {
    text += `${day.displayDate}: ${day.startTime}〜${day.endTime}\n`
  })

  text += `\n【合計】\n`
  text += `勤務日数: ${selectedShift.value.totalSummary.workDays}日\n`
  text += `総勤務時間: ${formatMinutesToHours(selectedShift.value.totalSummary.totalWorkMinutes)}\n`

  if (selectedShift.value.remarks) {
    text += `\n【備考】\n${selectedShift.value.remarks}\n`
  }

  return text
}

const shareShift = () => {
  if (!selectedShift.value) return
  showShareModal.value = true
}

const closeShareModal = () => {
  showShareModal.value = false
}

const shareViaLine = () => {
  const text = generateShiftText()
  const url = `https://line.me/R/share?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
  closeShareModal()
}

const shareViaEmail = () => {
  const text = generateShiftText()
  const subject = encodeURIComponent(getMonthLabel(selectedShift.value!))
  const body = encodeURIComponent(text)
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`
  window.location.href = mailtoLink
  closeShareModal()
}

const copyToClipboard = () => {
  const text = generateShiftText()
  navigator.clipboard.writeText(text)
    .then(() => {
      alert('シフト情報をコピーしました')
      closeShareModal()
    })
    .catch(err => {
      console.error('コピーに失敗:', err)
      alert('コピーに失敗しました')
    })
}

const deleteShift = () => {
  if (!selectedShift.value) return

  if (!confirm('この提出記録を削除してもよろしいですか？')) {
    return
  }

  // LocalStorageから削除
  const allShifts = JSON.parse(localStorage.getItem('savedShifts') || '[]')
  allShifts.splice(selectedIndex.value, 1)
  localStorage.setItem('savedShifts', JSON.stringify(allShifts))

  closeDetail()
  loadShifts()
}

onMounted(() => {
  loadShifts()
})
</script>

<style scoped>
.history-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.3);
}

.history-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.back-icon {
  font-size: 1.5rem;
  color: white;
}

.history-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.spacer {
  width: 40px;
}

.history-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

/* 空状態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
}

.empty-subtext {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.empty-btn {
  padding: 0.875rem 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.empty-btn:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.calendar-btn {
  color: #667eea;
}

.home-btn {
  color: #764ba2;
}

/* 記録一覧 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.favorite-star {
  color: #fbbf24;
  margin-right: 0.25rem;
}

.card-arrow {
  font-size: 1.25rem;
  color: #667eea;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.75rem 0;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-label {
  font-size: 0.875rem;
  color: #666;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.job-group {
  margin-bottom: 1rem;
}

.job-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 6px;
  border-left: 3px solid;
  font-weight: bold;
  font-size: 0.9rem;
}

.job-group-header.no-job {
  border-left-color: #9ca3af;
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(209, 213, 219, 0.1));
}

.job-color-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

.job-name {
  font-size: 0.9rem;
  color: #333;
}

.shift-detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.shift-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.shift-date {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.shift-time {
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 600;
}

.remarks-text {
  font-size: 0.875rem;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 8px;
}

.action-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 1.5rem;
}

.action-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.favorite-action-btn:hover {
  border-color: #fbbf24;
  background: #fffbeb;
}

.favorite-active {
  border-color: #fbbf24 !important;
  background: #fef3c7 !important;
}

.favorite-active .action-label {
  color: #92400e;
}

.delete-btn:hover {
  border-color: #ef4444;
  background: #fef2f2;
}

.delete-btn:hover .action-label {
  color: #ef4444;
}

/* 共有モーダル */
.share-modal {
  max-width: 350px;
}

.share-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.share-option-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.share-option-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateX(5px);
}

.share-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.share-label {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.line-btn:hover {
  border-color: #06c755;
  background: #f0fdf4;
}

.email-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.copy-btn:hover {
  border-color: #8b5cf6;
  background: #faf5ff;
}
</style>
