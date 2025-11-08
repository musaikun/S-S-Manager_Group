<template>
  <div class="home-container">
    <!-- タイトル -->
    <h1 class="wind-text">
      <span class="title-s">S</span>
      <span class="shine-x">×</span>
      <span class="title-s2">S Manager</span>
    </h1>

    <!-- メインボタン -->
    <div class="button-container">
      <button class="main-btn submit-btn" @click="goToShiftSubmit">
        シフト提出
      </button>
      <button class="main-btn aggregate-btn" @click="showComingSoon">
        シフト集計
      </button>
    </div>

    <!-- 著作権表示 -->
    <footer class="copyright">
      © 2025 無才 / S×S Manager
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNavigationStore } from '../stores/navigation'

const router = useRouter()
const navigationStore = useNavigationStore()

/**
 * シフト提出画面へ遷移
 */
const goToShiftSubmit = () => {
  navigationStore.setNone() // トランジションを無効化
  router.push('/calendar')
}

/**
 * シフト集計（実装中メッセージ）
 */
const showComingSoon = () => {
  alert('実装中')
}
</script>

<style scoped>
/* === 背景 === */
.home-container {
  margin: 0;
  min-height: 100vh;
  overflow: hidden;
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: linear-gradient(135deg, #1b1b15, #2f3a2a, #3e2f1d, #1f2b1f),
              linear-gradient(225deg, #2f3a2a, #1f2b1f, #1b1b15, #3e2f1d),
              linear-gradient(315deg, #3e2f1d, #1b1b15, #2f3a2a, #1f2b1f);
  background-size: 400% 400%;
  animation: bgFlow 25s ease infinite;
}

@keyframes bgFlow {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

/* === 中央タイトル === */
.wind-text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: clamp(2rem, 8vw, 4rem);
  letter-spacing: 0.05em;
  gap: 8px;
  margin: 0;
  padding: 0 1rem;
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  white-space: nowrap;
}

/* スマホ対応: さらに小さい画面 */
@media (max-width: 480px) {
  .wind-text {
    font-size: clamp(1.5rem, 10vw, 2.5rem);
    gap: 4px;
  }
}

.title-s, .title-s2 {
  background: linear-gradient(-60deg, rgba(255,255,255,0.9), rgba(220,250,255,0.4), rgba(255,255,255,0.9));
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: windFlow 5s linear infinite;
}

@keyframes windFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* === × === */
.shine-x {
  background: linear-gradient(120deg, #3a0d6f, #7c3aff, #d9b3ff, #6f3ad0);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 2px #b393ff)
          drop-shadow(0 0 6px #d9b3ff)
          drop-shadow(0 0 12px #6f3ad0);
  animation: shineMove 3s ease-in-out infinite, flicker 0.8s infinite;
  display: inline-block;
  position: relative;
  z-index: 10;
}

@keyframes shineMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

/* === ボタンコンテナ === */
.button-container {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  z-index: 5;
  width: min(400px, 85vw);
}

/* === ボタン === */
.main-btn {
  padding: 1rem 3rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.submit-btn {
  background: linear-gradient(135deg, #10b981, #34d399);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
}

.aggregate-btn {
  background: linear-gradient(135deg, #6f3ad0, #a36bff);
  box-shadow: 0 4px 15px rgba(111, 58, 208, 0.4);
}

.aggregate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(111, 58, 208, 0.6);
}

.main-btn:active {
  transform: translateY(0);
}

/* スマホ対応: ボタン */
@media (max-width: 480px) {
  .button-container {
    gap: 1rem;
  }

  .main-btn {
    padding: 0.875rem 2rem;
    font-size: 1.1rem;
  }
}

/* === 著作権 === */
.copyright {
  position: absolute;
  bottom: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  z-index: 5;
}
</style>
