import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase 세션 쿠키 확인 (sb-*-auth-token 패턴)
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(
    (c) => c.name.includes('auth-token') || c.name.startsWith('sb-')
  )

  // 미로그인 → /dashboard/* 접근 시 /login 리다이렉트
  if (!hasSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 루트(/) → /dashboard 또는 /login
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
