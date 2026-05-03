import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 text-center">
      {/* 404 숫자 */}
      <p className="text-7xl font-black tracking-tighter mb-4">
        <span style={{ color: '#E8001D' }}>4</span>
        <span className="text-neutral-700">0</span>
        <span style={{ color: '#E8001D' }}>4</span>
      </p>

      {/* 메시지 */}
      <h1 className="text-lg font-bold text-white mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-neutral-500 mb-8 max-w-xs">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>

      {/* 버튼 */}
      <Link
        href="/dashboard"
        className="rounded-xl px-6 py-3 text-sm font-bold text-white transition active:scale-95"
        style={{ backgroundColor: '#E8001D' }}
      >
        대시보드로 돌아가기
      </Link>
    </div>
  )
}
