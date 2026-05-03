function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function NoticesLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <Sk className="h-6 w-24 mb-1" />
          <Sk className="h-3 w-32" />
        </div>
        <Sk className="h-9 w-24 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex items-center gap-3">
            <Sk className="h-2 w-2 rounded-full shrink-0" />
            <div className="flex-1">
              <Sk className="h-4 w-3/4 mb-2" />
              <Sk className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
