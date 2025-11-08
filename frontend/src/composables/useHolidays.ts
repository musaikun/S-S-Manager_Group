import { ref } from 'vue'
import type { HolidayData } from '../types/calendar'

/**
 * 祝日データ取得用Composable
 */
export function useHolidays() {
  const holidays = ref<HolidayData>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 祝日データをAPIから取得
   */
  const fetchHolidays = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch('https://holidays-jp.github.io/api/v1/date.json')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      holidays.value = data
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '祝日データの取得に失敗しました'
      error.value = errorMessage
      console.error('祝日データ取得エラー:', e)
      holidays.value = {} // エラー時は空のオブジェクト
    } finally {
      loading.value = false
    }
  }

  /**
   * 指定した日付が祝日かチェック
   */
  const isHoliday = (dateString: string): boolean => {
    return dateString in holidays.value
  }

  /**
   * 指定した日付の祝日名を取得
   */
  const getHolidayName = (dateString: string): string | undefined => {
    return holidays.value[dateString]
  }

  /**
   * キャッシュから祝日データを読み込み
   */
  const loadFromCache = (): boolean => {
    try {
      const cached = localStorage.getItem('holidays_cache')
      if (cached) {
        const data = JSON.parse(cached)
        const cachedAt = new Date(data.cachedAt)
        const now = new Date()

        // キャッシュが1週間以内なら使用
        const oneWeek = 7 * 24 * 60 * 60 * 1000
        if (now.getTime() - cachedAt.getTime() < oneWeek) {
          holidays.value = data.holidays
          return true
        }
      }
    } catch (e) {
      console.error('キャッシュ読み込みエラー:', e)
    }
    return false
  }

  /**
   * 祝日データをキャッシュに保存
   */
  const saveToCache = (): void => {
    try {
      const cacheData = {
        holidays: holidays.value,
        cachedAt: new Date().toISOString()
      }
      localStorage.setItem('holidays_cache', JSON.stringify(cacheData))
    } catch (e) {
      console.error('キャッシュ保存エラー:', e)
    }
  }

  /**
   * キャッシュを使用して祝日データを取得
   * キャッシュがない場合はAPIから取得
   */
  const fetchHolidaysWithCache = async (): Promise<void> => {
    // まずキャッシュを確認
    const cached = loadFromCache()
    if (cached) {
      console.log('キャッシュから祝日データを読み込みました')
      return
    }

    // キャッシュがなければAPIから取得
    await fetchHolidays()

    // 取得成功したらキャッシュに保存
    if (!error.value) {
      saveToCache()
    }
  }

  return {
    holidays,
    loading,
    error,
    fetchHolidays,
    fetchHolidaysWithCache,
    isHoliday,
    getHolidayName
  }
}
