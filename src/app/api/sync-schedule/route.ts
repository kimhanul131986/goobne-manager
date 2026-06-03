import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSheetIdForStore, writeRawSheet } from '@/lib/google-sheets'

export const runtime = 'nodejs'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

// 'HH:MM[:SS]' → 분. 야간(퇴근<=출근)은 +24h 처리
function workHours(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  let diff = toMin(end) - toMin(start)
  if (diff <= 0) diff += 24 * 60
  return Math.round((diff / 60) * 100) / 100
}

export async function POST(req: NextRequest) {
  try {
    const { storeId } = await req.json()
    if (!storeId) {
      return NextResponse.json({ error: 'storeId 누락' }, { status: 400 })
    }

    const spreadsheetId = getSheetIdForStore(storeId)
    if (!spreadsheetId) {
      // 시트 연동이 설정되지 않은 매장 → 조용히 건너뜀
      return NextResponse.json({ skipped: true })
    }

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('work_date, start_time, end_time, is_confirmed, profiles(name)')
      .eq('store_id', storeId)
      .order('work_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const header = ['날짜', '요일', '직원', '출근', '퇴근', '시간', '확정']
    const rows = (data ?? []).map((s: any) => {
      const start = String(s.start_time).slice(0, 5)
      const end = String(s.end_time).slice(0, 5)
      const dow = DOW[new Date(s.work_date + 'T00:00:00').getDay()]
      return [
        s.work_date,
        dow,
        s.profiles?.name ?? '?',
        start,
        end,
        workHours(s.start_time, s.end_time),
        s.is_confirmed ? 'Y' : 'N',
      ]
    })

    await writeRawSheet(spreadsheetId, [header, ...rows])

    return NextResponse.json({ ok: true, count: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '동기화 실패' }, { status: 500 })
  }
}
