<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    padding?: 'sm' | 'md' | 'lg'
  }>(),
  { padding: 'md' },
)
</script>

<template>
  <section class="card" :class="`card--p-${padding}`">
    <header v-if="title || $slots.actions || $slots.header" class="card__head">
      <slot name="header">
        <h3 class="card__title">{{ title }}</h3>
      </slot>
      <div v-if="$slots.actions" class="card__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  border: var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.card--p-sm {
  padding: 16px;
}
.card--p-md {
  padding: 24px;
}
.card--p-lg {
  padding: 32px;
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.card__title {
  margin: 0;
  font: var(--font-title-2);
  color: var(--color-text-strong);
}
.card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
