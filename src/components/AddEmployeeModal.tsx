'use client'

import { useState } from 'react'

const ROLE_OPTIONS = [
  { value: 'staff', label: '직원' },
  { value: 'manager', label: '매니저' },
  { value: 'admin', label: '관리자' },
]

const RED = '#E8001D'

export default function AddEmployeeModal({
  storeId, storeName, onClose, onSaved,
}: {
  storeId: string
  storeName: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setError('이름을 입력하세요.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role, storeId }),
      })
      const text = await res.text()
      let json: { error?: string } = {}
      try { json = text ? JSON.parse(text) : {} } catch {
        // 응답이 JSON이 아님 (로그인 만료로 로그인 페이지가 반환되는 등)
        setError(res.status === 401 || /login/i.test(res.url)
          ? '로그인이 만료됐습니다. 새로고침 후 다시 로그인해 주세요.'
          : `서버 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`)
        setSaving(false)
        return
      }
      if (!res.ok) { setError(json.error ?? '저장에 실패했습니다.'); setSaving(false); return }
      onSaved()
    } catch (e) {
      setError('네트워크 오류로 저장하지 못했습니다. 연결을 확인해 주세요.')
      setSaving(false)
    }
  }

  const inputCls = 'rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2.5 focus:outline-none focus:border-[#E8001D]/50'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-2xl border border-neutral-700 p-6 z-10">
        <h3 className="text-base font-bold text-white mb-1">직원 추가</h3>
        <p className="text-[11px] text-neutral-500 mb-5">{storeName}에 등록됩니다.</p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">이름</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="홍길동" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400">역할</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm font-semibold text-neutral-400 bg-neutral-800 hover:bg-neutral-700 transition-colors">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: RED }}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
