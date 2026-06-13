<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, Minus, Trash2, Tag } from 'lucide-vue-next'
import { categoriesApi, itemsApi, type Category, type Item } from '@/api/items'
import type { PaymentItemInput } from '@/api/payments'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  modelValue: PaymentItemInput[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: PaymentItemInput[]): void
}>()

const toast = useToast()
const categories = ref<Category[]>([])
const items = ref<Item[]>([])
const activeCatId = ref<number | null>(null)
const loading = ref(false)

const filtered = computed(() =>
  items.value.filter((i) => i.category_id === activeCatId.value && i.is_active),
)

async function load() {
  loading.value = true
  try {
    const [cats, its] = await Promise.all([categoriesApi.list(), itemsApi.list()])
    categories.value = cats
    items.value = its
    if (cats[0]) activeCatId.value = cats[0].id
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function update(next: PaymentItemInput[]) {
  emit('update:modelValue', next)
}

function addFromItem(it: Item) {
  const existing = props.modelValue.findIndex(
    (x) => x.item_id === it.id && x.item_name === it.name && x.unit_price === it.price,
  )
  if (existing >= 0) {
    patch(existing, { quantity: (props.modelValue[existing]?.quantity ?? 0) + 1 })
  } else {
    update([
      ...props.modelValue,
      { item_id: it.id, item_name: it.name, unit_price: it.price, quantity: 1 },
    ])
  }
}

function addManual() {
  update([
    ...props.modelValue,
    { item_id: null, item_name: '', unit_price: 0, quantity: 1 },
  ])
}

function patch(idx: number, patch: Partial<PaymentItemInput>) {
  const list = props.modelValue.map((row, i): PaymentItemInput =>
    i === idx ? { ...row, ...patch } : row,
  )
  update(list)
}
function setName(idx: number, v: string) {
  patch(idx, { item_name: v })
}
function setPrice(idx: number, v: number) {
  patch(idx, { unit_price: Number.isFinite(v) ? Math.max(0, v) : 0 })
}
function setQty(idx: number, v: number) {
  patch(idx, { quantity: Math.max(1, Math.floor(v) || 1) })
}
function inc(idx: number) {
  const row = props.modelValue[idx]
  if (row) setQty(idx, row.quantity + 1)
}
function dec(idx: number) {
  const row = props.modelValue[idx]
  if (row) setQty(idx, row.quantity - 1)
}
function remove(idx: number) {
  update(props.modelValue.filter((_, i) => i !== idx))
}

const total = computed(() =>
  props.modelValue.reduce((s, x) => s + x.unit_price * x.quantity, 0),
)
</script>

<template>
  <div class="picker">
    <header v-if="categories.length > 0" class="picker__tabs">
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        class="tab"
        :class="{ 'tab--active': activeCatId === c.id }"
        @click="activeCatId = c.id"
      >
        <Tag :size="14" />
        <span>{{ c.name }}</span>
      </button>
    </header>

    <div v-if="loading" class="picker__loading t-body-2 text-tert">불러오는 중...</div>
    <div v-else-if="filtered.length === 0 && categories.length === 0" class="picker__empty t-body-2 text-tert">
      등록된 카테고리가 없습니다.
    </div>
    <div v-else class="grid">
      <button
        v-for="it in filtered"
        :key="it.id"
        type="button"
        class="item"
        @click="addFromItem(it)"
      >
        <span class="item__code">{{ it.code }}</span>
        <span class="item__name">{{ it.name }}</span>
        <span class="item__price num">{{ it.price.toLocaleString() }}원</span>
      </button>
      <button type="button" class="item item--manual" @click="addManual">
        <Plus :size="22" />
        <span class="item__manual-label">직접 추가</span>
      </button>
    </div>
  </div>

  <div class="cart">
    <header class="cart__head">
      <h4 class="cart__title">결제 목록</h4>
      <span class="cart__count num">{{ modelValue.length }}개 항목</span>
    </header>

    <div v-if="modelValue.length === 0" class="cart__empty t-body-2 text-tert">
      위 카드를 눌러 항목을 추가하세요.
    </div>

    <div v-else class="cart__list">
      <div v-for="(row, idx) in modelValue" :key="idx" class="row">
        <input
          class="row__name"
          :value="row.item_name"
          placeholder="품명"
          @input="setName(idx, ($event.target as HTMLInputElement).value)"
        />
        <input
          class="row__price num"
          inputmode="numeric"
          :value="row.unit_price"
          placeholder="0"
          @input="setPrice(idx, Number(($event.target as HTMLInputElement).value))"
        />
        <div class="qty">
          <button type="button" class="qty__btn" :disabled="row.quantity <= 1" @click="dec(idx)">
            <Minus :size="14" />
          </button>
          <input
            class="qty__num num"
            inputmode="numeric"
            :value="row.quantity"
            @input="setQty(idx, Number(($event.target as HTMLInputElement).value))"
          />
          <button type="button" class="qty__btn" @click="inc(idx)">
            <Plus :size="14" />
          </button>
        </div>
        <div class="row__amount num">{{ (row.unit_price * row.quantity).toLocaleString() }}원</div>
        <button type="button" class="row__del" aria-label="삭제" @click="remove(idx)">
          <Trash2 :size="16" />
        </button>
      </div>
    </div>

    <footer v-if="modelValue.length > 0" class="cart__foot">
      <span class="t-body-2 text-sub">합계</span>
      <span class="num cart__total">{{ total.toLocaleString() }}원</span>
    </footer>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.picker__tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: -4px;
}
.picker__tabs::-webkit-scrollbar {
  display: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-hover);
  color: var(--color-text-sub);
  font: var(--font-body-3);
  white-space: nowrap;
  transition: all 120ms ease;
}
.tab:hover {
  background: var(--color-line);
}
.tab--active {
  background: var(--color-primary);
  color: #fff;
}

.picker__loading,
.picker__empty {
  padding: 32px;
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 120ms ease;
  min-height: 88px;
}
.item:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  transform: translateY(-1px);
}
.item:active {
  transform: translateY(0);
}
.item__code {
  font: var(--font-tiny);
  color: var(--color-text-tert);
  font-variant-numeric: tabular-nums;
}
.item__name {
  font: var(--font-body-3);
  font-weight: 600;
  color: var(--color-text-strong);
  line-height: 18px;
  word-break: break-all;
}
.item__price {
  margin-top: auto;
  font: var(--font-body-3);
  font-weight: 700;
  color: var(--color-primary);
}
.item--manual {
  align-items: center;
  justify-content: center;
  background: var(--color-bg-page);
  color: var(--color-text-sub);
  border-style: dashed;
}
.item--manual:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-line);
  color: var(--color-text-strong);
  transform: none;
}
.item__manual-label {
  font: var(--font-body-3);
}

.cart {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cart__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cart__title {
  margin: 0;
  font: var(--font-title-3);
  color: var(--color-text-strong);
}
.cart__count {
  font: var(--font-caption);
  color: var(--color-text-tert);
}
.cart__empty {
  padding: 32px;
  text-align: center;
  border: 1px dashed var(--color-line);
  border-radius: 14px;
}
.cart__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: grid;
  grid-template-columns: 1.5fr 1fr auto auto 32px;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: #fff;
}
.row__name,
.row__price {
  height: 40px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  padding: 0 10px;
  font: var(--font-body-3);
  color: var(--color-text-strong);
  outline: none;
  width: 100%;
  min-width: 0;
}
.row__name:focus,
.row__price:focus {
  border-color: var(--color-primary);
  background: #fff;
}
.row__price {
  text-align: right;
}
.qty {
  display: inline-flex;
  align-items: center;
  height: 36px;
  border-radius: 10px;
  background: var(--color-bg-hover);
  padding: 0 4px;
}
.qty__btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--color-text-sub);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.qty__btn:hover:not(:disabled) {
  background: #fff;
  color: var(--color-text-strong);
}
.qty__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.qty__num {
  width: 36px;
  height: 28px;
  border: none;
  background: transparent;
  text-align: center;
  font: var(--font-body-3);
  font-weight: 600;
  color: var(--color-text-strong);
  outline: none;
}
.row__amount {
  text-align: right;
  font: var(--font-body-3);
  font-weight: 700;
  color: var(--color-text-strong);
  white-space: nowrap;
  padding: 0 4px;
}
.row__del {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--color-text-tert);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.row__del:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.cart__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px 0;
  border-top: 1px solid var(--color-line-soft);
  margin-top: 4px;
}
.cart__total {
  font: var(--font-title-2);
  color: var(--color-text-strong);
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .row {
    grid-template-columns: 1fr 1fr auto;
    grid-template-rows: auto auto;
  }
  .row__name {
    grid-column: 1 / 3;
  }
  .row__price {
    grid-column: 1;
    grid-row: 2;
  }
  .qty {
    grid-column: 2;
    grid-row: 2;
  }
  .row__amount {
    grid-column: 3;
    grid-row: 1 / 3;
    align-self: center;
  }
  .row__del {
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
  }
}
</style>
