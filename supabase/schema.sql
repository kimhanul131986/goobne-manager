-- ============================================================
-- Goobne Manager – Database Schema
-- 실행 위치: Supabase SQL Editor
-- RLS: 전체 비활성화 (추후 별도 추가 예정)
-- ============================================================


-- ──────────────────────────────────────────
-- 1. stores (매장)
-- ──────────────────────────────────────────
CREATE TABLE stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stores DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_stores_name ON stores (name);


-- ──────────────────────────────────────────
-- 2. profiles (직원 – auth.users 연동)
-- ──────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  store_id   UUID REFERENCES stores (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_profiles_store_id ON profiles (store_id);
CREATE INDEX idx_profiles_role     ON profiles (role);


-- ──────────────────────────────────────────
-- 3. notices (공지사항)
-- ──────────────────────────────────────────
CREATE TABLE notices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notices DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_notices_store_id   ON notices (store_id);
CREATE INDEX idx_notices_created_by ON notices (created_by);
CREATE INDEX idx_notices_created_at ON notices (created_at DESC);


-- ──────────────────────────────────────────
-- 4. notice_checks (공지 읽음 확인)
-- ──────────────────────────────────────────
CREATE TABLE notice_checks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id  UUID NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id)           -- 1인 1회 확인
);

ALTER TABLE notice_checks DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_notice_checks_notice_id ON notice_checks (notice_id);
CREATE INDEX idx_notice_checks_user_id   ON notice_checks (user_id);


-- ──────────────────────────────────────────
-- 5. order_items (발주 품목 기준표)
-- ──────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  recommended_qty INTEGER NOT NULL DEFAULT 0 CHECK (recommended_qty >= 0),
  unit            TEXT NOT NULL DEFAULT '개',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_order_items_store_id  ON order_items (store_id);
CREATE INDEX idx_order_items_item_name ON order_items (item_name);


-- ──────────────────────────────────────────
-- 6. order_logs (발주 실행 기록)
-- ──────────────────────────────────────────
CREATE TABLE order_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES order_items (id) ON DELETE RESTRICT,
  actual_qty INTEGER NOT NULL CHECK (actual_qty >= 0),
  ordered_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  memo       TEXT
);

ALTER TABLE order_logs DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_order_logs_store_id   ON order_logs (store_id);
CREATE INDEX idx_order_logs_item_id    ON order_logs (item_id);
CREATE INDEX idx_order_logs_ordered_by ON order_logs (ordered_by);
CREATE INDEX idx_order_logs_ordered_at ON order_logs (ordered_at DESC);


-- ──────────────────────────────────────────
-- 7. schedules (스케줄)
-- ──────────────────────────────────────────
CREATE TABLE schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  work_date    DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  CHECK (end_time > start_time)
);

ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_schedules_store_id  ON schedules (store_id);
CREATE INDEX idx_schedules_user_id   ON schedules (user_id);
CREATE INDEX idx_schedules_work_date ON schedules (work_date);


-- ──────────────────────────────────────────
-- 8. manuals (매뉴얼)
-- ──────────────────────────────────────────
CREATE TABLE manuals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('레시피', '청소', '오픈마감')),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  image_url  TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles (id) ON DELETE SET NULL
);

ALTER TABLE manuals DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_manuals_store_id  ON manuals (store_id);
CREATE INDEX idx_manuals_category  ON manuals (category);
CREATE INDEX idx_manuals_updated_by ON manuals (updated_by);


-- ──────────────────────────────────────────
-- 9. checklist_templates (체크리스트 항목 템플릿)
-- ──────────────────────────────────────────
CREATE TABLE checklist_templates (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id  UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  category  TEXT NOT NULL CHECK (category IN ('오픈', '마감', '청소')),
  title     TEXT NOT NULL,
  order_num INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE checklist_templates DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_checklist_templates_store_id ON checklist_templates (store_id);
CREATE INDEX idx_checklist_templates_category ON checklist_templates (category);


-- ──────────────────────────────────────────
-- 10. checklist_logs (체크리스트 완료 기록)
-- ──────────────────────────────────────────
CREATE TABLE checklist_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates (id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  done_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, user_id, log_date)  -- 하루 1회 완료
);

ALTER TABLE checklist_logs DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_checklist_logs_template_id ON checklist_logs (template_id);
CREATE INDEX idx_checklist_logs_user_id     ON checklist_logs (user_id);
CREATE INDEX idx_checklist_logs_log_date    ON checklist_logs (log_date);


-- ──────────────────────────────────────────
-- 11. handovers (인수인계)
-- ──────────────────────────────────────────
CREATE TABLE handovers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  shift      TEXT NOT NULL CHECK (shift IN ('오픈', '미들', '마감')),
  content    TEXT NOT NULL,
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE handovers DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_handovers_store_id   ON handovers (store_id);
CREATE INDEX idx_handovers_shift      ON handovers (shift);
CREATE INDEX idx_handovers_created_by ON handovers (created_by);
CREATE INDEX idx_handovers_created_at ON handovers (created_at DESC);


-- ──────────────────────────────────────────
-- 12. incidents (이슈 신고)
-- ──────────────────────────────────────────
CREATE TABLE incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('설비', '재고', '기타')),
  content     TEXT NOT NULL,
  reported_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_incidents_store_id    ON incidents (store_id);
CREATE INDEX idx_incidents_category    ON incidents (category);
CREATE INDEX idx_incidents_reported_by ON incidents (reported_by);
CREATE INDEX idx_incidents_is_resolved ON incidents (is_resolved);
CREATE INDEX idx_incidents_created_at  ON incidents (created_at DESC);
