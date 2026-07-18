'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'

type Category = '운영' | '레시피' | '청소'

const CATEGORY_ICON: Record<Category, string> = { 운영: '🖥️', 레시피: '🍗', 청소: '🧹' }
const STORAGE_BUCKET = 'manual-images'

export default function ManualNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { store } = useStore()

  const initialCategory = (searchParams.get('category') as Category) || '운영'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>(
    (['운영', '레시피', '청소'] as Category[]).includes(initialCategory) ? initialCategory : '운영'
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [role, setRole] = useState('')
  const [userId, setUserId] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCheckingAuth(false); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setRole(profile?.role ?? '')
      setCheckingAuth(false)
    }
    load()
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('이미지는 5MB 이하만 업로드 가능합니다.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setSaveError(null)
  }

  async function handleSave() {
    if (!store) {
      setSaveError('매장 정보를 불러오지 못했습니다.')
      return
    }
    if (!title.trim() || !content.trim()) {
      setSaveError('제목과 내용을 입력해주세요.')
      return
    }
    setSaving(true)
    setSaveError(null)

    const { data: inserted, error: insertError } = await supabase
      .from('manuals')
      .insert({
        store_id: store.id,
        category,
        title: title.trim(),
        content: content.trim(),
        image_url: null,
        updated_by: userId || null,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      setSaveError(insertError?.message ?? '저장 중 오류가 발생했습니다.')
      setSaving(false)
      return
    }

    let finalImageUrl: string | null = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${inserted.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, imageFile, { upsert: true })

      if (uploadError) {
        setSaveError('매뉴얼은 저장됐지만 이미지 업로드에 실패했습니다.')
        setSaving(false)
        router.replace(`/manuals/${inserted.id}`)
        return
      }

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      finalImageUrl = urlData.publicUrl

      await supabase
        .from('manuals')
        .update({ image_url: finalImageUrl, updated_at: new Date().toISOString() })
        .eq('id', inserted.id)
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview)
    router.replace(`/manuals/${inserted.id}`)
  }

  if (checkingAuth) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-6 w-32 mb-4 animate-pulse rounded-lg bg-neutral-800" />
        <div className="h-64 rounded-2xl animate-pulse bg-neutral-800" />
      </div>
    )
  }

  const canWrite = role === 'admin' || role === 'manager'
  if (!canWrite) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-neutral-500 text-sm mb-4">매뉴얼 등록 권한이 없습니다.</p>
        <button onClick={() => router.back()} className="text-xs text-neutral-400 underline">
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors"
      >
        ← 취소
      </button>
      <h2 className="text-lg font-bold text-white mb-5">매뉴얼 등록</h2>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-400">카테고리</label>
          <div className="flex gap-2">
            {(['운영', '레시피', '청소'] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                  category === cat
                    ? 'text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
                style={category === cat ? { backgroundColor: '#E8001D' } : {}}
              >
                {CATEGORY_ICON[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-400">
            제목 <span className="text-[#E8001D]">*</span>
          </label>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="매뉴얼 제목"
            className="rounded-xl px-4 py-3 text-sm bg-neutral-900 text-white placeholder-neutral-600 border border-neutral-700 focus:outline-none focus:border-[#E8001D] transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-400">
            내용 <span className="text-[#E8001D]">*</span>
          </label>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'매뉴얼 내용을 입력하세요.\n\n[섹션 제목]\n- 항목\n※ 주의사항'}
            className="rounded-xl px-4 py-3 text-sm bg-neutral-900 text-white placeholder-neutral-600 border border-neutral-700 focus:outline-none focus:border-[#E8001D] transition resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-400">이미지 (선택, 최대 5MB)</label>
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800">
              <Image
                src={imagePreview}
                alt="preview"
                width={640}
                height={360}
                className="w-full object-cover max-h-56"
                unoptimized
              />
              <button
                onClick={() => {
                  setImageFile(null)
                  if (imagePreview) URL.revokeObjectURL(imagePreview)
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
            {imagePreview ? '이미지 교체' : '+ 이미지 업로드'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {saveError && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">
            {saveError}
          </p>
        )}

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
          ) : '등록'}
        </button>
      </div>
    </div>
  )
}
