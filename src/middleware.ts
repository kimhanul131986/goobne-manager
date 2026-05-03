import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 토큰 갱신 (중요: getUser 호출해야 쿠키가 갱신됨)
  const { data: { user } } = await supabase.auth.getUser()

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isLogin = request.nextUrl.pathname === '/login'

  // 비로그인 → 대시보드 접근 시 로그인으로
  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 로그인 상태 → 로그인 페이지 접근 시 대시보드로
  if (user && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
