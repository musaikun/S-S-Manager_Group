import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCalendarStore } from '../stores/calendar'
import type { ProgressStep, ProgressStepInfo } from '../types/timeRegister'

/**
 * 進捗管理用Composable
 */
export function useProgress() {
  const route = useRoute()
  const calendarStore = useCalendarStore()

  /**
   * 現在のステップを取得
   */
  const currentStep = computed<ProgressStep>(() => {
    const name = route.name as string

    if (name === 'calendar') {
      return 'calendar'
    } else if (name === 'time-register') {
      return 'time-register'
    } else if (name === 'confirm') {
      return 'confirm'
    }

    // デフォルトはカレンダー
    return 'calendar'
  })

  /**
   * 全ステップの情報
   */
  const steps = computed<ProgressStepInfo[]>(() => {
    const current = currentStep.value
    const stepOrder: ProgressStep[] = ['calendar', 'time-register', 'confirm']
    const currentIndex = stepOrder.indexOf(current)

    return [
      {
        id: 'calendar',
        number: 1,
        label: '日付選択',
        completed: currentIndex > 0,
        active: current === 'calendar',
        clickable: true // カレンダーは常にクリック可能
      },
      {
        id: 'time-register',
        number: 2,
        label: '時間設定',
        completed: currentIndex > 1,
        active: current === 'time-register',
        clickable: true // 時間設定は常にクリック可能
      },
      {
        id: 'confirm',
        number: 3,
        label: '確認・提出',
        completed: false,
        active: current === 'confirm',
        clickable: true // 確認画面も常にクリック可能
      }
    ]
  })

  /**
   * 特定のステップが完了済みか
   */
  const isStepCompleted = (step: ProgressStep): boolean => {
    const stepInfo = steps.value.find(s => s.id === step)
    return stepInfo?.completed ?? false
  }

  /**
   * 特定のステップがアクティブか
   */
  const isStepActive = (step: ProgressStep): boolean => {
    return currentStep.value === step
  }

  return {
    currentStep,
    steps,
    isStepCompleted,
    isStepActive
  }
}
