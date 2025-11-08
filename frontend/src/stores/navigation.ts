import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TransitionDirection = 'slide-left' | 'slide-right' | 'none'

export const useNavigationStore = defineStore('navigation', () => {
  const transitionName = ref<TransitionDirection>('none')

  // 次へ（右から左へスライド）
  const setForward = () => {
    transitionName.value = 'slide-left'
  }

  // 戻る（左から右へスライド）
  const setBackward = () => {
    transitionName.value = 'slide-right'
  }

  // トランジションなし
  const setNone = () => {
    transitionName.value = 'none'
  }

  return {
    transitionName,
    setForward,
    setBackward,
    setNone
  }
})
