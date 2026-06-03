'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { StoreProvider, useStore, type StoreInfo } from '@/lib/store-context'

// ──────────────────────────────────────────
// 네비게이션 메뉴 정의
// ──────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',  label: '홈',         icon: '🏠' },
  { href: '/notices',    label: '공지',       icon: '📢' },
  { href: '/orders',     label: '발주',       icon: '📦' },
  { href: '/schedule',   label: '스케줄',     icon: '📅' },
  { href: '/checklist',  label: '체크리스트', icon: '📋' },
  { href: '/manuals',    label: '매뉴얼',     icon: '📖' },
  { href: '/handover',   label: '인수인계',   icon: '🔄' },
  { href: '/incidents',  label: '이슈신고',   icon: '⚠️' },
  { href: '/staff',      label: '직원',       icon: '👥' },
]

const TAB_ITEMS = NAV_ITEMS.slice(0, 5)

// ──────────────────────────────────────────
// 테마 정의
// ──────────────────────────────────────────
const THEMES = {
  dark: {
    mainBg:    'bg-neutral-950',
    sidebarBg: 'bg-neutral-900',
    border:    'border-neutral-800',
    headerBg:  'bg-neutral-900/50',
    mobileBg:  'bg-neutral-900',
    navHover:  'hover:bg-neutral-800 hover:text-white',
    activeNav: 'bg-[#E8001D]/15 text-[#E8001D]',
    btnBg:     'bg-neutral-800 hover:bg-neutral-700',
    tabBg:     'bg-neutral-900',
    tabBorder: 'border-neutral-800',
  },
  red: {
    mainBg:    'bg-[#120000]',
    sidebarBg: 'bg-red-950',
    border:    'border-red-900',
    headerBg:  'bg-red-950/80',
    mobileBg:  'bg-red-950',
    navHover:  'hover:bg-red-900 hover:text-white',
    activeNav: 'bg-white/10 text-white',
    btnBg:     'bg-red-900 hover:bg-red-800',
    tabBg:     'bg-red-950',
    tabBorder: 'border-red-900',
  },
}

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface UserProfile {
  name: string
  role: string
}

// ──────────────────────────────────────────
// 내부 레이아웃 (StoreProvider 안쪽)
// ──────────────────────────────────────────
function InnerLayout({ profile, onLogout, children }: {
  profile: UserProfile | null
  onLogout: () => void
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { store, stores, switchStore } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const themeKey = store?.theme ?? 'dark'
  const t = THEMES[themeKey]

  return (
    <div className={`min-h-screen ${t.mainBg} text-white flex w-full`}>

      {/* ── 데스크탑 사이드바 ── */}
      <aside className={`hidden md:flex flex-col w-56 shrink-0 ${t.sidebarBg} border-r ${t.border} min-h-screen fixed top-0 left-0`}>

        {/* 로고 */}
        <div className={`px-5 py-4 border-b ${t.border}`}>
          <p className="text-base font-extrabold tracking-tight leading-tight">
            <span style={{ color: '#E8001D' }}>굽네치킨</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">매장관리</p>
        </div>

        {/* 매장 전환 버튼 */}
        <div className={`px-3 py-2.5 border-b ${t.border} flex gap-1.5`}>
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => switchStore(s)}
              className={`
                flex-1 text-xs font-bold py-1.5 rounded-lg transition-all
                ${store?.id === s.id
                  ? s.theme === 'red'
                    ? 'bg-[#E8001D] text-white'
                    : 'bg-neutral-700 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
                }
              `}
            >
              {s.name}
            </button>
          ))}
          {stores.length === 0 && (
            <span className="text-xs text-neutral-600">매장 로딩 중…</span>
          )}
        </div>

        {/* 현재 매장 */}
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <p className="text-[10px] text-neutral-500">현재 매장</p>
          <p className="text-sm font-semibold text-white truncate">{store?.name ?? '—'}</p>
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
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? t.activeNav : `text-neutral-400 ${t.navHover}`}
                `}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 유저 정보 + 로그아웃 */}
        <div className={`px-4 py-4 border-t ${t.border}`}>
          <p className="text-xs text-neutral-500 truncate">{profile?.name}</p>
          <p className="text-xs text-neutral-600 mb-2">{profile?.role}</p>
          <button
            onClick={onLogout}
            className={`w-full text-xs text-neutral-400 hover:text-white ${t.btnBg} rounded-lg py-2 transition-colors`}
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 콘텐츠 영역 ── */}
      <div className={`flex-1 flex flex-col md:ml-56 h-dvh min-w-0 ${t.mainBg}`}>

        {/* 모바일 헤더 */}
        <header className={`md:hidden flex flex-col ${t.mobileBg} border-b ${t.border} sticky top-0 z-30`}>
          {/* 매장 전환 (모바일) */}
          {stores.length > 0 && (
            <div className={`flex border-b ${t.border}`}>
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchStore(s)}
                  className={`
                    flex-1 py-2 text-xs font-bold transition-all
                    ${store?.id === s.id
                      ? s.theme === 'red'
                        ? 'bg-[#E8001D]/20 text-[#E8001D]'
                        : 'bg-neutral-700/60 text-white'
                      : 'text-neutral-600'
                    }
                  `}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-extrabold">
                <span style={{ color: '#E8001D' }}>굽네치킨</span>
              </p>
              <p className="text-[10px] text-neutral-500">{store?.name ?? ''} 매장관리</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMenuOpen(true)}
                className={`text-xs text-neutral-300 ${t.btnBg} rounded-lg px-3 py-1.5 active:scale-95 transition-transform`}
              >
                ☰ 메뉴
              </button>
              <button
                onClick={onLogout}
                className={`text-xs text-neutral-400 ${t.btnBg} rounded-lg px-3 py-1.5 active:scale-95 transition-transform`}
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 데스크탑 헤더 */}
        <header className={`hidden md:flex items-center justify-between px-6 py-4 border-b ${t.border} ${t.headerBg} sticky top-0 z-30 backdrop-blur`}>
          <h1 className="text-sm font-semibold text-neutral-200">
            {NAV_ITEMS.find((i) =>
              i.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(i.href)
            )?.label ?? ''}
          </h1>
          <span className="text-xs text-neutral-500">{profile?.name} · {profile?.role}</span>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className={`flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 pb-24 md:pb-6 ${t.mainBg}`}>
          {children}
        </main>
      </div>

      {/* ── 모바일 하단 탭바 ── */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${t.tabBg} border-t ${t.tabBorder} flex`}>
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

      {/* ── 모바일 전체 메뉴 시트 ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className={`relative w-full ${t.mobileBg} rounded-t-3xl border-t ${t.border} p-5 z-10 max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">전체 메뉴</p>
              <button onClick={() => setMenuOpen(false)} className="text-neutral-500 text-lg px-2">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? t.activeNav : `text-neutral-300 ${t.btnBg}`
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// 외부 레이아웃 (인증 + StoreProvider)
// ──────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [initialStore, setInitialStore] = useState<StoreInfo | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!mounted) return
        if (error || !user) { router.replace('/login'); return }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, role, store_id')
          .eq('id', user.id)
          .single()

        if (!mounted) return

        if (profileData) {
          setProfile({ name: profileData.name, role: profileData.role })
        }

        // 하드코딩 폴백 (DB 조회 실패 시에도 동작 보장)
        const HARDCODED_STORES: StoreInfo[] = [
          { id: 'a279d0fb-9fef-4fb8-a472-43c153a56fc5', name: '성산점', theme: 'dark' },
          { id: '7cf30fca-9d3c-4c55-a937-bcc7d6a4697a', name: '홍대점', theme: 'red' },
        ]

        // 모든 매장 로드 (추후 권한 기반으로 필터 가능)
        const { data: storeRows, error: storeError } = await supabase
          .from('stores')
          .select('id, name')
          .order('name')

        if (!mounted) return

        // DB에서 읽어온 게 있으면 우선 사용, 없으면 하드코딩 폴백
        let mapped: StoreInfo[]
        if (storeRows && storeRows.length > 0) {
          mapped = storeRows.map((s: any) => ({
            id: s.id,
            name: s.name,
            theme: s.name.includes('홍대') ? 'red' : 'dark',
          }))
        } else {
          console.warn('stores query returned empty, using hardcoded fallback. Error:', storeError)
          mapped = HARDCODED_STORES
        }

        setStores(mapped)

        // localStorage에서 선택된 매장 복원, 없으면 첫 번째
        let selected = mapped[0]
        try {
          const saved = localStorage.getItem('goobne_store')
          if (saved) {
            const parsed = JSON.parse(saved)
            const found = mapped.find((s) => s.id === parsed.id)
            if (found) selected = found
          }
        } catch {}
        setInitialStore(selected)
      } catch (e) {
        console.error('init error', e)
      } finally {
        if (mounted) setAuthChecked(true)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <span className="text-neutral-500 text-sm animate-pulse">불러오는 중…</span>
      </div>
    )
  }

  return (
    <StoreProvider stores={stores} initialStore={initialStore}>
      <InnerLayout profile={profile} onLogout={handleLogout}>
        {children}
      </InnerLayout>
    </StoreProvider>
  )
}
