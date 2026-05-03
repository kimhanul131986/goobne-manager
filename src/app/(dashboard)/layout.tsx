'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────
// 네비게이션 메뉴 정의
// ──────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',            label: '홈',       icon: '🏠' },
  { href: '/dashboard/notices',    label: '공지',     icon: '📢' },
  { href: '/dashboard/orders',     label: '발주',     icon: '📦' },
  { href: '/dashboard/schedule',   label: '스케줄',   icon: '📅' },
  { href: '/dashboard/checklist',  label: '체크리스트', icon: '📋' },
  { href: '/dashboard/manuals',    label: '매뉴얼',   icon: '📖' },
  { href: '/dashboard/handover',   label: '인수인계', icon: '🔄' },
  { href: '/dashboard/incidents',  label: '이슈신고', icon: '⚠️' },
]

// 탭바에는 공간이 좁아서 5개만 노출, 나머지는 사이드바에만 표시
const TAB_ITEMS = NAV_ITEMS.slice(0, 5)

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface UserProfile {
  name: string
  role: string
  storeName: string
}

// ──────────────────────────────────────────
// 레이아웃
// ──────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted || !session) return

        const { data } = await supabase
          .from('profiles')
          .select('name, role, stores(name)')
          .eq('id', session.user.id)
          .single()

        if (!mounted) return

        if (data) {
          setProfile({
            name: data.name,
            role: data.role,
            storeName: (data.stores as any)?.name ?? '매장 미지정',
          })
        }
      } catch (e) {
        console.error('profile fetch error', e)
      } finally {
        if (mounted) setAuthChecked(true)
      }
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // 인증 확인 전 화면 빈칸 처리
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <span className="text-neutral-500 text-sm animate-pulse">불러오는 중…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">

      {/* ── 데스크탑 사이드바 ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-neutral-900 border-r border-neutral-800 min-h-screen fixed top-0 left-0">

        {/* 로고 */}
        <div className="px-5 py-5 border-b border-neutral-800">
          <p className="text-lg font-extrabold tracking-tight">
            <span style={{ color: '#E8001D' }}>굽네</span>
            <span className="text-white">치킨</span>
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">매장관리</p>
        </div>

        {/* 매장명 */}
        <div className="px-5 py-3 border-b border-neutral-800">
          <p className="text-xs text-neutral-500">현재 매장</p>
          <p className="text-sm font-semibold text-white truncate">{profile?.storeName}</p>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors
                  ${isActive
                    ? 'bg-[#E8001D]/15 text-[#E8001D]'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }
                `}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 유저 정보 + 로그아웃 */}
        <div className="px-4 py-4 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 truncate">{profile?.name}</p>
          <p className="text-xs text-neutral-600 mb-2">{profile?.role}</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg py-2 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 콘텐츠 영역 ── */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">

        {/* 상단 헤더 (모바일에서만 표시) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30">
          <div>
            <p className="text-sm font-extrabold">
              <span style={{ color: '#E8001D' }}>굽네</span>
              <span className="text-white">치킨</span>
              <span className="text-neutral-400 text-xs font-normal ml-1">매장관리</span>
            </p>
            <p className="text-xs text-neutral-500">{profile?.storeName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-400 bg-neutral-800 rounded-lg px-3 py-1.5 active:scale-95 transition-transform"
          >
            로그아웃
          </button>
        </header>

        {/* 데스크탑 상단 헤더 */}
        <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 sticky top-0 z-30 backdrop-blur">
          <h1 className="text-sm font-semibold text-neutral-200">
            {NAV_ITEMS.find((i) =>
              i.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(i.href)
            )?.label ?? ''}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500">{profile?.name} · {profile?.role}</span>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* ── 모바일 하단 탭바 ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900 border-t border-neutral-800 flex">
        {TAB_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 gap-0.5
                text-[10px] font-medium transition-colors
                ${isActive ? 'text-[#E8001D]' : 'text-neutral-500'}
              `}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
