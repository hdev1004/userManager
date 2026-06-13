<script setup lang="ts">
import { ref } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'danger'
}

const toasts = ref<Toast[]>([])
let seq = 0

function push(message: string, type: Toast['type'] = 'info', duration = 2400) {
  const id = ++seq
  toasts.value.push({ id, message, type })
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

defineExpose({ push })
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
      >
        {{ t.message }}
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 200;
  pointer-events: none;
}
.toast {
  font: var(--font-body-3);
  color: #fff;
  background: var(--color-text-strong);
  padding: 12px 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  max-width: 90vw;
}
.toast--success {
  background: var(--color-success);
}
.toast--danger {
  background: var(--color-danger);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 160ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
