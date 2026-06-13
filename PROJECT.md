# 회원관리 사이트 프로젝트

> 이 문서는 프로젝트의 요구사항과 관련 정보를 정리하는 단일 진실 공급원(Single Source of Truth)입니다.
> 작업 전 항상 이 문서를 먼저 참고하세요.

---

## 1. 프로젝트 개요

- **프로젝트명**:
- **목적/배경**:
- **타겟 사용자**:
- **예상 규모** (동시 접속자 / 회원 수):

---

## 2. 기술 스택

### Frontend

- **프레임워크**: Vue
- **언어**: (TypeScript / JavaScript - 미정)
- **스타일링**: (미정)
- **상태관리**: (Pinia / Vuex - 미정)

### Backend

- **런타임/언어**: Node.js + NestJS
- **프레임워크**: NestJS
- **인증 방식**: (미정)
- **DB 드라이버**: `pg` (node-postgres) — raw query 사용, ORM 미사용

### Database

- **DBMS**: PostgreSQL
- **ORM/ODM**: 사용 안함 (raw SQL)
- **접속 정보**: `.env`로 분리 (커밋 금지)
  - 호스트 / 포트 / DB / 사용자 / 비밀번호는 `.env` 참조
  - 예시 키: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **레거시 백업**: `20260613_marigold0210_DB_Backup.sql` (MariaDB 덤프 — 마이그레이션 소스)

### Infra / 배포

- **호스팅**: (예: Vercel, AWS, Docker)
- **CI/CD**:

---

## 3. 핵심 기능 (Features)

> 미용실 회원/결제/포인트 관리 시스템 (관리자가 사용하는 내부 운영 도구)

### 3.1 인증

- [ ] 로그인 / 로그아웃
- [ ] 비밀번호 변경
- (회원가입은 운영자가 직접 추가하는 형태라 일반 가입 플로우 불필요 — 추후 결정 필요)

### 3.2 회원 검색 & 상세

- [ ] **회원 검색**
  - 검색 키: 성명 또는 전화번호 뒷자리 4자리
  - 검색 결과 리스트 표시 → 항목 선택 시 상세(모달 or 페이지)로 이동
- [ ] **회원 상세 페이지** — 아래 4가지 액션 제공
  - 결제
  - 결제 수정
  - 회원정보 수정
  - 회원정보 삭제

#### 3.2.1 결제 (신규 결제 등록)

- [ ] 결제 항목 입력
  - **코드 찾기** (물품 코드 검색/선택)
  - **품명**
  - **수량**
  - **금액 = 수량 × 단가** (자동 계산)
- [ ] **추가 버튼** → 리스트에 누적 추가 (한 결제 건에 여러 항목)
- [ ] **포인트 사용**
  - 현재 사용 가능 포인트 표시
  - 사용할 포인트 입력 (사용 여부 선택 가능)
- [ ] **이미지 첨부** (시술 전/후 사진 등)
- [ ] **메모 입력**

#### 3.2.2 결제 수정

- [ ] 기존 결제 내역 조회 후 수정
- [ ] 결제 항목, 포인트, 이미지, 메모 모두 수정 가능

#### 3.2.3 회원정보 수정

- [ ] 성명 / 전화번호 / 포인트 수정
- [ ] **수정 이력** 조회 가능 (변경 전/후 + 시각)

#### 3.2.4 회원정보 삭제

- [ ] 회원 삭제 (soft delete 권장 — 결제 내역 보존 위해)

### 3.3 회원 추가

- [ ] 입력 필드: 성명 / 전화번호 / 포인트
- [ ] 전화번호 중복 체크

### 3.4 물품 관리

- [ ] **카테고리(탭) 관리**
  - 기본 탭: 펌 / 컷 / 드라이 / 염색
  - 탭 **추가 / 삭제** 가능
- [ ] **물품 리스트** (각 탭 내부)
  - 항목 추가 / 삭제
  - 항목 정보: 코드 / 품명 / 단가 (등)
- [ ] **드래그 앤 드롭으로 순서 변경**
  - 데스크탑 + **iPad(터치) 환경 모두 지원** (touch event 대응 라이브러리 필요)

### 3.5 회원 순위 / 통계

- [ ] 회원별 누적 포인트 랭킹
- [ ] 기타 통계 (후보)
  - 기간별 매출
  - 카테고리(펌/컷/…)별 매출 비중
  - 신규 회원 수 추이
  - 재방문율 / 회원당 평균 결제 금액
  - 인기 품목 Top N

---

## 4. 데이터 모델 (스키마)

> **실제 DDL: `db/marigold_schema.sql`** (PostgreSQL, 스키마명 `marigold`)
> 레거시 백업(`20260613_marigold0210_DB_Backup.sql`)의 데이터를 이관 대상으로 함 → §4.1 매핑 참고.

### 4.0 개편 요약 (레거시 대비)

- **PK**: `VARCHAR` → `BIGSERIAL`
- **날짜**: `VARCHAR(8)` 'YYYYMMDD' → `TIMESTAMPTZ`
- **무결성**: FK 제약 전면 도입 (레거시는 FK 없음)
- **테이블 통합**: `MEMO` + `SAVE_POINT` + `USE_POINT` → `payments` 컬럼화 (1:1 관계 단순화)
- **테이블 분리**: `ITEMS.type` 하드코딩 → `item_categories` 테이블 (탭 가변 운영)
- **이미지**: `IMAGES.img`(BLOB) → 파일 경로(`payment_images.file_path`)
- **삭제**: `deleted_at` 기반 soft delete
- **감사 로그**: `member_histories` 신설
- **품명 스냅샷**: `payment_items.item_name`로 단가/품명 변경 영향 차단
- **인덱스**: 전화번호 뒷 4자리 검색용 부분 함수 인덱스 (`RIGHT(phone,4)`)
- **트리거**: `updated_at` 자동 갱신
- **이관 추적**: `members.legacy_user_id`, `payments.legacy_pay_id`
- **제외(의미 확인 필요)**: `pay_cls`, `memo_cls` — 분류 의미 확정 시 컬럼 재도입

### 4.1 레거시 스키마 매핑 (MariaDB → PostgreSQL)

| 레거시 테이블 | 레거시 주요 컬럼                                                                  | 신규 테이블        | 비고                                       |
| ------------- | --------------------------------------------------------------------------------- | ------------------ | ------------------------------------------ |
| `LOGIN`       | id, pw                                                                            | `Admin`            | pw는 해시 재적용 필요할 수 있음 (확인)     |
| `USERS`       | user_id, name, phone, point, create_date, visit                                   | `Member`           | `visit`(방문횟수) 컬럼 신규 모델에 추가    |
| `ITEMS`       | item_id, item_nm, pay(=단가), align_id(=정렬), type(=카테고리)                    | `Item` + `ItemCategory` | `type` 값으로 카테고리 분리           |
| `USE_INFO`    | pay_id, user_id, item_id, pay, number, pay_date, pay_cls, item_nm, memo_cls       | `Payment` + `PaymentItem` | 결제 마스터/상세로 분리, `pay_cls` 의미 확인 필요 |
| `SAVE_POINT`  | pay_id, point                                                                     | `Payment.point_earned` (신규 컬럼) | 적립 포인트                |
| `USE_POINT`   | pay_id, point                                                                     | `Payment.point_used`          | 사용 포인트                       |
| `IMAGES`      | row_id, pay_id, img(blob)                                                         | `PaymentImage`     | blob → 파일 저장 후 경로 보관 권장         |
| `MEMO`        | pay_id, memo                                                                      | `Payment.memo`     | 1:1 관계라 마스터에 통합                   |

**확인 필요**:
- `pay_cls`, `memo_cls` 값의 의미 (분류 코드)
- `LOGIN.pw` 해시 알고리즘 (재해시 필요 여부)
- `USERS.create_date`가 `varchar(8)` (YYYYMMDD) → `TIMESTAMP`로 변환
- `IMAGES.img`(mediumblob) → 파일시스템/오브젝트스토리지로 이관 권장



### Admin (운영자 계정 — 로그인 주체, 레거시 `LOGIN`)

| 필드명     | 타입          | 설명            | 비고   |
| ---------- | ------------- | --------------- | ------ |
| id         | BIGSERIAL     | PK              |        |
| login_id   | VARCHAR(20)   | 로그인 ID       | unique |
| password   | VARCHAR(150)  | 해시된 비밀번호 |        |
| name       | VARCHAR(50)   | 이름 (옵션)     |        |
| created_at | TIMESTAMPTZ   |                 | default now() |
| updated_at | TIMESTAMPTZ   |                 |        |

### Member (회원 = 미용실 고객)

| 필드명     | 타입         | 설명                       | 비고                       |
| ---------- | ------------ | -------------------------- | -------------------------- |
| id         | BIGSERIAL    | PK                         |                            |
| name       | VARCHAR(50)  | 성명                       | index                      |
| phone      | VARCHAR(20)  | 전화번호                   | unique, index (뒤 4자리 검색용) |
| point      | INTEGER      | 보유 포인트                | default 0                  |
| visit      | INTEGER      | 누적 방문 횟수             | default 0 (레거시 호환)    |
| memo       | TEXT         | 메모 (옵션)                |                            |
| created_at | TIMESTAMPTZ  |                            | default now()              |
| updated_at | TIMESTAMPTZ  |                            |                            |
| deleted_at | TIMESTAMPTZ  | soft delete                | nullable                   |

### MemberHistory (회원정보 수정 이력)

| 필드명     | 타입         | 설명                         | 비고      |
| ---------- | ------------ | ---------------------------- | --------- |
| id         | BIGSERIAL    | PK                           |           |
| member_id  | BIGINT       | 대상 회원                    | FK        |
| field      | VARCHAR(30)  | 변경 필드 (name/phone/point) |           |
| before_val | VARCHAR(255) | 변경 전                      |           |
| after_val  | VARCHAR(255) | 변경 후                      |           |
| changed_by | BIGINT       | 작업한 관리자                | FK Admin  |
| created_at | TIMESTAMPTZ  |                              | default now() |

### ItemCategory (물품 카테고리 / 탭)

| 필드명     | 타입         | 설명                  | 비고      |
| ---------- | ------------ | --------------------- | --------- |
| id         | BIGSERIAL    | PK                    |           |
| name       | VARCHAR(30)  | 탭 이름 (펌/컷/...)   | unique    |
| sort_order | INTEGER      | 탭 정렬 순서          |           |
| created_at | TIMESTAMPTZ  |                       | default now() |

### Item (물품, 레거시 `ITEMS`)

| 필드명      | 타입         | 설명                | 비고                 |
| ----------- | ------------ | ------------------- | -------------------- |
| id          | BIGSERIAL    | PK                  |                      |
| category_id | BIGINT       | 소속 카테고리       | FK ItemCategory      |
| code        | VARCHAR(20)  | 상품 코드 (item_id) | unique               |
| name        | VARCHAR(50)  | 품명                |                      |
| price       | INTEGER      | 단가                |                      |
| sort_order  | INTEGER      | 카테고리 내 순서    | 드래그앤드롭 정렬용  |
| is_active   | BOOLEAN      | 사용 여부           | default true         |
| created_at  | TIMESTAMPTZ  |                     | default now()        |

### Payment (결제 마스터)

| 필드명         | 타입         | 설명                          | 비고      |
| -------------- | ------------ | ----------------------------- | --------- |
| id             | BIGSERIAL    | PK                            |           |
| member_id      | BIGINT       | 회원                          | FK Member |
| total_amount   | INTEGER      | 결제 항목 합계                |           |
| point_used     | INTEGER      | 사용 포인트 (USE_POINT)       | default 0 |
| point_earned   | INTEGER      | 적립 포인트 (SAVE_POINT)      | default 0 |
| final_amount   | INTEGER      | 실 결제 금액 (total - used)   |           |
| memo           | TEXT         | 메모                          |           |
| created_by     | BIGINT       | 작업 관리자                   | FK Admin  |
| created_at     | TIMESTAMPTZ  |                               | default now() |
| updated_at     | TIMESTAMPTZ  |                               |           |

### PaymentItem (결제 상세 - 1:N, 레거시 `USE_INFO`)

| 필드명      | 타입         | 설명               | 비고      |
| ----------- | ------------ | ------------------ | --------- |
| id          | BIGSERIAL    | PK                 |           |
| payment_id  | BIGINT       | 결제 마스터        | FK        |
| item_id     | BIGINT       | 물품               | FK Item   |
| item_name   | VARCHAR(50)  | 스냅샷 (당시 품명) |           |
| unit_price  | INTEGER      | 스냅샷 (당시 단가) |           |
| quantity    | INTEGER      | 수량               |           |
| amount      | INTEGER      | 수량 × 단가        |           |

### PaymentImage (결제 첨부 이미지, 레거시 `IMAGES`)

| 필드명     | 타입         | 설명             | 비고      |
| ---------- | ------------ | ---------------- | --------- |
| id         | BIGSERIAL    | PK               |           |
| payment_id | BIGINT       | 결제             | FK        |
| file_path  | VARCHAR(255) | 저장 경로/URL    |           |
| created_at | TIMESTAMPTZ  |                  | default now() |

---

## 5. 페이지 구성 (라우팅)

| 경로                          | 설명                          | 권한   |
| ----------------------------- | ----------------------------- | ------ |
| `/login`                      | 로그인                        | 공개   |
| `/`                           | 메인 (회원 검색)              | 로그인 |
| `/members/new`                | 회원 추가                     | 로그인 |
| `/members/:id`                | 회원 상세 (액션 진입점)       | 로그인 |
| `/members/:id/payments/new`   | 결제 등록                     | 로그인 |
| `/members/:id/payments/:pid`  | 결제 수정                     | 로그인 |
| `/members/:id/edit`           | 회원 정보 수정 / 이력         | 로그인 |
| `/items`                      | 물품 관리 (탭/리스트/DnD)     | 로그인 |
| `/stats`                      | 회원 순위 / 통계              | 로그인 |
| `/account/password`           | 비밀번호 변경                 | 로그인 |

---

## 6. API 명세 (요약)

### 인증

| Method | 경로                       | 설명          | 권한   |
| ------ | -------------------------- | ------------- | ------ |
| POST   | `/api/auth/login`          | 로그인        | 공개   |
| POST   | `/api/auth/logout`         | 로그아웃      | 로그인 |
| PATCH  | `/api/auth/password`       | 비밀번호 변경 | 로그인 |

### 회원

| Method | 경로                                | 설명                            | 권한   |
| ------ | ----------------------------------- | ------------------------------- | ------ |
| GET    | `/api/members?q={성명\|전화4자리}`  | 회원 검색                       | 로그인 |
| POST   | `/api/members`                      | 회원 추가                       | 로그인 |
| GET    | `/api/members/:id`                  | 회원 상세                       | 로그인 |
| PATCH  | `/api/members/:id`                  | 회원 정보 수정 (이력 자동 기록) | 로그인 |
| DELETE | `/api/members/:id`                  | 회원 삭제 (soft)                | 로그인 |
| GET    | `/api/members/:id/history`          | 수정 이력 조회                  | 로그인 |
| GET    | `/api/members/:id/payments`         | 결제 목록                       | 로그인 |

### 결제

| Method | 경로                       | 설명                                  | 권한   |
| ------ | -------------------------- | ------------------------------------- | ------ |
| POST   | `/api/payments`            | 결제 등록 (items + 포인트 + 메모/이미지) | 로그인 |
| GET    | `/api/payments/:id`        | 결제 상세                             | 로그인 |
| PATCH  | `/api/payments/:id`        | 결제 수정                             | 로그인 |
| POST   | `/api/payments/:id/images` | 이미지 업로드                         | 로그인 |
| DELETE | `/api/payments/:id/images/:imgId` | 이미지 삭제                    | 로그인 |

### 물품 / 카테고리

| Method | 경로                                | 설명                       | 권한   |
| ------ | ----------------------------------- | -------------------------- | ------ |
| GET    | `/api/item-categories`              | 카테고리(탭) 목록          | 로그인 |
| POST   | `/api/item-categories`              | 카테고리 추가              | 로그인 |
| DELETE | `/api/item-categories/:id`          | 카테고리 삭제              | 로그인 |
| PATCH  | `/api/item-categories/reorder`      | 탭 순서 일괄 변경 (DnD)    | 로그인 |
| GET    | `/api/items?categoryId=`            | 물품 목록 (카테고리별)     | 로그인 |
| GET    | `/api/items/search?code=` / `?q=`   | 코드/품명 검색 (결제용)    | 로그인 |
| POST   | `/api/items`                        | 물품 추가                  | 로그인 |
| PATCH  | `/api/items/:id`                    | 물품 수정                  | 로그인 |
| DELETE | `/api/items/:id`                    | 물품 삭제                  | 로그인 |
| PATCH  | `/api/items/reorder`                | 물품 순서 일괄 변경 (DnD)  | 로그인 |

### 통계

| Method | 경로                       | 설명                          | 권한   |
| ------ | -------------------------- | ----------------------------- | ------ |
| GET    | `/api/stats/ranking`       | 회원 포인트 랭킹              | 로그인 |
| GET    | `/api/stats/sales`         | 기간별 매출 (?from=&to=)      | 로그인 |
| GET    | `/api/stats/categories`    | 카테고리별 매출 비중          | 로그인 |
| GET    | `/api/stats/items`         | 인기 품목 Top N               | 로그인 |

---

## 7. UI/UX 요구사항

- **디자인 컨셉**:
- **반응형**: (모바일/태블릿/PC)
- **다국어**: (필요 여부)
- **다크모드**: (필요 여부)
- **참고 사이트**:

---

## 8. 보안 / 정책

- **비밀번호 정책**: (최소 길이, 특수문자 등)
- **세션/토큰 만료 시간**:
- **개인정보 처리방침 필요 여부**:
- **로그인 시도 제한**:

---

## 9. 외부 연동

- (이메일 발송 서비스, SMS, 결제 등)

---

## 10. 개발 진행 상황

### 진행 중

-

### 완료

-

### 보류 / 이슈

- ***

## 11. 메모 / 결정사항 로그

- `YYYY-MM-DD`:

---

## 12. 참고 자료

-
