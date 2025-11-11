<template>
  <div class="time-register-view">
    <div class="time-register-container">
      <!-- 掛け持ち先フィルターのラッパー（常に表示） -->
      <div class="job-filter-wrapper" :style="getFilterWrapperBorderStyle()">
        <!-- 掛け持ち先選択バナー -->
        <div class="job-filter-banner" :style="getJobFilterBannerStyle()">
          <div class="banner-content">
            <div class="banner-left">
              <span class="banner-text">{{ getJobFilterName() }}</span>
            </div>
            <div class="banner-right">
              <button v-if="hasMultipleJobs" @click="openJobSwitchModal" class="banner-btn switch-btn">
                切替
              </button>
              <button v-if="selectedJobFilter !== null" @click="clearJobFilter" class="banner-btn clear-btn">
                解除
              </button>
            </div>
          </div>
        </div>

        <!-- 一括設定セクション（アコーディオン） -->
        <div class="bulk-settings-section">
        <div class="section-header accordion-header" @click="toggleBulkAccordion">
          <h2>一括設定</h2>
          <span class="accordion-icon">{{ isBulkAccordionOpen ? '▲' : '▼' }}</span>
        </div>
        <transition name="accordion">
          <div v-show="isBulkAccordionOpen" class="bulk-settings-content">
            <!-- 掛け持ち先フィルター適用時の注意書き -->
            <div v-if="selectedJobFilter !== null" class="bulk-filter-notice">
              ⚠️ 現在一括設定は<strong>{{ getJobFilterName() }}</strong>にのみ反映されます
            </div>

            <!-- 指定なし時の説明テキスト -->
            <div v-if="selectedJobFilter === null" class="job-filter-info-container">
              <div class="job-filter-info-text">
                現在一括設定はすべての日に反映されます
              </div>
            </div>

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
          <button
            v-if="jobHasOvertimeWarning(group.job.id)"
            @click="openOvertimeModal(group.job.id)"
            :class="['overtime-warning-btn', { 'overtime-warning-btn-alone': !jobHasConflicts(group.job.id) }]"
            title="12時間超え勤務あり - クリックして詳細を表示"
          >
            ⚠️
          </button>
        </div>
        <div v-else class="job-group-header no-job">
          <span class="job-color-indicator main-store-indicator"></span>
          <span class="job-name">{{ calendarStore.mainStoreDisplayName }}</span>
          <button
            v-if="jobHasConflicts(undefined)"
            @click="openConflictModal(undefined)"
            class="conflict-warning-btn"
            title="時間重複あり - クリックして詳細を表示"
          >
            ⚠️
          </button>
          <button
            v-if="jobHasOvertimeWarning(undefined)"
            @click="openOvertimeModal(undefined)"
            :class="['overtime-warning-btn', { 'overtime-warning-btn-alone': !jobHasConflicts(undefined) }]"
            title="12時間超え勤務あり - クリックして詳細を表示"
          >
            ⚠️
          </button>
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
                conflict: hasConflict(workDay),
                overtime: hasOvertimeWarning(workDay),
                'conflict-overtime': hasConflict(workDay) && hasOvertimeWarning(workDay)
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

          <!-- 掛け持ち先ごとの統計 -->
          <!-- 時間重複の警告 -->
          <div v-if="timeConflicts.length > 0" class="conflicts-warning-section">
            <div class="conflicts-warning-header">
              <span class="conflicts-warning-icon">⚠️</span>
              <span class="conflicts-warning-text">時間の重複が{{ timeConflicts.length }}件あります</span>
            </div>
            <div class="conflicts-warning-note">
              掛け持ち先間で勤務時間が重複しています。確認してください。
            </div>
          </div>

          <!-- 掛け持ち先ごとの統計（詳細版） -->
          <div v-if="jobSummaries.length > 1" class="job-summaries-detailed-section">
            <h4 class="job-summaries-title">掛け持ち先別統計</h4>
            <div
              v-for="summary in jobSummaries"
              :key="summary.jobId || 'none'"
              class="job-summary-detailed-card"
            >
              <div class="job-summary-header">
                <span
                  v-if="summary.jobId"
                  class="job-color-dot"
                  :style="{ backgroundColor: calendarStore.getJobById(summary.jobId)?.color }"
                ></span>
                <span
                  v-else
                  class="job-color-dot main-store-dot-card"
                ></span>
                <span class="job-summary-name">
                  {{ summary.jobId ? calendarStore.getJobById(summary.jobId)?.name : calendarStore.mainStoreDisplayName }}
                </span>
              </div>

              <div class="job-summary-details">
                <div class="job-stat-row">
                  <span class="job-stat-label">勤務日数</span>
                  <span class="job-stat-value">{{ summary.workDays }}日</span>
                </div>
                <div class="job-stat-row">
                  <span class="job-stat-label">{{ includeBreak ? '実労働時間' : '総勤務時間' }}</span>
                  <span class="job-stat-value">{{ formatMinutesToHours(includeBreak ? summary.totalActualWorkMinutes : summary.totalWorkMinutes) }}</span>
                </div>

                <!-- 時給入力 -->
                <div class="job-wage-input-row">
                  <label class="job-wage-label">時給</label>
                  <input
                    type="number"
                    v-model.number="jobWages[summary.jobId?.toString() || 'none']"
                    class="job-wage-input"
                    min="0"
                    step="10"
                    placeholder="円"
                  />
                  <span class="job-wage-unit">円</span>
                </div>

                <!-- 給与表示 -->
                <div v-if="salaryByJob[summary.jobId?.toString() || 'none']" class="job-salary-result">
                  <span class="job-salary-label">給与概算</span>
                  <span class="job-salary-value">{{ salaryByJob[summary.jobId?.toString() || 'none']?.salary.toLocaleString() }}円</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 給与簡易概算 -->
          <div class="salary-calc-section">
            <!-- 本店のみの場合：時給入力と計算ボタン -->
            <div v-if="jobSummaries.length <= 1" class="salary-input-row">
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

            <!-- 掛け持ちありの場合：計算ボタンのみ -->
            <div v-else>
              <button @click="calculateSalary" class="salary-calc-btn-main">
                給与の簡易概算
              </button>
            </div>

            <!-- 給与計算結果（本店のみの場合のみ） -->
            <div v-if="calculatedSalary > 0 && jobSummaries.length <= 1" class="salary-result">
              <div class="salary-result-row total-salary">
                <span class="salary-result-label">合計給与:</span>
                <span class="salary-result-value">{{ calculatedSalary.toLocaleString() }}円</span>
              </div>

              <div class="salary-result-note">
                ※ 深夜給（22:00～05:00は25%増）を含む概算です。<br>
                ※ 各種税金や社会保険料などの控除を考慮していません。
              </div>
            </div>

            <!-- 掛け持ちありの場合：合計のみ表示 -->
            <div v-if="calculatedSalary > 0 && jobSummaries.length > 1" class="salary-result">
              <div class="salary-result-row total-salary">
                <span class="salary-result-label">合計給与:</span>
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
      <div v-if="showConflictModal && selectedJobForConflict !== null" class="modal-overlay" @click="closeConflictModal" @touchmove.prevent>
        <div class="modal-content conflict-modal" @click.stop @touchmove.stop>
          <h3 class="modal-title">⚠️ 時間重複の詳細</h3>
          <div class="conflict-content">
            <div class="conflict-job-info">
              <span class="conflict-job-label">対象:</span>
              <span class="conflict-job-name">{{ getJobName(selectedJobForConflict) }}</span>
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
                    <span class="job-badge" :style="{ backgroundColor: getJobColor(conflict.jobId1) }" :class="{ 'main-store-badge': conflict.jobId1 === undefined }">
                      {{ getJobName(conflict.jobId1) }}
                    </span>
                    <span class="time-range">{{ conflict.job1TimeSlot.startTime }} 〜 {{ conflict.job1TimeSlot.endTime }}</span>
                  </div>
                  <div class="conflict-overlap-indicator">
                    <span class="overlap-icon">⚠️</span>
                    <span class="overlap-text">重複時間: {{ formatOverlapTime(conflict.overlap) }}</span>
                  </div>
                  <div class="conflict-job-row">
                    <span class="job-badge" :style="{ backgroundColor: getJobColor(conflict.jobId2) }" :class="{ 'main-store-badge': conflict.jobId2 === undefined }">
                      {{ getJobName(conflict.jobId2) }}
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

    <!-- 12時間超え詳細モーダル -->
    <Teleport to="body">
      <div v-if="showOvertimeModal && selectedJobForOvertime !== null" class="modal-overlay" @click="closeOvertimeModal" @touchmove.prevent>
        <div class="modal-content overtime-modal" @click.stop @touchmove.stop>
          <h3 class="modal-title">⚠️ 12時間超え勤務の詳細</h3>
          <div class="overtime-content">
            <div class="overtime-job-info">
              <span class="overtime-job-label">対象:</span>
              <span class="overtime-job-name">{{ getJobName(selectedJobForOvertime) }}</span>
            </div>

            <div class="overtime-list">
              <div
                v-for="(workDay, index) in getOvertimeWorkDaysForJob(selectedJobForOvertime)"
                :key="index"
                class="overtime-item"
              >
                <div class="overtime-date">{{ workDay.displayDate }}</div>
                <div class="overtime-details">
                  <div class="overtime-time-row">
                    <span class="time-label">勤務時間:</span>
                    <span class="time-value">{{ workDay.startTime }} 〜 {{ workDay.endTime }}</span>
                  </div>
                  <div class="overtime-warning-row">
                    <span class="warning-icon">⚠️</span>
                    <span class="warning-text">勤務時間: {{ formatMinutesToHours(workDay.workMinutes) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button @click="closeOvertimeModal" class="close-btn">閉じる</button>
        </div>
      </div>
    </Teleport>

    <!-- 掛け持ち先切替モーダル -->
    <Teleport to="body">
      <div v-if="showJobSwitchModal" class="modal-overlay" @click="closeJobSwitchModal" @touchmove.prevent>
        <div class="modal-content job-switch-modal" @click.stop @touchmove.stop>
          <h3 class="modal-title">一括設定の対象を選択</h3>
          <div class="job-switch-content">
            <!-- 全ての掛け持ち先 -->
            <div
              class="job-switch-item all-jobs-item"
              @click="selectJobFilter(null)"
              :class="{ selected: selectedJobFilter === null }"
            >
              <div class="job-switch-indicator all-jobs-indicator">🌐</div>
              <span class="job-switch-name">全ての掛け持ち先</span>
              <span v-if="selectedJobFilter === null" class="selected-badge">✓</span>
            </div>

            <!-- メイン店舗 -->
            <div
              class="job-switch-item main-store-item"
              @click="selectJobFilter(undefined)"
              :class="{ selected: selectedJobFilter === undefined }"
            >
              <div class="job-switch-indicator main-store-indicator"></div>
              <span class="job-switch-name">{{ calendarStore.mainStoreDisplayName }}</span>
              <span v-if="selectedJobFilter === undefined" class="selected-badge">✓</span>
            </div>

            <!-- 掛け持ち先 -->
            <div
              v-for="job in calendarStore.activeJobs"
              :key="job.id"
              class="job-switch-item"
              @click="selectJobFilter(job.id)"
              :class="{ selected: selectedJobFilter === job.id }"
            >
              <div class="job-switch-indicator" :style="{ backgroundColor: job.color }"></div>
              <span class="job-switch-name">{{ job.name }}</span>
              <span v-if="selectedJobFilter === job.id" class="selected-badge">✓</span>
            </div>
          </div>
          <button @click="closeJobSwitchModal" class="close-btn">閉じる</button>
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

const { bulkSettings, includeBreak, workDays, selectedJobFilter } = storeToRefs(timeRegisterStore)
const { totalSummary } = storeToRefs(timeRegisterStore)

// 重複情報をストアから取得
const timeConflicts = computed(() => timeRegisterStore.timeConflicts)

// ジョブごとの統計を取得
const jobSummaries = computed(() => timeRegisterStore.jobSummaries)

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
const selectedJobForConflict = ref<JobId | undefined | null>(null)

// 12時間超え詳細モーダルの状態
const showOvertimeModal = ref(false)
const selectedJobForOvertime = ref<JobId | undefined | null>(null)

// 給与計算の状態
const hourlyWage = ref<number>(1000) // 時給（デフォルト1000円）
const calculatedSalary = ref<number>(0)
const showSalaryByJob = ref<boolean>(false) // 掛け持ち先別給与を表示するか
const salaryByJob = ref<Record<string, { jobId: number | undefined; salary: number }>>({})  // 掛け持ち先ごとの給与
const jobWages = ref<Record<string, number>>({}) // 掛け持ち先ごとの時給

// モーダル状態をPageSliderに提供（スライド制御用）
provide('isModalOpen', computed(() => showTimeModal.value || showConfirmModal.value || showHelpModal.value || showConflictModal.value || showOvertimeModal.value || showJobSwitchModal.value))

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
  return timeConflicts.value.some(conflict =>
    conflict.date === workDay.date &&
    (conflict.jobId1 === workDay.jobId || conflict.jobId2 === workDay.jobId)
  )
}

// 特定のジョブに重複があるかチェック
const jobHasConflicts = (jobId: JobId | undefined): boolean => {
  return timeConflicts.value.some(conflict =>
    conflict.jobId1 === jobId || conflict.jobId2 === jobId
  )
}

// 特定のジョブに関連する重複情報を取得
const getConflictsForJob = (jobId: JobId | undefined): ConflictInfo[] => {
  return timeConflicts.value.filter(conflict =>
    conflict.jobId1 === jobId || conflict.jobId2 === jobId
  )
}

// 特定のWorkDayに12時間超え警告があるかチェック
const hasOvertimeWarning = (workDay: WorkDay): boolean => {
  // 外された日は警告なし
  if (workDay.isRemoved) return false
  // 12時間（720分）以上かチェック
  return workDay.workMinutes >= 720
}

// 特定のジョブに12時間超えの勤務日があるかチェック
const jobHasOvertimeWarning = (jobId: JobId | undefined): boolean => {
  const jobWorkDays = workDays.value.filter(wd =>
    wd.jobId === jobId && !wd.isRemoved
  )
  return jobWorkDays.some(wd => wd.workMinutes >= 720)
}

// 特定のジョブの12時間超え勤務日を取得
const getOvertimeWorkDaysForJob = (jobId: JobId | undefined): WorkDay[] => {
  return workDays.value.filter(wd =>
    wd.jobId === jobId && !wd.isRemoved && wd.workMinutes >= 720
  )
}

// 重複詳細モーダルを開く
const openConflictModal = (jobId: JobId | undefined) => {
  selectedJobForConflict.value = jobId
  showConflictModal.value = true
}

// 重複詳細モーダルを閉じる
const closeConflictModal = () => {
  showConflictModal.value = false
  selectedJobForConflict.value = null
}

// 12時間超え詳細モーダルを開く
const openOvertimeModal = (jobId: JobId | undefined) => {
  selectedJobForOvertime.value = jobId
  showOvertimeModal.value = true
}

// 12時間超え詳細モーダルを閉じる
const closeOvertimeModal = () => {
  showOvertimeModal.value = false
  selectedJobForOvertime.value = null
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

// ジョブIDから名前を取得（メイン店舗対応）
const getJobName = (jobId: JobId | undefined): string => {
  if (jobId === undefined) {
    return calendarStore.mainStoreDisplayName
  }
  return calendarStore.getJobById(jobId)?.name || ''
}

// ジョブIDから色を取得（メイン店舗対応）
const getJobColor = (jobId: JobId | undefined): string => {
  if (jobId === undefined) {
    return '#FFFFFF' // メイン店舗は白
  }
  return calendarStore.getJobById(jobId)?.color || '#999'
}

// 掛け持ち先フィルターバナー関連
const getJobFilterName = (): string => {
  if (selectedJobFilter.value === null) {
    return '指定なし'
  }
  return getJobName(selectedJobFilter.value)
}

const getJobFilterBannerStyle = () => {
  if (selectedJobFilter.value === null) {
    // 指定なしの場合は薄い青系の背景
    const color = '#667eea'
    return {
      background: `linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(102, 126, 234, 0.15))`,
      borderLeft: `4px solid ${color}`
    }
  }
  if (selectedJobFilter.value === undefined) {
    // メイン店舗の場合も透明感のある背景で統一
    const color = '#ffffff' // メイン店舗のカラー
    return {
      background: `linear-gradient(135deg, rgba(108, 117, 125, 0.08), rgba(108, 117, 125, 0.15))`,
      borderLeft: `4px solid ${color}`
    }
  }
  // 掛け持ち先の場合は掛け持ち先の色
  const color = getJobColor(selectedJobFilter.value)
  return {
    background: `linear-gradient(135deg, ${color}15, ${color}25)`,
    borderLeft: `4px solid ${color}`
  }
}

const getFilterWrapperBorderStyle = () => {
  if (selectedJobFilter.value === null) {
    // 指定なし時は薄い青系のボーダー
    const color = '#667eea'
    return {
      border: `3px solid ${color}`,
      boxShadow: `0 0 12px ${color}40`
    }
  }
  if (selectedJobFilter.value === undefined) {
    // メイン店舗選択時は白のボーダー
    return {
      border: '3px solid #ffffff',
      boxShadow: '0 0 12px rgba(108, 117, 125, 0.3)'
    }
  }

  // 掛け持ち先選択時は掛け持ち先の色のボーダー
  const color = getJobColor(selectedJobFilter.value)
  return {
    border: `3px solid ${color}`,
    boxShadow: `0 0 12px ${color}50`
  }
}

const hasMultipleJobs = computed(() => {
  return calendarStore.activeJobs.length > 0
})

const clearJobFilter = () => {
  timeRegisterStore.clearSelectedJobFilter()
}

const showJobSwitchModal = ref(false)

const openJobSwitchModal = () => {
  showJobSwitchModal.value = true
}

const closeJobSwitchModal = () => {
  showJobSwitchModal.value = false
}

const selectJobFilter = (jobId: JobId | undefined | null) => {
  timeRegisterStore.setSelectedJobFilter(jobId)
  closeJobSwitchModal()
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

// デフォルト時刻を読み込む（新形式に対応）
const loadDefaultTimes = () => {
  const saved = localStorage.getItem('defaultTimes')
  if (saved) {
    const parsed = JSON.parse(saved)
    // 古い形式（直接startTime/endTimeがある）の場合
    if (parsed.startTime && parsed.endTime && !parsed.main) {
      return {
        main: {
          startTime: parsed.startTime || '09:00',
          endTime: parsed.endTime || '18:00'
        },
        jobs: {}
      }
    }
    // 新形式の場合
    return {
      main: parsed.main || { startTime: '09:00', endTime: '18:00' },
      jobs: parsed.jobs || {}
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

// 特定のジョブまたはメイン店舗のデフォルト時刻を取得
const getDefaultTimesForJob = (jobId: JobId | undefined) => {
  const allDefaults = loadDefaultTimes()
  if (jobId === undefined) {
    return allDefaults.main
  }
  // 掛け持ち先のデフォルト時刻がなければメイン店舗と同じ
  return allDefaults.jobs[jobId] || allDefaults.main
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
  const defaultTimes = getDefaultTimesForJob(workDay.jobId)

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
  const selectedDatesSet = calendarStore.selectedDates

  // すべての日付を統合（メイン選択 + 掛け持ち選択）
  const allDates = new Set([
    ...selectedDates,
    ...Object.keys(dateJobMap)
  ])
  const allDatesArray = Array.from(allDates).sort()

  if (allDatesArray.length === 0) {
    // 選択がなくなった場合はクリア
    timeRegisterStore.workDays = []
    return
  }

  // workDaysが空の場合は初期化、そうでなければ同期
  if (timeRegisterStore.workDays.length === 0) {
    timeRegisterStore.initializeFromDates(allDatesArray, dateJobMap, selectedDatesSet)
  } else {
    timeRegisterStore.syncWithSelectedDates(allDatesArray, dateJobMap, selectedDatesSet)
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
  return hasSelection ? '絞り込んだ日の両方の時間を変更' : 'すべての日の両方の時間を変更'
})

const bulkApplyStartLabel = computed(() => {
  const hasSelection = selectedWeekdays.value.length > 0 || selectedWeeks.value.length > 0
  return hasSelection ? '絞り込んだ日の開始時刻のみ変更' : 'すべての日の開始時刻のみを変更'
})

const bulkApplyEndLabel = computed(() => {
  const hasSelection = selectedWeekdays.value.length > 0 || selectedWeeks.value.length > 0
  return hasSelection ? '絞り込んだ日の終了時刻のみ変更' : 'すべての日の終了時刻のみを変更'
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

  // 12時間超え警告（両方を設定する場合のみ）
  if (type === 'both') {
    const { calculateWorkMinutes } = useTimeCalculation()
    const workMinutes = calculateWorkMinutes(bulkSettings.value.startTime, bulkSettings.value.endTime)
    if (workMinutes > 720) { // 720分 = 12時間
      const hours = Math.floor(workMinutes / 60)
      const minutes = workMinutes % 60
      const workTimeStr = minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`

      if (!confirm(`設定する勤務時間が12時間を超えています（${workTimeStr}）。\n\n長時間勤務となりますが、一括適用してもよろしいですか？`)) {
        return
      }
    }
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
  let totalSalary = 0
  const jobSalaries: Record<string, { jobId: number | undefined; salary: number }> = {}

  // 各勤務日ごとに計算
  workDays.value.forEach(workDay => {
    if (workDay.isRemoved) return

    // 掛け持ち先ごとに異なる時給を使用
    const jobKey = workDay.jobId?.toString() || 'none'
    const wage = jobSummaries.value.length > 1
      ? (jobWages.value[jobKey] || 0)
      : hourlyWage.value

    if (wage <= 0) return // 時給が設定されていない場合はスキップ

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
    const normalSalary = normalHours * wage

    // 深夜時間の給与（25%増）
    const lateNightHours = actualLateNightMinutes / 60
    const lateNightSalary = lateNightHours * wage * 1.25

    const daySalary = normalSalary + lateNightSalary
    totalSalary += daySalary

    // 掛け持ち先ごとに集計
    if (!jobSalaries[jobKey]) {
      jobSalaries[jobKey] = {
        jobId: workDay.jobId,
        salary: 0
      }
    }
    jobSalaries[jobKey].salary += daySalary
  })

  calculatedSalary.value = Math.floor(totalSalary)

  // 掛け持ち先ごとの給与を保存（小数点以下切り捨て）
  Object.keys(jobSalaries).forEach(key => {
    jobSalaries[key].salary = Math.floor(jobSalaries[key].salary)
  })
  salaryByJob.value = jobSalaries

  // 掛け持ちがある場合は自動的に詳細を表示
  showSalaryByJob.value = Object.keys(jobSalaries).length > 1
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
  // 24時間勤務（同じ開始時刻と終了時刻）の防止
  if (!isBulkMode.value && formattedStartTime.value === formattedEndTime.value) {
    alert('開始時刻と終了時刻が同じです。\n24時間勤務は設定できません。\n異なる時刻を選択してください。')
    return
  }

  // 12時間超え警告（個別設定モードのみ）
  if (!isBulkMode.value) {
    const { calculateWorkMinutes } = useTimeCalculation()
    const workMinutes = calculateWorkMinutes(formattedStartTime.value, formattedEndTime.value)
    if (workMinutes > 720) { // 720分 = 12時間
      const hours = Math.floor(workMinutes / 60)
      const minutes = workMinutes % 60
      const workTimeStr = minutes > 0 ? `${hours}時間${minutes}分` : `${hours}時間`

      if (!confirm(`勤務時間が12時間を超えています（${workTimeStr}）。\n\n長時間勤務となりますが、この設定でよろしいですか？`)) {
        return
      }
    }
  }

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

/* 掛け持ち先フィルターラッパー（バナー + 一括設定を囲む） */
.job-filter-wrapper {
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

/* 掛け持ち先フィルターバナー */
.job-filter-banner {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  padding: 0.875rem 1.25rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #6c757d;
}

/* ラッパー内の一括設定セクションはマージンを0に */
.job-filter-wrapper .bulk-settings-section {
  margin-bottom: 0;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
}

.banner-text {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-right {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.banner-btn {
  padding: 0.4rem 0.875rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.switch-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.switch-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.clear-btn {
  background: #f8f9fa;
  color: #666;
  border: 1.5px solid #dee2e6;
}

.clear-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

/* 一括設定フィルター注意書き */
.bulk-filter-notice {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 152, 0, 0.15));
  border-left: 4px solid #ffc107;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bulk-filter-notice strong {
  color: #d39e00;
  font-weight: 700;
}

/* 掛け持ち先切替モーダル */
.job-switch-modal {
  max-width: 450px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.job-switch-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.job-switch-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.job-switch-item:hover {
  background: #e9ecef;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.job-switch-item.main-store-item {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.job-switch-item.all-jobs-item {
  background: linear-gradient(135deg, #e0f2fe, #dbeafe);
  border: 2px solid #0ea5e9;
}

.job-switch-item.all-jobs-item:hover {
  background: linear-gradient(135deg, #d0ebfc, #cbe0fc);
  border-color: #0284c7;
}

.job-switch-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.main-store-indicator {
  background: white;
  border: 2.5px solid #666;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.all-jobs-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: transparent;
  box-shadow: none;
}

.job-switch-name {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.selected-badge {
  font-size: 1.25rem;
  color: #10b981;
  font-weight: 700;
}

/* 掛け持ち先絞り込みボタン */
.job-filter-button-container {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f0f4ff, #e0e7ff);
  border-radius: 10px;
  border: 2px dashed #667eea;
}

/* 指定なし時の情報テキスト */
.job-filter-info-container {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(102, 126, 234, 0.1));
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.job-filter-info-text {
  text-align: center;
  color: #667eea;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
}

.job-filter-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.job-filter-button:hover {
  background: linear-gradient(135deg, #5568d3, #6a3f8f);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.job-filter-button:active {
  transform: translateY(0);
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

/* 12時間超え警告スタイル - オレンジ */
.legend-item.overtime-warning .legend-card {
  background: #fed7aa;
  color: #7c2d12;
  border-left-color: #fb923c;
}

/* 23時間以上深刻な警告スタイル - 赤 */
.legend-item.severe-warning .legend-card {
  background: #fecaca;
  color: #7f1d1d;
  border-left-color: #dc2626;
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

.main-store-indicator {
  background-color: #FFFFFF;
  border: 1.5px solid #666;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
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

.overtime-warning-btn {
  margin-left: 0.25rem;
  background: rgba(255, 193, 7, 0.1);
  border: 2px solid rgba(255, 193, 7, 0.5);
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

.overtime-warning-btn:hover {
  background: rgba(255, 193, 7, 0.2);
  border-color: rgba(255, 193, 7, 0.7);
  transform: scale(1.1);
}

.overtime-warning-btn:active {
  transform: scale(0.95);
}

.overtime-warning-btn-alone {
  margin-left: auto;
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

/* 12時間超え警告スタイル - オレンジ */
.work-day-card.overtime-warning {
  background: #fed7aa;
}

/* 23時間以上深刻な警告スタイル - 赤 */
.work-day-card.severe-warning {
  background: #fecaca;
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

/* 12時間超えの黄色枠（蛍光色） */
.work-day-card.overtime {
  border: 3px solid #ffff00;
  border-left-width: 4px !important;
  box-shadow: 0 0 12px rgba(255, 255, 0, 0.5),
              0 4px 8px rgba(0, 0, 0, 0.15);
}

.work-day-card.overtime:hover {
  box-shadow: 0 0 16px rgba(255, 255, 0, 0.6),
              0 6px 12px rgba(0, 0, 0, 0.2);
  border-color: #ffff00;
}

/* 12時間超え+時間重複の場合: 左側が黄色、右側が赤色の枠線 */
.work-day-card.conflict-overtime {
  border: 3px solid transparent;
  border-left: 4px solid #ffff00 !important;
  border-right: 4px solid #ff0000 !important;
  border-top: 3px solid #ff0000;
  border-bottom: 3px solid #ffff00;
  box-shadow: 0 0 12px rgba(255, 170, 0, 0.5),
              0 4px 8px rgba(0, 0, 0, 0.15);
  background: linear-gradient(to right, rgba(255, 255, 0, 0.03) 50%, rgba(255, 0, 0, 0.03) 50%);
}

.work-day-card.conflict-overtime:hover {
  box-shadow: 0 0 16px rgba(255, 170, 0, 0.6),
              0 6px 12px rgba(0, 0, 0, 0.2);
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

/* 時間重複の警告 */
.conflicts-warning-section {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
  border: 2px solid #fca5a5;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.conflicts-warning-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.conflicts-warning-icon {
  font-size: 1.2rem;
}

.conflicts-warning-text {
  font-weight: 700;
  color: #dc2626;
  font-size: 0.95rem;
}

.conflicts-warning-note {
  font-size: 0.85rem;
  color: #991b1b;
  margin-left: 1.7rem;
}

/* 掛け持ち先ごとの統計（詳細版） */
.job-summaries-detailed-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e0e0e0;
}

.job-summaries-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.75rem;
}

.job-summary-detailed-card {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 10px;
}

.job-summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.2);
}

.job-summary-name {
  font-weight: 700;
  color: #333;
  font-size: 0.9rem;
}

.job-summary-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.job-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.15rem 0;
}

.job-stat-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 600;
}

.job-stat-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #667eea;
}

.job-wage-input-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
}

.job-wage-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  min-width: 35px;
  flex-shrink: 0;
}

.job-wage-input {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: right;
  transition: border-color 0.2s ease;
}

.job-wage-input:focus {
  outline: none;
  border-color: #667eea;
}

.job-wage-unit {
  font-size: 0.8rem;
  color: #666;
  font-weight: 600;
  flex-shrink: 0;
  min-width: 20px;
}

.job-salary-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05));
  border: 2px solid #6ee7b7;
  border-radius: 8px;
  margin-top: 0.4rem;
}

.job-salary-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #047857;
}

.job-salary-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #059669;
}

/* 掛け持ち先ごとの統計（旧版・削除予定） */
.job-summaries-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e0e0e0;
}

.job-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
  border-radius: 8px;
  border-left: 3px solid rgba(102, 126, 234, 0.3);
}

.job-summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.job-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.main-store-dot-card {
  background-color: #FFFFFF;
  border: 1.5px solid #666;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.job-summary-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.job-summary-stats {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #667eea;
}

.job-stat-separator {
  color: #999;
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

.salary-calc-btn-main {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.salary-calc-btn-main:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
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

.salary-result-row.total-salary {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.salary-by-job-section {
  margin: 0.75rem 0;
}

.salary-by-job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.salary-by-job-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}

.toggle-salary-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem;
}

.salary-by-job-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.salary-by-job-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
  border-left: 3px solid rgba(102, 126, 234, 0.3);
}

.salary-job-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.salary-job-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

.salary-job-value {
  font-size: 0.875rem;
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

.job-badge.main-store-badge {
  border: 1.5px solid #666;
  color: #333;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
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

/* 12時間超え詳細モーダル */
.overtime-modal {
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.overtime-content {
  margin-bottom: 1.5rem;
}

.overtime-job-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 235, 59, 0.15));
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.overtime-job-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}

.overtime-job-name {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
}

.overtime-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.overtime-item {
  padding: 1rem;
  background: white;
  border: 2px solid rgba(255, 193, 7, 0.4);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.15);
}

.overtime-date {
  font-size: 0.875rem;
  font-weight: 700;
  color: #f57c00;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 193, 7, 0.3);
}

.overtime-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.overtime-time-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
}

.overtime-time-row .time-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
  min-width: 80px;
}

.overtime-time-row .time-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
  font-family: 'Courier New', monospace;
}

.overtime-warning-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 193, 7, 0.15);
  border-radius: 6px;
  margin: 0.25rem 0;
}

.overtime-warning-row .warning-icon {
  font-size: 1.2rem;
}

.overtime-warning-row .warning-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: #f57c00;
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
