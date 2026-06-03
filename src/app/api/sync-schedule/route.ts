import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSheetIdForStore, writeRawSheet, writeGridSheet } from '@/lib/google-sheets'

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

// 'HH:MM' 컴팩트 (분 0이면 시만)
function compactPart(t: string): string {
  const [hh, mm] = t.split(':')
  return mm === '00' ? String(Number(hh)) : `${Number(hh)}:${mm}`
}

// 출근~퇴근 컴팩트 (자정 퇴근은 24)
function compactRange(start: string, end: string): string {
  const s = compactPart(start)
  const [eh, em] = end.split(':')
  const e = eh === '00' && em === '00' ? '24' : compactPart(end)
  return `${s}~${e}`
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

    const list = (data ?? []) as any[]

    // 1) raw 탭 (평평한 원본)
    const header = ['날짜', '요일', '직원', '출근', '퇴근', '시간', '확정']
    const rows = list.map((s) => {
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

    // 2) 월간 격자 탭 (세로=날짜, 가로=직원)
    const names = Array.from(new Set(list.map((s) => s.profiles?.name ?? '?'))).sort((a, b) => a.localeCompare(b, 'ko'))
    const dates = Array.from(new Set(list.map((s) => s.work_date))).sort()
    const cellMap = new Map<string, string>()
    const hourMap = new Map<string, number>()
    for (const s of list) {
      const nm = s.profiles?.name ?? '?'
      const range = compactRange(String(s.start_time).slice(0, 5), String(s.end_time).slice(0, 5))
      cellMap.set(`${s.work_date}|${nm}`, range)
      hourMap.set(nm, (hourMap.get(nm) ?? 0) + workHours(s.start_time, s.end_time))
    }
    const gridHeader = ['날짜', '요일', ...names]
    const gridRows = dates.map((d) => {
      const dow = DOW[new Date(d + 'T00:00:00').getDay()]
      return [d, dow, ...names.map((n) => cellMap.get(`${d}|${n}`) ?? '')]
    })
    const totalRow = ['총시간', '', ...names.map((n) => hourMap.get(n) ?? 0)]
    const grid = [gridHeader, ...gridRows, totalRow]

    await Promise.all([
      writeRawSheet(spreadsheetId, [header, ...rows]),
      writeGridSheet(spreadsheetId, grid),
    ])

    return NextResponse.json({ ok: true, count: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '동기화 실패' }, { status: 500 })
  }
}
