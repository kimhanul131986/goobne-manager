'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'
import { verifyPin } from '@/lib/verify-pin'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
type Category = '매일' | '오픈' | '마감'

interface CheckItem {
  id: string
  title: string
  order_num: number
  isDone: boolean
  doneByName: string | null
  doneAt: string | null
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

// KST 안전: 로컬(한국) 기준 YYYY-MM-DD (UTC toISOString 쓰면 새벽 0~9시에 어제로 잡힘)
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ──────────────────────────────────────────
// 정렬 가능한 항목 컴포넌트
// ──────────────────────────────────────────
function SortableItem({
  item, isAdmin, onCheck, onDelete,
}: {
  item: CheckItem
  isAdmin: boolean
  onCheck: (id: string, done: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`
          flex items-start gap-3 rounded-2xl px-4 py-4 border transition-all
          ${item.isDone ? 'bg-neutral-900/50 border-neutral-800/50' : 'bg-neutral-900 border-neutral-800'}
        `}
      >
        {/* 드래그 핸들 (admin) */}
        {isAdmin && (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 mt-0.5 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing touch-none"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect y="2" width="14" height="1.5" rx="1"/>
              <rect y="6" width="14" height="1.5" rx="1"/>
              <rect y="10" width="14" height="1.5" rx="1"/>
            </svg>
          </button>
        )}

        {/* 체크박스 */}
        <button
          onClick={() => onCheck(item.id, item.isDone)}
          className={`
            shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${item.isDone ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-600 hover:border-[#E8001D]'}
          `}
        >
          {item.isDone && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${item.isDone ? 'line-through text-neutral-500' : 'text-white'}`}>
            {item.title}
          </p>
          {item.isDone && item.doneAt && (
            <p className="text-[10px] text-neutral-600 mt-0.5">
              {item.doneByName ?? '나'} ·{' '}
              {new Date(item.doneAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* 삭제 버튼 (admin) */}
        {isAdmin && (
          <button
            onClick={() => onDelete(item.id)}
            className="shrink-0 text-neutral-700 hover:text-red-400 transition-colors text-lg leading-none mt-0.5"
          >
            ×
          </button>
        )}
      </div>
    </li>
  )
}

const TABS: Category[] = ['매일', '오픈', '마감']

const TAB_ICON: Record<Category, string> = {
  매일: '📋',
  오픈: '🌅',
  마감: '🌙',
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function ChecklistPage() {
  const { store } = useStore()
  const [activeTab, setActiveTab] = useState<Category>('매일')
  const [items, setItems] = useState<Record<Category, CheckItem[]>>({
    매일: [], 오픈: [], 마감: [],
  })
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [storeId, setStoreId] = useState('')
  const [userId, setUserId] = useState('')
  // admin 항목 추가
  const [addingTitle, setAddingTitle] = useState('')
  const [addingLoading, setAddingLoading] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const today = ymd(new Date())
  const isAdmin = role === 'admin'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // ── 초기 로드 ──
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

      await fetchAll(store.id)
      setLoading(false)
    }
    load()
  }, [store])

  async function fetchAll(sid: string) {
    // 전체 템플릿
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('id, category, title, order_num')
      .eq('store_id', sid)
      .order('order_num')

    // 오늘 이 매장의 완료 기록 (누가 체크했든 매장 단위로 공유) + 완료자 이름
    const templateIds = (templates ?? []).map((t) => t.id)
    const { data: logs } = templateIds.length
      ? await supabase
          .from('checklist_logs')
          .select('template_id, done_at, profiles(name)')
          .in('template_id', templateIds)
          .eq('log_date', today)
      : { data: [] as any[] }

    const doneMap = new Map<string, { done_at: string; name: string | null }>(
      (logs ?? []).map((l: any) => [
        l.template_id,
        { done_at: l.done_at, name: l.profiles?.name ?? null },
      ])
    )

    const grouped: Record<Category, CheckItem[]> = { 매일: [], 오픈: [], 마감: [] }

    for (const t of templates ?? []) {
      const cat = t.category as Category
      if (!grouped[cat]) continue
      const log = doneMap.get(t.id)
      grouped[cat].push({
        id: t.id,
        title: t.title,
        order_num: t.order_num,
        isDone: !!log,
        doneByName: log?.name ?? null,
        doneAt: log?.done_at ?? null,
      })
    }

    setItems(grouped)
  }

  // ── 체크/언체크 ──
  async function handleCheck(templateId: string, currentDone: boolean) {
    if (currentDone) {
      // 취소: 오늘 이 매장의 기록 삭제 (누가 체크했든 매장 단위로 해제)
      await supabase
        .from('checklist_logs')
        .delete()
        .eq('template_id', templateId)
        .eq('log_date', today)
    } else {
      // 완료: 기록 추가 (체크한 사람을 함께 기록)
      await supabase.from('checklist_logs').upsert(
        {
          template_id: templateId,
          user_id: userId,
          log_date: today,
          done_at: new Date().toISOString(),
        },
        { onConflict: 'template_id,user_id,log_date', ignoreDuplicates: false }
      )
    }

    // 재fetch
    await fetchAll(storeId)
  }

  // ── 항목 추가 (admin) ──
  async function handleAddItem() {
    const title = addingTitle.trim()
    if (!title) return
    setAddingLoading(true)

    const maxOrder = Math.max(0, ...items[activeTab].map((i) => i.order_num))

    const { data, error } = await supabase
      .from('checklist_templates')
      .insert({
        store_id: storeId,
        category: activeTab,
        title,
        order_num: maxOrder + 1,
      })
      .select()
      .single()

    if (error) {
      alert('추가 실패: ' + error.message)
    } else if (data) {
      setItems((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            id: data.id,
            title: data.title,
            order_num: data.order_num,
            isDone: false,
            doneByName: null,
            doneAt: null,
          },
        ],
      }))
      setAddingTitle('')
      addInputRef.current?.focus()
    }

    setAddingLoading(false)
  }

  // ── 항목 삭제 (admin) ──
  async function handleDelete(templateId: string) {
    if (!verifyPin('삭제')) return
    await supabase.from('checklist_templates').delete().eq('id', templateId)
    setItems((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((i) => i.id !== templateId),
    }))
  }

  // ── 순서 변경 (admin 드래그) ──
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const current = items[activeTab]
    const oldIdx = current.findIndex((i) => i.id === active.id)
    const newIdx = current.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(current, oldIdx, newIdx)

    // 낙관적 업데이트
    setItems((prev) => ({ ...prev, [activeTab]: reordered }))

    // DB에 order_num 일괄 업데이트
    await Promise.all(
      reordered.map((item, idx) =>
        supabase.from('checklist_templates').update({ order_num: idx + 1 }).eq('id', item.id)
      )
    )
  }

  const currentItems = items[activeTab]
  const doneCount = currentItems.filter((i) => i.isDone).length
  const totalCount = currentItems.length
  const allDone = totalCount > 0 && doneCount === totalCount
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // ──────────────────────────────────────────
  // 스켈레톤
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex gap-2 mb-5">
          {TABS.map((t) => <Skeleton key={t} className="h-9 w-20 rounded-xl" />)}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
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
        <h2 className="text-lg font-bold text-white">체크리스트</h2>
        <span className="text-xs text-neutral-500">{today}</span>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        {TABS.map((tab) => {
          const tabItems = items[tab]
          const tabDone = tabItems.filter((i) => i.isDone).length
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all
                ${isActive
                  ? 'text-white shadow-lg'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}
              `}
              style={isActive ? { backgroundColor: '#E8001D' } : {}}
            >
              <span className="text-base leading-none">{TAB_ICON[tab]}</span>
              {tab}
              {tabItems.length > 0 && (
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                    tabDone === tabItems.length
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-700 text-neutral-400'
                  }`}
                >
                  {tabDone}/{tabItems.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 진행률 바 */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-neutral-500">진행률</span>
            <span className={`text-xs font-semibold ${allDone ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {doneCount} / {totalCount} ({progress}%)
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: allDone ? '#34d399' : '#E8001D',
              }}
            />
          </div>
        </div>
      )}

      {/* 전체 완료 축하 메시지 */}
      {allDone && (
        <div className="mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-5 py-4 text-center">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-sm font-bold text-emerald-400">
            {activeTab} 체크리스트 완료!
          </p>
          <p className="text-xs text-emerald-500/70 mt-0.5">모든 항목을 완료했습니다.</p>
        </div>
      )}

      {/* 체크리스트 항목 없음 */}
      {currentItems.length === 0 ? (
        <div className="text-center py-12 text-neutral-600 text-sm">
          {activeTab} 체크리스트 항목이 없습니다.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={currentItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2 mb-4">
              {currentItems.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onCheck={handleCheck}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* 항목 추가 (admin) */}
      {isAdmin && (
        <div className="bg-neutral-900 rounded-2xl border border-dashed border-neutral-700 p-4">
          <p className="text-xs text-neutral-500 mb-2">
            {activeTab} 항목 추가
          </p>
          <div className="flex gap-2">
            <input
              ref={addInputRef}
              type="text"
              maxLength={80}
              value={addingTitle}
              onChange={(e) => setAddingTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="항목 이름 입력 후 Enter"
              className="
                flex-1 rounded-xl bg-neutral-800 border border-neutral-700
                text-sm text-white placeholder-neutral-600
                px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50
                transition
              "
            />
            <button
              onClick={handleAddItem}
              disabled={!addingTitle.trim() || addingLoading}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
              style={{ backgroundColor: '#E8001D' }}
            >
              {addingLoading ? '…' : '추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
