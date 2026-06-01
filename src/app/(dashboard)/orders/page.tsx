'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

// ──────────────────────────────────────────
// 타입 / 상수
// ──────────────────────────────────────────
type DeliveryDay = 'mon' | 'wed' | 'thu' | 'fri' | 'sun'

const DAY_LABELS: Record<DeliveryDay, string> = { mon: '월', wed: '수', thu: '목', fri: '금', sun: '일' }
const DAY_DOW: Record<DeliveryDay, number>    = { mon: 1,   wed: 3,   thu: 4,   fri: 5,   sun: 0   }
const DELIVERY_DAYS: DeliveryDay[] = ['mon', 'wed', 'thu', 'fri', 'sun']

const DELIVERY_INFO: Record<DeliveryDay, string> = {
  mon: '수요일 입고 (수,목 2일치 발주)',
  wed: '금요일 입고',
  thu: '토요일 입고 (토,일 2일치 발주)',
  fri: '월요일 입고',
  sun: '화요일 입고',
}

function getTodayDeliveryDay(): DeliveryDay {
  const d = new Date().getDay()
  if (d === 1) return 'mon'
  if (d === 3) return 'wed'
  if (d === 4) return 'thu'
  if (d === 5) return 'fri'
  if (d === 0) return 'sun'
  return d === 2 ? 'wed' : 'sun' // 화→수, 토→일
}

interface OrderItem {
  id: string
  item_name: string
  unit: string
  recommended_qty_mon: number
  recommended_qty_wed: number
  recommended_qty_thu: number
  recommended_qty_fri: number
  recommended_qty_sun: number
  actual_qty_mon: number
  actual_qty_wed: number
  actual_qty_thu: number
  actual_qty_fri: number
  actual_qty_sun: number
  memo_mon: string
  memo_wed: string
  memo_thu: string
  memo_fri: string
  memo_sun: string
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

function getActual(item: OrderItem, day: DeliveryDay): number {
  return (item as any)[`actual_qty_${day}`] ?? 0
}
function getMemo(item: OrderItem, day: DeliveryDay): string {
  return (item as any)[`memo_${day}`] ?? ''
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function OrdersPage() {
  const { store } = useStore()
  const [items, setItems]           = useState<OrderItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saveDone, setSaveDone]     = useState(false)
  const [role, setRole]             = useState<string>('')
  const [storeId, setStoreId]       = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<DeliveryDay>(getTodayDeliveryDay())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today    = new Date().toISOString().slice(0, 10)
  const todayDow = new Date().getDay()
  const isTodayDelivery = [1, 3, 4, 5, 0].includes(todayDow)

  // ── 초기 로드 + 실시간 구독 ──
  useEffect(() => {
    if (!store) return
    setLoading(true)

    const sid = store.id

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile) setRole(profile.role)
      setStoreId(sid)

      await loadItems(sid)
      setLoading(false)
    }
    load()

    // 다른 사용자가 적정발주량 수정 시 실시간 반영
    const channel = supabase
      .channel('order_items_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        (payload) => {
          const n = payload.new as any
          setItems(prev => prev.map(item =>
            item.id === n.id
              ? {
                  ...item,
                  recommended_qty_mon: n.recommended_qty_mon ?? item.recommended_qty_mon,
                  recommended_qty_wed: n.recommended_qty_wed ?? item.recommended_qty_wed,
                  recommended_qty_thu: n.recommended_qty_thu ?? item.recommended_qty_thu,
                  recommended_qty_fri: n.recommended_qty_fri ?? item.recommended_qty_fri,
                  recommended_qty_sun: n.recommended_qty_sun ?? item.recommended_qty_sun,
                }
              : item
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [store])

  async function loadItems(sid: string) {
    const { data } = await supabase
      .from('order_items')
      .select('id, item_name, unit, sort_order, recommended_qty_mon, recommended_qty_wed, recommended_qty_thu, recommended_qty_fri, recommended_qty_sun, actual_qty_mon, actual_qty_wed, actual_qty_thu, actual_qty_fri, actual_qty_sun, memo_mon, memo_wed, memo_thu, memo_fri, memo_sun')
      .eq('store_id', sid)
      .order('sort_order', { ascending: true })

    setItems(
      (data ?? []).map((d: any) => ({
        id: d.id,
        item_name: d.item_name,
        unit: d.unit,
        recommended_qty_mon: d.recommended_qty_mon ?? 0,
        recommended_qty_wed: d.recommended_qty_wed ?? 0,
        recommended_qty_thu: d.recommended_qty_thu ?? 0,
        recommended_qty_fri: d.recommended_qty_fri ?? 0,
        recommended_qty_sun: d.recommended_qty_sun ?? 0,
        actual_qty_mon: d.actual_qty_mon ?? 0,
        actual_qty_wed: d.actual_qty_wed ?? 0,
        actual_qty_thu: d.actual_qty_thu ?? 0,
        actual_qty_fri: d.actual_qty_fri ?? 0,
        actual_qty_sun: d.actual_qty_sun ?? 0,
        memo_mon: d.memo_mon ?? '',
        memo_wed: d.memo_wed ?? '',
        memo_thu: d.memo_thu ?? '',
        memo_fri: d.memo_fri ?? '',
        memo_sun: d.memo_sun ?? '',
      }))
    )
  }

  // ── 요일 탭 전환 ──
  function handleDaySelect(day: DeliveryDay) {
    setSelectedDay(day)
  }

  // ── 발주량 / 메모 변경 (선택된 요일에 저장) ──
  function setActualQty(id: string, val: string) {
    const num = Math.max(0, parseInt(val, 10) || 0)
    setItems(prev => prev.map(it => it.id === id ? { ...it, [`actual_qty_${selectedDay}`]: num } : it))
  }

  function setMemo(id: string, val: string) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [`memo_${selectedDay}`]: val } : it))
  }

  // ── 전체 저장 (요일별 발주량 + 메모) ──
  async function handleSave() {
    if (items.length === 0) return
    setSaving(true)

    const rows = items.map(it => ({
      id:             it.id,
      store_id:       storeId,
      item_name:      it.item_name,
      unit:           it.unit,
      actual_qty_mon: it.actual_qty_mon,
      actual_qty_wed: it.actual_qty_wed,
      actual_qty_thu: it.actual_qty_thu,
      actual_qty_fri: it.actual_qty_fri,
      actual_qty_sun: it.actual_qty_sun,
      memo_mon:       it.memo_mon.trim() || null,
      memo_wed:       it.memo_wed.trim() || null,
      memo_thu:       it.memo_thu.trim() || null,
      memo_fri:       it.memo_fri.trim() || null,
      memo_sun:       it.memo_sun.trim() || null,
      updated_at:     new Date().toISOString(),
    }))

    const { error } = await supabase.from('order_items').upsert(rows)

    if (!error) {
      setSaveDone(true)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaveDone(false), 3000)
    }

    setSaving(false)
  }

  // ──────────────────────────────────────────
  // 스켈레톤
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
              <Skeleton className="h-4 w-1/3 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 메인 UI
  // ──────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">발주량 관리</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{today}</p>
        </div>
        {role === 'admin' && (
          <span className="text-[10px] bg-yellow-500/15 text-yellow-400 rounded-full px-2 py-1 font-semibold">
            관리자 모드
          </span>
        )}
      </div>

      {/* 요일 탭 */}
      <div className="flex gap-1 mb-4 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
        {DELIVERY_DAYS.map(day => {
          const isToday = todayDow === DAY_DOW[day]
          return (
            <button
              key={day}
              onClick={() => handleDaySelect(day)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors relative ${
                selectedDay === day
                  ? 'bg-[#E8001D] text-white shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {DAY_LABELS[day]}
              {isToday && (
                <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* 입고 안내 */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#E8001D]/10 border border-[#E8001D]/20 px-3 py-2">
        <span className="text-[#E8001D] text-sm">📦</span>
        <p className="text-xs font-medium text-neutral-200">
          {DAY_LABELS[selectedDay]}요일 발주 → {DELIVERY_INFO[selectedDay]}
        </p>
      </div>

      {/* 비배송일 안내 */}
      {!isTodayDelivery && (
        <div className="mb-4 rounded-xl bg-neutral-800/60 border border-neutral-700 px-4 py-2.5 text-xs text-neutral-400">
          오늘은 배송일이 아닙니다 — 가장 가까운 배송일 기준으로 미리 확인하세요.
        </div>
      )}

      {/* 품목 없음 */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-neutral-600 text-sm">
          등록된 발주 품목이 없습니다.
        </div>
      ) : (
        <>
          {/* 저장 성공 배너 */}
          {saveDone && (
            <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <p className="text-sm text-emerald-400 font-medium">저장되었습니다.</p>
            </div>
          )}

          {/* 품목 목록 */}
          <div className="flex flex-col gap-1.5 mb-5">
            {items.map(item => {
              const actual = getActual(item, selectedDay)
              return (
                <div
                  key={item.id}
                  className="bg-neutral-900 rounded-xl border border-neutral-800 px-3 py-2"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-white truncate">{item.item_name}</p>
                    <span className="shrink-0 ml-2 text-[10px] text-neutral-500 bg-neutral-800 rounded-full px-1.5 py-0.5">
                      {item.unit}
                    </span>
                  </div>

                  {/* 발주량 입력 + 메모 */}
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={actual}
                      onChange={e => setActualQty(item.id, e.target.value)}
                      onFocus={e => e.currentTarget.select()}
                      className="w-16 shrink-0 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm text-center py-1.5 focus:outline-none focus:border-[#E8001D]/50 transition"
                    />
                    <input
                      type="text"
                      maxLength={100}
                      value={getMemo(item, selectedDay)}
                      onChange={e => setMemo(item.id, e.target.value)}
                      placeholder="메모"
                      className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white placeholder-neutral-600 px-2.5 py-1.5 focus:outline-none focus:border-[#E8001D]/50 transition"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 전체 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: '#E8001D' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                저장 중…
              </span>
            ) : (
              `${DAY_LABELS[selectedDay]}요일 저장 (${items.length}개 품목)`
            )}
          </button>
        </>
      )}
    </div>
  )
}
