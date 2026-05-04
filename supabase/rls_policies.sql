-- ================================================
-- RLS 정책 설정 (Supabase SQL Editor에서 실행)
-- 로그인한 사용자(authenticated)가 읽기/쓰기 가능하도록 허용
-- ================================================

-- ── stores ─────────────────────────────────
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stores_select" ON stores;
CREATE POLICY "stores_select" ON stores
  FOR SELECT TO authenticated USING (true);

-- ── profiles ───────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

-- ── notices ────────────────────────────────
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notices_select" ON notices;
DROP POLICY IF EXISTS "notices_insert" ON notices;
DROP POLICY IF EXISTS "notices_delete" ON notices;
CREATE POLICY "notices_select" ON notices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "notices_insert" ON notices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notices_delete" ON notices
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ── handovers ──────────────────────────────
ALTER TABLE handovers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "handovers_select" ON handovers;
DROP POLICY IF EXISTS "handovers_insert" ON handovers;
DROP POLICY IF EXISTS "handovers_delete" ON handovers;
CREATE POLICY "handovers_select" ON handovers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "handovers_insert" ON handovers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "handovers_delete" ON handovers
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ── incidents ──────────────────────────────
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incidents_select" ON incidents;
DROP POLICY IF EXISTS "incidents_insert" ON incidents;
DROP POLICY IF EXISTS "incidents_update" ON incidents;
DROP POLICY IF EXISTS "incidents_delete" ON incidents;
CREATE POLICY "incidents_select" ON incidents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "incidents_insert" ON incidents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "incidents_update" ON incidents
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "incidents_delete" ON incidents
  FOR DELETE TO authenticated USING (auth.uid() = reported_by);

-- ── order_items ────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items
  FOR UPDATE TO authenticated USING (true);

-- ── checklist_templates ────────────────────
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_templates_select" ON checklist_templates;
CREATE POLICY "checklist_templates_select" ON checklist_templates
  FOR SELECT TO authenticated USING (true);

-- ── checklist_logs ─────────────────────────
ALTER TABLE checklist_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_logs_select" ON checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_insert" ON checklist_logs;
DROP POLICY IF EXISTS "checklist_logs_delete" ON checklist_logs;
CREATE POLICY "checklist_logs_select" ON checklist_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_logs_insert" ON checklist_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "checklist_logs_delete" ON checklist_logs
  FOR DELETE TO authenticated USING (auth.uid() = checked_by);

-- ── schedules ──────────────────────────────
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_select" ON schedules;
DROP POLICY IF EXISTS "schedules_insert" ON schedules;
DROP POLICY IF EXISTS "schedules_update" ON schedules;
DROP POLICY IF EXISTS "schedules_delete" ON schedules;
CREATE POLICY "schedules_select" ON schedules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedules_insert" ON schedules
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schedules_update" ON schedules
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "schedules_delete" ON schedules
  FOR DELETE TO authenticated USING (true);

-- ── manuals ────────────────────────────────
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manuals_select" ON manuals;
DROP POLICY IF EXISTS "manuals_insert" ON manuals;
DROP POLICY IF EXISTS "manuals_update" ON manuals;
DROP POLICY IF EXISTS "manuals_delete" ON manuals;
CREATE POLICY "manuals_select" ON manuals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "manuals_insert" ON manuals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "manuals_update" ON manuals
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "manuals_delete" ON manuals
  FOR DELETE TO authenticated USING (true);

-- ── notice_checks ──────────────────────────
ALTER TABLE notice_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notice_checks_select" ON notice_checks;
DROP POLICY IF EXISTS "notice_checks_insert" ON notice_checks;
CREATE POLICY "notice_checks_select" ON notice_checks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "notice_checks_insert" ON notice_checks
  FOR INSERT TO authenticated WITH CHECK (true);
