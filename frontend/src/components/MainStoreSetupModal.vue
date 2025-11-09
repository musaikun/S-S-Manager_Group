<template>
  <Teleport to="body">
    <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">本店を設定</h2>
        </div>

        <div class="modal-body">
          <p class="modal-description">
            メインで働いている店舗の名前を入力してください。
          </p>
          <p class="modal-subdescription">
            （掛け持ち先は後でカレンダー画面で追加できます）
          </p>

          <div class="input-group">
            <label class="input-label">店舗名</label>
            <input
              v-model="storeName"
              type="text"
              class="store-input"
              placeholder="例: セブンイレブン 渋谷店"
              maxlength="50"
              @keyup.enter="handleSave"
              ref="inputRef"
            />
          </div>

          <div class="button-group">
            <button @click="handleSkip" class="btn skip-btn">
              スキップ
            </button>
            <button @click="handleSave" class="btn save-btn" :disabled="!storeName.trim()">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useCalendarStore } from '../stores/calendar'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': []
}>()

const calendarStore = useCalendarStore()
const storeName = ref('')
const inputRef = ref<HTMLInputElement>()

const isVisible = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  isVisible.value = newValue
  if (newValue) {
    // モーダルが開いたら既存の本店名を読み込む
    storeName.value = calendarStore.mainStoreName
    // フォーカスを設定
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

const handleOverlayClick = () => {
  // オーバーレイクリックでは閉じない（スキップボタンのみ）
}

const handleSkip = () => {
  isVisible.value = false
  emit('update:modelValue', false)
}

const handleSave = () => {
  const trimmedName = storeName.value.trim()
  if (trimmedName) {
    calendarStore.setMainStoreName(trimmedName)
  }
  isVisible.value = false
  emit('update:modelValue', false)
  emit('save')
}
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
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-align: center;
}

.modal-body {
  padding: 1.5rem;
}

.modal-description {
  font-size: 0.95rem;
  color: #333;
  margin: 0 0 0.5rem 0;
  line-height: 1.6;
}

.modal-subdescription {
  font-size: 0.85rem;
  color: #666;
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.store-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.store-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.btn {
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skip-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.skip-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.save-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn:active:not(:disabled) {
  transform: translateY(0);
}
</style>
