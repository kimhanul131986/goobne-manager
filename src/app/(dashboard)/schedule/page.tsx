'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'
import AddEmployeeModal from '@/components/AddEmployeeModal'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface Schedule {
  id: string
  user_id: string
  work_date: string   // 'YYYY-MM-DD'
  start_time: string  // 'HH:MM:SS'
  end_time: string
  is_confirmed: boolean
}

interface StoreProfile {
  id: string
  name: string
}

interface Template {
  user_id: string
  weekday: number     // 0=월 … 6=일
  start_time: string
  end_time: string
}

const DOW = ['월', '화', '수', '목', '금', '토', '일']
const RED = '#E8001D'

// ──────────────────────────────────────────
// 날짜 유틸 (KST 안전: 로컬 기준 포맷)
// ──────────────────────────────────────────
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthStartOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// JS getDay(0=일) → 앱 weekday(0=월 … 6=일)
function toWeekday(d: Date): number {
  const j = d.getDay()
  return j === 0 ? 6 : j - 1
}

// 'HH:MM[:SS]' 두 개로 근무시간(시간 단위). 야간(퇴근<=출근)은 +24h
function workHours(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  let diff = toMin(end) - toMin(start)
  if (diff <= 0) diff += 24 * 60
  return Math.round((diff / 60) * 100) / 100
}

// 'HH:MM' → 컴팩트 표기 (분이 0이면 시만)
function compactPart(t: string): string {
  const [hh, mm] = t.split(':')
  return mm === '00' ? String(Number(hh)) : `${Number(hh)}:${mm}`
}

// 출근~퇴근 컴팩트 표기 (자정 퇴근은 24로)
function compactRange(start: string, end: string): string {
  const s = compactPart(start.slice(0, 5))
  const [eh, em] = end.slice(0, 5).split(':')
  const e = eh === '00' && em === '00' ? '24' : compactPart(end.slice(0, 5))
  return `${s}~${e}`
}

// ──────────────────────────────────────────
// 스켈레톤
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

// ──────────────────────────────────────────
// 셀 수정 모달 (직원·날짜 고정, 시간만 편집)
// ──────────────────────────────────────────
function CellModal({
  storeId, storeProfiles, initialUserId, targetName, dateStr, existing, canEdit, isMine,
  onClose, onSaved,
}: {
  storeId: string
  storeProfiles: StoreProfile[]
  initialUserId: string
  targetName: string
  dateStr: string
  existing?: Schedule
  canEdit: boolean
  isMine: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const isAdd = !existing
  const showPicker = isAdd && canEdit && !initialUserId
  const [uid, setUid] = useState(initialUserId || storeProfiles[0]?.id || '')
  const [startTime, setStartTime] = useState(existing?.start_time.slice(0, 5) ?? '17:00')
  const [endTime, setEndTime]     = useState(existing?.end_time.slice(0, 5) ?? '23:00')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [, mm, dd] = useMemo(() => dateStr.split('-'), [dateStr])
  const dateLabel = `${Number(mm)}.${dd} (${DOW[toWeekday(new Date(dateStr + 'T00:00:00'))]})`

  async function handleSave() {
    if (startTime === endTime) { setError('출근과 퇴근 시간이 같을 수 없습니다.'); return }
    setSaving(true); setError(null)
    if (existing) {
      const { error: err } = await supabase
        .from('schedules')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', existing.id)
      if (err) { setError('저장 중 오류가 발생했습니다.'); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('schedules').insert({
        store_id: storeId, user_id: uid, work_date: dateStr,
        start_time: startTime, end_time: endTime, is_confirmed: false,
      })
      if (err) {
        setError(err.code === '23505'
          ? '이 직원은 이 날짜에 이미 근무가 등록돼 있습니다.'
          : '저장 중 오류가 발생했습니다.')
        setSaving(false); return
      }
    }
    onSaved(); onClose()
  }

  async function handleDelete() {
    if (!existing) return
    setSaving(true)
    await supabase.from('schedules').delete().eq('id', existing.id)
    onSaved(); onClose()
  }

  async function handleConfirm() {
    if (!existing) return
    setSaving(true)
    await supabase.from('schedules').update({ is_confirmed: !existing.is_confirmed }).eq('id', existing.id)
    onSaved(); onClose()
  }

  const inputCls = 'rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-2xl border border-neutral-700 p-6 z-10">
        {showPicker ? (
          <div className="mb-5">
            <p className="text-[11px] text-neutral-500 mb-2">{dateLabel} · 근무 추가</p>
            <select value={uid} onChange={(e) => setUid(e.target.value)}
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50">
              {storeProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-white mb-1">{targetName}</h3>
            <p className="text-[11px] text-neutral-500 mb-5">{dateLabel}</p>
          </>
        )}

        {canEdit ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-400">출근</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-400">퇴근</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 -mt-1">
              퇴근이 출근보다 빠르면 다음날 새벽 근무(마감조)로 계산됩니다.
            </p>
            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              {existing && (
                <button onClick={handleDelete} disabled={saving}
                  className="rounded-xl py-3 px-4 text-sm font-semibold text-red-400 bg-red-950/40 hover:bg-red-950/60 transition-colors disabled:opacity-50">
                  삭제
                </button>
              )}
              <button onClick={onClose}
                className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: RED }}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-300">
              {existing ? compactRange(existing.start_time, existing.end_time) + ' 근무' : '스케줄 없음'}
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors">
                닫기
              </button>
              {existing && isMine && (
                <button onClick={handleConfirm} disabled={saving}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: existing.is_confirmed ? '#374151' : RED }}>
                  {existing.is_confirmed ? '확인 취소' : '확인하기'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// 고정 패턴 편집 모달 (직원 1명 요일별)
// ──────────────────────────────────────────
interface DayPattern { on: boolean; start: string; end: string }

function TemplateModal({
  storeId, storeProfiles, templates, onClose, onSaved,
}: {
  storeId: string
  storeProfiles: StoreProfile[]
  templates: Template[]
  onClose: () => void
  onSaved: () => void
}) {
  const [targetUserId, setTargetUserId] = useState(storeProfiles[0]?.id ?? '')
  const [days, setDays] = useState<DayPattern[]>(() =>
    Array.from({ length: 7 }, () => ({ on: false, start: '17:00', end: '23:00' }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 선택 직원이 바뀌면 기존 패턴 로드
  useEffect(() => {
    const next: DayPattern[] = Array.from({ length: 7 }, () => ({ on: false, start: '17:00', end: '23:00' }))
    templates
      .filter((t) => t.user_id === targetUserId)
      .forEach((t) => {
        next[t.weekday] = { on: true, start: t.start_time.slice(0, 5), end: t.end_time.slice(0, 5) }
      })
    setDays(next)
  }, [targetUserId, templates])

  function setDay(i: number, patch: Partial<DayPattern>) {
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  }

  async function handleSave() {
    if (!targetUserId) return
    setSaving(true); setError(null)

    const del = await supabase.from('schedule_templates').delete().eq('user_id', targetUserId)
    if (del.error) {
      setError(del.error.message.includes('schedule_templates')
        ? 'DB에 schedule_templates 테이블이 없습니다. 마이그레이션을 먼저 실행하세요.'
        : '저장 실패: ' + del.error.message)
      setSaving(false); return
    }

    const rows = days
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.on && d.start !== d.end)
      .map(({ d, i }) => ({
        store_id: storeId, user_id: targetUserId, weekday: i,
        start_time: d.start, end_time: d.end,
      }))
    if (rows.length > 0) {
      const ins = await supabase.from('schedule_templates').insert(rows)
      if (ins.error) {
        setError('저장 실패: ' + ins.error.message)
        setSaving(false); return
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-2xl border border-neutral-700 p-6 z-10 max-h-[88vh] overflow-y-auto">
        <h3 className="text-base font-bold text-white mb-1">고정 패턴</h3>
        <p className="text-[11px] text-neutral-500 mb-4">직원의 요일별 기본 근무를 설정합니다.</p>

        <select
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          className="w-full rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 mb-4 focus:outline-none focus:border-[#E8001D]/50"
        >
          {storeProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex flex-col gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setDay(i, { on: !d.on })}
                className={`w-12 shrink-0 rounded-lg py-2 text-xs font-bold transition-colors ${
                  d.on ? 'text-white' : 'text-neutral-500 bg-neutral-800'
                }`}
                style={d.on ? { backgroundColor: RED } : undefined}
              >
                {DOW[i]}
              </button>
              {d.on ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input type="time" value={d.start} onChange={(e) => setDay(i, { start: e.target.value })}
                    className="flex-1 min-w-0 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white px-2 py-2 focus:outline-none focus:border-[#E8001D]/50" />
                  <span className="text-neutral-600 text-xs">~</span>
                  <input type="time" value={d.end} onChange={(e) => setDay(i, { end: e.target.value })}
                    className="flex-1 min-w-0 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white px-2 py-2 focus:outline-none focus:border-[#E8001D]/50" />
                </div>
              ) : (
                <span className="flex-1 text-xs text-neutral-600 pl-1">휴무</span>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2 mt-4">{error}</p>
        )}

        <div className="flex gap-3 pt-5">
          <button onClick={onClose}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: RED }}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// 직원 삭제 모달 (관리자 재인증 후 삭제)
// ──────────────────────────────────────────
function DeleteEmployeeModal({
  target, adminEmail, adminUserId, onClose, onDeleted,
}: {
  target: { id: string; name: string }
  adminEmail: string
  adminUserId: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [email, setEmail] = useState(adminEmail)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (target.id === adminUserId) { setError('본인 계정은 삭제할 수 없습니다.'); return }
    if (!password) { setError('비밀번호를 입력하세요.'); return }
    setBusy(true); setError(null)
    try {
      // 현재 세션을 건드리지 않는 임시 클라이언트로 관리자 본인 확인
      const verifier = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { data: auth, error: authErr } = await verifier.auth.signInWithPassword({ email, password })
      if (authErr || !auth?.user) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        setBusy(false); return
      }
      if (auth.user.id !== adminUserId) {
        setError('현재 로그인한 관리자 계정으로만 삭제할 수 있습니다.')
        setBusy(false); return
      }

      const res = await fetch('/api/admin/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.id }),
      })
      const text = await res.text()
      let json: { error?: string } = {}
      try { json = text ? JSON.parse(text) : {} } catch {
        setError(`서버 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`)
        setBusy(false); return
      }
      if (!res.ok) { setError(json.error ?? '삭제에 실패했습니다.'); setBusy(false); return }
      onDeleted()
    } catch {
      setError('네트워크 오류로 삭제하지 못했습니다.')
      setBusy(false)
    }
  }

  const inputCls = 'rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-2xl border border-neutral-700 p-6 z-10">
        <h3 className="text-base font-bold text-white mb-1">직원 삭제</h3>
        <p className="text-[11px] text-neutral-500 mb-5">
          <b className="text-red-400">{target.name}</b> 직원을 삭제합니다. 관리자 본인 확인을 위해 아이디·비밀번호를 입력하세요.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">아이디(이메일)</label>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">비밀번호</label>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors">
              취소
            </button>
            <button onClick={handleDelete} disabled={busy}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: RED }}>
              {busy ? '삭제 중…' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function SchedulePage() {
  const { store } = useStore()

  const [monthStart, setMonthStart]       = useState<Date>(() => monthStartOf(new Date()))
  const [schedules, setSchedules]         = useState<Schedule[]>([])
  const [templates, setTemplates]         = useState<Template[]>([])
  const [storeProfiles, setStoreProfiles] = useState<StoreProfile[]>([])
  const [loading, setLoading]             = useState(true)
  const [role, setRole]                   = useState('')
  const [userId, setUserId]               = useState('')
  const [storeId, setStoreId]             = useState('')
  const [applying, setApplying]           = useState(false)

  const [cellTarget, setCellTarget] = useState<{ userId: string; name: string; date: string; existing?: Schedule } | null>(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const [adminEmail, setAdminEmail] = useState('')
  const [delTarget, setDelTarget] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = role === 'admin'
  const todayStr = ymd(new Date())

  // 직원 표시 순서 (이 기기에 저장)
  useEffect(() => {
    if (!storeId) return
    try {
      const raw = localStorage.getItem(`sched_order_${storeId}`)
      setOrder(raw ? JSON.parse(raw) : [])
    } catch { setOrder([]) }
  }, [storeId])

  const orderedProfiles = useMemo(() => {
    const idx = new Map(order.map((id, i) => [id, i]))
    return [...storeProfiles].sort((a, b) => {
      const ia = idx.has(a.id) ? idx.get(a.id)! : Infinity
      const ib = idx.has(b.id) ? idx.get(b.id)! : Infinity
      if (ia !== ib) return ia - ib
      return a.name.localeCompare(b.name)
    })
  }, [storeProfiles, order])

  function moveEmployee(id: string, dir: -1 | 1) {
    const ids = orderedProfiles.map((p) => p.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setOrder(ids)
    try { localStorage.setItem(`sched_order_${storeId}`, JSON.stringify(ids)) } catch {}
  }

  // 이 달의 날짜 목록
  const monthDates = useMemo(() => {
    const y = monthStart.getFullYear(), m = monthStart.getMonth()
    const n = new Date(y, m + 1, 0).getDate()
    return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1))
  }, [monthStart])

  // 빠른 조회용 맵: `${userId}|${date}` → Schedule
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>()
    schedules.forEach((s) => map.set(`${s.user_id}|${s.work_date}`, s))
    return map
  }, [schedules])

  useEffect(() => {
    if (!store) return
    setLoading(true)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      setAdminEmail(user.email ?? '')

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile) { setLoading(false); return }
      setRole(profile.role)
      setStoreId(store!.id)

      const { data: profiles } = await supabase
        .from('profiles').select('id, name').eq('store_id', store!.id).order('name')
      setStoreProfiles(profiles ?? [])

      const { data: tpls } = await supabase
        .from('schedule_templates').select('user_id, weekday, start_time, end_time').eq('store_id', store!.id)
      setTemplates(tpls ?? [])

      setLoading(false)
    }
    init()
  }, [store])

  const fetchSchedules = useCallback(async (mStart: Date, sid: string) => {
    const y = mStart.getFullYear(), m = mStart.getMonth()
    const from = ymd(new Date(y, m, 1))
    const to   = ymd(new Date(y, m + 1, 0))
    const { data } = await supabase
      .from('schedules')
      .select('id, user_id, work_date, start_time, end_time, is_confirmed')
      .eq('store_id', sid).gte('work_date', from).lte('work_date', to)
    setSchedules((data ?? []) as Schedule[])
  }, [])

  const fetchTemplates = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from('schedule_templates').select('user_id, weekday, start_time, end_time').eq('store_id', sid)
    setTemplates(data ?? [])
  }, [])

  const fetchProfiles = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from('profiles').select('id, name').eq('store_id', sid).order('name')
    setStoreProfiles(data ?? [])
  }, [])

  useEffect(() => {
    if (!storeId) return
    fetchSchedules(monthStart, storeId)
  }, [monthStart, storeId, fetchSchedules])

  // 구글 시트로 단방향 내보내기 (fire-and-forget)
  function syncSheet() {
    if (!storeId) return
    fetch('/api/sync-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId }),
    }).catch(() => {})
  }

  function refreshAfterEdit() {
    fetchSchedules(monthStart, storeId)
    syncSheet()
  }

  function prevMonth() { setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goThisMonth() { setMonthStart(monthStartOf(new Date())) }

  // 고정 패턴을 이 달에 적용 (기존 날짜는 건너뜀)
  async function applyTemplates() {
    if (!isAdmin || templates.length === 0) return
    if (!confirm('이 달에 고정 패턴을 적용할까요? 이미 등록된 날짜는 그대로 둡니다.')) return
    setApplying(true)
    const rows: any[] = []
    for (const date of monthDates) {
      const wd = toWeekday(date)
      const dateStr = ymd(date)
      for (const t of templates.filter((t) => t.weekday === wd)) {
        if (scheduleMap.has(`${t.user_id}|${dateStr}`)) continue
        rows.push({
          store_id: storeId, user_id: t.user_id, work_date: dateStr,
          start_time: t.start_time, end_time: t.end_time, is_confirmed: false,
        })
      }
    }
    if (rows.length > 0) {
      await supabase.from('schedules').insert(rows)
    }
    setApplying(false)
    await fetchSchedules(monthStart, storeId)
    syncSheet()
    alert(rows.length > 0 ? `${rows.length}건 적용했습니다.` : '추가할 스케줄이 없습니다.')
  }

  function openCell(p: StoreProfile, date: Date) {
    const dateStr = ymd(date)
    const existing = scheduleMap.get(`${p.id}|${dateStr}`)
    // 권한 없으면 빈 칸은 무시
    if (!isAdmin && !existing) return
    setCellTarget({ userId: p.id, name: p.name, date: dateStr, existing })
  }

  const monthLabel = `${monthStart.getFullYear()}.${String(monthStart.getMonth() + 1).padStart(2, '0')}`
  const isThisMonth = ymd(monthStart) === ymd(monthStartOf(new Date()))

  // 직원별 월 총시간
  function totalHours(uid: string): number {
    return schedules
      .filter((s) => s.user_id === uid)
      .reduce((sum, s) => sum + workHours(s.start_time, s.end_time), 0)
  }

  // ── 스켈레톤 ──
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors text-lg">
            ‹
          </button>
          <p className="text-sm font-bold text-white min-w-[64px] text-center">{monthLabel}</p>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors text-lg">
            ›
          </button>
          {!isThisMonth && (
            <button onClick={goThisMonth}
              className="text-xs text-[#E8001D] bg-[#E8001D]/10 rounded-xl px-2.5 py-1.5 hover:bg-[#E8001D]/20 transition-colors whitespace-nowrap">
              ↩ 이번달로
            </button>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowAddEmp(true)}
              className="text-[11px] font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl px-2.5 py-2 transition-colors">
              + 직원
            </button>
            <button onClick={() => setShowTemplate(true)}
              className="text-[11px] font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl px-2.5 py-2 transition-colors">
              고정패턴
            </button>
            <button onClick={applyTemplates} disabled={applying || templates.length === 0}
              className="text-[11px] font-bold text-white rounded-xl px-2.5 py-2 transition active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: RED }}>
              {applying ? '적용 중…' : '고정 적용'}
            </button>
          </div>
        )}
      </div>

      {storeProfiles.length === 0 ? (
        <p className="text-[11px] text-neutral-600 text-center py-10">등록된 직원이 없습니다.</p>
      ) : (
        <div className="overflow-auto max-h-[calc(100dvh-16rem)] md:max-h-[calc(100dvh-11rem)] rounded-2xl border border-neutral-800 [-webkit-overflow-scrolling:touch]">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 bg-neutral-950 border-b border-r border-neutral-800 px-2 py-2 text-[11px] font-bold text-neutral-400 min-w-[52px]">
                  날짜
                </th>
                {orderedProfiles.map((p, ci) => (
                  <th key={p.id}
                    className="sticky top-0 z-20 bg-neutral-950 border-b border-neutral-800 px-1 py-1.5 text-[12px] font-bold text-white min-w-[60px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="truncate max-w-[60px]">{p.name}</span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveEmployee(p.id, -1)} disabled={ci === 0}
                            className="text-[11px] text-neutral-500 hover:text-white disabled:opacity-20 leading-none px-0.5">◀</button>
                          <button onClick={() => moveEmployee(p.id, 1)} disabled={ci === orderedProfiles.length - 1}
                            className="text-[11px] text-neutral-500 hover:text-white disabled:opacity-20 leading-none px-0.5">▶</button>
                          <button onClick={() => setDelTarget({ id: p.id, name: p.name })}
                            className="text-[11px] text-neutral-600 hover:text-red-400 leading-none px-0.5">✕</button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthDates.map((d) => {
                const dateStr = ymd(d)
                const wd = toWeekday(d)
                const weekend = wd >= 5
                const isToday = dateStr === todayStr
                const sundayLine = wd === 6 ? 'border-b-2 border-b-neutral-600' : ''
                return (
                  <tr key={dateStr} className={isToday ? 'bg-[#E8001D]/[0.06]' : ''}>
                    <td className={`sticky left-0 z-10 border-r border-t border-neutral-800 px-2 py-2 ${sundayLine} ${
                      isToday ? 'bg-[#E8001D]/10' : 'bg-neutral-900'
                    }`}>
                      <div className={`text-[12px] font-bold leading-tight ${
                        isToday ? 'text-[#E8001D]' : weekend ? 'text-orange-400' : 'text-neutral-200'
                      }`}>{d.getDate()}</div>
                      <div className={`text-[9px] leading-tight ${
                        isToday ? 'text-[#E8001D]' : weekend ? 'text-orange-400/70' : 'text-neutral-600'
                      }`}>{DOW[wd]}</div>
                    </td>
                    {orderedProfiles.map((p) => {
                      const s = scheduleMap.get(`${p.id}|${dateStr}`)
                      const isMine = p.id === userId
                      return (
                        <td key={p.id}
                          onClick={() => openCell(p, d)}
                          className={`border-t border-neutral-800/70 px-0.5 py-2 align-middle ${sundayLine} ${
                            isAdmin || s ? 'cursor-pointer active:bg-neutral-800' : ''
                          }`}>
                          {s ? (
                            <span className={`inline-block text-[11px] font-semibold leading-tight whitespace-nowrap rounded px-1.5 py-0.5 ${
                              s.is_confirmed
                                ? 'text-emerald-300 bg-emerald-500/10'
                                : isMine ? 'text-[#E8001D] bg-[#E8001D]/10' : 'text-sky-300 bg-sky-500/10'
                            }`}>
                              {compactRange(s.start_time, s.end_time)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-700">·</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* 총시간 합계 행 */}
              <tr>
                <td className="sticky left-0 z-10 bg-neutral-950 border-r border-t border-neutral-800 px-2 py-2 text-[10px] font-bold text-neutral-400">
                  총시간
                </td>
                {orderedProfiles.map((p) => (
                  <td key={p.id} className="bg-neutral-950 border-t border-neutral-800 px-1 py-2 text-[11px] font-bold text-orange-300">
                    {totalHours(p.id) || ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isAdmin && (
        <p className="text-[11px] text-neutral-600 mt-3 text-center">
          본인 근무를 탭하면 확인 처리할 수 있습니다.
        </p>
      )}

      {/* 셀 수정 모달 */}
      {cellTarget && (
        <CellModal
          storeId={storeId}
          storeProfiles={storeProfiles}
          initialUserId={cellTarget.userId}
          targetName={cellTarget.name}
          dateStr={cellTarget.date}
          existing={cellTarget.existing}
          canEdit={isAdmin}
          isMine={cellTarget.userId === userId}
          onClose={() => setCellTarget(null)}
          onSaved={refreshAfterEdit}
        />
      )}

      {/* 고정 패턴 모달 */}
      {showTemplate && (
        <TemplateModal
          storeId={storeId}
          storeProfiles={storeProfiles}
          templates={templates}
          onClose={() => setShowTemplate(false)}
          onSaved={() => { setShowTemplate(false); fetchTemplates(storeId) }}
        />
      )}

      {/* 직원 추가 모달 */}
      {showAddEmp && store && (
        <AddEmployeeModal
          storeId={store.id}
          storeName={store.name}
          onClose={() => setShowAddEmp(false)}
          onSaved={() => { setShowAddEmp(false); fetchProfiles(storeId) }}
        />
      )}

      {/* 직원 삭제 모달 */}
      {delTarget && (
        <DeleteEmployeeModal
          target={delTarget}
          adminEmail={adminEmail}
          adminUserId={userId}
          onClose={() => setDelTarget(null)}
          onDeleted={() => {
            setDelTarget(null)
            fetchProfiles(storeId)
            fetchSchedules(monthStart, storeId)
          }}
        />
      )}
    </div>
  )
}
