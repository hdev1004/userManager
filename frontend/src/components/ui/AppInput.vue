<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null
    label?: string
    placeholder?: string
    type?: string
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'search' | 'url'
    error?: string
    hint?: string
    disabled?: boolean
    autofocus?: boolean
    maxlength?: number
  }>(),
  {
    type: 'text',
    inputmode: 'text',
    disabled: false,
    autofocus: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enter'): void
}>()

const uid = useId()
const value = computed({
  get() {
    return props.modelValue ?? ''
  },
  set(v: string | number) {
    emit('update:modelValue', String(v))
  },
})
</script>

<template>
  <div class="field" :class="{ 'field--error': !!error }">
    <label v-if="label" :for="uid" class="field__label">{{ label }}</label>
    <input
      :id="uid"
      v-model="value"
      class="field__input"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :disabled="disabled"
      :autofocus="autofocus"
      :maxlength="maxlength"
      @keydown.enter="emit('enter')"
    />
    <p v-if="error" class="field__msg field__msg--error">{{ error }}</p>
    <p v-else-if="hint" class="field__msg">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}
.field__label {
  font: var(--font-body-3);
  color: var(--color-text-sub);
}
.field__input {
  height: 56px;
  padding: 0 16px;
  font: var(--font-body-3);
  font-size: 15px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-line);
  background: #fff;
  color: var(--color-text-strong);
  transition: border-color 120ms ease, box-shadow 120ms ease;
  outline: none;
}
.field__input::placeholder {
  color: var(--color-text-tert);
}
.field__input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
.field__input:disabled {
  background: var(--color-bg-hover);
  color: var(--color-text-tert);
  cursor: not-allowed;
}
.field--error .field__input {
  border-color: var(--color-danger);
}
.field--error .field__input:focus {
  box-shadow: 0 0 0 3px rgba(240, 68, 82, 0.18);
}
.field__msg {
  font: var(--font-caption);
  color: var(--color-text-tert);
  margin: 0;
}
.field__msg--error {
  color: var(--color-danger);
}
</style>
