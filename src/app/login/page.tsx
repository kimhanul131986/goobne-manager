'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    // router.push 대신 강제 페이지 이동으로 세션 쿠키 확실히 반영
    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      {/* 카드 */}
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-8 shadow-xl">

        {/* 타이틀 */}
        <div className="mb-8 text-center">
          <span className="inline-block text-3xl font-extrabold tracking-tight">
            <span style={{ color: '#E8001D' }}>굽네</span>
            <span className="text-white">치킨</span>
          </span>
          <p className="mt-1 text-sm text-neutral-400 font-medium tracking-widest uppercase">
            매장관리
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-neutral-400 tracking-wide">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@goobne.com"
              className="
                rounded-lg px-4 py-3 text-sm
                bg-neutral-800 text-white placeholder-neutral-600
                border border-neutral-700
                focus:outline-none focus:border-[#E8001D] focus:ring-1 focus:ring-[#E8001D]
                transition
              "
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-neutral-400 tracking-wide">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="
                rounded-lg px-4 py-3 text-sm
                bg-neutral-800 text-white placeholder-neutral-600
                border border-neutral-700
                focus:outline-none focus:border-[#E8001D] focus:ring-1 focus:ring-[#E8001D]
                transition
              "
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="
              mt-2 rounded-lg py-3 text-sm font-bold text-white
              transition active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            style={{ backgroundColor: '#E8001D' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                로그인 중…
              </span>
            ) : (
              '로그인'
            )}
          </button>
        </form>
      </div>

      {/* 하단 문구 */}
      <p className="mt-6 text-xs text-neutral-600">
        © 2025 Goobne Manager. All rights reserved.
      </p>
    </main>
  )
}
