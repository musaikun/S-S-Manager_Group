import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('../views/CalendarView.vue')
    },
    {
      path: '/time-register',
      name: 'time-register',
      component: () => import('../views/TimeRegisterView.vue')
    },
    {
      path: '/confirm',
      name: 'confirm',
      component: () => import('../views/ConfirmView.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue')
    },
    {
      path: '/shift-calendar',
      name: 'shift-calendar',
      component: () => import('../views/ShiftCalendarView.vue')
    }
  ]
})

export default router
