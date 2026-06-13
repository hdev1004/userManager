<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: number
    closable?: boolean
  }>(),
  { closable: true, width: 480 },
)

const emit = defineEmits<{ (e: 'close'): void }>()

function close() {
  if (props.closable) emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  },
)
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="modal" role="dialog" aria-modal="true">
        <div class="modal__dim" @click="close" />
        <div class="modal__box" :style="{ width: width + 'px' }">
          <header v-if="title || $slots.title || closable" class="modal__head">
            <h3 class="modal__title">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button v-if="closable" class="modal__close" type="button" @click="close" aria-label="닫기">
              <X :size="20" />
            </button>
          </header>
          <div class="modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal__dim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}
.modal__box {
  position: relative;
  background: #fff;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: 100%;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 8px;
}
.modal__title {
  margin: 0;
  font: var(--font-title-2);
  color: var(--color-text-strong);
}
.modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--color-text-sub);
}
.modal__close:hover {
  background: var(--color-bg-hover);
}
.modal__body {
  padding: 16px 28px 24px;
  overflow-y: auto;
}
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 28px 24px;
  border-top: 1px solid var(--color-line-soft);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 160ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
