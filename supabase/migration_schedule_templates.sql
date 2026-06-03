-- ============================================================
-- migration_schedule_templates.sql
-- 고정 스케줄(직원×요일 반복 패턴) 저장 테이블
-- weekday: 0=월 ... 6=일  (앱 DOW 배열과 동일 순서)
-- 패턴이 있으면 그 요일 근무, 없으면 OFF(휴무)로 해석
-- "한 달 적용" 시 이 패턴을 schedules에 실체화하고,
-- 늦게 출근/일찍 퇴근 등 예외는 실체화된 schedules 행만 수정한다.
-- 실행 위치: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  weekday    SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, weekday)            -- 직원·요일당 1개 고정 패턴
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_templates_store_id ON schedule_templates (store_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_id  ON schedule_templates (user_id);

-- RLS: 다른 테이블과 동일하게 authenticated 전체 허용
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_templates_select" ON schedule_templates;
DROP POLICY IF EXISTS "schedule_templates_insert" ON schedule_templates;
DROP POLICY IF EXISTS "schedule_templates_update" ON schedule_templates;
DROP POLICY IF EXISTS "schedule_templates_delete" ON schedule_templates;
CREATE POLICY "schedule_templates_select" ON schedule_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedule_templates_insert" ON schedule_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schedule_templates_update" ON schedule_templates
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "schedule_templates_delete" ON schedule_templates
  FOR DELETE TO authenticated USING (true);
