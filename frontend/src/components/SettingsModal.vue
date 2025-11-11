<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click="emit('close')">
      <div class="modal-content settings-modal" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">設定</h2>
          <button @click="emit('close')" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <!-- メイン店舗の名前設定 -->
          <div class="settings-section">
            <h3 class="section-title">メイン店舗の名前</h3>
            <div class="name-setting">
              <input
                v-model="mainStoreName"
                @blur="updateMainStoreName"
                @keyup.enter="updateMainStoreName"
                type="text"
                class="name-input"
                placeholder="メイン店舗の名前を入力"
                maxlength="20"
              />
            </div>
            <p class="settings-note">※ シフト提出時などに表示される名前です</p>
          </div>

          <!-- メイン店舗のデフォルト時刻設定 -->
          <div class="settings-section">
            <h3 class="section-title">メイン店舗のデフォルト時刻</h3>

            <!-- 開始時刻 -->
            <div class="time-setting">
              <label class="time-label">開始時刻</label>
              <div class="time-display" @click="openTimePicker('main')">
                {{ displayMainStartTime }}
                <span class="edit-icon">✎</span>
              </div>
            </div>

            <!-- 終了時刻 -->
            <div class="time-setting">
              <label class="time-label">終了時刻</label>
              <div class="time-display" @click="openTimePicker('main')">
                {{ displayMainEndTime }}
                <span class="edit-icon">✎</span>
              </div>
            </div>

            <p class="settings-note">※ 一括設定の初期値として使用されます</p>
          </div>

          <!-- 掛け持ち先の設定 -->
          <div v-for="job in activeJobs" :key="job.id" class="settings-section">
            <h3 class="section-title" :style="{ borderBottomColor: job.color }">
              {{ job.name }}の設定
            </h3>

            <!-- 名前編集 -->
            <div class="name-setting">
              <label class="time-label">名前</label>
              <input
                :value="job.name"
                @blur="(e) => updateJobName(job.id, (e.target as HTMLInputElement).value)"
                @keyup.enter="(e) => updateJobName(job.id, (e.target as HTMLInputElement).value)"
                type="text"
                class="name-input"
                placeholder="掛け持ち先の名前を入力"
                maxlength="20"
              />
            </div>

            <!-- 開始時刻 -->
            <div class="time-setting">
              <label class="time-label">開始時刻</label>
              <div class="time-display" @click="openTimePicker(job.id)">
                {{ getDisplayStartTime(job.id) }}
                <span class="edit-icon">✎</span>
              </div>
            </div>

            <!-- 終了時刻 -->
            <div class="time-setting">
              <label class="time-label">終了時刻</label>
              <div class="time-display" @click="openTimePicker(job.id)">
                {{ getDisplayEndTime(job.id) }}
                <span class="edit-icon">✎</span>
              </div>
            </div>

            <p class="settings-note">※ この掛け持ち先の一括設定の初期値として使用されます</p>
          </div>

          <!-- 履歴管理 -->
          <div class="settings-section">
            <h3 class="section-title">履歴管理</h3>
            <button @click="deleteNonFavorites" class="action-btn delete-history-btn">
              <span class="action-icon">🗑️</span>
              <span class="action-label">お気に入り以外を削除</span>
            </button>
            <p class="settings-note">※ ⭐お気に入りは残ります</p>
          </div>

          <!-- キャッシュ管理 -->
          <div class="settings-section">
            <h3 class="section-title">キャッシュ管理</h3>
            <button @click="clearCache" class="action-btn clear-cache-btn">
              <span class="action-icon">🔄</span>
              <span class="action-label">全てのキャッシュをクリア</span>
            </button>
            <p class="settings-note">※ 掛け持ち設定、過去のシフト、デフォルト時刻などが削除されます</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 時刻選択モーダル -->
    <div v-if="showTimePicker" class="modal-overlay" @click="closeTimePicker" @touchmove.prevent>
      <div class="modal-content time-picker-modal" @click.stop>
        <h3 class="modal-title">{{ currentEditTargetName }}</h3>

        <!-- 開始時間 -->
        <div class="modal-section">
          <div class="modal-section-header">
            <label class="modal-label">開始時間</label>
            <div class="toggle-switch">
              <input type="checkbox" id="startPeriodToggle" v-model="startPm" class="toggle-input">
              <label for="startPeriodToggle" class="toggle-label">
                <span class="toggle-text-am">午前</span>
                <span class="toggle-text-pm">午後</span>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- 時間選択（24時間制：午前0-11、午後12-23） -->
          <div class="hour-selector-row">
            <button
              v-for="hour in startHourButtons.slice(0, 6)"
              :key="'start-' + hour"
              class="hour-btn"
              :class="{ active: selectedStartHour === hour }"
              @click="selectStartHour(hour)"
            >
              {{ hour }}
            </button>
          </div>
          <div class="hour-selector-row">
            <button
              v-for="hour in startHourButtons.slice(6, 12)"
              :key="'start-' + hour"
              class="hour-btn"
              :class="{ active: selectedStartHour === hour }"
              @click="selectStartHour(hour)"
            >
              {{ hour }}
            </button>
          </div>

          <!-- 分選択 -->
          <div class="minute-selector-row">
            <button
              v-for="minute in [0, 15, 30, 45]"
              :key="'start-min-' + minute"
              class="minute-btn"
              :class="{ active: selectedStartMinute === minute }"
              @click="selectStartMinute(minute)"
            >
              {{ String(minute).padStart(2, '0') }}分
            </button>
          </div>

          <div class="time-preview">選択: <span>{{ formattedStartTime }}</span></div>
        </div>

        <!-- 終了時間 -->
        <div class="modal-section">
          <div class="modal-section-header">
            <label class="modal-label">終了時間</label>
            <div class="toggle-switch">
              <input type="checkbox" id="endPeriodToggle" v-model="endPm" class="toggle-input">
              <label for="endPeriodToggle" class="toggle-label">
                <span class="toggle-text-am">午前</span>
                <span class="toggle-text-pm">午後</span>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- 時間選択（24時間制：午前0-11、午後12-23） -->
          <div class="hour-selector-row">
            <button
              v-for="hour in endHourButtons.slice(0, 6)"
              :key="'end-' + hour"
              class="hour-btn"
              :class="{ active: selectedEndHour === hour }"
              @click="selectEndHour(hour)"
            >
              {{ hour }}
            </button>
          </div>
          <div class="hour-selector-row">
            <button
              v-for="hour in endHourButtons.slice(6, 12)"
              :key="'end-' + hour"
              class="hour-btn"
              :class="{ active: selectedEndHour === hour }"
              @click="selectEndHour(hour)"
            >
              {{ hour }}
            </button>
          </div>

          <!-- 分選択 -->
          <div class="minute-selector-row">
            <button
              v-for="minute in [0, 15, 30, 45]"
              :key="'end-min-' + minute"
              class="minute-btn"
              :class="{ active: selectedEndMinute === minute }"
              @click="selectEndMinute(minute)"
            >
              {{ String(minute).padStart(2, '0') }}分
            </button>
          </div>

          <div class="time-preview">選択: <span>{{ formattedEndTime }}</span></div>
        </div>

        <div class="modal-buttons">
          <button @click="closeTimePicker" class="btn-modal btn-secondary-modal">キャンセル</button>
          <button @click="applyTime" class="btn-modal btn-primary-modal">設定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTimeRegisterStore } from '../stores/timeRegister'
import { useCalendarStore } from '../stores/calendar'
import type { JobId } from '../types/calendar'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const timeRegisterStore = useTimeRegisterStore()
const calendarStore = useCalendarStore()

// アクティブなジョブ一覧
const activeJobs = computed(() => calendarStore.activeJobs)

// メイン店舗名
const mainStoreName = ref(calendarStore.mainStoreName || 'メイン店舗')

// メイン店舗名を更新
const updateMainStoreName = () => {
  const trimmedName = mainStoreName.value.trim()
  if (trimmedName) {
    calendarStore.setMainStoreName(trimmedName)
    calendarStore.saveMainStoreToLocalStorage()
  }
}

// 掛け持ち先の名前を更新
const updateJobName = (jobId: JobId, newName: string) => {
  const trimmedName = newName.trim()
  if (trimmedName) {
    calendarStore.updateJob(jobId, trimmedName)
  }
}

// デフォルト時刻の型定義
interface DefaultTimes {
  main: {
    startTime: string
    endTime: string
  }
  jobs: Partial<Record<JobId, {
    startTime: string
    endTime: string
  }>>
}

// デフォルト時刻（LocalStorageから読み込み、独立管理）
const loadDefaultTimes = (): DefaultTimes => {
  const saved = localStorage.getItem('defaultTimes')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // 古い形式（直接startTime/endTimeがある）の場合は新形式に変換
      if (parsed.startTime && parsed.endTime && !parsed.main) {
        return {
          main: {
            startTime: parsed.startTime,
            endTime: parsed.endTime
          },
          jobs: {}
        }
      }
      // 新形式の場合はそのまま使用（jobsがない場合は空オブジェクトで初期化）
      return {
        main: parsed.main || { startTime: '09:00', endTime: '18:00' },
        jobs: parsed.jobs || {}
      }
    } catch (e) {
      console.error('Failed to parse defaultTimes:', e)
    }
  }
  return {
    main: {
      startTime: '09:00',
      endTime: '18:00'
    },
    jobs: {}
  }
}

const defaultTimes = ref<DefaultTimes>(loadDefaultTimes())

// 現在編集中のターゲット（'main' または JobId）
const currentEditTarget = ref<'main' | JobId>('main')

// 時刻ピッカーの状態
const showTimePicker = ref(false)
const startPm = ref(false) // 午前=false（0-11）, 午後=true（12-23）
const endPm = ref(true)
const selectedStartHour = ref(9) // 0-23の範囲
const selectedStartMinute = ref(0) // 0, 15, 30, 45
const selectedEndHour = ref(18) // 0-23の範囲
const selectedEndMinute = ref(0) // 0, 15, 30, 45

// 編集中のターゲット名
const currentEditTargetName = computed(() => {
  if (currentEditTarget.value === 'main') {
    return 'メイン店舗のデフォルト時刻設定'
  }
  const job = activeJobs.value.find(j => j.id === currentEditTarget.value)
  return job ? `${job.name}のデフォルト時刻設定` : 'デフォルト時刻設定'
})

// メイン店舗の表示用時刻
const displayMainStartTime = computed(() => defaultTimes.value.main.startTime)
const displayMainEndTime = computed(() => defaultTimes.value.main.endTime)

// 掛け持ち先の開始時刻を取得（未設定ならメイン店舗と同じ）
const getDisplayStartTime = (jobId: JobId): string => {
  return defaultTimes.value.jobs[jobId]?.startTime || defaultTimes.value.main.startTime
}

// 掛け持ち先の終了時刻を取得（未設定ならメイン店舗と同じ）
const getDisplayEndTime = (jobId: JobId): string => {
  return defaultTimes.value.jobs[jobId]?.endTime || defaultTimes.value.main.endTime
}

// 開始時間ボタン配列（午前: 0-11、午後: 12-23）
const startHourButtons = computed(() => {
  if (startPm.value) {
    return [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
  } else {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  }
})

// 終了時間ボタン配列（午前: 0-11、午後: 12-23）
const endHourButtons = computed(() => {
  if (endPm.value) {
    return [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
  } else {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  }
})

// 選択中の開始時刻の表示
const formattedStartTime = computed(() => {
  const h = String(selectedStartHour.value).padStart(2, '0')
  const m = String(selectedStartMinute.value).padStart(2, '0')
  return `${h}:${m}`
})

// 選択中の終了時刻の表示
const formattedEndTime = computed(() => {
  const h = String(selectedEndHour.value).padStart(2, '0')
  const m = String(selectedEndMinute.value).padStart(2, '0')
  return `${h}:${m}`
})

// 時刻ピッカーを開く
const openTimePicker = (target: 'main' | JobId) => {
  currentEditTarget.value = target

  // 現在のデフォルト時刻を取得
  let startTime: string
  let endTime: string

  if (target === 'main') {
    startTime = defaultTimes.value.main.startTime
    endTime = defaultTimes.value.main.endTime
  } else {
    startTime = defaultTimes.value.jobs[target]?.startTime || defaultTimes.value.main.startTime
    endTime = defaultTimes.value.jobs[target]?.endTime || defaultTimes.value.main.endTime
  }

  const [startHourStr = '9', startMinuteStr = '0'] = startTime.split(':')
  const [endHourStr = '18', endMinuteStr = '0'] = endTime.split(':')

  const startHour = parseInt(startHourStr, 10)
  const startMinute = parseInt(startMinuteStr, 10)
  const endHour = parseInt(endHourStr, 10)
  const endMinute = parseInt(endMinuteStr, 10)

  selectedStartHour.value = startHour
  selectedStartMinute.value = startMinute
  startPm.value = startHour >= 12

  selectedEndHour.value = endHour
  selectedEndMinute.value = endMinute
  endPm.value = endHour >= 12

  showTimePicker.value = true
}

// 時刻ピッカーを閉じる
const closeTimePicker = () => {
  showTimePicker.value = false
}

// 開始時間選択
const selectStartHour = (hour: number) => {
  selectedStartHour.value = hour
}

const selectStartMinute = (minute: number) => {
  selectedStartMinute.value = minute
}

// 終了時間選択
const selectEndHour = (hour: number) => {
  selectedEndHour.value = hour
}

const selectEndMinute = (minute: number) => {
  selectedEndMinute.value = minute
}

// 時刻を適用
const applyTime = () => {
  const newStartTime = formattedStartTime.value
  const newEndTime = formattedEndTime.value

  // デフォルト時刻を更新
  if (currentEditTarget.value === 'main') {
    defaultTimes.value.main.startTime = newStartTime
    defaultTimes.value.main.endTime = newEndTime

    // メイン店舗の場合は一括設定にも反映
    timeRegisterStore.updateBulkSettings({
      startTime: newStartTime,
      endTime: newEndTime
    })
  } else {
    // 掛け持ち先の場合
    const target = currentEditTarget.value as JobId
    if (!defaultTimes.value.jobs[target]) {
      defaultTimes.value.jobs[target] = {
        startTime: newStartTime,
        endTime: newEndTime
      }
    } else {
      const jobTimes = defaultTimes.value.jobs[target]
      if (jobTimes) {
        jobTimes.startTime = newStartTime
        jobTimes.endTime = newEndTime
      }
    }
  }

  // LocalStorageに保存
  localStorage.setItem('defaultTimes', JSON.stringify(defaultTimes.value))

  closeTimePicker()
}

// お気に入り以外の履歴を削除
const deleteNonFavorites = () => {
  if (!confirm('お気に入り以外の履歴を削除してもよろしいですか？')) {
    return
  }

  const savedShifts = JSON.parse(localStorage.getItem('savedShifts') || '[]')
  const favorites = savedShifts.filter((shift: any) => shift.isFavorite)
  localStorage.setItem('savedShifts', JSON.stringify(favorites))

  alert(`${savedShifts.length - favorites.length}件の履歴を削除しました`)
}

const clearCache = () => {
  if (!confirm('全てのキャッシュをクリアしてもよろしいですか？\n\n以下のデータが削除されます：\n・掛け持ち設定\n・過去のシフト\n・デフォルト時刻\n・その他の設定')) {
    return
  }

  // LocalStorageをクリア
  localStorage.clear()

  alert('全てのキャッシュをクリアしました。\nページをリロードします。')

  // ページをリロード
  window.location.reload()
}

// 午前/午後切り替え時に時間を調整
watch(startPm, (newIsPm) => {
  if (newIsPm && selectedStartHour.value < 12) {
    selectedStartHour.value += 12
  } else if (!newIsPm && selectedStartHour.value >= 12) {
    selectedStartHour.value -= 12
  }
})

watch(endPm, (newIsPm) => {
  if (newIsPm && selectedEndHour.value < 12) {
    selectedEndHour.value += 12
  } else if (!newIsPm && selectedEndHour.value >= 12) {
    selectedEndHour.value -= 12
  }
})
</script>

<style scoped>
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
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.settings-modal .modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.time-picker-modal .modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #667eea;
  text-align: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  color: #999;
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 1.25rem;
}

.settings-section {
  margin-bottom: 1.5rem;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid #667eea;
}

.time-setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.time-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  justify-content: center;
}

.time-display:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.edit-icon {
  font-size: 0.875rem;
  color: #999;
}

.settings-note {
  font-size: 0.7rem;
  color: #999;
  margin: 0.5rem 0 0 0;
}

.name-setting {
  margin-bottom: 0.75rem;
}

.name-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.name-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.name-input::placeholder {
  color: #999;
  font-weight: 400;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.action-btn:hover {
  border-color: #ef4444;
  background: #fef2f2;
}

.clear-cache-btn {
  border-color: #3b82f6;
  color: #3b82f6;
}

.clear-cache-btn:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.action-icon {
  font-size: 1.125rem;
}

.action-label {
  font-weight: 600;
  color: #333;
  font-size: 12px;
}

/* Time Picker Modal */
.time-picker-modal {
  max-width: 450px;
  width: 100%;
  padding: 1rem;
}

.modal-section {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.modal-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #333;
}

/* トグルスイッチ */
.toggle-switch {
  position: relative;
  display: inline-block;
}

.toggle-input {
  display: none;
}

.toggle-label {
  display: flex;
  align-items: center;
  background: #e0e0e0;
  border-radius: 16px;
  padding: 2px;
  cursor: pointer;
  position: relative;
  width: 85px;
  height: 28px;
}

.toggle-text-am,
.toggle-text-pm {
  flex: 1;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 2;
  transition: color 0.3s ease;
  color: #666;
}

.toggle-input:checked + .toggle-label .toggle-text-am {
  color: #666;
}

.toggle-input:checked + .toggle-label .toggle-text-pm {
  color: white;
}

.toggle-input:not(:checked) + .toggle-label .toggle-text-am {
  color: white;
}

.toggle-input:not(:checked) + .toggle-label .toggle-text-pm {
  color: #666;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 40px;
  height: 24px;
  background: #ff9800;
  border-radius: 14px;
  transition: all 0.3s ease;
}

.toggle-input:checked + .toggle-label .toggle-slider {
  transform: translateX(41px);
  background: #2196F3;
}

/* 時間選択ボタン */
.hour-selector-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  min-width: 0;
}

.hour-btn {
  padding: 0.5rem 0.2rem;
  border: 1.5px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 0;
  overflow: hidden;
}

.hour-btn:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.hour-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  transform: scale(1.05);
}

/* 分選択ボタン */
.minute-selector-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  min-width: 0;
}

.minute-btn {
  padding: 0.5rem 0.2rem;
  border: 1.5px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 0;
  overflow: hidden;
}

.minute-btn:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.minute-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  transform: scale(1.05);
}

.time-preview {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
}

.time-preview span {
  font-weight: 700;
  color: #667eea;
  font-size: 1rem;
}

.modal-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  width: 100%;
}

.btn-modal {
  padding: 0.7rem 0.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 0;
}

.btn-primary-modal {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary-modal:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary-modal {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary-modal:hover {
  background: #e0e0e0;
}
</style>
