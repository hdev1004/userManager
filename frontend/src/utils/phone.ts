// 한국 휴대폰 번호 포맷 유틸
// 정규식 사용 이유: /\D/g 한 줄로 "숫자 아닌 모든 문자 제거"라는 의도가 명확.
// 외부 라이브러리(maska, libphonenumber-js 등) 도입 비용 대비 이득 없음.

/** 입력 도중 호출되는 포맷터 — 진행형 표시 (010-, 010-1234, 010-1234-5678) */
export function formatKoreanPhoneTyping(raw: string | null | undefined): string {
  const d = String(raw ?? '')
    .replace(/\D/g, '') // 숫자 외 모두 제거 (대시, 공백 포함)
    .slice(0, 11)        // 11자리에서 추가 입력 차단
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

/** 표시용 포맷터 — 11자리(휴대폰) / 10자리(구형 또는 지역번호) 자동 분기 */
export function formatKoreanPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  const t = String(raw).replace(/\D/g, '')
  if (t.length === 11) return `${t.slice(0, 3)}-${t.slice(3, 7)}-${t.slice(7)}`
  if (t.length === 10) return `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}`
  return String(raw)
}

/** 서버 전송용 — 숫자만 남김 */
export function stripPhone(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\D/g, '')
}
