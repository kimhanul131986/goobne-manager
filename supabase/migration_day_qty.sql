-- ============================================================
-- migration_day_qty.sql
-- order_items 테이블에 요일별 적정발주량 컬럼 추가 (월·수·목·금·일)
-- 실행 위치: Supabase SQL Editor
-- 값은 화면에서 요일별로 직접 입력/수정합니다 (시드 없음)
-- ============================================================

-- 배송 요일별 적정발주량 컬럼 추가 (이미 있으면 무시)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS recommended_qty_mon INTEGER NOT NULL DEFAULT 0 CHECK (recommended_qty_mon >= 0),
  ADD COLUMN IF NOT EXISTS recommended_qty_wed INTEGER NOT NULL DEFAULT 0 CHECK (recommended_qty_wed >= 0),
  ADD COLUMN IF NOT EXISTS recommended_qty_thu INTEGER NOT NULL DEFAULT 0 CHECK (recommended_qty_thu >= 0),
  ADD COLUMN IF NOT EXISTS recommended_qty_fri INTEGER NOT NULL DEFAULT 0 CHECK (recommended_qty_fri >= 0),
  ADD COLUMN IF NOT EXISTS recommended_qty_sun INTEGER NOT NULL DEFAULT 0 CHECK (recommended_qty_sun >= 0);

-- (선택) 이전 버전에서 만든 미사용 컬럼 정리가 필요하면 아래 주석을 해제해 실행
-- ALTER TABLE order_items
--   DROP COLUMN IF EXISTS recommended_qty_tue,
--   DROP COLUMN IF EXISTS recommended_qty_sat;
