<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  images: { id: number | string; src: string; alt?: string }[]
  index: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:index', v: number): void
}>()

const current = computed(() => props.images[props.index])
const hasMany = computed(() => props.images.length > 1)

function close() {
  emit('close')
}
function prev() {
  if (!hasMany.value) return
  emit('update:index', (props.index - 1 + props.images.length) % props.images.length)
}
function next() {
  if (!hasMany.value) return
  emit('update:index', (props.index + 1) % props.images.length)
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
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
      <div v-if="open && current" class="viewer" role="dialog" aria-modal="true" @click.self="close">
        <button class="viewer__close" type="button" @click="close" aria-label="닫기">
          <X :size="20" />
        </button>

        <button
          v-if="hasMany"
          class="viewer__nav viewer__nav--prev"
          type="button"
          @click="prev"
          aria-label="이전"
        >
          <ChevronLeft :size="24" />
        </button>

        <img
          :src="current.src"
          :alt="current.alt ?? ''"
          class="viewer__img"
          @click.stop
        />

        <button
          v-if="hasMany"
          class="viewer__nav viewer__nav--next"
          type="button"
          @click="next"
          aria-label="다음"
        >
          <ChevronRight :size="24" />
        </button>

        <div v-if="hasMany" class="viewer__count">
          {{ index + 1 }} / {{ images.length }}
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.86);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.viewer__img {
  max-width: min(92vw, 1400px);
  max-height: 88vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  user-select: none;
}
.viewer__close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease;
}
.viewer__close:hover {
  background: rgba(255, 255, 255, 0.2);
}
.viewer__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease;
}
.viewer__nav:hover {
  background: rgba(255, 255, 255, 0.22);
}
.viewer__nav--prev {
  left: 24px;
}
.viewer__nav--next {
  right: 24px;
}
.viewer__count {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font: var(--font-caption);
  font-variant-numeric: tabular-nums;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .viewer__nav--prev {
    left: 8px;
  }
  .viewer__nav--next {
    right: 8px;
  }
}
</style>
