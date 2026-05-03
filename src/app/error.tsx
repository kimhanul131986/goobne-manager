'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  const router = useRouter()

  useEffect(() => {
    // 에러 로깅 (추후 Sentry 등 연동 가능)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 text-center">
      {/* 아이콘 */}
      <div className="w-16 h-16 rounded-2xl bg-[#E8001D]/10 border border-[#E8001D]/20 flex items-center justify-center mb-5">
        <span className="text-3xl">⚠️</span>
      </div>

      {/* 타이틀 */}
      <h1 className="text-xl font-bold text-white mb-2">오류가 발생했습니다</h1>
      <p className="text-sm text-neutral-500 mb-1 max-w-xs">
        일시적인 문제가 생겼습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
      </p>

      {/* 에러 코드 (개발 환경에서만 표시) */}
      {process.env.NODE_ENV === 'development' && error.message && (
        <p className="text-xs text-neutral-700 bg-neutral-900 rounded-lg px-3 py-2 mt-3 font-mono max-w-sm break-all">
          {error.message}
        </p>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 mt-7">
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          홈으로
        </button>
        <button
          onClick={reset}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition active:scale-95"
          style={{ backgroundColor: '#E8001D' }}
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
