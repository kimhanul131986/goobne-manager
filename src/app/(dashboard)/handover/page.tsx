'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'
import { verifyPin } from '@/lib/verify-pin'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
type Shift = '오픈' | '마감' | '기타'

interface Handover {
  id: string
  shift: Shift
  content: string
  created_at: string
  created_by: string
  author_name: string
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

const SHIFTS: Shift[] = ['오픈', '마감', '기타']

const SHIFT_STYLE: Record<Shift, { bg: string; text: string; border: string }> = {
  오픈:  { bg: 'bg-sky-500/15',    text: 'text-sky-400',    border: 'border-sky-500/30' },
  마감:  { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  기타:  { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso)
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const target   = new Date(d); target.setHours(0, 0, 0, 0)

  if (target.getTime() === today.getTime())     return '오늘'
  if (target.getTime() === yesterday.getTime()) return '어제'

  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// 날짜 문자열로 그룹핑
function groupByDate(list: Handover[]): { dateLabel: string; dateKey: string; items: Handover[] }[] {
  const map = new Map<string, Handover[]>()
  for (const h of list) {
    const key = h.created_at.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(h)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      dateKey: key,
      dateLabel: formatDateHeader(items[0].created_at),
      items,
    }))
}

// ──────────────────────────────────────────
// 인수인계 카드
// ──────────────────────────────────────────
interface CardProps {
  item: Handover
  isMine: boolean
  isAdmin: boolean
  onDelete: (id: string) => void
}

function HandoverCard({ item, isMine, isAdmin, onDelete }: CardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const style = SHIFT_STYLE[item.shift]

  const isLong = item.content.length > 120

  async function handleDelete() {
    if (!confirm('이 인수인계를 삭제하시겠습니까?')) return
    if (!verifyPin('삭제')) return
    setDeleting(true)
    onDelete(item.id)
  }

  return (
    <div className={`rounded-2xl border ${style.border} bg-neutral-900 overflow-hidden transition-all`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${style.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${style.text}`}>{item.shift}</span>
          <span className="text-neutral-600 text-xs">·</span>
          <span className="text-xs text-neutral-400 font-medium">{item.author_name}</span>
          <span className="text-neutral-600 text-xs">·</span>
          <span className="text-xs text-neutral-500">{formatTime(item.created_at)}</span>
        </div>
        {(isMine || isAdmin) && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            삭제
          </button>
        )}
      </div>

      {/* 본문 */}
      <button
        className="w-full text-left px-4 py-3"
        onClick={() => isLong && setExpanded((v) => !v)}
      >
        <p className={`text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {item.content}
        </p>
        {isLong && (
          <p className={`text-xs mt-1.5 ${style.text}`}>
            {expanded ? '▲ 접기' : '▼ 더 보기'}
          </p>
        )}
      </button>
    </div>
  )
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function HandoverPage() {
  const { store } = useStore()
  // 유저 상태
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [storeId, setStoreId] = useState('')
  const [role, setRole] = useState('')

  // 작성 폼
  const [shift, setShift]     = useState<Shift>('오픈')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 목록
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [loading, setLoading]     = useState(true)

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
      setRole(profile.role ?? '')
      setStoreId(store.id)

      await fetchHandovers(store.id)
      setLoading(false)
    }
    init()
  }, [store])

  async function fetchHandovers(sid: string) {
    const since = new Date()
    since.setDate(since.getDate() - 6)
    since.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('handovers')
      .select('id, shift, content, created_at, created_by, profiles(name)')
      .eq('store_id', sid)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })

    setHandovers(
      (data ?? []).map((h: any) => ({
        id: h.id,
        shift: h.shift as Shift,
        content: h.content,
        created_at: h.created_at,
        created_by: h.created_by,
        author_name: h.profiles?.name ?? '알 수 없음',
      }))
    )
  }

  // ── 작성 제출 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setFormError(null)

    const { data, error } = await supabase
      .from('handovers')
      .insert({
        store_id: storeId,
        shift,
        content: content.trim(),
        created_by: userId,
      })
      .select('id, shift, content, created_at, created_by')
      .single()

    if (error || !data) {
      setFormError(`작성 중 오류가 발생했습니다. (${error?.message ?? '알 수 없는 오류'})`)
      setSubmitting(false)
      return
    }

    // 목록 맨 위에 추가
    const newItem: Handover = {
      id: data.id,
      shift: data.shift as Shift,
      content: data.content,
      created_at: data.created_at,
      created_by: data.created_by,
      author_name: userName || '나',
    }

    setHandovers((prev) => [newItem, ...prev])
    setContent('')
    setSubmitting(false)
    // 목록으로 스크롤
    setTimeout(() => {
      document.getElementById('handover-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // ── 삭제 ──
  async function handleDelete(id: string) {
    await supabase.from('handovers').delete().eq('id', id)
    setHandovers((prev) => prev.filter((h) => h.id !== id))
  }

  const grouped = groupByDate(handovers)
  const charCount = content.length

  // ──────────────────────────────────────────
  // 스켈레톤
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 mb-5" />
        <Skeleton className="h-40 rounded-2xl mb-6" />
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 메인 UI
  // ──────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-white mb-5">인수인계</h2>

      {/* ── 작성 폼 ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-7"
      >
        {/* Shift 선택 */}
        <div className="flex border-b border-neutral-800">
          {SHIFTS.map((s) => {
            const style = SHIFT_STYLE[s]
            const isActive = shift === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={`
                  flex-1 py-3 text-sm font-semibold transition-all
                  ${isActive ? `${style.bg} ${style.text}` : 'text-neutral-500 hover:text-neutral-300'}
                `}
              >
                {s}
              </button>
            )
          })}
        </div>

        {/* 텍스트 입력 */}
        <div className="px-4 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            required
            rows={5}
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${shift} 인수인계 내용을 입력하세요.\n\n예) 냉장고 온도 이상 발생 → 점검 요청 완료\n     저녁 피크타임 인력 부족 주의`}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-600 resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* 하단 바 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-800">
          <span className={`text-xs ${charCount > 900 ? 'text-orange-400' : 'text-neutral-600'}`}>
            {charCount} / 1000
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
                등록 중
              </span>
            ) : '등록'}
          </button>
        </div>

        {formError && (
          <p className="text-xs text-red-400 bg-red-950/40 border-t border-red-900 px-4 py-2">
            {formError}
          </p>
        )}
      </form>

      {/* ── 목록 ── */}
      <div id="handover-list">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-neutral-400">최근 7일 인수인계</p>
          <div className="flex items-center gap-3 text-[10px]">
            {SHIFTS.map((s) => {
              const style = SHIFT_STYLE[s]
              return (
                <span key={s} className={`${style.text} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.bg.replace('/15', '')} inline-block`} />
                  {s}
                </span>
              )
            })}
          </div>
        </div>

        {handovers.length === 0 ? (
          <div className="text-center py-14 text-neutral-600 text-sm">
            최근 7일간 인수인계 기록이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(({ dateKey, dateLabel, items }) => (
              <div key={dateKey}>
                {/* 날짜 구분선 */}
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-bold text-neutral-500 shrink-0">{dateLabel}</p>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <HandoverCard
                      key={item.id}
                      item={item}
                      isMine={item.created_by === userId}
                      isAdmin={role === 'admin' || role === 'manager'}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
