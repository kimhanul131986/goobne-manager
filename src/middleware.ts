import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 쿠키를 전달/갱신할 response 객체
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
          // request 쿠키 갱신
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // response 재생성 후 Set-Cookie 헤더 추가
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() 는 서버에서 토큰을 검증하므로 getSession()보다 신뢰도 높음
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 미로그인 → /dashboard/* 접근 시 /login 리다이렉트
  if (!user && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 로그인 상태 → /login 접근 시 /dashboard 리다이렉트
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 루트(/) 접근 시 로그인 여부에 따라 분기
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
  ],
}
