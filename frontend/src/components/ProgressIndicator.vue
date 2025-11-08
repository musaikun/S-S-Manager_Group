<template>
  <div class="progress-indicator">
    <div
      v-for="(step, index) in steps"
      :key="step.id"
      class="progress-item"
    >
      <!-- ステップドット -->
      <div
        class="progress-step"
        :class="{ active: step.active }"
        @click="handleStepClick(step)"
      >
        <div class="step-dot"></div>
        <div class="step-label">{{ step.label }}</div>
      </div>

      <!-- 線（最後のステップ以外） -->
      <div
        v-if="index < steps.length - 1"
        class="progress-line"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useProgress } from '../composables/useProgress'
import type { ProgressStepInfo } from '../types/timeRegister'

const router = useRouter()
const { steps } = useProgress()

const handleStepClick = (step: ProgressStepInfo) => {
  if (!step.clickable) return

  // ステップに応じてルート遷移
  if (step.id === 'calendar') {
    router.push('/calendar')
  } else if (step.id === 'time-register') {
    router.push('/time-register')
  } else if (step.id === 'confirm') {
    router.push('/confirm')
  }
}
</script>

<style scoped>
.progress-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
  position: relative;
}

.progress-item {
  display: flex;
  align-items: center;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.progress-step:hover .step-dot {
  transform: scale(1.1);
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
}

.progress-step.active .step-dot {
  width: 14px;
  height: 14px;
  background: white;
  box-shadow:
    0 0 10px rgba(255, 255, 255, 0.8),
    0 0 20px rgba(255, 255, 255, 0.6),
    0 0 30px rgba(255, 255, 255, 0.4);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow:
      0 0 10px rgba(255, 255, 255, 0.8),
      0 0 20px rgba(255, 255, 255, 0.6),
      0 0 30px rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow:
      0 0 15px rgba(255, 255, 255, 1),
      0 0 30px rgba(255, 255, 255, 0.8),
      0 0 45px rgba(255, 255, 255, 0.6);
  }
}

.step-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  transition: all 0.3s ease;
}

.progress-step.active .step-label {
  color: white;
  font-weight: 700;
}

.progress-line {
  width: 60px;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 0.75rem;
  position: relative;
  top: -10px;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .progress-indicator {
    padding: 0.5rem 0.5rem;
  }

  .step-dot {
    width: 10px;
    height: 10px;
  }

  .progress-step.active .step-dot {
    width: 12px;
    height: 12px;
  }

  .step-label {
    font-size: 0.65rem;
  }

  .progress-line {
    width: 40px;
    margin: 0 0.5rem;
  }
}

@media (max-width: 480px) {
  .step-dot {
    width: 8px;
    height: 8px;
  }

  .progress-step.active .step-dot {
    width: 10px;
    height: 10px;
  }

  .step-label {
    font-size: 0.6rem;
  }

  .progress-line {
    width: 30px;
    margin: 0 0.3rem;
  }
}
</style>
