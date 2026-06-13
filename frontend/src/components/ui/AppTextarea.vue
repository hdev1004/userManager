<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    rows?: number
    maxlength?: number
  }>(),
  {
    disabled: false,
    rows: 5,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const uid = useId()
const value = computed({
  get() {
    return props.modelValue ?? ''
  },
  set(v: string) {
    emit('update:modelValue', v)
  },
})
</script>

<template>
  <div class="field" :class="{ 'field--error': !!error }">
    <label v-if="label" :for="uid" class="field__label">{{ label }}</label>
    <textarea
      :id="uid"
      v-model="value"
      class="field__area"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
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
.field__area {
  padding: 14px 16px;
  font: var(--font-body-3);
  font-size: 15px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-line);
  background: #fff;
  color: var(--color-text-strong);
  transition: border-color 120ms ease, box-shadow 120ms ease;
  outline: none;
  resize: none; /* 크기 변경 금지 */
  line-height: 22px;
  font-family: 'Pretendard', sans-serif;
}
.field__area::placeholder {
  color: var(--color-text-tert);
}
.field__area:focus {
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
.field__area:disabled {
  background: var(--color-bg-hover);
  color: var(--color-text-tert);
  cursor: not-allowed;
}
.field--error .field__area {
  border-color: var(--color-danger);
}
.field--error .field__area:focus {
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
