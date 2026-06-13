<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Save, History } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { membersApi, type Member, type MemberHistory } from '@/api/members'
import { errorMessage } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { formatKoreanPhoneTyping, stripPhone } from '@/utils/phone'

const props = defineProps<{ id: string }>()
const router = useRouter()
const toast = useToast()

const original = ref<Member | null>(null)
const name = ref('')
const phone = ref('')
const point = ref('')
const memo = ref('')
const history = ref<MemberHistory[]>([])
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const [m, h] = await Promise.all([
      membersApi.get(Number(props.id)),
      membersApi.history(Number(props.id)),
    ])
    original.value = m
    name.value = m.name
    phone.value = formatKoreanPhoneTyping(m.phone ?? '')
    point.value = String(m.point)
    memo.value = m.memo ?? ''
    history.value = h
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  if (!original.value) return
  saving.value = true
  try {
    const body: Record<string, unknown> = {}
    if (name.value.trim() !== original.value.name) body.name = name.value.trim()
    const phoneClean = stripPhone(phone.value)
    if ((phoneClean || '') !== (original.value.phone ?? '')) body.phone = phoneClean
    if (Number(point.value) !== original.value.point) body.point = Number(point.value)
    if ((memo.value || '') !== (original.value.memo ?? '')) body.memo = memo.value
    if (Object.keys(body).length === 0) {
      toast.info('변경된 내용이 없습니다.')
      saving.value = false
      return
    }
    await membersApi.update(original.value.id, body)
    toast.success('회원 정보가 수정되었습니다.')
    router.replace(`/members/${original.value.id}`)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

function fieldLabel(f: string) {
  return (
    { name: '성명', phone: '전화번호', point: '포인트', memo: '메모' }[f] ?? f
  )
}
function fmtTs(s: string) {
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="page">
    <button class="back" type="button" @click="router.back()">
      <ChevronLeft :size="22" />
      <span>뒤로</span>
    </button>

    <h1 class="t-title-1" style="margin-bottom: 24px">회원정보 수정</h1>

    <div v-if="loading" class="t-body-2 text-tert">불러오는 중...</div>

    <template v-else>
      <AppCard padding="lg">
        <form class="form" @submit.prevent="save">
          <AppInput v-model="name" label="성명" :maxlength="50" />
          <AppInput
            :model-value="phone"
            label="전화번호"
            inputmode="numeric"
            placeholder="010-1234-5678"
            :maxlength="13"
            @update:modelValue="(v) => (phone = formatKoreanPhoneTyping(v))"
          />
          <AppInput v-model="point" label="포인트" inputmode="numeric" />
          <AppInput v-model="memo" label="메모" />

          <div class="form__actions">
            <AppButton variant="outline" size="large" type="button" @click="router.back()">
              취소
            </AppButton>
            <AppButton variant="primary" size="large" type="submit" :loading="saving" block>
              <Save :size="18" />
              <span>저장</span>
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard padding="lg" style="margin-top: 24px">
        <template #header>
          <h3 class="card__title" style="display:inline-flex;align-items:center;gap:8px;margin:0;font:var(--font-title-2);color:var(--color-text-strong)">
            <History :size="20" />
            수정 이력
          </h3>
        </template>
        <div v-if="history.length === 0" class="t-body-2 text-tert">이력이 없습니다.</div>
        <table v-else class="hist">
          <thead>
            <tr>
              <th>일시</th>
              <th>항목</th>
              <th>변경 전</th>
              <th>변경 후</th>
              <th>작업자</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td class="num">{{ fmtTs(h.created_at) }}</td>
              <td>{{ fieldLabel(h.field) }}</td>
              <td>{{ h.before_val ?? '—' }}</td>
              <td>{{ h.after_val ?? '—' }}</td>
              <td>{{ h.changed_by ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 52px;
  padding: 0 18px;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-sub);
  border-radius: 12px;
  margin-bottom: 16px;
}
.back:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-strong);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.hist {
  font: var(--font-body-3);
}
.hist th,
.hist td {
  text-align: left;
  padding: 12px 8px;
  border-bottom: 1px solid var(--color-line-soft);
}
.hist th {
  font: var(--font-caption);
  color: var(--color-text-tert);
  font-weight: 500;
}
.hist td {
  color: var(--color-text);
}
</style>
