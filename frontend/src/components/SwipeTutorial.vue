<template>
  <transition name="tutorial-fade">
    <div v-if="showTutorial" class="swipe-tutorial-overlay" @click="dismissTutorial">
      <div class="tutorial-content">
        <div class="finger-animation">
          <svg
            class="finger-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M13.5 3C13.5 2.17 14.17 1.5 15 1.5C15.83 1.5 16.5 2.17 16.5 3V11.5H18C19.66 11.5 21 12.84 21 14.5V17.5C21 20.26 18.76 22.5 16 22.5H12C9.24 22.5 7 20.26 7 17.5V13.5C7 12.67 7.67 12 8.5 12C9.33 12 10 12.67 10 13.5V9.5C10 8.67 10.67 8 11.5 8C12.33 8 13 8.67 13 9.5V3H13.5M13.5 3V9.5M10 13.5V17.5" />
          </svg>
          <div class="swipe-arrow">→</div>
        </div>
        <div class="tutorial-text">スワイプで次の画面へ</div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showTutorial = ref(false)

// LocalStorageのキー
const TUTORIAL_KEY = 'swipe-tutorial-shown'

// チュートリアルを表示するかチェック
const checkShouldShow = (): boolean => {
  return !localStorage.getItem(TUTORIAL_KEY)
}

// チュートリアルを非表示にする
const dismissTutorial = () => {
  showTutorial.value = false
  localStorage.setItem(TUTORIAL_KEY, 'true')
}

onMounted(() => {
  if (checkShouldShow()) {
    // 少し遅延させてから表示
    setTimeout(() => {
      showTutorial.value = true
      // 4秒後に自動的に消える
      setTimeout(() => {
        if (showTutorial.value) {
          dismissTutorial()
        }
      }, 4000)
    }, 500)
  }
})
</script>

<style scoped>
.swipe-tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  pointer-events: auto;
  cursor: pointer;
}

.tutorial-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.finger-animation {
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: swipe-motion 2s ease-in-out infinite;
}

.finger-icon {
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  transform: rotate(-45deg);
}

.swipe-arrow {
  font-size: 3rem;
  color: white;
  font-weight: 700;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  animation: arrow-pulse 1s ease-in-out infinite;
}

.tutorial-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  text-align: center;
  padding: 0 2rem;
}

@keyframes swipe-motion {
  0% {
    transform: translateX(100px);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateX(-100px);
    opacity: 0;
  }
}

@keyframes arrow-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* トランジション */
.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.5s ease;
}

.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .finger-icon {
    width: 48px;
    height: 48px;
  }

  .swipe-arrow {
    font-size: 2.5rem;
  }

  .tutorial-text {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .finger-icon {
    width: 40px;
    height: 40px;
  }

  .swipe-arrow {
    font-size: 2rem;
  }

  .tutorial-text {
    font-size: 1rem;
    padding: 0 1rem;
  }
}
</style>
