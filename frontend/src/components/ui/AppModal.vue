<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: number
    closable?: boolean
    /** 배경 dim + 페이드 인. false 면 부유 팝업처럼 동작 */
    dim?: boolean
    /** 헤더 드래그로 위치 이동 (iPad 터치 지원) */
    draggable?: boolean
  }>(),
  { closable: true, width: 480, dim: true, draggable: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()

function close() {
  if (props.closable) emit('close')
}

function onKey(e: KeyboardEvent) {
  if (props.open && e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

// drag state
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const start = ref({ px: 0, py: 0, ox: 0, oy: 0 })

watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v && props.dim ? 'hidden' : ''
    if (v) offset.value = { x: 0, y: 0 } // reset on open
  },
)

function onPointerDown(e: PointerEvent) {
  if (!props.draggable) return
  if ((e.target as HTMLElement).closest('.modal__close')) return
  dragging.value = true
  start.value = {
    px: e.clientX,
    py: e.clientY,
    ox: offset.value.x,
    oy: offset.value.y,
  }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}
function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  offset.value = {
    x: start.value.ox + (e.clientX - start.value.px),
    y: start.value.oy + (e.clientY - start.value.py),
  }
}
function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    // ignore
  }
}

const boxStyle = computed(() => ({
  width: props.width + 'px',
  transform:
    offset.value.x || offset.value.y
      ? `translate(${offset.value.x}px, ${offset.value.y}px)`
      : undefined,
}))

const transitionName = computed(() => (props.dim ? 'fade' : 'none'))
</script>

<template>
  <Teleport to="body">
    <transition :name="transitionName">
      <div
        v-if="open"
        class="modal"
        :class="{ 'modal--no-dim': !dim, 'modal--dragging': dragging }"
        role="dialog"
        aria-modal="true"
      >
        <div v-if="dim" class="modal__dim" @click="close" />
        <div class="modal__box" :style="boxStyle">
          <header
            v-if="title || $slots.title || closable"
            class="modal__head"
            :class="{ 'modal__head--drag': draggable }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <h3 class="modal__title">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button
              v-if="closable"
              class="modal__close"
              type="button"
              @click="close"
              aria-label="닫기"
            >
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
.modal--no-dim {
  /* dim 없으면 컨테이너는 클릭 통과시키고, 모달 박스만 인터랙트 */
  pointer-events: none;
}
.modal--no-dim .modal__box {
  pointer-events: auto;
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
.modal--no-dim .modal__box {
  /* 부유 팝업은 그림자를 좀 더 강하게 (배경이 옅어서 떠 있는 느낌) */
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08);
}
.modal--dragging .modal__box {
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25), 0 6px 14px rgba(0, 0, 0, 0.12);
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 8px;
}
.modal__head--drag {
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.modal__head--drag:active {
  cursor: grabbing;
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
  pointer-events: auto;
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
/* "none" transition name → no animation classes applied → instant */
</style>
