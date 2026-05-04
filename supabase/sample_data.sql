-- ================================================
-- 굽네치킨 홍대성산점 샘플 데이터
-- Supabase SQL Editor에서 실행
-- ================================================

DO $$
DECLARE
  uid   uuid := 'd9eb3955-a212-4f7d-b425-0cb4bddeca3c';  -- 테스트 유저
  sid   uuid := 'a279d0fb-9fef-4fb8-a472-43c153a56fc5';  -- 성산점
  sid2  uuid := '7cf30fca-9d3c-4c55-a937-bcc7d6a4697a';  -- 홍대점
BEGIN

-- ── stores 보장 ───────────────────────────────
INSERT INTO stores (id, name) VALUES
  (sid,  '성산점'),
  (sid2, '홍대점')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════
-- 성산점
-- ══════════════════════════════════════════════

INSERT INTO notices (store_id, title, content, created_by) VALUES
  (sid, '[필독] 오픈 전 청소 체크리스트 숙지', '매일 오픈 전 청소 항목을 반드시 확인해주세요. 그릴, 후드, 튀김기 기름 교체 주기를 지켜주세요.', uid),
  (sid, '이번 주 음료 프로모션 안내', '콜라·사이다 1+1 행사 진행 중입니다. POS 설정 확인 후 손님께 안내 부탁드립니다.', uid),
  (sid, '유니폼 세탁 규정 변경', '유니폼은 매주 월요일 수거 후 수요일 지급으로 변경됩니다. 개인 세탁 금지.', uid)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (store_id, item_name, unit, recommended_qty) VALUES
  (sid, '고추장소스', 'box', 2),
  (sid, '치킨무', 'EA', 50),
  (sid, '냅킨', 'box', 5),
  (sid, '생닭(중)', 'kg', 30),
  (sid, '식용유', 'L', 20)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_templates (store_id, category, title, order_num) VALUES
  (sid, '오픈', '그릴 예열 확인', 1),
  (sid, '오픈', '냉장고 온도 기록', 2),
  (sid, '오픈', '홀 테이블 세팅 완료', 3),
  (sid, '마감', '쓰레기 분리수거', 1),
  (sid, '마감', '가스 밸브 잠금', 2),
  (sid, '마감', '시재 확인 및 보고', 3)
ON CONFLICT DO NOTHING;

INSERT INTO handovers (store_id, shift, content, created_by) VALUES
  (sid, '오픈', '오전 배달 건수 다소 많음. 포장재 재고 확인 요망. 냉장고 2번 문 잠금 불량 → 점검 요청함.', uid),
  (sid, '미들', '점심 피크 원활. 치킨무 재고 소진 임박 — 발주 필요. 새 알바 적응 중이니 배려 부탁.', uid),
  (sid, '마감', '매출 정상. 튀김기 기름 내일 교체 예정. 전등 B구역 1개 깜빡임 → 사장님께 보고 완료.', uid)
ON CONFLICT DO NOTHING;

INSERT INTO incidents (store_id, category, content, reported_by, is_resolved) VALUES
  (sid, '설비', '튀김기 3번 온도 센서 오류 발생. 경고등 켜짐. 제조사 A/S 신청 필요.', uid, false),
  (sid, '재고', '고추장 소스 재고 1박스 미만. 발주 요청.', uid, true),
  (sid, '기타', '주차장 쪽 유리문 손잡이 흔들림. 안전 조치 필요.', uid, false)
ON CONFLICT DO NOTHING;

INSERT INTO manuals (store_id, category, title, content, updated_by) VALUES
  (sid, '레시피', '고추바사삭 소스 비율', '고추장 3 : 간장 1 : 설탕 0.5 : 다진마늘 0.3 비율로 혼합. 중불에서 5분 졸여 완성.', uid),
  (sid, '레시피', '오리지널 염지 방법', '소금 1% + 후추 0.2% + 마늘분 0.3%. 최소 2시간 냉장 염지 후 튀김.', uid),
  (sid, '운영', '오픈 순서 체크리스트', '1. 전등·간판 ON\n2. 냉장고 온도 확인\n3. 그릴 예열 (15분)\n4. POS 부팅\n5. 홀 세팅', uid),
  (sid, '운영', 'POS 환불 처리 방법', 'POS → 매출관리 → 취소/환불 → 영수증 번호 입력 → 확인. 카드 취소는 당일만 가능.', uid),
  (sid, '위생', '튀김기 기름 교체 주기', '일반 영업일 기준 3일마다 교체. 교체 시 튀김기 완전 냉각 후 진행.', uid)
ON CONFLICT DO NOTHING;

INSERT INTO schedules (store_id, user_id, work_date, start_time, end_time, is_confirmed) VALUES
  (sid, uid, CURRENT_DATE,     '09:00', '15:00', true),
  (sid, uid, CURRENT_DATE + 1, '15:00', '22:00', true),
  (sid, uid, CURRENT_DATE + 2, '09:00', '15:00', false)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════
-- 홍대점
-- ══════════════════════════════════════════════

INSERT INTO notices (store_id, title, content, created_by) VALUES
  (sid2, '[공지] 홍대점 주말 특별 운영 안내', '주말 피크타임(17~21시) 인원 추가 배치됩니다. 해당 시간대 포지션 확인 후 입장 부탁드립니다.', uid),
  (sid2, '배달 앱 할인 쿠폰 행사', '배달의민족·쿠팡이츠 1만원 이상 주문 시 2천원 할인 쿠폰 배포 중. 별도 조작 없이 자동 적용됩니다.', uid),
  (sid2, '신메뉴 고구마바사삭 출시', '5월 1일부터 고구마바사삭 판매 시작. 레시피 숙지 후 조리 부탁드립니다.', uid)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (store_id, item_name, unit, recommended_qty) VALUES
  (sid2, '고추장소스', 'box', 3),
  (sid2, '치킨무', 'EA', 80),
  (sid2, '냅킨', 'box', 8),
  (sid2, '생닭(중)', 'kg', 50),
  (sid2, '식용유', 'L', 30),
  (sid2, '포장박스(대)', 'EA', 100)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_templates (store_id, category, title, order_num) VALUES
  (sid2, '오픈', '배달 포장재 재고 확인', 1),
  (sid2, '오픈', '간판·조명 점등', 2),
  (sid2, '오픈', '배달 앱 수신 ON', 3),
  (sid2, '마감', '배달 앱 수신 OFF', 1),
  (sid2, '마감', '포장재·소모품 재고 기록', 2),
  (sid2, '마감', '냉동고 온도 최종 확인', 3)
ON CONFLICT DO NOTHING;

INSERT INTO handovers (store_id, shift, content, created_by) VALUES
  (sid2, '오픈', '배달 주문 꾸준히 들어오는 중. 포장박스 재고 넉넉. 새 메뉴 고구마바사삭 주문 간간이 있음.', uid),
  (sid2, '미들', '점심 피크 종료. 배달 앱 쿠폰 사용 고객 많음. 치킨무 소진 임박 — 내일 발주 요청.', uid),
  (sid2, '마감', '주말 매출 정상치. 튀김기 기름 상태 양호. 홀 청소 완료. 내일 오픈 준비 완료.', uid)
ON CONFLICT DO NOTHING;

INSERT INTO incidents (store_id, category, content, reported_by, is_resolved) VALUES
  (sid2, '설비', '냉장고 1번 도어 씰 손상. 냉기 누출 의심. 교체 요청 필요.', uid, false),
  (sid2, '서비스', '배달 앱 리뷰 악성 댓글 1건 접수. 본사 신고 처리 완료.', uid, true),
  (sid2, '기타', '주방 환기팬 소음 증가. 점검 필요.', uid, false)
ON CONFLICT DO NOTHING;

INSERT INTO manuals (store_id, category, title, content, updated_by) VALUES
  (sid2, '레시피', '고구마바사삭 소스 비율', '고구마페이스트 4 : 마요네즈 1 : 연유 0.5 비율. 냉장 보관, 2일 이내 소진.', uid),
  (sid2, '운영', '배달 주문 처리 순서', '1. 앱 알림 확인\n2. 주문 접수(수락)\n3. 조리 시작\n4. 포장 완료 후 배달 앱 픽업 알림\n5. 배달원 전달', uid),
  (sid2, '운영', '주말 피크 운영 가이드', '17~21시: 튀김·포장 전담 분리. 배달·홀 1:1 비율 유지. 사이드 메뉴 선조리 적극 활용.', uid),
  (sid2, '위생', '냉동 닭 해동 기준', '냉장 해동(12시간) 원칙. 급속 해동 시 흐르는 냉수 사용, 실온 해동 금지.', uid)
ON CONFLICT DO NOTHING;

INSERT INTO schedules (store_id, user_id, work_date, start_time, end_time, is_confirmed) VALUES
  (sid2, uid, CURRENT_DATE,     '15:00', '22:00', true),
  (sid2, uid, CURRENT_DATE + 1, '09:00', '15:00', true),
  (sid2, uid, CURRENT_DATE + 3, '15:00', '22:00', false)
ON CONFLICT DO NOTHING;

END $$;
