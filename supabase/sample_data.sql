-- ================================================
-- 굽네치킨 홍대성산점 샘플 데이터
-- 실행 후 언제든지 아래 TRUNCATE 문으로 삭제 가능
-- ================================================

-- 변수 설정 (직접 수정 불필요)
DO $$
DECLARE
  uid  uuid := 'd9eb3955-a212-4f7d-b425-0cb4bddeca3c';
  sid  uuid := 'a279d0fb-9fef-4fb8-a472-43c153a56fc5';
BEGIN

-- ── 공지사항 ──────────────────────────────────
INSERT INTO notices (store_id, title, content, created_by) VALUES
  (sid, '[필독] 오픈 전 청소 체크리스트 숙지', '매일 오픈 전 청소 항목을 반드시 확인해주세요. 그릴, 후드, 튀김기 기름 교체 주기를 지켜주세요.', uid),
  (sid, '이번 주 음료 프로모션 안내', '콜라·사이다 1+1 행사 진행 중입니다. POS 설정 확인 후 손님께 안내 부탁드립니다.', uid),
  (sid, '유니폼 세탁 규정 변경', '유니폼은 매주 월요일 수거 후 수요일 지급으로 변경됩니다. 개인 세탁 금지.', uid);

-- ── 발주 항목 (order_items) ───────────────────
INSERT INTO order_items (store_id, item_name, unit, default_qty) VALUES
  (sid, '고추장소스', 'box', 2),
  (sid, '치킨무', 'EA', 50),
  (sid, '냅킨', 'box', 5),
  (sid, '생닭(중)', 'kg', 30),
  (sid, '식용유', 'L', 20);

-- ── 체크리스트 템플릿 ─────────────────────────
INSERT INTO checklist_templates (store_id, title, timing) VALUES
  (sid, '그릴 예열 확인', 'open'),
  (sid, '냉장고 온도 기록', 'open'),
  (sid, '홀 테이블 세팅 완료', 'open'),
  (sid, '쓰레기 분리수거', 'close'),
  (sid, '가스 밸브 잠금', 'close'),
  (sid, '시재 확인 및 보고', 'close');

-- ── 인수인계 ──────────────────────────────────
INSERT INTO handovers (store_id, shift, content, created_by) VALUES
  (sid, '오픈', '오전 배달 건수 다소 많음. 포장재 재고 확인 요망. 냉장고 2번 문 잠금 불량 → 점검 요청함.', uid),
  (sid, '미들', '점심 피크 원활. 치킨무 재고 소진 임박 — 발주 필요. 새 알바 적응 중이니 배려 부탁.', uid),
  (sid, '마감', '매출 정상. 튀김기 기름 내일 교체 예정. 전등 B구역 1개 깜빡임 → 사장님께 보고 완료.', uid);

-- ── 이슈 신고 ─────────────────────────────────
INSERT INTO incidents (store_id, category, content, reported_by, is_resolved) VALUES
  (sid, '설비', '튀김기 3번 온도 센서 오류 발생. 경고등 켜짐. 제조사 A/S 신청 필요.', uid, false),
  (sid, '재고', '고추장 소스 재고 1박스 미만. 발주 요청.', uid, true),
  (sid, '기타', '주차장 쪽 유리문 손잡이 흔들림. 안전 조치 필요.', uid, false);

-- ── 매뉴얼 ───────────────────────────────────
INSERT INTO manuals (store_id, category, title, content, updated_by) VALUES
  (sid, '레시피', '고추바사삭 소스 비율', '고추장 3 : 간장 1 : 설탕 0.5 : 다진마늘 0.3 비율로 혼합. 중불에서 5분 졸여 완성.', uid),
  (sid, '레시피', '오리지널 염지 방법', '소금 1% + 후추 0.2% + 마늘분 0.3%. 최소 2시간 냉장 염지 후 튀김.', uid),
  (sid, '운영', '오픈 순서 체크리스트', '1. 전등·간판 ON\n2. 냉장고 온도 확인\n3. 그릴 예열 (15분)\n4. POS 부팅\n5. 홀 세팅', uid),
  (sid, '운영', 'POS 환불 처리 방법', 'POS → 매출관리 → 취소/환불 → 영수증 번호 입력 → 확인. 카드 취소는 당일만 가능.', uid),
  (sid, '위생', '튀김기 기름 교체 주기', '일반 영업일 기준 3일마다 교체. 교체 시 튀김기 완전 냉각 후 진행.', uid);

-- ── 스케줄 ───────────────────────────────────
INSERT INTO schedules (store_id, user_id, work_date, start_time, end_time, is_confirmed) VALUES
  (sid, uid, CURRENT_DATE, '09:00', '15:00', true),
  (sid, uid, CURRENT_DATE + 1, '15:00', '22:00', true),
  (sid, uid, CURRENT_DATE + 2, '09:00', '15:00', false);

END $$;
