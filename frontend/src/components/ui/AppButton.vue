<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-soft'
type Size = 'large' | 'medium' | 'small'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'medium',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  },
)

const classes = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  { 'btn--block': props.block, 'btn--loading': props.loading },
])
</script>

<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="btn__spin" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-lg);
  transition: all 120ms ease;
  white-space: nowrap;
  user-select: none;
  border: 1px solid transparent;
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn--large {
  height: 56px;
  padding: 0 20px;
  font: var(--font-body-1);
  border-radius: var(--radius-lg);
}
.btn--medium {
  height: 48px;
  padding: 0 16px;
  font: var(--font-body-3);
  font-weight: 600;
  border-radius: 12px;
}
.btn--small {
  height: 36px;
  padding: 0 14px;
  font: var(--font-body-3);
  border-radius: var(--radius-md);
}
.btn--block {
  width: 100%;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}
.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.btn--primary:active:not(:disabled) {
  background: var(--color-primary-press);
}

.btn--secondary {
  background: var(--color-bg-hover);
  color: var(--color-text-strong);
}
.btn--secondary:hover:not(:disabled) {
  background: var(--color-line);
}

.btn--outline {
  background: #fff;
  color: var(--color-text-strong);
  border-color: var(--color-line);
}
.btn--outline:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text);
}
.btn--ghost:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn--danger {
  background: var(--color-danger);
  color: #fff;
}
.btn--danger:hover:not(:disabled) {
  background: #d63a47;
}

.btn--danger-soft {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.btn--danger-soft:hover:not(:disabled) {
  background: #ffd8dc;
}

.btn__spin {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: spin 600ms linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
