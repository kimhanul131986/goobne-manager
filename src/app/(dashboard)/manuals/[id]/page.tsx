'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
type Category = '레시피' | '청소' | '오픈마감'

interface ManualDetail {
  id: string
  category: Category
  title: string
  content: string
  image_url: string | null
  updated_at: string
  updated_by: string | null
  profiles: { name: string } | null
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

const CATEGORY_ICON: Record<Category, string> = { 레시피: '🍗', 청소: '🧹', 오픈마감: '🔑' }
const STORAGE_BUCKET = 'manual-images'

// ──────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────
export default function ManualDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [manual, setManual] = useState<ManualDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // 편집 상태
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('레시피')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [role, setRole] = useState('')
  const [userId, setUserId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 초기 로드 ──
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      setRole(profile?.role ?? '')

      const { data, error } = await supabase
        .from('manuals')
        .select('id, category, title, content, image_url, updated_at, updated_by, profiles(name)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setManual(data as ManualDetail)
      setLoading(false)
    }
    load()
  }, [id, router])

  // ── 편집 모드 진입 ──
  function enterEdit() {
    if (!manual) return
    setEditTitle(manual.title)
    setEditContent(manual.content)
    setEditCategory(manual.category)
    setImagePreview(null)
    setImageFile(null)
    setSaveError(null)
    setEditing(true)
  }

  // ── 이미지 선택 ──
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('이미지는 5MB 이하만 업로드 가능합니다.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setSaveError(null)
  }

  // ── 저장 ──
  async function handleSave() {
    if (!manual) return
    if (!editTitle.trim() || !editContent.trim()) {
      setSaveError('제목과 내용을 입력해주세요.')
      return
    }
    setSaving(true)
    setSaveError(null)

    let newImageUrl = manual.image_url

    // 이미지 업로드
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${manual.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, imageFile, { upsert: true })

      if (uploadError) {
        setSaveError('이미지 업로드 중 오류가 발생했습니다.')
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path)

      newImageUrl = urlData.publicUrl
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('manuals')
      .update({
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        image_url: newImageUrl,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', manual.id)

    if (updateError) {
      setSaveError('저장 중 오류가 발생했습니다.')
      setSaving(false)
      return
    }

    // 로컬 상태 갱신
    setManual((prev) =>
      prev
        ? {
            ...prev,
            title: editTitle.trim(),
            content: editContent.trim(),
            category: editCategory,
            image_url: newImageUrl,
            updated_at: new Date().toISOString(),
          }
        : prev
    )
    setEditing(false)
    setSaving(false)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    setImageFile(null)
  }

  // ── 이미지 삭제 ──
  async function handleRemoveImage() {
    if (!manual?.image_url) return
    setSaving(true)

    await supabase
      .from('manuals')
      .update({ image_url: null, updated_at: new Date().toISOString(), updated_by: userId })
      .eq('id', manual.id)

    setManual((prev) => prev ? { ...prev, image_url: null } : prev)
    setSaving(false)
  }

  // ──────────────────────────────────────────
  const canWrite = role === 'admin' || role === 'manager'

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-4 w-16 mb-6" />
        <Skeleton className="h-7 w-2/3 mb-2" />
        <Skeleton className="h-3 w-40 mb-8" />
        <Skeleton className="h-52 w-full mb-5" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-neutral-500 text-sm mb-4">매뉴얼을 찾을 수 없습니다.</p>
        <button onClick={() => router.back()} className="text-xs text-neutral-400 underline">
          돌아가기
        </button>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 편집 모드
  // ──────────────────────────────────────────
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors"
        >
          ← 취소
        </button>
        <h2 className="text-lg font-bold text-white mb-5">매뉴얼 수정</h2>

        <div className="flex flex-col gap-4">
          {/* 카테고리 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">카테고리</label>
            <div className="flex gap-2">
              {(['레시피', '청소', '오픈마감'] as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEditCategory(cat)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                    editCategory === cat
                      ? 'text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                  style={editCategory === cat ? { backgroundColor: '#E8001D' } : {}}
                >
                  {CATEGORY_ICON[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">
              제목 <span className="text-[#E8001D]">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm bg-neutral-900 text-white placeholder-neutral-600 border border-neutral-700 focus:outline-none focus:border-[#E8001D] transition"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">
              내용 <span className="text-[#E8001D]">*</span>
            </label>
            <textarea
              rows={12}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm bg-neutral-900 text-white placeholder-neutral-600 border border-neutral-700 focus:outline-none focus:border-[#E8001D] transition resize-none"
            />
          </div>

          {/* 이미지 업로드 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">이미지 (선택, 최대 5MB)</label>
            {/* 미리보기 */}
            {(imagePreview ?? manual?.image_url) && (
              <div className="relative rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800">
                <Image
                  src={imagePreview ?? manual!.image_url!}
                  alt="preview"
                  width={640}
                  height={360}
                  className="w-full object-cover max-h-56"
                  unoptimized
                />
                <button
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-dashed border-neutral-600 py-3 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-300 transition-colors"
            >
              {imagePreview ?? manual?.image_url ? '이미지 교체' : '+ 이미지 업로드'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* 에러 */}
          {saveError && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">
              {saveError}
            </p>
          )}

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: '#E8001D' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                저장 중…
              </span>
            ) : '저장'}
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 뷰 모드
  // ──────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors"
      >
        ← 목록으로
      </button>

      <article className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">

        {/* 이미지 */}
        {manual?.image_url && (
          <div className="relative">
            <Image
              src={manual.image_url}
              alt={manual.title}
              width={640}
              height={360}
              className="w-full object-cover max-h-64"
              unoptimized
            />
            {canWrite && (
              <button
                onClick={handleRemoveImage}
                disabled={saving}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs rounded-full px-2.5 py-1 transition"
              >
                이미지 삭제
              </button>
            )}
          </div>
        )}

        {/* 헤더 */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-neutral-800 text-neutral-400 rounded-full px-2 py-0.5">
                  {CATEGORY_ICON[manual!.category]} {manual!.category}
                </span>
              </div>
              <h1 className="text-lg font-bold text-white leading-snug">{manual?.title}</h1>
            </div>
            {canWrite && (
              <button
                onClick={enterEdit}
                className="shrink-0 text-xs text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-xl px-3 py-1.5 transition-colors"
              >
                수정
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            최종 수정: {manual?.profiles?.name ?? '-'} ·{' '}
            {manual && new Date(manual.updated_at).toLocaleString('ko-KR', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* 본문 */}
        <div className="px-5 py-5">
          <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
            {manual?.content}
          </p>
        </div>
      </article>
    </div>
  )
}
