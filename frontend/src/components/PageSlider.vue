<template>
  <div class="page-slider-container">
    <div
      class="page-slider-wrapper"
      :style="{
        transform: `translate3d(${currentTranslateX}px, 0, 0)`,
        transition: isTransitioning ? 'transform 0.3s ease-out' : 'none'
      }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 各ページを横並びで配置 -->
      <div
        v-for="(page, index) in pages"
        :key="page.name"
        class="page-item"
        :style="{ width: `${viewportWidth}px` }"
      >
        <component :is="page.component" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Component } from 'vue'

interface Page {
  name: string
  path: string
  component: Component
}

const props = defineProps<{
  pages: Page[]
}>()

const router = useRouter()
const route = useRoute()

// モーダルが開いているかどうか（TimeRegisterViewからinject）
const isModalOpen = inject<{ value: boolean }>('isModalOpen', { value: false })

// ビューポート幅
const viewportWidth = ref(window.innerWidth)

// タッチ状態
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchMoveX = ref(0)
const isDragging = ref(false)
const isTransitioning = ref(false)

// 現在のページインデックス
const currentPageIndex = ref(0)

// ドラッグ中のオフセット
const dragOffsetX = ref(0)

// 現在の表示位置
const currentTranslateX = computed(() => {
  const baseTranslate = -currentPageIndex.value * viewportWidth.value
  return baseTranslate + dragOffsetX.value
})

// ルートが変更されたら現在のページインデックスを更新
watch(() => route.path, (newPath, oldPath) => {
  const newIndex = props.pages.findIndex(p => p.path === newPath)
  const oldIndex = props.pages.findIndex(p => p.path === oldPath)

  if (newIndex !== -1 && newIndex !== currentPageIndex.value) {
    // ページ遷移時はスライドアニメーションを有効化
    if (oldIndex !== -1) {
      isTransitioning.value = true
      dragOffsetX.value = 0

      setTimeout(() => {
        currentPageIndex.value = newIndex
        setTimeout(() => {
          isTransitioning.value = false
        }, 300)
      }, 0)
    } else {
      // 初期表示時はアニメーションなし
      currentPageIndex.value = newIndex
    }
  }
}, { immediate: true })

// リサイズハンドラ
const handleResize = () => {
  viewportWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// タッチイベントハンドラ
const handleTouchStart = (e: TouchEvent) => {
  // モーダルが開いている場合はスワイプを無効化
  if (isModalOpen.value) {
    return
  }

  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  touchMoveX.value = touchStartX.value
  isDragging.value = false
  isTransitioning.value = false
}

const handleTouchMove = (e: TouchEvent) => {
  // モーダルが開いている場合はスワイプを無効化
  if (isModalOpen.value) {
    return
  }

  touchMoveX.value = e.touches[0].clientX
  const diffX = touchMoveX.value - touchStartX.value
  const diffY = Math.abs(e.touches[0].clientY - touchStartY.value)

  // 横方向のスワイプのみ認識（縦スクロールを妨げない）
  if (Math.abs(diffX) > 10 && diffY < 50) {
    isDragging.value = true

    // 端での抵抗（ラバーバンド効果）
    let actualOffset = diffX

    // 左端で右にスワイプ
    if (currentPageIndex.value === 0 && diffX > 0) {
      actualOffset = diffX * 0.3 // 抵抗を加える
    }
    // 右端で左にスワイプ
    else if (currentPageIndex.value === props.pages.length - 1 && diffX < 0) {
      actualOffset = diffX * 0.3 // 抵抗を加える
    }

    dragOffsetX.value = actualOffset
    e.preventDefault() // スクロール防止
  }
}

const handleTouchEnd = () => {
  // モーダルが開いている場合はスワイプを無効化
  if (isModalOpen.value) {
    return
  }

  if (!isDragging.value) {
    dragOffsetX.value = 0
    return
  }

  const diffX = touchMoveX.value - touchStartX.value
  const threshold = viewportWidth.value * 0.3 // 30%スワイプで遷移

  let targetIndex = currentPageIndex.value

  // 端でのスワイプ判定（バウンスバック）
  const isAtLeftEdge = currentPageIndex.value === 0 && diffX > 0
  const isAtRightEdge = currentPageIndex.value === props.pages.length - 1 && diffX < 0

  if (isAtLeftEdge || isAtRightEdge) {
    // 端でのスワイプの場合はバウンスバック
    isTransitioning.value = true
    dragOffsetX.value = 0
    isDragging.value = false

    setTimeout(() => {
      isTransitioning.value = false
    }, 300)
    return
  }

  // 左スワイプ（次へ）
  if (diffX < -threshold && currentPageIndex.value < props.pages.length - 1) {
    targetIndex = currentPageIndex.value + 1
  }
  // 右スワイプ（前へ）
  else if (diffX > threshold && currentPageIndex.value > 0) {
    targetIndex = currentPageIndex.value - 1
  }

  // アニメーション開始
  isTransitioning.value = true
  dragOffsetX.value = 0
  isDragging.value = false

  // ページが変わる場合はルーターで遷移
  if (targetIndex !== currentPageIndex.value) {
    currentPageIndex.value = targetIndex
    setTimeout(() => {
      router.push(props.pages[targetIndex].path)
      isTransitioning.value = false
    }, 300) // トランジション時間と一致
  } else {
    setTimeout(() => {
      isTransitioning.value = false
    }, 300)
  }
}
</script>

<style scoped>
.page-slider-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.page-slider-wrapper {
  display: flex;
  height: 100%;
  will-change: transform;
  touch-action: pan-y; /* 縦スクロールは許可 */
}

.page-item {
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}
</style>
