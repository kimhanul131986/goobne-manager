import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

const ROLES = ['admin', 'manager', 'staff']

// 호출자가 admin인지 확인. admin이면 user를 반환, 아니면 NextResponse(에러)를 반환
async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 직원을 관리할 수 있습니다.' }, { status: 403 })
  }
  return { userId: user.id }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const { name, role, storeId } = await req.json()

  if (!name || !storeId) {
    return NextResponse.json({ error: '이름·매장은 필수입니다.' }, { status: 400 })
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: '역할 값이 올바르지 않습니다.' }, { status: 400 })
  }

  // 로그인 계정은 선택 사항 → 이메일/비밀번호는 자동 생성(아무도 로그인하지 않아도 스케줄에는 표시됨)
  const email = `emp-${crypto.randomUUID()}@goobne.local`
  const password = crypto.randomUUID()

  // 1. auth 계정 생성 (이메일 확인 생략)
  const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr || !created?.user) {
    const msg = authErr?.message?.includes('already')
      ? '이미 등록된 이메일입니다.'
      : authErr?.message ?? '계정 생성에 실패했습니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 2. profiles 행 생성
  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: created.user.id,
    name,
    role,
    store_id: storeId,
  })

  if (profileErr) {
    // 프로필 생성 실패 → 고아 auth 계정 정리
    await supabaseAdmin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: '직원 정보 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: created.user.id })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId 누락' }, { status: 400 })
  }
  if (userId === guard.userId) {
    return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 })
  }

  // 스케줄 등 연결 데이터가 있으면 먼저 안내
  const { count } = await supabaseAdmin
    .from('schedules')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `이 직원의 스케줄 ${count}건이 남아 있어 삭제할 수 없습니다. 스케줄을 먼저 정리하세요.` },
      { status: 409 }
    )
  }

  await supabaseAdmin.from('profiles').delete().eq('id', userId)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    return NextResponse.json({ error: '계정 삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
