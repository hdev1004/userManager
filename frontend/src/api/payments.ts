import { api } from './client'

export interface PaymentItemInput {
  item_id?: number | null
  item_name: string
  unit_price: number
  quantity: number
}

export interface Payment {
  id: number
  member_id: number
  paid_at: string
  total_amount: number
  point_used: number
  point_earned: number
  final_amount: number
  memo: string | null
  member_name?: string
  member_phone?: string | null
  items: Array<{
    id: number
    item_id: number | null
    item_name: string
    unit_price: number
    quantity: number
    amount: number
  }>
  images: Array<{ id: number; file_path: string }>
}

export const paymentsApi = {
  create(body: {
    member_id: number
    items: PaymentItemInput[]
    point_used?: number
    point_earned?: number
    memo?: string
  }) {
    return api.post<Payment>('/payments', body).then((r) => r.data)
  },
  get(id: number) {
    return api.get<Payment>(`/payments/${id}`).then((r) => r.data)
  },
  update(
    id: number,
    body: {
      items?: PaymentItemInput[]
      point_used?: number
      point_earned?: number
      memo?: string
    },
  ) {
    return api.patch<Payment>(`/payments/${id}`, body).then((r) => r.data)
  },
  uploadImage(id: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<{ id: number; file_path: string }>(`/payments/${id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  removeImage(id: number, imgId: number) {
    return api.delete(`/payments/${id}/images/${imgId}`).then(() => undefined)
  },
}
