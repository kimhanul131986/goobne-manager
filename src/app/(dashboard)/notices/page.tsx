'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Notice {
  id: string
  title: string
  created_at: string
  created_by: string | null
  profiles: { name: string } | null
  isRead: boolean
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function NoticesPage() {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotices() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const userId = session.user.id

      // 프로필 + 매장
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', userId)
        .single()

      if (!profile) { router.replace('/login'); return }
      setRole(profile.role)

      // 공지 목록 + 작성자 이름
      const { data: noticeRows } = await supabase
        .from('notices')
        .select('id, title, created_at, created_by, profiles(name)')
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false })

      if (!noticeRows) { setLoading(false); return }

      // 내가 읽은 공지 id 목록
      const { data: checks } = await supabase
        .from('notice_checks')
        .select('notice_id')
        .eq('user_id', userId)

      const readIds = new Set((checks ?? []).map((c: any) => c.notice_id))

      setNotices(
        noticeRows.map((n: any) => ({
          id: n.id,
          title: n.title,
          created_at: n.created_at,
          created_by: n.created_by,
          profiles: n.profiles,
          isRead: readIds.has(n.id),
        }))
      )
      setLoading(false)
    }

    fetchNotices()
  }, [router])

  const unreadCount = notices.filter((n) => !n.isRead).length

  return (
    <div className="max-w-2xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">공지사항</h2>
          {!loading && unreadCount > 0 && (
            <p className="text-xs text-neutral-400 mt-0.5">
              미확인{' '}
              <span className="text-[#E8001D] font-semibold">{unreadCount}건</span>
            </p>
          )}
        </div>
        {(role === 'admin' || role === 'manager') && (
          <Link
            href="/dashboard/notices/new"
            className="text-sm font-semibold text-white rounded-xl px-4 py-2 active:scale-95 transition-transform"
            style={{ backgroundColor: '#E8001D' }}
          >
            + 공지 작성
          </Link>
        )}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16 text-neutral-600 text-sm">
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`/dashboard/notices/${notice.id}`}
                className="flex items-center gap-3 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] transition-all rounded-2xl p-4 border border-neutral-800"
              >
                {/* 읽음 여부 점 */}
                <span
                  className={`shrink-0 w-2 h-2 rounded-full ${notice.isRead ? 'bg-neutral-700' : 'bg-[#E8001D]'}`}
                />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${notice.isRead ? 'text-neutral-400' : 'text-white'}`}>
                    {notice.title}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {notice.profiles?.name ?? '알 수 없음'} ·{' '}
                    {new Date(notice.created_at).toLocaleDateString('ko-KR', {
                      month: '2-digit', day: '2-digit',
                    })}
                  </p>
                </div>

                {!notice.isRead && (
                  <span className="shrink-0 text-[10px] font-semibold bg-[#E8001D]/15 text-[#E8001D] rounded-full px-2 py-0.5">
                    NEW
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
