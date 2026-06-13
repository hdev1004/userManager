import { api } from './client'

export interface MemberSummary {
  id: number
  name: string
  phone: string | null
  point: number
  visit_count: number
  updated_at: string
}
export interface Member extends MemberSummary {
  memo: string | null
  created_at: string
}
export interface MemberHistory {
  id: number
  field: string
  before_val: string | null
  after_val: string | null
  changed_by: string | null
  created_at: string
}
export interface PaymentSummary {
  id: number
  paid_at: string
  total_amount: number
  point_used: number
  point_earned: number
  final_amount: number
  memo: string | null
  items: Array<{
    id: number
    item_name: string
    unit_price: number
    quantity: number
    amount: number
  }>
  images: Array<{ id: number; file_path: string }>
}

export type PaymentFilter = 'all' | 'point_used' | 'point_earned'

export interface PaymentPage {
  rows: PaymentSummary[]
  has_more: boolean
}

export const membersApi = {
  search(q: string) {
    return api.get<MemberSummary[]>('/members', { params: { q } }).then((r) => r.data)
  },
  get(id: number) {
    return api.get<Member>(`/members/${id}`).then((r) => r.data)
  },
  create(body: { name: string; phone?: string; point?: number; memo?: string }) {
    return api.post<Member>('/members', body).then((r) => r.data)
  },
  update(
    id: number,
    body: { name?: string; phone?: string; point?: number; memo?: string },
  ) {
    return api.patch<Member>(`/members/${id}`, body).then((r) => r.data)
  },
  remove(id: number) {
    return api.delete(`/members/${id}`).then(() => undefined)
  },
  history(id: number) {
    return api.get<MemberHistory[]>(`/members/${id}/history`).then((r) => r.data)
  },
  payments(
    id: number,
    opts: { offset?: number; limit?: number; filter?: PaymentFilter } = {},
  ) {
    return api
      .get<PaymentPage>(`/members/${id}/payments`, { params: opts })
      .then((r) => r.data)
  },
}
