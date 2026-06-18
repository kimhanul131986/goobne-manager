'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store-context'
import AddEmployeeModal from '@/components/AddEmployeeModal'
import { verifyPin } from '@/lib/verify-pin'

interface Employee {
  id: string
  name: string
  role: string
}

const ROLE_LABEL: Record<string, string> = {
  staff: '직원',
  manager: '매니저',
  admin: '관리자',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function StaffPage() {
  const { store } = useStore()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchEmployees = useCallback(async (storeId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('store_id', storeId)
      .order('name')
    setEmployees(data ?? [])
  }, [])

  useEffect(() => {
    if (!store) return
    setLoading(true)
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(profile?.role ?? '')
      await fetchEmployees(store!.id)
      setLoading(false)
    }
    init()
  }, [store, fetchEmployees])

  async function handleDelete(emp: Employee) {
    if (!confirm(`${emp.name} 직원을 삭제할까요?`)) return
    if (!verifyPin('삭제')) return
    const res = await fetch('/api/admin/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error ?? '삭제 실패'); return }
    if (store) fetchEmployees(store.id)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-sm text-neutral-500 text-center py-12">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-white">{store?.name} 직원</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">{employees.length}명</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs font-bold text-white rounded-xl px-3.5 py-2 active:scale-95 transition"
          style={{ backgroundColor: '#E8001D' }}
        >
          + 직원 추가
        </button>
      </div>

      {employees.length === 0 ? (
        <p className="text-[11px] text-neutral-600 text-center py-10">등록된 직원이 없습니다. “직원 추가”로 등록하세요.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm font-semibold text-white truncate">{emp.name}</span>
                <span className="text-[10px] text-neutral-400 bg-neutral-800 rounded-full px-2 py-0.5 shrink-0">
                  {ROLE_LABEL[emp.role] ?? emp.role}
                </span>
              </div>
              <button
                onClick={() => handleDelete(emp)}
                className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors px-1 shrink-0"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && store && (
        <AddEmployeeModal
          storeId={store.id}
          storeName={store.name}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchEmployees(store.id) }}
        />
      )}
    </div>
  )
}
