'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface OrderItem {
  id: string
  item_name: string
  unit: string
  recommended_qty: number
  // 입력 상태
  actual_qty: number
  memo: string
  // 적정발주량 인라인 편집 (admin)
  editingRecommended: boolean
  tempRecommended: string
}

interface OrderLog {
  id: string
  actual_qty: number
  memo: string | null
  ordered_at: string
  item_id: string
  profiles: { name: string } | null
  order_items: { item_name: string; unit: string } | null
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function OrdersPage() {
  const { store } = useStore()
  const [items, setItems] = useState<OrderItem[]>([])
  const [logs, setLogs] = useState<OrderLog[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)
  const [role, setRole] = useState<string>('')
  const [storeId, setStoreId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  // ── 초기 데이터 로드 ──
  useEffect(() => {
    if (!store) return
    setLoading(true)
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const uid = user.id
      setUserId(uid)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single()

      if (!profile) { setLoading(false); return }
      setRole(profile.role)
      setStoreId(store.id)

      await Promise.all([
        loadItems(store.id),
        loadLogs(store.id),
      ])
      setLoading(false)
    }
    load()

    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current)
    }
  }, [store])

  async function loadItems(sid: string) {
    const { data } = await supabase
      .from('order_items')
      .select('id, item_name, unit, recommended_qty')
      .eq('store_id', sid)
      .order('item_name')

    setItems(
      (data ?? []).map((item: any) => ({
        ...item,
        actual_qty: item.recommended_qty,
        memo: '',
        editingRecommended: false,
        tempRecommended: String(item.recommended_qty),
      }))
    )
  }

  async function loadLogs(sid: string) {
    const todayStart = `${today}T00:00:00`
    const todayEnd   = `${today}T23:59:59`

    const { data } = await supabase
      .from('order_logs')
      .select('id, actual_qty, memo, ordered_at, item_id, profiles(name), order_items(item_name, unit)')
      .eq('store_id', sid)
      .gte('ordered_at', todayStart)
      .lte('ordered_at', todayEnd)
      .order('ordered_at', { ascending: false })

    setLogs(data as OrderLog[] ?? [])
  }

  // ── 수량 변경 ──
  function setActualQty(id: string, val: string) {
    const num = Math.max(0, parseInt(val, 10) || 0)
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, actual_qty: num } : it))
  }

  // ── 메모 변경 ──
  function setMemo(id: string, val: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, memo: val } : it))
  }

  // ── 적정발주량 인라인 편집 진입 (admin only) ──
  function startEditRecommended(id: string, current: number) {
    setItems((prev) => prev.map((it) =>
      it.id === id
        ? { ...it, editingRecommended: true, tempRecommended: String(current) }
        : it
    ))
  }

  // ── 적정발주량 저장 ──
  async function saveRecommended(id: string) {
    const item = items.find((it) => it.id === id)
    if (!item) return
    const newQty = Math.max(0, parseInt(item.tempRecommended, 10) || 0)

    const { error } = await supabase
      .from('order_items')
      .update({ recommended_qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setItems((prev) => prev.map((it) =>
        it.id === id
          ? { ...it, recommended_qty: newQty, editingRecommended: false }
          : it
      ))
    }
  }

  // ── 적정발주량 편집 취소 ──
  function cancelEditRecommended(id: string) {
    setItems((prev) => prev.map((it) =>
      it.id === id ? { ...it, editingRecommended: false } : it
    ))
  }

  // ── 전체 발주 완료 ──
  async function handleSubmitAll() {
    if (items.length === 0) return
    setSubmitting(true)

    const rows = items.map((it) => ({
      store_id: storeId,
      item_id: it.id,
      actual_qty: it.actual_qty,
      ordered_by: userId,
      memo: it.memo.trim() || null,
      ordered_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('order_logs').insert(rows)

    if (!error) {
      setSubmitDone(true)
      await loadLogs(storeId)
      // 수량/메모 초기화
      setItems((prev) => prev.map((it) => ({
        ...it,
        actual_qty: it.recommended_qty,
        memo: '',
      })))
      submitTimer.current = setTimeout(() => setSubmitDone(false), 3000)
    }

    setSubmitting(false)
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">발주 관리</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{today}</p>
        </div>
        {role === 'admin' && (
          <span className="text-[10px] bg-yellow-500/15 text-yellow-400 rounded-full px-2 py-1 font-semibold">
            관리자 모드
          </span>
        )}
      </div>

      {/* 품목 없음 */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-neutral-600 text-sm">
          등록된 발주 품목이 없습니다.
        </div>
      ) : (
        <>
          {/* 발주 성공 배너 */}
          {submitDone && (
            <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <p className="text-sm text-emerald-400 font-medium">발주가 완료되었습니다.</p>
            </div>
          )}

          {/* 품목 목록 */}
          <div className="flex flex-col gap-3 mb-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden"
              >
                {/* 품목 헤더 */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="text-sm font-semibold text-white">{item.item_name}</p>
                  <span className="text-xs text-neutral-500 bg-neutral-800 rounded-full px-2 py-0.5">
                    {item.unit}
                  </span>
                </div>

                {/* 적정발주량 */}
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                    <span>적정발주량:</span>
                    {item.editingRecommended ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={item.tempRecommended}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id
                                  ? { ...it, tempRecommended: e.target.value }
                                  : it
                              )
                            )
                          }
                          className="w-16 rounded-lg bg-neutral-700 text-white text-xs px-2 py-1 border border-yellow-500/50 focus:outline-none focus:border-yellow-400 text-center"
                        />
                        <span className="text-neutral-500">{item.unit}</span>
                        <button
                          onClick={() => saveRecommended(item.id)}
                          className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-0.5 hover:bg-emerald-500/20"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => cancelEditRecommended(item.id)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-300"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-300 font-medium">
                        {item.recommended_qty} {item.unit}
                        {role === 'admin' && (
                          <button
                            onClick={() => startEditRecommended(item.id, item.recommended_qty)}
                            className="ml-2 text-[10px] text-yellow-500 hover:text-yellow-400"
                          >
                            수정
                          </button>
                        )}
                      </span>
                    )}
                  </div>

                  {/* 발주 수량 + 메모 */}
                  <div className="flex gap-2">
                    {/* 수량 조절 */}
                    <div className="flex items-center rounded-xl overflow-hidden border border-neutral-700 shrink-0">
                      <button
                        onClick={() => setActualQty(item.id, String(item.actual_qty - 1))}
                        className="px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors text-lg leading-none"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={item.actual_qty}
                        onChange={(e) => setActualQty(item.id, e.target.value)}
                        className="w-14 bg-neutral-800 text-white text-sm text-center py-2 focus:outline-none"
                      />
                      <button
                        onClick={() => setActualQty(item.id, String(item.actual_qty + 1))}
                        className="px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors text-lg leading-none"
                      >
                        +
                      </button>
                    </div>

                    {/* 메모 */}
                    <input
                      type="text"
                      maxLength={100}
                      value={item.memo}
                      onChange={(e) => setMemo(item.id, e.target.value)}
                      placeholder="메모 (선택)"
                      className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white placeholder-neutral-600 px-3 py-2 focus:outline-none focus:border-[#E8001D]/50 transition"
                    />
                  </div>

                  {/* 적정 대비 차이 표시 */}
                  {item.actual_qty !== item.recommended_qty && (
                    <p className={`text-[10px] mt-1.5 ${item.actual_qty > item.recommended_qty ? 'text-orange-400' : 'text-sky-400'}`}>
                      {item.actual_qty > item.recommended_qty
                        ? `▲ 적정보다 ${item.actual_qty - item.recommended_qty}${item.unit} 많음`
                        : `▼ 적정보다 ${item.recommended_qty - item.actual_qty}${item.unit} 적음`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 전체 발주 완료 버튼 */}
          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: '#E8001D' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                발주 처리 중…
              </span>
            ) : (
              `전체 발주 완료 (${items.length}개 품목)`
            )}
          </button>
        </>
      )}

      {/* ── 오늘 발주 기록 ── */}
      {logs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-neutral-400 mb-3">오늘 발주 기록</h3>
          <div className="flex flex-col gap-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-neutral-900 rounded-xl border border-neutral-800 px-4 py-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">
                      {(log.order_items as any)?.item_name ?? '-'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {log.actual_qty} {(log.order_items as any)?.unit}
                    </span>
                    {log.memo && (
                      <span className="text-xs text-neutral-600 truncate max-w-[120px]">
                        · {log.memo}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-0.5">
                    {(log.profiles as any)?.name ?? '알 수 없음'} ·{' '}
                    {new Date(log.ordered_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
