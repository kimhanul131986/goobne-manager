'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
type Category = '레시피' | '청소' | '오픈마감'

interface Manual {
  id: string
  category: Category
  title: string
  updated_at: string
  profiles: { name: string } | null
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

const TABS: Category[] = ['레시피', '청소', '오픈마감']
const TAB_ICON: Record<Category, string> = { 레시피: '🍗', 청소: '🧹', 오픈마감: '🔑' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function ManualsPage() {
  const { store } = useStore()
  const [manuals, setManuals] = useState<Manual[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Category>('레시피')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [storeId, setStoreId] = useState('')

  useEffect(() => {
    if (!store) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) { setLoading(false); return }
      setRole(profile.role)
      setStoreId(store.id)

      const { data } = await supabase
        .from('manuals')
        .select('id, category, title, updated_at, profiles(name)')
        .eq('store_id', store.id)
        .order('updated_at', { ascending: false })

      setManuals((data as Manual[]) ?? [])
      setLoading(false)
    }
    load()
  }, [store])

  // 탭 + 검색 필터 (메모이즈)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return manuals.filter(
      (m) => m.category === activeTab && (q === '' || m.title.toLowerCase().includes(q))
    )
  }, [manuals, activeTab, query])

  const canWrite = role === 'admin' || role === 'manager'

  // ──────────────────────────────────────────
  // 스켈레톤
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex gap-2 mb-4">
          {TABS.map((t) => <Skeleton key={t} className="h-9 w-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 rounded-xl mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
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
        <h2 className="text-lg font-bold text-white">매뉴얼</h2>
        {canWrite && (
          <Link
            href={`/manuals/new?category=${activeTab}`}
            className="text-sm font-semibold text-white rounded-xl px-4 py-2 active:scale-95 transition-transform"
            style={{ backgroundColor: '#E8001D' }}
          >
            + 등록
          </Link>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => {
          const count = manuals.filter((m) => m.category === tab).length
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setQuery('') }}
              className={`
                flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all
                ${isActive ? 'text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}
              `}
              style={isActive ? { backgroundColor: '#E8001D' } : {}}
            >
              <span>{TAB_ICON[tab]}</span>
              {tab}
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-neutral-700 text-neutral-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${activeTab} 매뉴얼 검색`}
          className="
            w-full rounded-xl bg-neutral-900 border border-neutral-700
            text-sm text-white placeholder-neutral-600
            pl-9 pr-4 py-2.5
            focus:outline-none focus:border-[#E8001D]/50
            transition
          "
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 text-neutral-600 text-sm">
          {query ? `"${query}" 검색 결과가 없습니다.` : `등록된 ${activeTab} 매뉴얼이 없습니다.`}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((manual) => (
            <li key={manual.id}>
              <Link
                href={`/manuals/${manual.id}`}
                className="flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] transition-all rounded-2xl px-5 py-4 border border-neutral-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{manual.title}</p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {manual.profiles?.name ?? '-'} · 수정 {formatDate(manual.updated_at)}
                  </p>
                </div>
                <span className="shrink-0 text-neutral-600 ml-3">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
