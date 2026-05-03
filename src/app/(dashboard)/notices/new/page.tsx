'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

export default function NoticeNewPage() {
  const router = useRouter()
  const { store } = useStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // 역할 체크: staff 접근 불가
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role === 'staff') {
        router.replace('/notices')
        return
      }

      setAuthChecked(true)
    }

    checkAuth()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const userId = user.id

    if (!store) {
      setError('매장 정보를 불러올 수 없습니다.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase
      .from('notices')
      .insert({
        store_id: store.id,
        title: title.trim(),
        content: content.trim(),
        created_by: userId,
      })

    if (insertError) {
      setError('공지 등록 중 오류가 발생했습니다.')
      setSubmitting(false)
      return
    }

    router.push('/notices')
  }

  if (!authChecked) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="text-neutral-500 text-sm animate-pulse">확인 중…</span>
      </div>
    )
  }

  const isDisabled = submitting || !title.trim() || !content.trim()

  return (
    <div className="max-w-2xl mx-auto">

      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors"
      >
        ← 돌아가기
      </button>

      <h2 className="text-lg font-bold text-white mb-6">공지 작성</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* 제목 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-xs font-semibold text-neutral-400 tracking-wide">
            제목 <span className="text-[#E8001D]">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요"
            className="
              rounded-xl px-4 py-3 text-sm
              bg-neutral-900 text-white placeholder-neutral-600
              border border-neutral-700
              focus:outline-none focus:border-[#E8001D] focus:ring-1 focus:ring-[#E8001D]
              transition
            "
          />
          <p className="text-right text-[10px] text-neutral-600">{title.length} / 100</p>
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-xs font-semibold text-neutral-400 tracking-wide">
            내용 <span className="text-[#E8001D]">*</span>
          </label>
          <textarea
            id="content"
            required
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            className="
              rounded-xl px-4 py-3 text-sm
              bg-neutral-900 text-white placeholder-neutral-600
              border border-neutral-700
              focus:outline-none focus:border-[#E8001D] focus:ring-1 focus:ring-[#E8001D]
              transition resize-none
            "
          />
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors active:scale-95"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isDisabled}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#E8001D' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                등록 중…
              </span>
            ) : (
              '공지 등록'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
