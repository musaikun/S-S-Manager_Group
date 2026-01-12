<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import liff from '@line/liff'
import PageSlider from './components/PageSlider.vue'
import ProgressIndicator from './components/ProgressIndicator.vue'
import SettingsModal from './components/SettingsModal.vue'
import CalendarView from './views/CalendarView.vue'
import TimeRegisterView from './views/TimeRegisterView.vue'
import ConfirmView from './views/ConfirmView.vue'
import HomeView from './views/HomeView.vue'
import HistoryView from './views/HistoryView.vue'
import { useNavigationStore } from './stores/navigation'
import { useTimeRegisterStore } from './stores/timeRegister'

const route = useRoute()
const router = useRouter()
const navigationStore = useNavigationStore()
const timeRegisterStore = useTimeRegisterStore()
const { workDays, totalSummary } = storeToRefs(timeRegisterStore)

const showSettingsModal = ref(false)
const showLineRedirectModal = ref(false)
const redirectUrl = ref('')

// LINEブラウザ検出
onMounted(async () => {
  const liffId = import.meta.env.VITE_LIFF_ID
  const appUrl = import.meta.env.VITE_APP_URL

  // LIFF IDとApp URLが設定されている場合のみ処理
  if (liffId && appUrl) {
    try {
      // LIFF初期化
      await liff.init({ liffId })

      // LINE内ブラウザで開かれている場合
      if (liff.isInClient()) {
        // 現在のパスを保持してリダイレクトURLを作成
        const currentPath = route.fullPath
        redirectUrl.value = `${appUrl}${currentPath}`

        // モーダル表示
        showLineRedirectModal.value = true
      }
    } catch (error) {
      console.error('LIFF initialization failed:', error)
    }
  }
})

// 外部ブラウザで開く
const openExternalBrowser = () => {
  if (redirectUrl.value) {
    liff.openWindow({
      url: redirectUrl.value,
      external: true
    })
  }
}

// スライド対象のページ
const sliderPages = [
  { name: 'calendar', path: '/calendar', component: CalendarView },
  { name: 'time-register', path: '/time-register', component: TimeRegisterView },
  { name: 'confirm', path: '/confirm', component: ConfirmView }
]

// ホーム画面かどうか
const isHomePage = computed(() => route.path === '/')

// スライドページかどうか
const isSliderPage = computed(() =>
  sliderPages.some(page => page.path === route.path)
)

// 現在のページに応じたボタン設定
const showBackButton = computed(() =>
  route.path === '/time-register' || route.path === '/confirm'
)

const nextButtonLabel = computed(() => {
  if (route.path === '/calendar') return '次へ'
  if (route.path === '/time-register') return '次へ'
  if (route.path === '/confirm') return '提出'
  return '次へ'
})

// ボタンハンドラー
const handleBack = () => {
  navigationStore.setBackward()
  if (route.path === '/time-register') {
    router.push('/calendar')
  } else if (route.path === '/confirm') {
    router.push('/time-register')
  }
}

const handleNext = () => {
  if (route.path === '/calendar') {
    navigationStore.setForward()
    router.push('/time-register')
  } else if (route.path === '/time-register') {
    navigationStore.setForward()
    router.push('/confirm')
  } else if (route.path === '/confirm') {
    // 提出方法選択モーダルを開く
    timeRegisterStore.openSubmitModal()
  }
}

// ヘッダーアイコンのハンドラー
const handleHistoryClick = () => {
  router.push('/history')
}

const handleLogoClick = () => {
  router.push('/')
}

const handleSettingsClick = () => {
  showSettingsModal.value = true
}

const closeSettingsModal = () => {
  showSettingsModal.value = false
}
</script>

<template>
  <div id="app">
    <!-- ホーム画面は通常表示 -->
    <HomeView v-if="isHomePage" />

    <!-- 履歴画面 -->
    <HistoryView v-else-if="route.path === '/history'" />

    <!-- その他のページ（router-viewで表示） -->
    <router-view v-else-if="!isSliderPage" />

    <!-- カレンダー・時間設定・確認画面 -->
    <div v-else-if="isSliderPage" class="slider-layout">
      <!-- ヘッダー（固定） -->
      <div class="fixed-header">
        <div class="header-icons">
          <button class="header-icon-btn" @click="handleHistoryClick" title="過去の作成記録">
            <span class="icon">📋</span>
          </button>
          <button class="header-logo-btn" @click="handleLogoClick" title="ホームに戻る">
            <span class="logo-text">
              <span class="title-s">S</span>
              <span class="shine-x">×</span>
              <span class="title-s2">S Manager</span>
            </span>
          </button>
          <button class="header-icon-btn" @click="handleSettingsClick" title="初期値設定">
            <span class="icon">⚙️</span>
          </button>
        </div>
      </div>

      <!-- メインコンテンツ（スライド） -->
      <div class="slider-content">
        <PageSlider :pages="sliderPages" />
      </div>

      <!-- フッター（固定） -->
      <div class="fixed-footer">
        <ProgressIndicator />
      </div>
    </div>

    <!-- 設定モーダル -->
    <SettingsModal :isOpen="showSettingsModal" @close="closeSettingsModal" />

    <!-- LINEブラウザリダイレクトモーダル -->
    <div v-if="showLineRedirectModal" class="line-redirect-overlay">
      <div class="line-redirect-modal">
        <div class="line-redirect-icon">🌐</div>
        <h2 class="line-redirect-title">ブラウザで開く必要があります</h2>
        <p class="line-redirect-message">
          このアプリは一部の機能（PDFダウンロードなど）を使うため、<br>
          <strong>Chrome</strong> などの外部ブラウザで開く必要があります。
        </p>
        <button @click="openExternalBrowser" class="line-redirect-button">
          Chromeで開く
        </button>
        <p class="line-redirect-note">
          ※ タップ後、ブラウザの選択画面が表示されます
        </p>
      </div>
    </div>
  </div>
</template>

<style>
/* グローバルスタイル */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
}

/* スライドレイアウト */
.slider-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.3);
}

.fixed-header {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  z-index: 100;
}

.header-icons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.header-icon-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
}

.header-icon-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.header-icon-btn .icon {
  font-size: 1.25rem;
}

.header-logo-btn {
  background: transparent;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.header-logo-btn:hover {
  transform: translateY(-2px);
}

.logo-text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  gap: 4px;
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
}

@keyframes shineMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.slider-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.fixed-footer {
  flex-shrink: 0;
  padding: 1rem;
  z-index: 100;
}

.footer-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  max-width: 800px;
  margin: 0 auto;
}

.action-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 50px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  max-width: 200px;
}

.back-btn {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.back-btn:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.next-btn {
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: white;
  box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
}

.next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
}

.submit-btn {
  background: linear-gradient(135deg, #10b981, #34d399);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.submit-btn:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

/* レスポンシブ */
@media (max-width: 768px) {
  .fixed-header {
    padding: 0.75rem 0.75rem 0 0.75rem;
  }

  .fixed-footer {
    padding: 0.75rem;
  }

  .action-btn {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }
}

/* PC表示用：メインコンテンツの幅制限を解除 */
@media (min-width: 769px) {
  .slider-layout {
    max-width: 100%;
  }
}

/* LINEリダイレクトモーダル */
.line-redirect-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.line-redirect-modal {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.line-redirect-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.line-redirect-title {
  color: #333;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.line-redirect-message {
  color: #666;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.line-redirect-message strong {
  color: #667eea;
  font-weight: 700;
}

.line-redirect-button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 1rem 2.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  width: 100%;
  margin-bottom: 1rem;
}

.line-redirect-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.line-redirect-button:active {
  transform: translateY(0);
}

.line-redirect-note {
  color: #999;
  font-size: 0.875rem;
  margin: 0;
}
</style>
