# MARIGOLD 마이그레이션 도구

레거시 MariaDB `mysqldump` 백업 → PostgreSQL `marigold` 스키마 임포트 스크립트 모음.

## 사전 준비

1. PostgreSQL 접속 정보를 환경변수로 설정 (루트 `.env` 값과 동일)

   **bash / WSL / Linux 서버:**
   ```bash
   export PGHOST=...
   export PGPORT=...
   export PGDATABASE=postgres
   export PGUSER=postgres
   export PGPASSWORD='...'
   ```

   **Windows PowerShell:**
   ```powershell
   $env:PGHOST='...'
   $env:PGPORT='...'
   $env:PGDATABASE='postgres'
   $env:PGUSER='postgres'
   $env:PGPASSWORD='...'
   ```

   루트 `.env` 가 이미 있다면 도움 스니펫:
   ```bash
   set -a; . ../../.env; set +a
   export PGHOST=$DB_HOST PGPORT=$DB_PORT PGDATABASE=$DB_NAME PGUSER=$DB_USER PGPASSWORD=$DB_PASSWORD
   ```

2. 의존성 설치 (이 폴더에서)
   ```bash
   cd db/migrate
   npm install
   ```

## 전체 임포트 (원샷)

```bash
node import-all.cjs <backup.sql> <upload-root> [admin_password]
```

예시 (프로젝트 루트에 `backup.sql` 두고 `uploads/` 폴더 사용):

```bash
node import-all.cjs ../../backup.sql ../../uploads marigold
```

이 명령이 순서대로 실행:

1. `apply-schema.cjs` — `marigold` 스키마가 없으면 생성
2. `reset.cjs --yes` — 기존 데이터 모두 비움 (스키마는 유지)
3. `import-data.cjs` — `LOGIN / USERS / ITEMS / USE_INFO / MEMO / SAVE_POINT / USE_POINT` 임포트
4. `import-images.cjs` — `IMAGES` (base64) 를 파일로 추출 + `payment_images` 메타 적재
5. `set-admin-password.cjs marigold <pw>` — `marigold` 관리자 비번 리셋

종료 후 `marigold / <비번>` 으로 로그인 가능.

## 개별 스크립트

| 스크립트 | 용도 |
|----------|------|
| `node apply-schema.cjs` | `db/marigold_schema.sql` 적용. 이미 존재하면 노옵. |
| `node reset.cjs [--yes]` | 모든 데이터 TRUNCATE (스키마/제약 유지). 카테고리 시드 재삽입. |
| `node import-data.cjs <backup.sql>` | 이미지 제외 전 테이블 임포트. 기존 데이터 있으면 abort. |
| `node import-images.cjs <backup.sql> <upload-root>` | BLOB 이미지를 파일로 추출 + DB 메타 적재. |
| `node set-admin-password.cjs <login_id> <password>` | 관리자 비번 bcrypt 해시로 설정. 없으면 생성. |
| `node import-all.cjs <backup.sql> <upload-root> [pw]` | 위 4개 + 관리자 비번을 순서대로 실행. |

## 알려진 동작

- **`members.phone` 제약 완화**: 레거시 USERS 에 `phone='0'` 다수 + 중복 번호 존재.
  최초 임포트 시 NOT NULL 과 UNIQUE 부분 인덱스를 제거함.
  운영 시작 전 정리 후 다시 추가 권장.
- **`LOGIN.pw`** (MySQL old hash) 는 NestJS 가 검증 불가 → `set-admin-password.cjs` 로 bcrypt 재해시 필수.
- **`pay_cls` / `memo_cls`** 컬럼은 의미 미확정이라 현재 임포트하지 않음.
- **고아 결제**: `USE_INFO.user_id` 가 `USERS` 에 없는 경우 결제 자체를 건너뜀 (보통 몇 건).
  이미지도 마찬가지로 매칭 안 되면 skip.
- **재실행 안전성**: `import-data.cjs` / `import-images.cjs` 모두 "대상 테이블 비어있을 때만" 동작.
  덮어쓰기/병합은 의도적으로 지원하지 않음. 재임포트 = `reset.cjs` 부터.

## 트러블슈팅

- **`스키마 이미 존재`** → `reset.cjs` 로 비우면 됨. 완전 재생성이 필요하면
  `DROP SCHEMA marigold CASCADE;` 수동 실행 후 다시.
- **`bcrypt` 설치 실패 (windows-build-tools)** → Node 22+ 면 prebuilt 가 보통 잘 들어옴.
  안 되면 `npm i bcryptjs` 로 바꿔 사용해도 됨 (API 동일).
- **메모리 부족 (대용량 IMAGES)** → `import-images.cjs` 는 line-by-line 스트리밍이라 보통 OK.
  그래도 부족하면 `node --max-old-space-size=2048 import-images.cjs ...`.
