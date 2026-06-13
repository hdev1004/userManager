<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, ref } from 'vue'
import AppTopBar from '@/components/AppTopBar.vue'
import AppToast from '@/components/ui/AppToast.vue'
import { bindToast } from '@/composables/useToast'

const toastRef = ref<InstanceType<typeof AppToast> | null>(null)

onMounted(() => {
  bindToast(toastRef.value as any)
})
</script>

<template>
  <div class="layout">
    <AppTopBar />
    <main class="layout__main">
      <RouterView />
    </main>
    <AppToast ref="toastRef" />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: var(--color-bg-page);
}
.layout__main {
  padding-top: var(--top-bar-h);
}
</style>
