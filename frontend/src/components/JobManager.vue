<template>
  <div class="job-manager">
    <!-- アコーディオンヘッダー -->
    <div class="accordion-header" @click="toggleAccordion">
      <span class="header-text">
        <span class="header-icon">🔄</span>
        入力先を切り替え
      </span>
      <span class="accordion-icon">{{ isOpen ? '▲' : '▼' }}</span>
    </div>

    <!-- アコーディオンコンテンツ -->
    <div v-show="isOpen" class="accordion-content">
      <!-- ジョブリスト -->
      <div v-if="jobs.length > 0" class="job-list">
        <div
          v-for="job in jobs"
          :key="job.id"
          class="job-item"
          :class="{ active: currentJobId === job.id }"
        >
          <button
            class="job-button"
            :class="{ selected: currentJobId === job.id }"
            :style="{
              borderColor: currentJobId === job.id ? job.color : '#ddd',
              borderWidth: currentJobId === job.id ? '3px' : '2px',
              color: currentJobId === job.id ? job.color : '#666'
            }"
            @click="selectJob(job.id)"
          >
            <span class="job-color-dot" :style="{ backgroundColor: job.color }"></span>
            <span class="job-name">{{ job.name }}</span>
            <span class="job-status">{{ currentJobId === job.id ? '(選択中)' : '(選択)' }}</span>
          </button>
          <button class="edit-button" @click="editJob(job)" title="編集">
            編集
          </button>
          <button class="delete-button" @click="deleteJob(job.id)" title="削除">
            ×
          </button>
        </div>
      </div>

      <!-- ジョブ追加ボタン -->
      <button
        v-if="jobs.length < 4"
        class="add-job-button"
        @click="showAddJobModal = true"
      >
        + 勤務先を追加
      </button>

      <div v-else class="max-jobs-message">
        最大4つまで登録できます
      </div>

      <!-- 選択解除ボタン -->
      <button
        v-if="currentJobId !== null"
        class="deselect-button"
        @click="deselectJob"
      >
        選択を解除
      </button>
    </div>

    <!-- ジョブ追加/編集モーダル -->
    <div v-if="showAddJobModal || editingJob" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ editingJob ? 'ジョブを編集' : 'ジョブを追加' }}</h3>
        <input
          v-model="jobName"
          type="text"
          placeholder="勤務先の名前"
          class="job-name-input"
          maxlength="20"
          @keyup.enter="saveJob"
        />
        <div class="modal-buttons">
          <button class="cancel-button" @click="closeModal">キャンセル</button>
          <button class="save-button" @click="saveJob" :disabled="!jobName.trim()">
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCalendarStore } from '../stores/calendar'
import type { Job, JobId } from '../types/calendar'

const calendarStore = useCalendarStore()

const isOpen = ref(false)
const showAddJobModal = ref(false)
const editingJob = ref<Job | null>(null)
const jobName = ref('')

const jobs = computed(() => calendarStore.jobs)
const currentJobId = computed(() => calendarStore.currentJobId)

const toggleAccordion = () => {
  isOpen.value = !isOpen.value
}

const selectJob = (jobId: JobId) => {
  if (currentJobId.value === jobId) {
    // 同じジョブをクリックした場合は選択解除
    calendarStore.setCurrentJobId(null)
  } else {
    calendarStore.setCurrentJobId(jobId)
  }
}

const deselectJob = () => {
  calendarStore.setCurrentJobId(null)
}

const editJob = (job: Job) => {
  editingJob.value = job
  jobName.value = job.name
}

const deleteJob = (jobId: JobId) => {
  if (confirm('この勤務先を削除してもよろしいですか？\n関連する日付の選択も削除されます。')) {
    calendarStore.deleteJob(jobId)
  }
}

const saveJob = () => {
  if (!jobName.value.trim()) return

  if (editingJob.value) {
    // 編集
    calendarStore.updateJob(editingJob.value.id, jobName.value.trim())
  } else {
    // 新規追加
    calendarStore.addJob(jobName.value.trim())
  }

  closeModal()
}

const closeModal = () => {
  showAddJobModal.value = false
  editingJob.value = null
  jobName.value = ''
}
</script>

<style scoped>
.job-manager {
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.accordion-header {
  padding: 1rem;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  user-select: none;
  transition: background 0.2s;
}

.accordion-header:hover {
  background: #e8e8e8;
}

.header-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  font-size: 1.2rem;
}

.accordion-icon {
  font-size: 0.8rem;
  color: #666;
}

.accordion-content {
  padding: 1rem;
}

.job-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.job-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.job-item.active .job-button {
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transform: translateY(-1px);
}

.job-button {
  flex: 1;
  padding: 0.875rem 1.25rem;
  border: 2px solid;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.25s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  position: relative;
}

.job-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.job-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.job-button:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.job-name {
  flex: 1;
}

.job-status {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4caf50;
  margin-left: auto;
  white-space: nowrap;
}

.job-button.selected .job-status {
  color: #388e3c;
  font-weight: 700;
}

.job-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.edit-button,
.delete-button {
  padding: 0.875rem 1rem;
  border: 2px solid;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.edit-button {
  border-color: #2196f3;
  color: #2196f3;
}

.edit-button:hover {
  background: #2196f3;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
}

.edit-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.2);
}

.delete-button {
  color: #f44336;
  font-weight: bold;
  border-color: #f44336;
}

.delete-button:hover {
  background: #f44336;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
}

.delete-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.2);
}

.add-job-button {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px dashed #2196f3;
  border-radius: 8px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f5f9ff 100%);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  color: #2196f3;
  transition: all 0.25s ease;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
}

.add-job-button:hover {
  border-color: #1976d2;
  color: #1976d2;
  background: linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.2);
}

.add-job-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.15);
}

.max-jobs-message {
  text-align: center;
  color: #999;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.deselect-button {
  width: 100%;
  padding: 0.875rem 1rem;
  margin-top: 0.5rem;
  border: 2px solid #ff9800;
  border-radius: 8px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  color: #f57c00;
  transition: all 0.25s ease;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.1);
}

.deselect-button:hover {
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%);
  border-color: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 152, 0, 0.2);
}

.deselect-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.15);
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.job-name-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
}

.job-name-input:focus {
  outline: none;
  border-color: #2196f3;
}

.modal-buttons {
  display: flex;
  gap: 0.5rem;
}

.cancel-button,
.save-button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: #f5f5f5;
  color: #666;
}

.cancel-button:hover {
  background: #e8e8e8;
}

.save-button {
  background: #2196f3;
  color: white;
}

.save-button:hover:not(:disabled) {
  background: #1976d2;
}

.save-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
