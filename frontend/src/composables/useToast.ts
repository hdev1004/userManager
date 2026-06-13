import { ref } from 'vue'
import type { Component } from 'vue'

type ToastType = 'info' | 'success' | 'danger'

interface ToastRefLike {
  push: (msg: string, type?: ToastType, duration?: number) => void
}

const ref_ = ref<ToastRefLike | null>(null)

export function bindToast(instance: ToastRefLike | null) {
  ref_.value = instance
}

export function useToast() {
  function notify(msg: string, type: ToastType = 'info', duration?: number) {
    ref_.value?.push(msg, type, duration)
  }
  return {
    info: (m: string) => notify(m, 'info'),
    success: (m: string) => notify(m, 'success'),
    error: (m: string) => notify(m, 'danger'),
  }
}

// keeping import compatibility
export type { Component }
