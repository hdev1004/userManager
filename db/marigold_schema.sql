-- =============================================================================
-- MARIGOLD — 미용실 회원/결제 관리 시스템 스키마 (PostgreSQL)
-- =============================================================================
-- 레거시(MariaDB) 백업: 20260613_marigold0210_DB_Backup.sql
--
-- 주요 개편 사항
--   1. PK: VARCHAR → BIGSERIAL
--   2. 날짜: VARCHAR(8) 'YYYYMMDD' → TIMESTAMPTZ / DATE
--   3. FK 제약 전면 도입
--   4. 통합: MEMO + SAVE_POINT + USE_POINT → payments 컬럼화
--   5. 분리: ITEMS.type → item_categories 테이블 (탭 가변 운영)
--   6. IMAGES.img(BLOB) → 파일 경로 저장(payment_images.file_path)
--   7. soft delete (deleted_at) / created_at / updated_at 표준화
--   8. updated_at 자동 갱신 트리거
--   9. 회원정보 수정 이력 테이블(member_histories) 신설
--   10. legacy_* 컬럼으로 이관 추적
-- =============================================================================

-- PostgreSQL은 식별자를 소문자로 폴드함. 'MARIGOLD'는 실제로 'marigold'로 저장됨.
-- 따옴표 없이 MARIGOLD.xxx / marigold.xxx 어느 쪽으로 쿼리해도 동작.

CREATE SCHEMA IF NOT EXISTS marigold;
SET search_path TO marigold, public;


-- =============================================================================
-- 공용 함수: updated_at 자동 갱신
-- =============================================================================
CREATE OR REPLACE FUNCTION marigold.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 1. admins — 운영자 계정 (레거시: LOGIN)
-- =============================================================================
CREATE TABLE marigold.admins (
    id          BIGSERIAL    PRIMARY KEY,
    login_id    VARCHAR(30)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,                       -- bcrypt/argon2 해시 권장
    name        VARCHAR(50),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON marigold.admins
    FOR EACH ROW EXECUTE FUNCTION marigold.set_updated_at();

COMMENT ON TABLE  marigold.admins IS '운영자 계정 (레거시 LOGIN 대체)';
COMMENT ON COLUMN marigold.admins.password IS '해시된 비밀번호 (bcrypt/argon2 권장, 레거시 MySQL old_password 재해시 필요)';


-- =============================================================================
-- 2. members — 회원 (레거시: USERS)
-- =============================================================================
CREATE TABLE marigold.members (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    point           INTEGER      NOT NULL DEFAULT 0 CHECK (point >= 0),
    visit_count     INTEGER      NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
    memo            TEXT,
    legacy_user_id  VARCHAR(20),                              -- 이관 추적용 (USERS.user_id)
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- 활성 회원에 한해 전화번호 유니크 (탈퇴 후 동일 번호 재가입 허용)
CREATE UNIQUE INDEX uq_members_phone_active
    ON marigold.members(phone)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_members_name
    ON marigold.members(name)
    WHERE deleted_at IS NULL;

-- 전화번호 뒷 4자리 검색용 부분 함수 인덱스
CREATE INDEX idx_members_phone_tail4
    ON marigold.members(RIGHT(phone, 4))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_members_legacy
    ON marigold.members(legacy_user_id)
    WHERE legacy_user_id IS NOT NULL;

CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON marigold.members
    FOR EACH ROW EXECUTE FUNCTION marigold.set_updated_at();

COMMENT ON TABLE  marigold.members IS '회원(미용실 고객)';
COMMENT ON COLUMN marigold.members.visit_count IS '누적 방문 횟수 (레거시 USERS.visit 호환)';
COMMENT ON COLUMN marigold.members.legacy_user_id IS '레거시 USERS.user_id (이관 추적)';


-- =============================================================================
-- 3. member_histories — 회원정보 수정 이력 (신규)
-- =============================================================================
CREATE TABLE marigold.member_histories (
    id          BIGSERIAL    PRIMARY KEY,
    member_id   BIGINT       NOT NULL REFERENCES marigold.members(id) ON DELETE CASCADE,
    field       VARCHAR(30)  NOT NULL,                       -- name | phone | point | ...
    before_val  VARCHAR(255),
    after_val   VARCHAR(255),
    changed_by  BIGINT       REFERENCES marigold.admins(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_histories_member
    ON marigold.member_histories(member_id, created_at DESC);

COMMENT ON TABLE marigold.member_histories IS '회원정보 변경 이력 (필드 단위)';


-- =============================================================================
-- 4. item_categories — 물품 카테고리 / 탭 (신규: ITEMS.type 분리)
-- =============================================================================
CREATE TABLE marigold.item_categories (
    id          BIGSERIAL    PRIMARY KEY,
    code        VARCHAR(10)  NOT NULL UNIQUE,                -- PER/CUT/DRY/DYE 등
    name        VARCHAR(30)  NOT NULL,                       -- 표시명 (펌/컷/드라이/염색)
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_item_categories_name_active
    ON marigold.item_categories(name)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_item_categories_sort
    ON marigold.item_categories(sort_order)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE marigold.item_categories IS '물품 카테고리(탭). 탭 추가/삭제/순서 변경 가능';


-- =============================================================================
-- 5. items — 물품 (레거시: ITEMS)
-- =============================================================================
CREATE TABLE marigold.items (
    id           BIGSERIAL    PRIMARY KEY,
    category_id  BIGINT       NOT NULL REFERENCES marigold.item_categories(id),
    code         VARCHAR(20)  NOT NULL,                      -- 레거시 item_id (사용자 입력)
    name         VARCHAR(50)  NOT NULL,
    price        INTEGER      NOT NULL DEFAULT 0 CHECK (price >= 0),
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_items_code_active
    ON marigold.items(code)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_items_category_sort
    ON marigold.items(category_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_items_name_trgm_ready
    ON marigold.items(name)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_items_updated_at
    BEFORE UPDATE ON marigold.items
    FOR EACH ROW EXECUTE FUNCTION marigold.set_updated_at();

COMMENT ON TABLE  marigold.items IS '물품(시술 코드/품명/단가)';
COMMENT ON COLUMN marigold.items.code IS '사용자에게 보이는 코드 (레거시 item_id)';


-- =============================================================================
-- 6. payments — 결제 마스터
-- 레거시 USE_INFO(행 단위 저장) + MEMO + SAVE_POINT + USE_POINT 통합
-- =============================================================================
CREATE TABLE marigold.payments (
    id              BIGSERIAL    PRIMARY KEY,
    member_id       BIGINT       NOT NULL REFERENCES marigold.members(id),
    paid_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    total_amount    INTEGER      NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    point_used      INTEGER      NOT NULL DEFAULT 0 CHECK (point_used   >= 0),
    point_earned    INTEGER      NOT NULL DEFAULT 0 CHECK (point_earned >= 0),
    final_amount    INTEGER      NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
    payment_method  VARCHAR(10)  NOT NULL DEFAULT 'CASH'
                                 CHECK (payment_method IN ('CASH', 'CARD')),
    memo            TEXT,
    legacy_pay_id   VARCHAR(35),                              -- 이관 추적용 (USE_INFO.pay_id)
    created_by      BIGINT       REFERENCES marigold.admins(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_payments_member
    ON marigold.payments(member_id, paid_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_paid_at
    ON marigold.payments(paid_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_legacy
    ON marigold.payments(legacy_pay_id)
    WHERE legacy_pay_id IS NOT NULL;

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON marigold.payments
    FOR EACH ROW EXECUTE FUNCTION marigold.set_updated_at();

COMMENT ON TABLE  marigold.payments IS '결제 마스터. MEMO/SAVE_POINT/USE_POINT 통합';
COMMENT ON COLUMN marigold.payments.point_used   IS '사용 포인트 (레거시 USE_POINT)';
COMMENT ON COLUMN marigold.payments.point_earned IS '적립 포인트 (레거시 SAVE_POINT)';
COMMENT ON COLUMN marigold.payments.final_amount IS '실 결제 금액 = total_amount - point_used';


-- =============================================================================
-- 7. payment_items — 결제 상세 (레거시: USE_INFO의 각 행)
-- =============================================================================
CREATE TABLE marigold.payment_items (
    id           BIGSERIAL    PRIMARY KEY,
    payment_id   BIGINT       NOT NULL REFERENCES marigold.payments(id) ON DELETE CASCADE,
    item_id      BIGINT       REFERENCES marigold.items(id) ON DELETE SET NULL,
    item_name    VARCHAR(50)  NOT NULL,                      -- 결제 시점 스냅샷
    unit_price   INTEGER      NOT NULL CHECK (unit_price >= 0),
    quantity     INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
    amount       INTEGER      NOT NULL DEFAULT 0 CHECK (amount >= 0),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_items_payment ON marigold.payment_items(payment_id);
CREATE INDEX idx_payment_items_item    ON marigold.payment_items(item_id);

COMMENT ON TABLE  marigold.payment_items IS '결제 상세 (결제 내 항목 N건)';
COMMENT ON COLUMN marigold.payment_items.item_name IS '결제 시점의 품명 스냅샷 (이후 items.name 변경 영향 X)';


-- =============================================================================
-- 8. payment_images — 결제 첨부 이미지 (레거시: IMAGES BLOB → 파일 경로)
-- =============================================================================
CREATE TABLE marigold.payment_images (
    id           BIGSERIAL    PRIMARY KEY,
    payment_id   BIGINT       NOT NULL REFERENCES marigold.payments(id) ON DELETE CASCADE,
    file_path    VARCHAR(500) NOT NULL,
    file_size    INTEGER,
    mime_type    VARCHAR(50),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_images_payment ON marigold.payment_images(payment_id);

COMMENT ON TABLE marigold.payment_images IS '결제 첨부 이미지 메타. 실제 파일은 디스크/오브젝트 스토리지';


-- =============================================================================
-- 시드 데이터: 기본 카테고리(탭)
-- =============================================================================
INSERT INTO marigold.item_categories (code, name, sort_order) VALUES
    ('PER', '펌',     1),
    ('CUT', '컷',     2),
    ('DRY', '드라이', 3),
    ('DYE', '염색',   4)
ON CONFLICT (code) DO NOTHING;
