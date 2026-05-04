'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface Schedule {
  id: string
  user_id: string
  user_name: string
  work_date: string   // 'YYYY-MM-DD'
  start_time: string  // 'HH:MM:SS'
  end_time: string
  is_confirmed: boolean
}

interface StoreProfile {
  id: string
  name: string
}

type ModalMode = 'add' | 'edit' | null

// ──────────────────────────────────────────
// 날짜 유틸
// ──────────────────────────────────────────
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function fmt(t: string): string {
  return t.slice(0, 5)
}

const DOW = ['월', '화', '수', '목', '금', '토', '일']
const TODAY_STR = toDateStr(new Date())

// ──────────────────────────────────────────
// 스켈레톤
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

// ──────────────────────────────────────────
// 스케줄 추가/수정 모달
// ──────────────────────────────────────────
interface ModalProps {
  mode: ModalMode
  storeProfiles: StoreProfile[]
  initialDate: string
  initialData?: Schedule
  onClose: () => void
  onSave: () => void
  storeId: string
}

function ScheduleModal({
  mode, storeProfiles, initialDate, initialData, onClose, onSave, storeId,
}: ModalProps) {
  const [targetUserId, setTargetUserId] = useState(initialData?.user_id ?? '')
  const [workDate, setWorkDate]         = useState(initialData?.work_date ?? initialDate)
  const [startTime, setStartTime]       = useState(initialData?.start_time.slice(0, 5) ?? '09:00')
  const [endTime, setEndTime]           = useState(initialData?.end_time.slice(0, 5) ?? '18:00')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function handleSave() {
    if (!targetUserId) { setError('직원을 선택하세요.'); return }
    if (startTime >= endTime) { setError('퇴근 시간은 출근 시간보다 늦어야 합니다.'); return }
    setSaving(true)
    setError(null)

    if (mode === 'add') {
      const { error: err } = await supabase.from('schedules').insert({
        store_id: storeId,
        user_id: targetUserId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        is_confirmed: false,
      })
      if (err) { setError('저장 중 오류가 발생했습니다.'); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('schedules')
        .update({ user_id: targetUserId, work_date: workDate, start_time: startTime, end_time: endTime })
        .eq('id', initialData!.id)
      if (err) { setError('저장 중 오류가 발생했습니다.'); setSaving(false); return }
    }

    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-2xl border border-neutral-700 p-6 z-10">
        <h3 className="text-base font-bold text-white mb-5">
          {mode === 'add' ? '스케줄 추가' : '스케줄 수정'}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">직원</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50"
            >
              <option value="">선택하세요</option>
              {storeProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">날짜</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-400">출근</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-400">퇴근</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50"
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: '#E8001D' }}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// 페이지 컴포넌트
// ──────────────────────────────────────────
export default function SchedulePage() {
  const { store } = useStore()

  const [weekStart, setWeekStart]         = useState<Date>(() => getMonday(new Date()))
  const [schedules, setSchedules]         = useState<Schedule[]>([])
  const [storeProfiles, setStoreProfiles] = useState<StoreProfile[]>([])
  const [loading, setLoading]             = useState(true)
  const [role, setRole]                   = useState('')
  const [userId, setUserId]               = useState('')
  const [storeId, setStoreId]             = useState('')

  const [modalMode, setModalMode]   = useState<ModalMode>(null)
  const [modalDate, setModalDate]   = useState('')
  const [editTarget, setEditTarget] = useState<Schedule | undefined>()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    if (!store) return
    setLoading(true)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) { setLoading(false); return }
      setRole(profile.role)
      setStoreId(store.id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('store_id', store.id)
        .order('name')

      setStoreProfiles(profiles ?? [])
      setLoading(false)
    }
    init()
  }, [store])

  const fetchSchedules = useCallback(async (start: Date, sid: string) => {
    const from = toDateStr(start)
    const to   = toDateStr(addDays(start, 6))

    const { data } = await supabase
      .from('schedules')
      .select('id, user_id, work_date, start_time, end_time, is_confirmed, profiles(name)')
      .eq('store_id', sid)
      .gte('work_date', from)
      .lte('work_date', to)
      .order('start_time')

    setSchedules(
      (data ?? []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        user_name: s.profiles?.name ?? '?',
        work_date: s.work_date,
        start_time: s.start_time,
        end_time: s.end_time,
        is_confirmed: s.is_confirmed,
      }))
    )
  }, [])

  useEffect(() => {
    if (!storeId) return
    fetchSchedules(weekStart, storeId)
  }, [weekStart, storeId, fetchSchedules])

  function prevWeek() { setWeekStart((d) => addDays(d, -7)) }
  function nextWeek() { setWeekStart((d) => addDays(d, +7)) }
  function goToday()  { setWeekStart(getMonday(new Date())) }

  async function handleConfirm(schedule: Schedule) {
    if (schedule.user_id !== userId) return
    const next = !schedule.is_confirmed
    await supabase.from('schedules').update({ is_confirmed: next }).eq('id', schedule.id)
    setSchedules((prev) =>
      prev.map((s) => s.id === schedule.id ? { ...s, is_confirmed: next } : s)
    )
  }

  async function handleDelete(id: string) {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  function openAdd(dateStr: string) {
    setModalDate(dateStr)
    setEditTarget(undefined)
    setModalMode('add')
  }

  function openEdit(s: Schedule) {
    setModalDate(s.work_date)
    setEditTarget(s)
    setModalMode('edit')
  }

  const isThisWeek = toDateStr(weekStart) === toDateStr(getMonday(new Date()))

  const weekLabel = `${weekDays[0].getMonth() + 1}.${String(weekDays[0].getDate()).padStart(2, '0')} ~ ${weekDays[6].getMonth() + 1}.${String(weekDays[6].getDate()).padStart(2, '0')}`

  // ──────────────────────────────────────────
  // 스켈레톤
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 세로 주간 리스트
  // ──────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors text-lg"
          >
            ‹
          </button>
          <p className="text-sm font-bold text-white min-w-[110px] text-center">{weekLabel}</p>
          <button
            onClick={nextWeek}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors text-lg"
          >
            ›
          </button>
          {!isThisWeek && (
            <button
              onClick={goToday}
              className="text-xs text-[#E8001D] bg-[#E8001D]/10 rounded-xl px-3 py-1.5 hover:bg-[#E8001D]/20 transition-colors"
            >
              이번주
            </button>
          )}
        </div>
      </div>

      {/* 7일 세로 리스트 */}
      <div className="flex flex-col gap-2">
        {weekDays.map((day, idx) => {
          const dateStr    = toDateStr(day)
          const isToday    = dateStr === TODAY_STR
          const isWeekend  = idx >= 5
          const daySchedules = schedules.filter((s) => s.work_date === dateStr)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))

          return (
            <div
              key={dateStr}
              className={`
                rounded-2xl border px-4 py-3
                ${isToday
                  ? 'border-[#E8001D]/40 bg-[#E8001D]/5'
                  : 'border-neutral-800 bg-neutral-900'}
              `}
            >
              {/* 날짜 행 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 text-center ${
                    isToday ? 'text-[#E8001D]' : isWeekend ? 'text-orange-400' : 'text-neutral-400'
                  }`}>
                    {DOW[idx]}
                  </span>
                  <span className={`text-sm font-bold ${isToday ? 'text-[#E8001D]' : 'text-white'}`}>
                    {day.getMonth() + 1}.{String(day.getDate()).padStart(2, '0')}
                  </span>
                  {isToday && (
                    <span className="text-[10px] text-[#E8001D] bg-[#E8001D]/10 rounded-full px-2 py-0.5 font-semibold">
                      오늘
                    </span>
                  )}
                </div>
                {role === 'admin' && (
                  <button
                    onClick={() => openAdd(dateStr)}
                    className="text-[11px] text-neutral-500 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg px-2.5 py-1 transition-colors"
                  >
                    + 추가
                  </button>
                )}
              </div>

              {/* 스케줄 없음 */}
              {daySchedules.length === 0 && (
                <p className="text-[11px] text-neutral-700 pl-7">스케줄 없음</p>
              )}

              {/* 스케줄 목록 */}
              {daySchedules.length > 0 && (
                <div className="flex flex-col gap-1.5 pl-7">
                  {daySchedules.map((s) => {
                    const isMine = s.user_id === userId
                    return (
                      <div
                        key={s.id}
                        className={`
                          flex items-center justify-between rounded-xl px-3 py-2
                          ${isMine ? 'bg-[#E8001D]/15' : 'bg-neutral-800/60'}
                        `}
                      >
                        {/* 이름 + 시간 */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-semibold truncate ${isMine ? 'text-[#E8001D]' : 'text-neutral-300'}`}>
                            {s.user_name}
                          </span>
                          <span className={`text-[11px] shrink-0 ${isMine ? 'text-[#E8001D]/70' : 'text-neutral-500'}`}>
                            {fmt(s.start_time)}~{fmt(s.end_time)}
                          </span>
                        </div>

                        {/* 오른쪽 액션 */}
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {isMine && (
                            s.is_confirmed ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">확인됨</span>
                            ) : (
                              <button
                                onClick={() => handleConfirm(s)}
                                className="text-[10px] text-neutral-500 bg-neutral-800 hover:bg-neutral-700 rounded-full px-2 py-0.5 transition-colors active:scale-95"
                              >
                                확인하기
                              </button>
                            )
                          )}
                          {role === 'admin' && (
                            <button
                              onClick={() => openEdit(s)}
                              className="text-[10px] text-neutral-600 hover:text-neutral-300 transition-colors px-1"
                            >
                              수정
                            </button>
                          )}
                          {role === 'admin' && (
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="text-[10px] text-neutral-700 hover:text-red-400 transition-colors px-1"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 스케줄 추가/수정 모달 */}
      {modalMode && (
        <ScheduleModal
          mode={modalMode}
          storeProfiles={storeProfiles}
          initialDate={modalDate}
          initialData={editTarget}
          storeId={storeId}
          onClose={() => setModalMode(null)}
          onSave={() => fetchSchedules(weekStart, storeId)}
        />
      )}
    </div>
  )
}
