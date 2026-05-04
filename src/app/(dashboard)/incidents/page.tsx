'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
type Category = '설비' | '재고' | '기타'

interface Incident {
  id: string
  category: Category
  content: string
  is_resolved: boolean
  created_at: string
  reported_by: string
  reporter_name: string
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

const CATEGORIES: Category[] = ['설비', '재고', '기타']

const CAT_STYLE: Record<Category, { icon: string; bg: string; text: string; border: string }> = {
  설비: { icon: '🔧', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  재고: { icon: '📦', bg: 'bg-sky-500/15',    text: 'text-sky-400',    border: 'border-sky-500/30'    },
  기타: { icon: '📋', bg: 'bg-neutral-500/20', text: 'text-neutral-400', border: 'border-neutral-600' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ──────────────────────────────────────────
// 이슈 카드
// ──────────────────────────────────────────
interface CardProps {
  item: Incident
  isAdmin: boolean
  currentUserId: string
  onResolve: (id: string) => void
  onDelete: (id: string) => void
}

function IncidentCard({ item, isAdmin, currentUserId, onResolve, onDelete }: CardProps) {
  const [expanded, setExpanded]   = useState(false)
  const [resolving, setResolving] = useState(false)
  const style = CAT_STYLE[item.category]
  const isLong = item.content.length > 100
  const isMine = item.reported_by === currentUserId

  async function handleResolve() {
    setResolving(true)
    onResolve(item.id)
  }

  return (
    <div className={`rounded-2xl border ${item.is_resolved ? 'border-neutral-800 bg-neutral-900/50' : `${style.border} bg-neutral-900`} overflow-hidden`}>

      {/* 헤더 */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${item.is_resolved ? 'bg-neutral-800/40' : style.bg}`}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{style.icon}</span>
          <span className={`text-xs font-bold ${item.is_resolved ? 'text-neutral-500' : style.text}`}>
            {item.category}
          </span>
          {item.is_resolved && (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 rounded-full px-2 py-0.5 font-semibold">
              해결완료
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!item.is_resolved && isAdmin && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
            >
              {resolving ? '처리 중…' : '해결완료'}
            </button>
          )}
          {isMine && !item.is_resolved && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 본문 */}
      <button
        className="w-full text-left px-4 py-3"
        onClick={() => isLong && setExpanded((v) => !v)}
      >
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${item.is_resolved ? 'text-neutral-500' : 'text-neutral-200'} ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {item.content}
        </p>
        {isLong && (
          <p className={`text-xs mt-1.5 ${item.is_resolved ? 'text-neutral-600' : style.text}`}>
            {expanded ? '▲ 접기' : '▼ 더 보기'}
          </p>
        )}
      </button>

      {/* 푸터 */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-neutral-600">
          {item.reporter_name} · {formatDateTime(item.created_at)}
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function IncidentsPage() {
  const { store } = useStore()
  // 유저
  const [userId, setUserId]     = useState('')
  const [userName, setUserName] = useState('')
  const [storeId, setStoreId]   = useState('')
  const [role, setRole]         = useState('')

  // 폼
  const [category, setCategory] = useState<Category>('설비')
  const [content, setContent]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [submitDone, setSubmitDone] = useState(false)

  // 목록
  const [incidents, setIncidents]         = useState<Incident[]>([])
  const [loading, setLoading]             = useState(true)
  const [showResolved, setShowResolved]   = useState(false)

  // ── 초기 로드 ──
  useEffect(() => {
    if (!store) return
    setLoading(true)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const uid = user.id
      setUserId(uid)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', uid)
        .single()

      if (!profile) { setLoading(false); return }
      setUserName(profile.name)
      setStoreId(store.id)
      setRole(profile.role)

      await fetchIncidents(store.id)
      setLoading(false)
    }
    init()
  }, [store])

  async function fetchIncidents(sid: string) {
    const { data } = await supabase
      .from('incidents')
      .select('id, category, content, is_resolved, created_at, reported_by, profiles(name)')
      .eq('store_id', sid)
      .order('created_at', { ascending: false })

    setIncidents(
      (data ?? []).map((i: any) => ({
        id: i.id,
        category: i.category as Category,
        content: i.content,
        is_resolved: i.is_resolved,
        created_at: i.created_at,
        reported_by: i.reported_by,
        reporter_name: i.profiles?.name ?? '알 수 없음',
      }))
    )
  }

  // ── 신고 제출 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setFormError(null)

    const { data, error } = await supabase
      .from('incidents')
      .insert({
        store_id: storeId,
        category,
        content: content.trim(),
        reported_by: userId,
        is_resolved: false,
      })
      .select('id, category, content, is_resolved, created_at, reported_by')
      .single()

    if (error || !data) {
      setFormError(`신고 중 오류가 발생했습니다. (${error?.message ?? '알 수 없는 오류'})`)
      setSubmitting(false)
      return
    }

    const newItem: Incident = {
      id: data.id,
      category: data.category as Category,
      content: data.content,
      is_resolved: data.is_resolved,
      created_at: data.created_at,
      reported_by: data.reported_by,
      reporter_name: userName || '나',
    }

    setIncidents((prev) => [newItem, ...prev])
    setContent('')
    setSubmitDone(true)
    setSubmitting(false)
    setTimeout(() => setSubmitDone(false), 3000)
  }

  // ── 해결 완료 (admin) ──
  async function handleResolve(id: string) {
    await supabase
      .from('incidents')
      .update({ is_resolved: true })
      .eq('id', id)

    setIncidents((prev) =>
      prev.map((i) => i.id === id ? { ...i, is_resolved: true } : i)
    )
  }

  // ── 삭제 (본인 미해결 건) ──
  async function handleDelete(id: string) {
    if (!confirm('이 이슈 신고를 삭제하시겠습니까?')) return
    await supabase.from('incidents').delete().eq('id', id)
    setIncidents((prev) => prev.filter((i) => i.id !== id))
  }

  // ── 분류 ──
  const unresolved = incidents.filter((i) => !i.is_resolved)
  const resolved   = incidents.filter((i) => i.is_resolved)

  // ── 카테고리별 미해결 집계 ──
  const unresolvedByCategory = CATEGORIES.reduce<Record<Category, number>>(
    (acc, cat) => {
      acc[cat] = unresolved.filter((i) => i.category === cat).length
      return acc
    },
    { 설비: 0, 재고: 0, 기타: 0 }
  )

  // ──────────────────────────────────────────
  // 스켈레톤
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 mb-5" />
        <Skeleton className="h-44 rounded-2xl mb-6" />
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 메인 UI
  // ──────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white">이슈 신고</h2>
        {unresolved.length > 0 && (
          <span className="text-xs font-bold bg-[#E8001D]/15 text-[#E8001D] rounded-full px-3 py-1">
            미해결 {unresolved.length}건
          </span>
        )}
      </div>

      {/* ── 신고 폼 ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-7"
      >
        {/* 카테고리 선택 */}
        <div className="flex border-b border-neutral-800">
          {CATEGORIES.map((cat) => {
            const style = CAT_STYLE[cat]
            const isActive = category === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all
                  ${isActive ? `${style.bg} ${style.text}` : 'text-neutral-500 hover:text-neutral-300'}
                `}
              >
                <span className="text-base leading-none">{style.icon}</span>
                {cat}
              </button>
            )
          })}
        </div>

        {/* 내용 입력 */}
        <div className="px-4 pt-3 pb-2">
          <textarea
            required
            rows={5}
            maxLength={500}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${category} 이슈 내용을 입력하세요.\n\n예) 냉장고 3번 온도 이상 알람 발생 (현재 8°C)\n     즉시 점검 필요`}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-600 resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* 하단 바 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-800">
          <span className={`text-xs ${content.length > 450 ? 'text-orange-400' : 'text-neutral-600'}`}>
            {content.length} / 500
          </span>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-xl px-5 py-2 text-sm font-bold text-white transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#E8001D' }}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                신고 중
              </span>
            ) : '신고하기'}
          </button>
        </div>

        {/* 에러 */}
        {formError && (
          <p className="text-xs text-red-400 bg-red-950/40 border-t border-red-900 px-4 py-2">{formError}</p>
        )}
      </form>

      {/* 신고 성공 배너 */}
      {submitDone && (
        <div className="mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          <p className="text-sm text-emerald-400">이슈가 신고되었습니다.</p>
        </div>
      )}

      {/* ── 카테고리별 현황 요약 ── */}
      {unresolved.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const style = CAT_STYLE[cat]
            const count = unresolvedByCategory[cat]
            return (
              <div key={cat} className={`rounded-2xl border ${style.border} ${style.bg} px-3 py-3 text-center`}>
                <p className="text-xl leading-none mb-1">{style.icon}</p>
                <p className={`text-lg font-extrabold ${count > 0 ? style.text : 'text-neutral-600'}`}>{count}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{cat} 미해결</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 미해결 이슈 목록 ── */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-neutral-400 mb-3">
          미해결 이슈
          {unresolved.length > 0 && (
            <span className="ml-2 text-[#E8001D] font-bold">{unresolved.length}</span>
          )}
          {role === 'admin' && unresolved.length > 0 && (
            <span className="ml-2 text-[10px] text-neutral-600 font-normal">관리자: 해결완료 처리 가능</span>
          )}
        </p>

        {unresolved.length === 0 ? (
          <div className="text-center py-10 bg-neutral-900 rounded-2xl border border-neutral-800">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm text-neutral-500">미해결 이슈가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {unresolved.map((item) => (
              <IncidentCard
                key={item.id}
                item={item}
                isAdmin={role === 'admin'}
                currentUserId={userId}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 해결된 이슈 토글 ── */}
      {resolved.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-3 w-full"
          >
            <span>{showResolved ? '▼' : '›'}</span>
            <span>해결된 이슈 {resolved.length}건</span>
            <div className="flex-1 h-px bg-neutral-800 ml-1" />
          </button>

          {showResolved && (
            <div className="flex flex-col gap-2">
              {resolved.map((item) => (
                <IncidentCard
                  key={item.id}
                  item={item}
                  isAdmin={role === 'admin'}
                  currentUserId={userId}
                  onResolve={handleResolve}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
