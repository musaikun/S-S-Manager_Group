<template>
  <div class="time-register-view">
    <div class="time-register-container">
      <!-- 一括設定セクション（アコーディオン） -->
      <div class="bulk-settings-section">
        <div class="section-header accordion-header" @click="toggleBulkAccordion">
          <h2>一括設定</h2>
          <span class="accordion-icon">{{ isBulkAccordionOpen ? '▲' : '▼' }}</span>
        </div>
        <transition name="accordion">
          <div v-show="isBulkAccordionOpen" class="bulk-settings-content">
            <div class="bulk-time-settings">
              <div class="bulk-time-item">
                <button @click="openBulkTimeModal('start')" class="bulk-time-btn">
                  開始時刻設定
                </button>
                <div class="bulk-time-display" @click="openBulkTimeModal('start')">
                  {{ bulkSettings.startTime }}
                </div>
              </div>
              <div class="bulk-time-item">
                <button @click="openBulkTimeModal('end')" class="bulk-time-btn">
                  終了時刻設定
                </button>
                <div class="bulk-time-display" @click="openBulkTimeModal('end')">
                  {{ bulkSettings.endTime }}
                </div>
              </div>
            </div>

            <!-- 週選択 -->
            <div class="week-selector">
              <div class="week-label">週を選択</div>
              <div class="week-buttons">
                <button
                  v-for="week in 6"
                  :key="week"
                  @click="toggleWeek(week, $event)"
                  class="week-btn"
                  :class="{
                    active: selectedWeeks.includes(week),
                    disabled: !isWeekAvailable(week)
                  }"
                  :disabled="!isWeekAvailable(week)"
                >
                  第{{ week }}週
                </button>
              </div>
            </div>

            <!-- 曜日選択 -->
            <div class="weekday-selector">
              <div class="weekday-label">曜日を選択</div>
              <div class="weekday-buttons">
                <button
                  v-for="day in weekdayOptions"
                  :key="day.value"
                  @click="toggleWeekday(day.value, $event)"
                  class="weekday-btn"
                  :class="{
                    active: selectedWeekdays.includes(day.value),
                    sunday: day.value === 0,
                    saturday: day.value === 6
                  }"
                >
                  {{ day.label }}
                </button>
              </div>
            </div>

            <div class="bulk-actions">
              <button @click="handleBulkApplyAll('both')" class="bulk-btn bulk-btn-all">
                {{ bulkApplyBothLabel }}
              </button>
              <button @click="handleBulkApplyAll('start')" class="bulk-btn bulk-btn-all">
                {{ bulkApplyStartLabel }}
              </button>
              <button @click="handleBulkApplyAll('end')" class="bulk-btn bulk-btn-all">
                {{ bulkApplyEndLabel }}
              </button>
            </div>

            <!-- 説明テキスト -->
            <div class="bulk-note">
              ※週・曜日を選択すると該当カードがマークされます
            </div>
          </div>
        </transition>
      </div>

      <!-- 時間表示凡例 -->
      <div class="time-display-legend">
        <div class="legend-label">※時間表示:</div>
        <div class="legend-items">
          <div class="legend-item default-style">
            <div class="legend-card">デフォルト</div>
          </div>
          <div class="legend-item custom-style">
            <div class="legend-card">個別設定</div>
          </div>
          <div class="legend-item bulk-style">
            <div class="legend-card">一括設定</div>
          </div>
          <div class="legend-item base-style">
            <div class="legend-card">過去ベース</div>
          </div>
        </div>
      </div>

      <!-- 個別設定ヘッダー -->
      <div class="individual-settings-header">
        <h3>日別に設定</h3>
      </div>

      <!-- ジョブごとにグループ分けした勤務日カードリスト -->
      <div v-for="(group, groupIndex) in workDaysByJob" :key="groupIndex" class="job-group">
        <!-- ジョブヘッダー -->
        <div v-if="group.job" class="job-group-header" :style="{ borderLeftColor: group.job.color }">
          <span class="job-color-indicator" :style="{ backgroundColor: group.job.color }"></span>
          <span class="job-name">{{ group.job.name }}</span>
          <button
            v-if="jobHasConflicts(group.job.id)"
            @click="openConflictModal(group.job.id)"
            class="conflict-warning-btn"
            title="時間重複あり - クリックして詳細を表示"
          >
            ⚠️
          </button>
        </div>
        <div v-else class="job-group-header no-job">
          <span class="job-name">掛け持ちなし</span>
        </div>

        <!-- 勤務日カードリスト -->
        <div class="work-days-list">
          <div
            v-for="(workDay, index) in group.workDays"
            :key="`${workDay.date}_${workDay.jobId || 'none'}`"
            class="work-day-card"
            :class="[
              getCardBackgroundClass(workDay),
              getBorderClass(workDay),
              {
                removed: workDay.isRemoved,
                highlighted: isHighlighted(workDay),
                conflict: hasConflict(workDay)
              }
            ]"
          >
            <div class="card-main" @click="handleCardClick($event, findWorkDayIndex(workDay))">
              <div class="card-content-single-line">
                <div class="card-date-section">
                  <span class="card-date" :class="{
                    'saturday': workDay.dayOfWeek === 6,
                    'sunday': workDay.dayOfWeek === 0,
                    'holiday': isHoliday(workDay.date)
                  }">{{ workDay.displayDate }}</span>
                  <span class="card-week">第{{ workDay.weekNumber }}週</span>
                </div>
                <div class="card-time-section">
                  <span class="time-value" :class="getStartTimeClass(workDay)">{{ workDay.startTime }}</span>
                  <span class="time-separator">〜</span>
                  <span class="time-value" :class="getEndTimeClass(workDay)">{{ workDay.endTime }}</span>
                </div>
                <div class="card-hours">
                  <span class="hours-icon">💼</span>
                  <span class="hours-text">{{ formatWorkTime(workDay) }}</span>
                </div>
              </div>
            </div>
            <button
              @click.stop="toggleRemoveDay(findWorkDayIndex(workDay))"
              class="card-action-btn"
              :class="{ restore: workDay.isRemoved }"
            >
              <span v-if="!workDay.isRemoved" class="remove-icon">×</span>
              <span v-else class="restore-icon">↶</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 合計統計 -->
      <div class="total-summary-section">
        <div class="summary-card">
          <!-- 休憩時間設定 -->
          <div class="summary-break-setting">
            <label class="break-time-toggle-inline">
              <input
                type="checkbox"
                :checked="includeBreak"
                @change="handleBreakToggle"
              />
              <span>休憩時間を表示</span>
              <button @click="showBreakHelp" class="help-btn-small">?</button>
            </label>
          </div>

          <div class="summary-row">
            <span class="summary-label">勤務日数:</span>
            <span class="summary-value">{{ totalSummary.workDays }}日</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">総勤務時間:</span>
            <span class="summary-value">{{ formatMinutesToHours(totalSummary.totalWorkMinutes) }}</span>
          </div>
          <div v-if="includeBreak" class="summary-row">
            <span class="summary-label">休憩時間:</span>
            <span class="summary-value">{{ formatMinutesToHours(totalSummary.totalBreakMinutes) }}</span>
          </div>
          <div v-if="includeBreak" class="summary-row total">
            <span class="summary-label">実働時間:</span>
            <span class="summary-value highlight">
              {{ formatMinutesToHours(totalSummary.totalActualWorkMinutes) }}
            </span>
          </div>

          <!-- 給与簡易概算 -->
          <div class="salary-calc-section">
            <div class="salary-input-row">
              <input
                type="number"
                v-model.number="hourlyWage"
                class="wage-input"
                min="0"
                step="10"
                placeholder="時給（円）"
              />
              <button @click="calculateSalary" class="salary-calc-btn">
                給与の簡易概算
              </button>
            </div>

            <!-- 給与計算結果 -->
            <div v-if="calculatedSalary > 0" class="salary-result">
              <div class="salary-result-row">
                <span class="salary-result-label">概算給与:</span>
                <span class="salary-result-value">{{ calculatedSalary.toLocaleString() }}円</span>
              </div>
              <div class="salary-result-note">
                ※ 深夜給（22:00～05:00は25%増）を含む概算です。<br>
                ※ 各種税金や社会保険料などの控除を考慮していません。
              </div>
            </div>
          </div>

          <!-- 備考欄 -->
          <div class="remarks-section-time">
            <label for="remarks-time" class="remarks-label-time">備考</label>
            <textarea
              id="remarks-time"
              v-model="timeRegisterStore.remarks"
              class="remarks-input-time"
              placeholder="未ログインの場合、氏名の情報は含まれないので入力しましょう"
              rows="4"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- 確認モーダル（Teleportでbody直下に配置） -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal-overlay" @click="showConfirmModal = false" @touchmove.prevent>
        <div class="modal-content confirm-modal" @click.stop>
          <h3 class="modal-title">{{ confirmModalData.title }}</h3>
          <p class="modal-message" v-html="confirmModalData.message"></p>
          <div class="modal-options">
            <button
              v-for="option in confirmModalData.options"
              :key="option.value"
              @click="confirmModalData.onConfirm(option.value)"
              class="option-btn"
              :class="{ primary: option.value === 'apply' || option.value === 'all' }"
              v-html="option.label"
            >
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ヘルプモーダル（Teleportでbody直下に配置） -->
    <Teleport to="body">
      <div v-if="showHelpModal" class="modal-overlay" @click="showHelpModal = false" @touchmove.prevent>
        <div class="modal-content help-modal" @click.stop>
          <h3 class="modal-title">休憩時間のルール</h3>
          <div class="help-content">
            <div class="help-row">
              <span class="help-label">6時間未満:</span>
              <span class="help-value">休憩なし</span>
            </div>
            <div class="help-row">
              <span class="help-label">6時間以上8時間未満:</span>
              <span class="help-value">45分</span>
            </div>
            <div class="help-row">
              <span class="help-label">8時間以上:</span>
              <span class="help-value">60分</span>
            </div>
            <div class="help-note">
              ※ 労働基準法 第34条の要点（休憩の原則）を参考にしています。
            </div>
          </div>
          <button @click="showHelpModal = false" class="close-btn">閉じる</button>
        </div>
      </div>
    </Teleport>

    <!-- 時間重複詳細モーダル -->
    <Teleport to="body">
      <div v-if="showConflictModal && selectedJobForConflict" class="modal-overlay" @click="closeConflictModal" @touchmove.prevent>
        <div class="modal-content conflict-modal" @click.stop>
          <h3 class="modal-title">⚠️ 時間重複の詳細</h3>
          <div class="conflict-content">
            <div class="conflict-job-info">
              <span class="conflict-job-label">対象:</span>
              <span class="conflict-job-name">{{ calendarStore.getJobById(selectedJobForConflict)?.name }}</span>
            </div>

            <div class="conflict-list">
              <div
                v-for="(conflict, index) in getConflictsForJob(selectedJobForConflict)"
                :key="index"
                class="conflict-item"
              >
                <div class="conflict-date">{{ conflict.date }}</div>
                <div class="conflict-details">
                  <div class="conflict-job-row">
                    <span class="job-badge" :style="{ backgroundColor: calendarStore.getJobById(conflict.jobId1)?.color }">
                      {{ calendarStore.getJobById(conflict.jobId1)?.name }}
                    </span>
                    <span class="time-range">{{ conflict.job1TimeSlot.startTime }} 〜 {{ conflict.job1TimeSlot.endTime }}</span>
                  </div>
                  <div class="conflict-overlap-indicator">
                    <span class="overlap-icon">⚠️</span>
                    <span class="overlap-text">重複時間: {{ formatOverlapTime(conflict.overlap) }}</span>
                  </div>
                  <div class="conflict-job-row">
                    <span class="job-badge" :style="{ backgroundColor: calendarStore.getJobById(conflict.jobId2)?.color }">
                      {{ calendarStore.getJobById(conflict.jobId2)?.name }}
                    </span>
                    <span class="time-range">{{ conflict.job2TimeSlot.startTime }} 〜 {{ conflict.job2TimeSlot.endTime }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button @click="closeConflictModal" class="close-btn">閉じる</button>
        </div>
      </div>
    </Teleport>

    <!-- 時刻選択モーダル（Teleportでbody直下に配置） -->
    <Teleport to="body">
      <div v-if="showTimeModal" class="modal-overlay" @click="cancelTimeEdit" @touchmove.prevent>
      <div class="modal-content time-picker-modal" @click.stop>
        <!-- 一括設定モードのヘッダー -->
        <h3 class="modal-title" v-if="isBulkMode">
          {{ bulkTimeType === 'start' ? '開始時刻設定' : '終了時刻設定' }}
        </h3>
        <!-- 個別設定モードのヘッダー -->
        <h3 class="modal-title" v-else-if="currentEditIndex !== null && workDays[currentEditIndex]">
          {{ workDays[currentEditIndex].displayDate }}
        </h3>

        <!-- 開始時間 -->
        <div class="modal-section" v-if="!isBulkMode || bulkTimeType === 'start'">
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
        <div class="modal-section" v-if="!isBulkMode || bulkTimeType === 'end'">
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

        <div class="modal-work-hours" v-if="!isBulkMode">
          勤務時間: <span>{{ calculatedWorkHours }}</span>
        </div>

        <div class="modal-buttons">
          <button @click="cancelTimeEdit" class="btn-modal btn-secondary-modal">キャンセル</button>
          <button @click="confirmTimeEdit" class="btn-modal btn-primary-modal">設定</button>
        </div>
      </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, provide } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCalendarStore } from '../stores/calendar'
import { useTimeRegisterStore } from '../stores/timeRegister'
import { useTimeFormat } from '../composables/useTimeFormat'
import { useTimeCalculation } from '../composables/useTimeCalculation'
import { useHolidays } from '../composables/useHolidays'
import type { BulkApplyType, WorkDay, ConflictInfo, TimeOverlap } from '../types/timeRegister'
import type { JobId } from '../types/calendar'

const route = useRoute()
const calendarStore = useCalendarStore()
const timeRegisterStore = useTimeRegisterStore()
const { isHoliday } = useHolidays()

const { bulkSettings, includeBreak, workDays } = storeToRefs(timeRegisterStore)
const { totalSummary } = storeToRefs(timeRegisterStore)

// 重複情報をストアから取得
const timeConflicts = computed(() => timeRegisterStore.timeConflicts)

const { formatMinutesToHours } = useTimeFormat()
const { calculateBreakTime, getWeeksInMonth } = useTimeCalculation()

// アコーディオンの開閉状態
const isBulkAccordionOpen = ref(false) // デフォルトで閉じている

// 週選択の状態（デフォルトは何も選択されていない）
const selectedWeeks = ref<number[]>([])

// 曜日選択の状態（デフォルトは何も選択されていない）
const selectedWeekdays = ref<number[]>([])

// 現在の月で利用可能な週を取得
const availableWeeks = computed(() => {
  if (workDays.value.length === 0) return []
  const firstDate = new Date(workDays.value[0].date)
  const year = firstDate.getFullYear()
  const month = firstDate.getMonth()
  const totalWeeks = getWeeksInMonth(year, month)
  return Array.from({ length: totalWeeks }, (_, i) => i + 1)
})

// 指定週が利用可能かチェック
const isWeekAvailable = (week: number) => {
  return availableWeeks.value.includes(week)
}

// 曜日オプション
const weekdayOptions = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' }
]

// 時刻選択モーダルの状態（24時間制）
const showTimeModal = ref(false)
const currentEditIndex = ref<number | null>(null)
const isBulkMode = ref(false) // 一括設定モードかどうか
const bulkTimeType = ref<'start' | 'end'>('start') // 一括設定の種類（開始 or 終了）
const startPm = ref(false) // 午前=false（0-11）, 午後=true（12-23）
const endPm = ref(true)
const selectedStartHour = ref(9) // 0-23の範囲
const selectedStartMinute = ref(0) // 0, 15, 30, 45
const selectedEndHour = ref(18) // 0-23の範囲
const selectedEndMinute = ref(0) // 0, 15, 30, 45

// 確認モーダルの状態
const showConfirmModal = ref(false)
const confirmModalData = ref({
  title: '',
  message: '',
  options: [] as { label: string; value: string }[],
  onConfirm: (value: string) => {}
})

// ヘルプモーダルの状態
const showHelpModal = ref(false)

// 重複詳細モーダルの状態
const showConflictModal = ref(false)
const selectedJobForConflict = ref<JobId | null>(null)

// 給与計算の状態
const hourlyWage = ref<number>(1000) // 時給（デフォルト1000円）
const calculatedSalary = ref<number>(0)

// モーダル状態をPageSliderに提供（スライド制御用）
provide('isModalOpen', computed(() => showTimeModal.value || showConfirmModal.value || showHelpModal.value || showConflictModal.value))

// アクティブな勤務日（削除されていない）
const activeWorkDays = computed(() => {
  return workDays.value
})

// ジョブごとにグループ化されたWorkDays
const workDaysByJob = computed(() => {
  const grouped: Record<string, { job: any; workDays: WorkDay[] }> = {}

  workDays.value.forEach((day) => {
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

// workDaysの全体配列の中からインデックスを検索
const findWorkDayIndex = (workDay: WorkDay): number => {
  return workDays.value.findIndex((wd) => wd.date === workDay.date && wd.jobId === workDay.jobId)
}

// 選択条件に該当する勤務日かどうかを判定
const isHighlighted = (workDay: WorkDay) => {
  // 週または曜日が選択されていない場合はハイライトしない
  if (selectedWeeks.value.length === 0 && selectedWeekdays.value.length === 0) {
    return false
  }

  // 週の条件チェック
  const weekMatch = selectedWeeks.value.length === 0 || selectedWeeks.value.includes(workDay.weekNumber)
  // 曜日の条件チェック
  const weekdayMatch = selectedWeekdays.value.length === 0 || selectedWeekdays.value.includes(workDay.dayOfWeek)

  return weekMatch && weekdayMatch
}

// 特定のWorkDayに時間重複があるかチェック
const hasConflict = (workDay: WorkDay): boolean => {
  if (!workDay.jobId) return false

  return timeConflicts.value.some(conflict =>
    conflict.date === workDay.date &&
    (conflict.jobId1 === workDay.jobId || conflict.jobId2 === workDay.jobId)
  )
}

// 特定のジョブに重複があるかチェック
const jobHasConflicts = (jobId: JobId | undefined): boolean => {
  if (!jobId) return false

  return timeConflicts.value.some(conflict =>
    conflict.jobId1 === jobId || conflict.jobId2 === jobId
  )
}

// 特定のジョブに関連する重複情報を取得
const getConflictsForJob = (jobId: JobId | undefined): ConflictInfo[] => {
  if (!jobId) return []

  return timeConflicts.value.filter(conflict =>
    conflict.jobId1 === jobId || conflict.jobId2 === jobId
  )
}

// 重複詳細モーダルを開く
const openConflictModal = (jobId: JobId) => {
  selectedJobForConflict.value = jobId
  showConflictModal.value = true
}

// 重複詳細モーダルを閉じる
const closeConflictModal = () => {
  showConflictModal.value = false
  selectedJobForConflict.value = null
}

// 重複時間を分から時刻形式に変換（例: 540分 → "9:00"）
const minutesToTimeString = (minutes: number): string => {
  const adjustedMinutes = minutes % (24 * 60) // 24時間以内に正規化
  const hours = Math.floor(adjustedMinutes / 60)
  const mins = adjustedMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// 重複時間をフォーマット
const formatOverlapTime = (overlap: TimeOverlap): string => {
  const startTime = minutesToTimeString(overlap.startMinutes)
  const endTime = minutesToTimeString(overlap.endMinutes)
  const duration = formatMinutesToHours(overlap.durationMinutes)
  return `${startTime} 〜 ${endTime} (${duration})`
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

// 選択された開始時刻をフォーマット（24時間制なのでそのまま）
const formattedStartTime = computed(() => {
  return `${String(selectedStartHour.value).padStart(2, '0')}:${String(selectedStartMinute.value).padStart(2, '0')}`
})

// 選択された終了時刻をフォーマット（24時間制なのでそのまま）
const formattedEndTime = computed(() => {
  return `${String(selectedEndHour.value).padStart(2, '0')}:${String(selectedEndMinute.value).padStart(2, '0')}`
})

// 計算された勤務時間
const calculatedWorkHours = computed(() => {
  const { calculateWorkMinutes } = useTimeCalculation()
  const minutes = calculateWorkMinutes(formattedStartTime.value, formattedEndTime.value)
  return formatMinutesToHours(minutes)
})

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

// カードの背景色クラスを取得
const getCardBackgroundClass = (workDay: WorkDay) => {
  // 個別設定が存在する場合は常に黄色（最優先）
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') {
    return 'custom-style'
  }
  // 過去ベースの設定がある場合
  if (workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base') {
    return 'base-style'
  }
  // 一括設定がある場合
  if (workDay.startTimeSetBy === 'bulk' || workDay.endTimeSetBy === 'bulk') {
    return 'bulk-style'
  }
  // デフォルトの場合
  return 'default-style'
}

// 開始時刻のテキスト色クラスを取得
const getStartTimeClass = (workDay: WorkDay) => {
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

// 左ボーダーの色配列を取得（最大2色）
const getBorderColors = (workDay: WorkDay) => {
  const colors = new Set<string>()
  const defaultTimes = loadDefaultTimes()

  // 設定方法を収集
  if (workDay.startTimeSetBy === 'custom' || workDay.endTimeSetBy === 'custom') {
    colors.add('custom')
  }
  if (workDay.startTimeSetBy === 'bulk' || workDay.endTimeSetBy === 'bulk') {
    colors.add('bulk')
  }
  if (workDay.startTimeSetBy === 'base' || workDay.endTimeSetBy === 'base') {
    colors.add('base')

    // baseの場合、デフォルト時刻と同じかチェック
    const startIsDefault = workDay.startTime === defaultTimes.startTime && workDay.startTimeSetBy === 'base'
    const endIsDefault = workDay.endTime === defaultTimes.endTime && workDay.endTimeSetBy === 'base'

    if (startIsDefault || endIsDefault) {
      colors.add('default')
    }
  }

  // 優先順位: custom → base → bulk → default
  const priority = ['custom', 'base', 'bulk', 'default']
  const result = priority.filter(color => colors.has(color))

  // 最大2色まで
  return result.slice(0, 2)
}

// ボーダー用のクラスを生成
const getBorderClass = (workDay: WorkDay) => {
  const colors = getBorderColors(workDay)
  if (colors.length === 0) {
    return 'border-default'
  }
  if (colors.length === 1) {
    return `border-${colors[0]}`
  }
  // 2色の場合
  return `border-${colors[0]}-${colors[1]}`
}

// 午前/午後トグル切替時の時間調整
watch(startPm, (isPm) => {
  // 午前（0-11）と午後（12-23）の範囲をチェック
  if (isPm && selectedStartHour.value < 12) {
    selectedStartHour.value = selectedStartHour.value + 12
  } else if (!isPm && selectedStartHour.value >= 12) {
    selectedStartHour.value = selectedStartHour.value - 12
  }
})

watch(endPm, (isPm) => {
  // 午前（0-11）と午後（12-23）の範囲をチェック
  if (isPm && selectedEndHour.value < 12) {
    selectedEndHour.value = selectedEndHour.value + 12
  } else if (!isPm && selectedEndHour.value >= 12) {
    selectedEndHour.value = selectedEndHour.value - 12
  }
})

// 初期化関数
const initializeWorkDays = () => {
  const selectedDates = calendarStore.selectedDatesArray
  const dateJobMap = calendarStore.dateJobMap

  if (selectedDates.length === 0) {
    // 選択がなくなった場合はクリア
    timeRegisterStore.workDays = []
    return
  }

  // workDaysが空の場合は初期化、そうでなければ同期
  if (timeRegisterStore.workDays.length === 0) {
    timeRegisterStore.initializeFromDates(selectedDates, dateJobMap)
  } else {
    timeRegisterStore.syncWithSelectedDates(selectedDates, dateJobMap)
  }
}

// 初期化
onMounted(() => {
  initializeWorkDays()
})

// カレンダーの選択状態が変わったら workDays を更新
watch(() => calendarStore.selectedDatesArray, (newDates) => {
  // 時間設定画面にいる場合のみ更新
  if (route.path === '/time-register') {
    initializeWorkDays()
  }
}, { deep: true })

// ルートが時間設定画面に変わったときも初期化チェック
watch(() => route.path, (newPath) => {
  if (newPath === '/time-register') {
    initializeWorkDays()
  }
})

// 勤務時間のフォーマット
const formatWorkTime = (workDay: WorkDay) => {
  return formatMinutesToHours(workDay.workMinutes)
}

// アコーディオンのトグル
const toggleBulkAccordion = () => {
  isBulkAccordionOpen.value = !isBulkAccordionOpen.value
}

// 週選択のトグル
const toggleWeek = (week: number, event?: Event) => {
  if (!isWeekAvailable(week)) return

  const index = selectedWeeks.value.indexOf(week)
  if (index === -1) {
    // 選択されていない場合は追加
    selectedWeeks.value.push(week)
    selectedWeeks.value.sort((a, b) => a - b) // ソートして順番を保つ
  } else {
    // 既に選択されている場合は削除
    selectedWeeks.value.splice(index, 1)
  }

  // フォーカスを外す
  if (event && event.target instanceof HTMLElement) {
    event.target.blur()
  }
}

// 曜日選択のトグル
const toggleWeekday = (dayOfWeek: number, event?: Event) => {
  const index = selectedWeekdays.value.indexOf(dayOfWeek)
  if (index === -1) {
    // 選択されていない場合は追加
    selectedWeekdays.value.push(dayOfWeek)
    selectedWeekdays.value.sort((a, b) => a - b) // ソートして順番を保つ
  } else {
    // 既に選択されている場合は削除
    selectedWeekdays.value.splice(index, 1)
  }

  // フォーカスを外す
  if (event && event.target instanceof HTMLElement) {
    event.target.blur()
  }
}

// ボタンラベル（曜日・週選択に応じて変化）
const bulkApplyBothLabel = computed(() => {
  const hasSelection = selectedWeekdays.value.length > 0 || selectedWeeks.value.length > 0
  return hasSelection ? '適用' : '全日に適用'
})

const bulkApplyStartLabel = computed(() => {
  const hasSelection = selectedWeekdays.value.length > 0 || selectedWeeks.value.length > 0
  return hasSelection ? '開始時刻のみ適用' : '全日に開始時刻のみ適用'
})

const bulkApplyEndLabel = computed(() => {
  const hasSelection = selectedWeekdays.value.length > 0 || selectedWeeks.value.length > 0
  return hasSelection ? '終了時刻のみ適用' : '全日に終了時刻のみ適用'
})

// 一括適用（選択曜日・週に基づく）
const handleBulkApplyAll = (type: BulkApplyType) => {
  // 曜日が選択されていない場合は全曜日を対象、選択されている場合は選択曜日のみ
  const targetWeekdays = selectedWeekdays.value.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : selectedWeekdays.value
  // 週が選択されていない場合は全週を対象、選択されている場合は選択週のみ
  const targetWeeks = selectedWeeks.value.length === 0 ? availableWeeks.value : selectedWeeks.value

  // 選択曜日・週に該当する勤務日をカウント
  const targetDays = workDays.value.filter(d =>
    !d.isRemoved && targetWeekdays.includes(d.dayOfWeek) && targetWeeks.includes(d.weekNumber)
  )
  const targetCount = targetDays.length
  const modifiedCount = targetDays.filter(d => d.isModified).length

  if (targetCount === 0) {
    alert('該当する勤務日がありません')
    return
  }

  // 選択曜日の表示文字列を生成
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土']
  const isAllWeekdays = selectedWeekdays.value.length === 0
  const isAllWeeks = selectedWeeks.value.length === 0

  let selectedLabel = ''
  if (isAllWeekdays && isAllWeeks) {
    selectedLabel = '全日'
  } else if (isAllWeekdays && !isAllWeeks) {
    selectedLabel = `第${selectedWeeks.value.join('・')}週`
  } else if (!isAllWeekdays && isAllWeeks) {
    selectedLabel = selectedWeekdays.value.map(day => weekdayLabels[day]).join('・')
  } else {
    const weekLabel = `第${selectedWeeks.value.join('・')}週`
    const dayLabel = selectedWeekdays.value.map(day => weekdayLabels[day]).join('・')
    selectedLabel = `${weekLabel}の${dayLabel}`
  }

  // 個別設定がある場合は選択肢を表示
  if (modifiedCount > 0) {
    confirmModalData.value = {
      title: '一括設定の確認',
      message: `${selectedLabel}で個別設定した箇所が${modifiedCount}日あります。`,
      options: [
        { label: '個別設定の日は<span style="color: #ca8a04; font-weight: 700;">除いて</span>適用', value: 'unmodified' },
        { label: '個別設定も<span style="color: #ca8a04; font-weight: 700;">上書き</span>して適用', value: 'all' },
        { label: '<span style="color: #ef4444;">キャンセル</span>', value: 'cancel' }
      ],
      onConfirm: (value: string) => {
        if (value !== 'cancel') {
          timeRegisterStore.applyBulk(type, value as 'unmodified' | 'all', targetWeekdays, targetWeeks)
          // 適用後に選択を解除
          selectedWeeks.value = []
          selectedWeekdays.value = []
        }
        showConfirmModal.value = false
      }
    }
    showConfirmModal.value = true
  } else {
    // 個別設定がない場合は確認のみ
    let message = ''

    if (type === 'both') {
      message = `${selectedLabel}の${targetCount}日に開始: ${bulkSettings.value.startTime}、終了: ${bulkSettings.value.endTime}を適用しますか？`
    } else if (type === 'start') {
      message = `${selectedLabel}の${targetCount}日の開始時刻を${bulkSettings.value.startTime}に変更しますか？`
    } else if (type === 'end') {
      message = `${selectedLabel}の${targetCount}日の終了時刻を${bulkSettings.value.endTime}に変更しますか？`
    }

    confirmModalData.value = {
      title: '一括設定の確認',
      message: message,
      options: [
        { label: 'キャンセル', value: 'cancel' },
        { label: '適用する', value: 'apply' }
      ],
      onConfirm: (value: string) => {
        if (value === 'apply') {
          timeRegisterStore.applyBulk(type, 'all', targetWeekdays, targetWeeks)
          // 適用後に選択を解除
          selectedWeeks.value = []
          selectedWeekdays.value = []
        }
        showConfirmModal.value = false
      }
    }
    showConfirmModal.value = true
  }
}

// 休憩時間トグル
const handleBreakToggle = () => {
  timeRegisterStore.toggleBreak()
}

// 休憩時間ヘルプ
const showBreakHelp = () => {
  showHelpModal.value = true
}

// 深夜時間（22:00～05:00）の分数を計算
const calculateLateNightMinutes = (startTime: string, endTime: string): number => {
  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  let start = parseTime(startTime)
  let end = parseTime(endTime)

  // 翌日にまたがる場合
  if (end <= start) {
    end += 24 * 60
  }

  // 深夜時間帯の開始と終了（分単位）
  const lateNightStart = 22 * 60 // 22:00
  const lateNightEnd = 29 * 60 // 05:00（翌日なので24+5=29）

  let lateNightMinutes = 0

  // 勤務時間が深夜時間帯と重複する部分を計算
  // 22:00-24:00の範囲
  const overlapStart1 = Math.max(start, lateNightStart)
  const overlapEnd1 = Math.min(end, 24 * 60)
  if (overlapStart1 < overlapEnd1) {
    lateNightMinutes += overlapEnd1 - overlapStart1
  }

  // 00:00-05:00の範囲（翌日）
  if (end > 24 * 60) {
    const overlapStart2 = Math.max(start, 24 * 60)
    const overlapEnd2 = Math.min(end, lateNightEnd)
    if (overlapStart2 < overlapEnd2) {
      lateNightMinutes += overlapEnd2 - overlapStart2
    }
  }

  return lateNightMinutes
}

// 給与計算（常に休憩時間を除く、深夜割増25%を反映）
const calculateSalary = () => {
  const wage = hourlyWage.value
  if (wage <= 0) return

  let totalSalary = 0

  // 各勤務日ごとに計算
  workDays.value.forEach(workDay => {
    if (workDay.isRemoved) return

    let workMinutes = workDay.workMinutes

    // 常に休憩時間を引く
    const breakMinutes = calculateBreakTime(workMinutes)
    workMinutes -= breakMinutes

    // 深夜時間帯の勤務時間を計算
    const lateNightMinutes = calculateLateNightMinutes(workDay.startTime, workDay.endTime)

    // 深夜時間から休憩時間の比率分を引く（簡易計算）
    const breakRatio = workDay.workMinutes > 0 ? breakMinutes / workDay.workMinutes : 0
    const actualLateNightMinutes = lateNightMinutes * (1 - breakRatio)

    // 通常時間帯の勤務時間
    const normalMinutes = workMinutes - actualLateNightMinutes

    // 通常時間の給与
    const normalHours = normalMinutes / 60
    totalSalary += normalHours * wage

    // 深夜時間の給与（25%増）
    const lateNightHours = actualLateNightMinutes / 60
    totalSalary += lateNightHours * wage * 1.25
  })

  calculatedSalary.value = Math.floor(totalSalary)
}

// workDaysが変更されたら自動で再計算
watch(
  () => workDays.value,
  () => {
    // 時給が入力されていれば自動計算
    if (hourlyWage.value > 0 && calculatedSalary.value > 0) {
      calculateSalary()
    }
  },
  { deep: true }
)

// 開始時間の選択
const selectStartHour = (hour: number) => {
  selectedStartHour.value = hour
  // 時間に応じて午前/午後トグルを自動設定
  startPm.value = hour >= 12
}

// 終了時間の選択
const selectEndHour = (hour: number) => {
  selectedEndHour.value = hour
  // 時間に応じて午前/午後トグルを自動設定
  endPm.value = hour >= 12
}

// 開始時間の分選択
const selectStartMinute = (minute: number) => {
  selectedStartMinute.value = minute
}

// 終了時間の分選択
const selectEndMinute = (minute: number) => {
  selectedEndMinute.value = minute
}

// 一括設定用のモーダルを開く
const openBulkTimeModal = (type: 'start' | 'end') => {
  isBulkMode.value = true
  bulkTimeType.value = type

  // 一括設定の現在値をパース
  const timeStr = type === 'start' ? bulkSettings.value.startTime : bulkSettings.value.endTime
  const [hourStr, minStr] = timeStr.split(':').map(Number)

  if (type === 'start') {
    selectedStartHour.value = hourStr
    selectedStartMinute.value = minStr
    startPm.value = hourStr >= 12
  } else {
    selectedEndHour.value = hourStr
    selectedEndMinute.value = minStr
    endPm.value = hourStr >= 12
  }

  showTimeModal.value = true
}

// 時刻選択モーダルを開く（個別設定用）
const handleTimeClick = (index: number, type: string) => {
  if (!workDays.value[index]) return // undefinedチェック

  isBulkMode.value = false
  const workDay = workDays.value[index]
  currentEditIndex.value = index

  // 開始時刻のパース（24時間制なのでシンプル）
  const [startHourStr, startMinStr] = workDay.startTime.split(':').map(Number)
  selectedStartHour.value = startHourStr
  selectedStartMinute.value = startMinStr
  startPm.value = startHourStr >= 12

  // 終了時刻のパース（24時間制なのでシンプル）
  const [endHourStr, endMinStr] = workDay.endTime.split(':').map(Number)
  selectedEndHour.value = endHourStr
  selectedEndMinute.value = endMinStr
  endPm.value = endHourStr >= 12

  showTimeModal.value = true
}

// カードクリック時のリップルエフェクト
const handleCardClick = (event: MouseEvent, index: number) => {
  const card = event.currentTarget as HTMLElement

  // リップルエフェクトを作成
  const ripple = document.createElement('span')
  ripple.classList.add('ripple')

  // クリック位置を取得（カード内の相対位置）
  const rect = card.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // リップルの位置を設定
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  // カードにリップルを追加
  card.appendChild(ripple)

  // アニメーション終了後にリップルを削除
  setTimeout(() => {
    ripple.remove()
  }, 600)

  // 時刻選択モーダルを開く
  handleTimeClick(index, 'both')
}

// シフトを外す/戻す
const toggleRemoveDay = (index: number) => {
  timeRegisterStore.toggleRemoveDay(index)
}

// 時刻選択モーダルをキャンセル
const cancelTimeEdit = () => {
  showTimeModal.value = false
  currentEditIndex.value = null
  isBulkMode.value = false
}

// 時刻選択モーダルを確定
const confirmTimeEdit = () => {
  if (isBulkMode.value) {
    // 一括設定モードの場合
    if (bulkTimeType.value === 'start') {
      bulkSettings.value.startTime = formattedStartTime.value
    } else {
      bulkSettings.value.endTime = formattedEndTime.value
    }
  } else {
    // 個別設定モードの場合
    if (currentEditIndex.value !== null) {
      timeRegisterStore.updateWorkDay(currentEditIndex.value, {
        startTime: formattedStartTime.value,
        endTime: formattedEndTime.value
      })
    }
  }
  showTimeModal.value = false
  currentEditIndex.value = null
  isBulkMode.value = false
}
</script>

<style scoped>
.time-register-view {
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.time-register-container {
  max-width: 800px;
  margin: 0 auto;
}

/* 一括設定セクション */
.bulk-settings-section {
  background: white;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  margin: 0;
  padding: 1rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  text-align: center;
}

/* アコーディオンヘッダー */
.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.3s ease;
  user-select: none;
}

.accordion-header:hover {
  background: #f8f9fa;
}

.accordion-icon {
  font-size: 1rem;
  color: #667eea;
  font-weight: 700;
  transition: transform 0.3s ease;
}

/* アコーディオントランジション */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease;
  max-height: 450px;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

.bulk-settings-content {
  padding: 0 0.75rem 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 週選択 */
.week-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.week-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #666;
  text-align: center;
}

.week-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
}

.week-btn {
  padding: 0.4rem 0.2rem;
  background: white;
  color: #666;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 0;
}

.week-btn:focus {
  outline: none;
}

.week-btn:active:not(.disabled) {
  transform: scale(0.98);
}

.week-btn.active {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border-color: #10b981;
  transform: scale(1.05);
}

.week-btn.disabled {
  background: #f5f5f5;
  color: #ccc;
  border-color: #e0e0e0;
  cursor: not-allowed;
}

/* 曜日選択 */
.weekday-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.weekday-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #666;
  text-align: center;
}

.weekday-buttons {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.3rem;
}

.weekday-btn {
  padding: 0.4rem 0.2rem;
  background: white;
  color: #666;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 0;
}

.weekday-btn:focus {
  outline: none;
}

.weekday-btn:active {
  transform: scale(0.98);
}

.weekday-btn.active {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border-color: #10b981;
  transform: scale(1.05);
}

.weekday-btn.sunday:not(.active) {
  color: #ef4444;
  border-color: #fca5a5;
}

.weekday-btn.saturday:not(.active) {
  color: #2563eb;
  border-color: #93c5fd;
}

.bulk-time-settings {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bulk-time-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.bulk-time-btn {
  padding: 0.4rem 0.6rem;
  background: #f8f9fa;
  color: #667eea;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 110px;
}

.bulk-time-btn:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.bulk-time-display {
  flex: 1;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: #667eea;
  padding: 0.4rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bulk-time-display:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.bulk-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.bulk-btn {
  padding: 0.4rem 0.5rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bulk-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.bulk-btn:active {
  transform: translateY(0);
}

/* 一括設定の説明テキスト */
.bulk-note {
  font-size: 0.7rem;
  color: #666;
  text-align: center;
  padding: 0.5rem 0.25rem 0.25rem 0.25rem;
  line-height: 1.4;
}

/* 時間表示凡例 */
.time-display-legend {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.legend-label {
  font-size: 0.75rem;
  color: white;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.legend-items {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
}

.legend-card {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border-left-width: 3px;
  border-left-style: solid;
  white-space: nowrap;
}

/* デフォルトスタイル */
.legend-item.default-style .legend-card {
  background: white;
  color: #333;
  border-left-color: #e5e7eb;
}

/* 個別設定スタイル - 黄色 */
.legend-item.custom-style .legend-card {
  background: #fef3c7;
  color: #78350f;
  border-left-color: #f59e0b;
}

/* 一括設定スタイル - 青色 */
.legend-item.bulk-style .legend-card {
  background: #dbeafe;
  color: #1e3a8a;
  border-left-color: #3b82f6;
}

/* 過去のシフトベーススタイル - 赤色 */
.legend-item.base-style .legend-card {
  background: #fee2e2;
  color: #991b1b;
  border-left-color: #ef4444;
}

/* 個別設定ヘッダー */
.individual-settings-header {
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.individual-settings-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #333;
  text-align: center;
}

/* 休憩時間設定 */
.break-time-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.break-time-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}

.break-time-toggle input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.help-btn {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  border: none;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.help-btn:hover {
  background: #764ba2;
  transform: scale(1.1);
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

.job-name {
  font-size: 1.05rem;
  color: #333;
}

.conflict-warning-btn {
  margin-left: auto;
  background: rgba(255, 69, 0, 0.1);
  border: 2px solid rgba(255, 69, 0, 0.4);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  padding: 0;
}

.conflict-warning-btn:hover {
  background: rgba(255, 69, 0, 0.2);
  border-color: rgba(255, 69, 0, 0.6);
  transform: scale(1.1);
}

.conflict-warning-btn:active {
  transform: scale(0.95);
}

/* 勤務日カードリスト */
.work-days-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.work-day-card {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.2s ease;
  border-left: 3px solid transparent;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.work-day-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  border-left-color: #667eea;
}

.card-main {
  flex: 1;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  position: relative;
}

.card-action-btn {
  padding: 0.35rem;
  margin-right: 0.5rem;
  background: #fee;
  color: #ef4444;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}

.card-action-btn:hover {
  background: #fdd;
  transform: scale(1.05);
}

.card-action-btn.restore {
  background: #dbeafe;
  color: #2563eb;
}

.card-action-btn.restore:hover {
  background: #bfdbfe;
}

.remove-icon {
  line-height: 1;
}

.restore-icon {
  font-size: 1.2rem;
  line-height: 1;
}

/* リップルエフェクト */
.work-day-card .ripple {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.5);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-animation {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

/* カード背景スタイル */
/* デフォルトスタイル - 白色 */
.work-day-card.default-style {
  background: white;
}

/* 個別設定スタイル - 黄色 */
.work-day-card.custom-style {
  background: #fef3c7;
}

/* 一括設定スタイル - 青色 */
.work-day-card.bulk-style {
  background: #dbeafe;
}

/* 過去のシフトベーススタイル - 赤色 */
.work-day-card.base-style {
  background: #fee2e2;
}

/* 左ボーダースタイル（単色） */
.work-day-card.border-default {
  border-left-color: #e5e7eb;
  border-left-width: 3px;
}

.work-day-card.border-custom {
  border-left-color: #f59e0b;
  border-left-width: 4px;
}

.work-day-card.border-bulk {
  border-left-color: #3b82f6;
  border-left-width: 4px;
}

.work-day-card.border-base {
  border-left-color: #ef4444;
  border-left-width: 4px;
}

/* 左ボーダースタイル（2色グラデーション） */
.work-day-card.border-custom-bulk {
  border-left: 4px solid;
  border-image: linear-gradient(to bottom, #f59e0b 50%, #3b82f6 50%) 1;
}

.work-day-card.border-custom-base {
  border-left: 4px solid;
  border-image: linear-gradient(to bottom, #f59e0b 50%, #ef4444 50%) 1;
}

.work-day-card.border-bulk-base {
  border-left: 4px solid;
  border-image: linear-gradient(to bottom, #3b82f6 50%, #ef4444 50%) 1;
}

.work-day-card.border-base-default {
  border-left: 4px solid;
  border-image: linear-gradient(to bottom, #ef4444 50%, #e5e7eb 50%) 1;
}

/* 選択条件に該当するカードは蛍光緑色の枠 */
.work-day-card.highlighted {
  border: 3px solid #00ff00;
  border-left-width: 4px !important;
}

/* 重複時の赤枠（蛍光色） */
.work-day-card.conflict {
  border: 3px solid #ff0000;
  border-left-width: 4px !important;
  box-shadow: 0 0 12px rgba(255, 0, 0, 0.5),
              0 4px 8px rgba(0, 0, 0, 0.15);
  background: rgba(255, 0, 0, 0.05);
}

.work-day-card.conflict:hover {
  box-shadow: 0 0 16px rgba(255, 0, 0, 0.6),
              0 6px 12px rgba(0, 0, 0, 0.2);
  border-color: #ff0000;
}

/* 時刻テキストの色 */
.time-value.default-time {
  color: #333;
  font-weight: 600;
}

.time-value.custom-time {
  color: #f59e0b;
  font-weight: 700;
}

.time-value.bulk-time {
  color: #3b82f6;
  font-weight: 700;
}

.time-value.from-base-time {
  color: #ef4444;
  font-weight: 700;
}

/* removed は最優先（グレーアウト） */
.work-day-card.removed {
  background: #e5e5e5;
  color: #999;
  opacity: 0.7;
}

.work-day-card.removed .time-value {
  color: #999;
}

.work-day-card.removed .card-date {
  color: #999;
}

.work-day-card.swiped {
  z-index: 10;
}

.card-content-single-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-date-section {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.card-date {
  font-size: 0.85rem;
  font-weight: 700;
  color: #333;
}

.card-date.saturday {
  color: #2563eb;
}

.card-date.sunday,
.card-date.holiday {
  color: #ef4444;
}

.card-week {
  font-size: 0.65rem;
  color: #999;
  font-weight: 600;
}

.card-time-section {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex: 1;
  justify-content: center;
}

.time-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
}

.time-separator {
  font-size: 0.75rem;
  color: #999;
}

.card-hours {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #666;
  flex-shrink: 0;
}

.hours-icon {
  font-size: 0.85rem;
}

.hours-text {
  font-weight: 600;
}

/* 合計統計 */
.total-summary-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.summary-row.total {
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  border-top: 2px solid #e0e0e0;
}

.summary-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #333;
}

.summary-value.highlight {
  font-size: 1.5rem;
  color: #667eea;
}

/* 休憩時間設定（インライン） */
.summary-break-setting {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.break-time-toggle-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
}

.break-time-toggle-inline input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.help-btn-small {
  margin-left: auto;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.help-btn-small:hover {
  background: #764ba2;
  transform: scale(1.1);
}

/* 給与計算セクション */
.salary-calc-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e0e0e0;
}

.salary-input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.wage-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  transition: all 0.3s ease;
  min-width: 0; /* flexで縮小可能にする */
}

.wage-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.wage-input::placeholder {
  color: #999;
  font-weight: 500;
}

.salary-calc-btn {
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.salary-calc-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 給与計算結果表示 */
.salary-result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #10b981;
}

.salary-result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.salary-result-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #666;
}

.salary-result-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.salary-result-note {
  font-size: 0.75rem;
  color: #999;
  line-height: 1.5;
}

/* 備考欄（時間設定ページ） */
.remarks-section-time {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e0e0e0;
}

.remarks-label-time {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.remarks-input-time {
  width: 100%;
  padding: 0.875rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #333;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
}

.remarks-input-time:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.remarks-input-time::placeholder {
  color: #999;
}

/* モーダル共通 */
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
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
  max-height: 80vh;
  overflow-y: auto;
}

/* 確認モーダル */
.confirm-modal {
  max-width: 400px;
  width: 100%;
}

.modal-message {
  font-size: 1rem;
  color: #333;
  margin-bottom: 1.5rem;
  line-height: 1.6;
  white-space: pre-line;
}

.modal-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-btn {
  padding: 0.875rem 1.5rem;
  border: 2px solid #3b82f6;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* ヘルプモーダル */
.help-modal {
  max-width: 400px;
  width: 100%;
}

.help-content {
  margin-bottom: 1.5rem;
}

.help-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.help-row:last-child {
  border-bottom: none;
}

.help-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}

.help-value {
  font-size: 1rem;
  font-weight: 700;
  color: #667eea;
}

.help-note {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f0f4ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #555;
  line-height: 1.5;
}

/* 重複詳細モーダル */
.conflict-modal {
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.conflict-content {
  margin-bottom: 1.5rem;
}

.conflict-job-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(255, 69, 0, 0.1), rgba(255, 140, 0, 0.1));
  border-radius: 8px;
  border-left: 4px solid #ff4500;
}

.conflict-job-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}

.conflict-job-name {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conflict-item {
  padding: 1rem;
  background: white;
  border: 2px solid rgba(255, 69, 0, 0.3);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(255, 69, 0, 0.1);
}

.conflict-date {
  font-size: 0.875rem;
  font-weight: 700;
  color: #ff4500;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 69, 0, 0.2);
}

.conflict-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.conflict-job-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
}

.job-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  min-width: 100px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.time-range {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
  font-family: 'Courier New', monospace;
}

.conflict-overlap-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 69, 0, 0.1);
  border-radius: 6px;
  margin: 0.25rem 0;
}

.overlap-icon {
  font-size: 1.2rem;
}

.overlap-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: #ff4500;
}

.close-btn {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 時刻選択モーダル */
.time-picker-modal {
  max-width: 450px;
  width: 100%;
  padding: 1rem;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #667eea;
  text-align: center;
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

.toggle-input:checked ~ .toggle-label .toggle-text-am {
  color: #666;
}

.toggle-input:checked ~ .toggle-label .toggle-text-pm {
  color: white;
}

.toggle-input:not(:checked) ~ .toggle-label .toggle-text-am {
  color: white;
}

.toggle-input:not(:checked) ~ .toggle-label .toggle-text-pm {
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

.toggle-input:checked ~ .toggle-label .toggle-slider {
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
  font-size: 0.9rem;
}

/* 勤務時間表示 */
.modal-work-hours {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  padding: 0.6rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.modal-work-hours span {
  font-size: 1rem;
  font-weight: 700;
  color: #667eea;
}

/* モーダルボタン */
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
  background: #f5f5f5;
  color: #666;
}

.btn-secondary-modal:hover {
  background: #e0e0e0;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .time-register-view {
    padding: 0.75rem;
  }

  .bulk-settings-section,
  .break-time-section,
  .total-summary-section {
    padding: 1rem;
  }

  .section-header {
    padding: 1rem;
  }

  .bulk-settings-content {
    padding: 0 1rem 1rem 1rem;
  }

  .bulk-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .bulk-time-btn {
    font-size: 0.75rem;
    min-width: 100px;
    padding: 0.5rem 0.75rem;
  }

  .bulk-time-display {
    font-size: 1.25rem;
  }

  .time-picker-modal {
    padding: 1rem;
  }

  .hour-btn,
  .minute-btn {
    font-size: 0.75rem;
    padding: 0.5rem 0.15rem;
  }

  .btn-modal {
    font-size: 0.875rem;
    padding: 0.75rem 0.25rem;
  }
}
</style>
