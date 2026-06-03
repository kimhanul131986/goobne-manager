-- ============================================================
-- migration_schedule_overnight.sql
-- 마감조(새벽까지) 근무 허용: end_time > start_time 제약 제거
-- 퇴근시간이 출근보다 빠르면 "다음날"로 해석 (앱/시트에서 +24h 계산)
-- 실행 위치: Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'schedules'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%end_time%start_time%';

  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE schedules DROP CONSTRAINT %I', c);
  END IF;
END $$;
