-- 직원 시급 및 세금공제 여부 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate INTEGER NOT NULL DEFAULT 11000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_deduct BOOLEAN NOT NULL DEFAULT false;

-- 직원별 초기값 설정
UPDATE profiles SET hourly_rate = 11000, tax_deduct = false WHERE name IN ('김한얼', '김한슬', '홍승재');
UPDATE profiles SET hourly_rate = 12000, tax_deduct = true  WHERE name IN ('즈엉', '민후이', '뚜안');
UPDATE profiles SET hourly_rate = 11000, tax_deduct = true  WHERE name = '아린';
