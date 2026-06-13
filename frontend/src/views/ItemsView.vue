<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import draggable from 'vuedraggable'
import {
  Plus,
  Trash2,
  GripVertical,
  X,
  Tag,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { categoriesApi, itemsApi, type Category, type Item } from '@/api/items'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const categories = ref<Category[]>([])
const items = ref<Item[]>([])
const activeCatId = ref<number | null>(null)
const loading = ref(false)

const showAddCat = ref(false)
const newCatCode = ref('')
const newCatName = ref('')

const showAddItem = ref(false)
const newItemCode = ref('')
const newItemName = ref('')
const newItemPrice = ref<number | string>('')

const showConfirmDeleteCat = ref(false)
const showConfirmDeleteItem = ref<Item | null>(null)

const filtered = computed(() =>
  activeCatId.value
    ? items.value.filter((i) => i.category_id === activeCatId.value)
    : [],
)

async function loadAll() {
  loading.value = true
  try {
    const cats = await categoriesApi.list()
    categories.value = cats
    if (!activeCatId.value && cats[0]) activeCatId.value = cats[0].id
    if (activeCatId.value) {
      items.value = await itemsApi.list()
    }
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

async function createCategory() {
  if (!newCatCode.value || !newCatName.value) {
    toast.error('코드와 이름을 입력하세요.')
    return
  }
  try {
    const c = await categoriesApi.create({
      code: newCatCode.value.trim().toUpperCase(),
      name: newCatName.value.trim(),
    })
    categories.value.push(c)
    activeCatId.value = c.id
    newCatCode.value = ''
    newCatName.value = ''
    showAddCat.value = false
    toast.success('카테고리가 추가되었습니다.')
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function deleteActiveCategory() {
  if (!activeCatId.value) return
  try {
    await categoriesApi.remove(activeCatId.value)
    toast.success('카테고리가 삭제되었습니다.')
    categories.value = categories.value.filter((c) => c.id !== activeCatId.value)
    activeCatId.value = categories.value[0]?.id ?? null
    showConfirmDeleteCat.value = false
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function createItem() {
  if (!activeCatId.value) return
  if (!newItemCode.value || !newItemName.value) {
    toast.error('코드와 품명을 입력하세요.')
    return
  }
  try {
    const it = await itemsApi.create({
      category_id: activeCatId.value,
      code: newItemCode.value.trim(),
      name: newItemName.value.trim(),
      price: Number(newItemPrice.value) || 0,
    })
    items.value.push({ ...it } as Item)
    newItemCode.value = ''
    newItemName.value = ''
    newItemPrice.value = ''
    showAddItem.value = false
    toast.success('물품이 추가되었습니다.')
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function deleteItem(it: Item) {
  try {
    await itemsApi.remove(it.id)
    items.value = items.value.filter((x) => x.id !== it.id)
    toast.success('물품이 삭제되었습니다.')
    showConfirmDeleteItem.value = null
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function onCategoryDragEnd() {
  try {
    const orders = categories.value.map((c, idx) => ({ id: c.id, sort_order: idx + 1 }))
    await categoriesApi.reorder(orders)
  } catch (e) {
    toast.error(errorMessage(e))
    await loadAll()
  }
}

async function onItemDragEnd() {
  if (!activeCatId.value) return
  try {
    const orders = filtered.value.map((c, idx) => ({ id: c.id, sort_order: idx + 1 }))
    await itemsApi.reorder(activeCatId.value, orders)
  } catch (e) {
    toast.error(errorMessage(e))
    await loadAll()
  }
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1 class="t-title-1">물품 관리</h1>
        <p class="t-body-2 text-tert" style="margin-top: 4px">
          탭과 물품을 추가/삭제하고 드래그로 순서를 바꿀 수 있어요. (iPad 터치 지원)
        </p>
      </div>
    </header>

    <AppCard padding="md">
      <div class="tabsbar">
        <draggable
          v-model="categories"
          item-key="id"
          tag="div"
          class="tabs"
          :delay="80"
          :delay-on-touch-only="true"
          :touch-start-threshold="3"
          handle=".tab"
          @end="onCategoryDragEnd"
        >
          <template #item="{ element }">
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeCatId === element.id }"
              @click="activeCatId = element.id"
            >
              <Tag :size="14" />
              <span>{{ element.name }}</span>
            </button>
          </template>
        </draggable>
        <AppButton size="small" variant="ghost" @click="showAddCat = true">
          <Plus :size="14" />
          <span>탭 추가</span>
        </AppButton>
        <AppButton
          v-if="activeCatId"
          size="small"
          variant="ghost"
          @click="showConfirmDeleteCat = true"
        >
          <X :size="14" />
          <span>탭 삭제</span>
        </AppButton>
      </div>
    </AppCard>

    <AppCard padding="md" style="margin-top: 12px">
      <template #header>
        <h3 style="margin:0;font:var(--font-title-3);color:var(--color-text-strong)">
          {{ categories.find((c) => c.id === activeCatId)?.name ?? '카테고리 없음' }}
        </h3>
      </template>
      <template #actions>
        <AppButton size="small" variant="primary" :disabled="!activeCatId" @click="showAddItem = true">
          <Plus :size="14" />
          <span>물품 추가</span>
        </AppButton>
      </template>

      <div v-if="loading" class="t-body-2 text-tert">불러오는 중...</div>
      <div v-else-if="filtered.length === 0" class="t-body-2 text-tert">등록된 물품이 없습니다.</div>
      <draggable
        v-else
        v-model="items"
        item-key="id"
        tag="div"
        class="itemlist"
        :delay="80"
        :delay-on-touch-only="true"
        :touch-start-threshold="3"
        handle=".grip"
        @end="onItemDragEnd"
      >
        <template #item="{ element }">
          <div
            v-if="element.category_id === activeCatId"
            class="itemrow"
          >
            <button class="grip" type="button" aria-label="드래그">
              <GripVertical :size="22" />
            </button>
            <div class="itemrow__code">{{ element.code }}</div>
            <div class="itemrow__name">{{ element.name }}</div>
            <div class="itemrow__price num">{{ element.price.toLocaleString() }}원</div>
            <button class="itemrow__del" type="button" @click="showConfirmDeleteItem = element">
              <Trash2 :size="20" />
            </button>
          </div>
        </template>
      </draggable>
    </AppCard>

    <AppModal :open="showAddCat" title="탭 추가" @close="showAddCat = false">
      <div class="vstack" style="gap:16px">
        <AppInput v-model="newCatCode" label="코드" placeholder="예: SPA (영문 대문자 권장)" :maxlength="10" />
        <AppInput v-model="newCatName" label="표시명" placeholder="예: 스파" :maxlength="30" />
      </div>
      <template #footer>
        <AppButton variant="outline" size="medium" @click="showAddCat = false">취소</AppButton>
        <AppButton variant="primary" size="medium" @click="createCategory">추가</AppButton>
      </template>
    </AppModal>

    <AppModal :open="showAddItem" title="물품 추가" @close="showAddItem = false">
      <div class="vstack" style="gap:16px">
        <AppInput v-model="newItemCode" label="코드" placeholder="예: P30" :maxlength="20" />
        <AppInput v-model="newItemName" label="품명" placeholder="예: 펌" :maxlength="50" />
        <AppInput v-model="newItemPrice" label="단가" inputmode="numeric" placeholder="0" />
      </div>
      <template #footer>
        <AppButton variant="outline" size="medium" @click="showAddItem = false">취소</AppButton>
        <AppButton variant="primary" size="medium" @click="createItem">추가</AppButton>
      </template>
    </AppModal>

    <AppModal :open="showConfirmDeleteCat" title="탭 삭제" @close="showConfirmDeleteCat = false">
      <p class="t-body-2" style="margin:0">
        선택한 카테고리를 삭제할까요?<br />
        포함된 물품은 그대로 보존됩니다.
      </p>
      <template #footer>
        <AppButton variant="outline" size="medium" @click="showConfirmDeleteCat = false">취소</AppButton>
        <AppButton variant="danger" size="medium" @click="deleteActiveCategory">삭제</AppButton>
      </template>
    </AppModal>

    <AppModal
      :open="!!showConfirmDeleteItem"
      title="물품 삭제"
      @close="showConfirmDeleteItem = null"
    >
      <p class="t-body-2" style="margin:0">
        <strong>{{ showConfirmDeleteItem?.name }}</strong> 물품을 삭제할까요?
      </p>
      <template #footer>
        <AppButton variant="outline" size="medium" @click="showConfirmDeleteItem = null">취소</AppButton>
        <AppButton
          variant="danger"
          size="medium"
          @click="showConfirmDeleteItem && deleteItem(showConfirmDeleteItem)"
        >
          삭제
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tabsbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 22px;
  border-radius: var(--radius-pill);
  background: #fff;
  border: 2px solid var(--color-line);
  color: var(--color-text-sub);
  font: var(--font-body-1);
  font-size: 17px;
  font-weight: 700;
  transition: all 120ms ease;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(49, 130, 246, 0.25);
}

.itemlist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.itemrow {
  display: grid;
  grid-template-columns: 56px 110px 1fr auto 44px;
  align-items: center;
  gap: 16px;
  padding: 6px 16px 6px 6px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: #fff;
  min-height: 68px;
  transition: border-color 120ms ease, background 120ms ease;
}
.itemrow:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
.grip {
  width: 100%;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tert);
  cursor: grab;
  border-radius: 10px;
  background: var(--color-line-soft);
  touch-action: none;
  transition: all 120ms ease;
}
.grip:hover {
  background: var(--color-line);
  color: var(--color-text-sub);
}
.grip:active {
  cursor: grabbing;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.itemrow__code {
  font: var(--font-body-3);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-tert);
  font-variant-numeric: tabular-nums;
}
.itemrow__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-strong);
}
.itemrow__price {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}
.itemrow__del {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: var(--color-text-tert);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.itemrow__del:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.vstack {
  display: flex;
  flex-direction: column;
}
</style>
