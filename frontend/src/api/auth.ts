import { api } from './client'

export interface LoginResponse {
  token: string
  admin: { id: number; loginId: string; name: string | null }
}

export const authApi = {
  login(loginId: string, password: string) {
    return api.post<LoginResponse>('/auth/login', { loginId, password }).then((r) => r.data)
  },
  logout() {
    return api.post('/auth/logout').then(() => undefined)
  },
  changePassword(currentPassword: string, newPassword: string) {
    return api.patch('/auth/password', { currentPassword, newPassword }).then((r) => r.data)
  },
}
