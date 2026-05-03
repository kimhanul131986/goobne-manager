'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface NoticeDetail {
  id: string
  title: string
  content: string
  created_at: string
  profiles: { name: string; role: string } | null
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function NoticeDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [notice, setNotice] = useState<NoticeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchNotice() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const userId = user.id

      // 공지 상세
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, content, created_at, profiles(name, role)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setNotice(data as any)

      // 읽음 처리: 이미 있으면 무시 (UNIQUE 제약 덕분에 중복 방지)
      await supabase
        .from('notice_checks')
        .upsert(
          { notice_id: id, user_id: userId },
          { onConflict: 'notice_id,user_id', ignoreDuplicates: true }
        )

      setLoading(false)
    }

    fetchNotice()
  }, [id, router])

  const ROLE_LABEL: Record<string, string> = {
    admin: '관리자',
    manager: '매니저',
    staff: '직원',
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-4 w-16 mb-6" />
        <Skeleton className="h-7 w-2/3 mb-3" />
        <Skeleton className="h-3 w-40 mb-8" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-neutral-500 text-sm mb-4">공지를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="text-xs text-neutral-400 underline"
        >
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors"
      >
        ← 목록으로
      </button>

      {/* 공지 카드 */}
      <article className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">

        {/* 헤더 */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800">
          <h1 className="text-lg font-bold text-white leading-snug mb-3">
            {notice?.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="bg-neutral-800 rounded-full px-2 py-0.5">
              {ROLE_LABEL[notice?.profiles?.role ?? ''] ?? notice?.profiles?.role}
            </span>
            <span className="font-medium text-neutral-400">{notice?.profiles?.name ?? '알 수 없음'}</span>
            <span>·</span>
            <span>
              {notice && new Date(notice.created_at).toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-5 py-5">
          <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
            {notice?.content}
          </p>
        </div>

        {/* 읽음 확인 안내 */}
        <div className="mx-5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 flex items-center gap-2">
          <span className="text-emerald-400 text-sm">✓</span>
          <p className="text-xs text-emerald-400">읽음 처리되었습니다.</p>
        </div>
      </article>
    </div>
  )
}
