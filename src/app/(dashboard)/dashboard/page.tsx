'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface DashboardData {
  userName: string
  storeName: string
  storeId: string
  userId: string
  unreadNotices: number
  incompleteChecklists: number
  todaySchedule: { start_time: string; end_time: string } | null
  latestHandover: { shift: string; content: string; created_at: string } | null
  unresolvedIncidents: number
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const day = DAY_KO[date.getDay()]
  return { full: `${y}. ${m}. ${d}`, day, dateStr: `${y}-${m}-${d}` }
}

function formatTime(t: string) {
  // "HH:MM:SS" → "HH:MM"
  return t.slice(0, 5)
}

// ──────────────────────────────────────────
// 스켈레톤 컴포넌트
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
  )
}

function CardSkeleton() {
  return (
    <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-14 mb-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const today = formatDate(new Date())

  useEffect(() => {
    async function fetchAll() {
      // 1. 세션
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const userId = session.user.id

      // 2. 프로필 + 매장
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, store_id, stores(name)')
        .eq('id', userId)
        .single()

      if (!profile) { router.replace('/login'); return }

      const storeId: string = profile.store_id
      const storeName: string = (profile.stores as any)?.name ?? '매장 미지정'

      // 3. 병렬 패치
      const [
        noticesRes,
        checklistRes,
        scheduleRes,
        handoverRes,
        incidentsRes,
      ] = await Promise.all([
        // 미확인 공지: notice_checks에 없는 공지 수
        supabase
          .from('notices')
          .select('id, notice_checks!left(id)', { count: 'exact' })
          .eq('store_id', storeId)
          .is('notice_checks.id', null),

        // 오늘 미완료 체크리스트
        supabase
          .from('checklist_templates')
          .select('id, checklist_logs!left(id)', { count: 'exact' })
          .eq('store_id', storeId)
          .is('checklist_logs.id', null),

        // 오늘 본인 스케줄
        supabase
          .from('schedules')
          .select('start_time, end_time')
          .eq('store_id', storeId)
          .eq('user_id', userId)
          .eq('work_date', today.dateStr)
          .maybeSingle(),

        // 최근 인수인계 1개
        supabase
          .from('handovers')
          .select('shift, content, created_at')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 미해결 이슈
        supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('is_resolved', false),
      ])

      setData({
        userName: profile.name,
        storeName,
        storeId,
        userId,
        unreadNotices: noticesRes.count ?? 0,
        incompleteChecklists: checklistRes.count ?? 0,
        todaySchedule: scheduleRes.data ?? null,
        latestHandover: handoverRes.data ?? null,
        unresolvedIncidents: incidentsRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchAll()
  }, [router, today.dateStr])

  // ──────────────────────────────────────────
  // 스켈레톤 UI
  // ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* 날짜 스켈레톤 */}
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        {/* 카드 그리드 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        {/* 와이드 카드 */}
        <div className="flex flex-col gap-3">
          <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 실제 UI
  // ──────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      {/* 날짜 + 인삿말 */}
      <div className="mb-6">
        <p className="text-2xl font-bold text-white">
          {today.full}
          <span className="ml-2 text-base font-normal text-neutral-400">({today.day})</span>
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          안녕하세요, <span className="text-white font-semibold">{data?.userName}</span>님 ·{' '}
          <span style={{ color: '#E8001D' }} className="font-semibold">{data?.storeName}</span>
        </p>
      </div>

      {/* 수치 카드 2열 그리드 */}
      <div className="grid grid-cols-2 gap-3 mb-3">

        {/* 미확인 공지 */}
        <button
          onClick={() => router.push('/dashboard/notices')}
          className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all rounded-2xl p-5 border border-neutral-800 text-left"
        >
          <p className="text-xs text-neutral-500 mb-2">미확인 공지</p>
          <p className={`text-3xl font-extrabold ${(data?.unreadNotices ?? 0) > 0 ? 'text-[#E8001D]' : 'text-white'}`}>
            {data?.unreadNotices}
          </p>
          <p className="text-xs text-neutral-600 mt-1">건</p>
          {(data?.unreadNotices ?? 0) > 0 && (
            <span className="inline-block mt-2 text-[10px] bg-[#E8001D]/20 text-[#E8001D] rounded-full px-2 py-0.5">
              확인 필요
            </span>
          )}
        </button>

        {/* 미완료 체크리스트 */}
        <button
          onClick={() => router.push('/dashboard/checklist')}
          className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all rounded-2xl p-5 border border-neutral-800 text-left"
        >
          <p className="text-xs text-neutral-500 mb-2">오늘 체크리스트</p>
          <p className={`text-3xl font-extrabold ${(data?.incompleteChecklists ?? 0) > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {data?.incompleteChecklists}
          </p>
          <p className="text-xs text-neutral-600 mt-1">건 미완료</p>
          {(data?.incompleteChecklists ?? 0) === 0 && (
            <span className="inline-block mt-2 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5">
              완료
            </span>
          )}
        </button>

        {/* 미해결 이슈 */}
        <button
          onClick={() => router.push('/dashboard/incidents')}
          className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all rounded-2xl p-5 border border-neutral-800 text-left"
        >
          <p className="text-xs text-neutral-500 mb-2">미해결 이슈</p>
          <p className={`text-3xl font-extrabold ${(data?.unresolvedIncidents ?? 0) > 0 ? 'text-orange-400' : 'text-white'}`}>
            {data?.unresolvedIncidents}
          </p>
          <p className="text-xs text-neutral-600 mt-1">건</p>
        </button>

        {/* 오늘 스케줄 */}
        <button
          onClick={() => router.push('/dashboard/schedule')}
          className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all rounded-2xl p-5 border border-neutral-800 text-left"
        >
          <p className="text-xs text-neutral-500 mb-2">오늘 내 스케줄</p>
          {data?.todaySchedule ? (
            <>
              <p className="text-base font-bold text-white leading-tight">
                {formatTime(data.todaySchedule.start_time)}
              </p>
              <p className="text-xs text-neutral-400">
                ~ {formatTime(data.todaySchedule.end_time)}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-600 mt-1">스케줄 없음</p>
          )}
        </button>
      </div>

      {/* 최근 인수인계 */}
      <button
        onClick={() => router.push('/dashboard/handover')}
        className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] transition-all rounded-2xl p-5 border border-neutral-800 text-left mb-3"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-neutral-500">최근 인수인계</p>
          {data?.latestHandover && (
            <span className="text-[10px] bg-neutral-800 text-neutral-400 rounded-full px-2 py-0.5">
              {data.latestHandover.shift}
            </span>
          )}
        </div>
        {data?.latestHandover ? (
          <>
            <p className="text-sm text-neutral-200 leading-relaxed line-clamp-2">
              {data.latestHandover.content}
            </p>
            <p className="text-[10px] text-neutral-600 mt-2">
              {new Date(data.latestHandover.created_at).toLocaleString('ko-KR', {
                month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-600">등록된 인수인계가 없습니다.</p>
        )}
      </button>

      {/* 빠른 메뉴 */}
      <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
        <p className="text-xs text-neutral-500 mb-3">빠른 이동</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: '/dashboard/orders',  icon: '📦', label: '발주' },
            { href: '/dashboard/manuals', icon: '📖', label: '매뉴얼' },
            { href: '/dashboard/handover', icon: '🔄', label: '인수인계' },
            { href: '/dashboard/incidents', icon: '⚠️', label: '이슈신고' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] text-neutral-400">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
