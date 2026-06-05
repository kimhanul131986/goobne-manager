/**
 * 굽네 레시피 HTML → Supabase 매뉴얼 자동 임포트 (통합 1개 항목, 모든 이미지 포함)
 * 사용: node scripts/import-recipe.mjs
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET       = 'manual-images'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('환경변수 누락: .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정 필요')
  process.exit(1)
}

const STORE_IDS = [
  'a279d0fb-9fef-4fb8-a472-43c153a56fc5', // 성산점
  '7cf30fca-9d3c-4c55-a937-bcc7d6a4697a', // 홍대점
]

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const RECIPE_DIR = 'G:/내 드라이브/굽네홍대/굽네레시피/치킨베이크_files'

async function uploadImage(filename, storagePath) {
  const localPath = path.join(RECIPE_DIR, filename)
  if (!fs.existsSync(localPath)) {
    console.warn(`  ⚠ 파일 없음: ${filename}`)
    return null
  }
  const buffer = fs.readFileSync(localPath)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error) { console.error(`  ✗ 업로드 실패 ${filename}:`, error.message); return null }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  console.log(`  ✓ ${filename} → ${storagePath}`)
  return data.publicUrl
}

async function main() {
  console.log('=== 치킨 베이크 전체 임포트 시작 ===\n')

  // 1. 모든 이미지 업로드
  console.log('▶ 이미지 업로드 중...')
  const imgs = {}
  const imageFiles = [
    ['1-1.jpg', 'recipes/chicken-bake/banner.jpg'],
    ['1-2.jpg', 'recipes/chicken-bake/ingredient-1.jpg'],
    ['1-3.jpg', 'recipes/chicken-bake/ingredient-2.jpg'],
    ['1-4.jpg', 'recipes/chicken-bake/ingredient-3.jpg'],
    ['2-1.jpg', 'recipes/chicken-bake/material-1.jpg'],
    ['2-2.jpg', 'recipes/chicken-bake/material-2.jpg'],
    ['4-1.jpg', 'recipes/chicken-bake/step-1.jpg'],
    ['4-2.jpg', 'recipes/chicken-bake/step-2.jpg'],
    ['4-3.jpg', 'recipes/chicken-bake/step-3.jpg'],
    ['4-4.jpg', 'recipes/chicken-bake/step-4.jpg'],
    ['4-5.jpg', 'recipes/chicken-bake/step-5.jpg'],
    ['4-6.jpg', 'recipes/chicken-bake/step-6.jpg'],
    ['4-7.jpg', 'recipes/chicken-bake/step-7.jpg'],
    ['4-8.jpg', 'recipes/chicken-bake/step-8.jpg'],
    ['4-9.jpg', 'recipes/chicken-bake/step-9.jpg'],
    ['4-10.jpg', 'recipes/chicken-bake/step-10.jpg'],
    ['4-11.jpg', 'recipes/chicken-bake/step-11.jpg'],
    ['4-12.jpg', 'recipes/chicken-bake/step-12.jpg'],
    ['4-13.jpg', 'recipes/chicken-bake/step-13.jpg'],
  ]
  for (const [file, storagePath] of imageFiles) {
    imgs[file] = await uploadImage(file, storagePath)
  }

  // 2. 통합 콘텐츠 생성 (이미지 인라인 마커 포함)
  const i = (file) => imgs[file] ? `[IMG:${imgs[file]}]` : ''

  const content = `[1-1. 주재료]

${i('1-2.jpg')}
1) 치킨 베이크(냉동 유통/보관)
포장단위: 320g/ea
청구단위: 10ea/box
소비기한: 제조일로부터 냉동 9개월
해동 방법
- 냉장 해동: 최소 7시간, 최대 15시간
- 실온 해동: 최소 2시간 30분, 최대 4시간
- 전자레인지 해동: 2분

${i('1-3.jpg')}
2) 옥수수 식용유 혹은 콩 식용유(교차 사용 가능)
청구단위: 매장 사입 품목

${i('1-4.jpg')}
3) 굽네 눈꽃 치즈(냉동 보관)
포장단위: 1kg  /  청구단위: 봉
소비기한: 제조일로부터 냉동 12개월(별도 표시일까지)

[1-2. 부자재]

${i('2-1.jpg')}
1) 쿠킹 호일
규격: 폭 30cm  /  청구단위: 매장 사입 품목

${i('2-2.jpg')}
2) 치킨 베이크 스티커
포장단위: 1ea/500ea/roll  /  청구단위: roll

[2. 기구 및 장비]

1) 위생 장갑  2) 가위  3) 그리드
4) 오븐 장갑  5) 전자레인지  6) 실리콘 붓  7) 계량스푼

[3. 제조(굽기)]

${i('4-1.jpg')}
1) 소비기한 및 선입선출, 제품의 이상 유무 확인 후 조리 준비

${i('4-2.jpg')}
${i('4-3.jpg')}
${i('4-4.jpg')}
2) 치킨 베이크를 그리드에 올린 후 가위로 비닐을 제거한다.
※ 비닐 이탈 시 반죽이 들러붙지 않게 주의
※ 이음매 부분이 바닥을 향하도록 그리드에 올린다
※ 그리드에 올릴 때 사선 방향으로 올린다
※ 가로(-)방향 → 이음매 벌어져 외관에 영향
※ 세로(|)방향 → 반죽이 그리드 사이에 끼어 떼어내기 어려움
※ 종이호일 깔지 않는다

${i('4-5.jpg')}
3) 식용유 2g을 고르게 발라준다.
※ 실리콘 붓으로 윗면·옆면(아랫면 제외)에 골고루 바른다
※ 고르게 바르지 않으면 눈꽃 치즈가 이탈할 수 있다

${i('4-6.jpg')}
${i('4-7.jpg')}
4) 눈꽃 치즈 8g을 계량스푼(30ml)으로 골고루 뿌려준다.
※ 떨어지지 않게 손으로 받쳐가며 뿌린다

${i('4-8.jpg')}
5) 오븐 온도 195℃ 확인 후 오븐 상단에서 15분 굽는다.
※ 조리 색상표를 참고하여 시간 조정
※ 치킨과 함께 조리 시 기름이 떨어지지 않도록 최상단에서 굽는다

${i('4-9.jpg')}
6) 쿠킹 호일 위에 치킨 베이크를 대각선 방향으로 올린다.

${i('4-10.jpg')}
${i('4-11.jpg')}
${i('4-12.jpg')}
${i('4-13.jpg')}
7) 양 끝을 안쪽으로 말아 감싸준 후 이음매에 스티커를 부착하여 완성.
※ 포장 시 제품이 완전히 감싸지도록 한다`.trim()

  // 3. 기존 항목 삭제
  await supabase.from('manuals').delete().like('title', '치킨 베이크%')
  console.log('\n▶ 기존 항목 삭제 완료')

  // 4. 통합 항목 삽입
  console.log('\n▶ 통합 항목 삽입 중...')
  for (const storeId of STORE_IDS) {
    const { error } = await supabase.from('manuals').insert({
      store_id: storeId,
      category: '레시피',
      title: '치킨 베이크',
      content,
      image_url: imgs['1-1.jpg'] ?? null,
      updated_at: new Date().toISOString(),
    })
    if (error) console.error(`  ✗ 실패 (${storeId}):`, error.message)
    else console.log(`  ✓ ${storeId === STORE_IDS[0] ? '성산점' : '홍대점'}`)
  }

  console.log('\n=== 완료 ===')
}

main().catch(console.error)
