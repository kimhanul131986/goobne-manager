function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function HandoverLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <Sk className="h-6 w-24 mb-5" />
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-7">
        <div className="flex border-b border-neutral-800">
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="flex-1 h-12 rounded-none" />)}
        </div>
        <div className="px-4 pt-3 pb-2">
          <Sk className="h-28 w-full" />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-800">
          <Sk className="h-3 w-12" />
          <Sk className="h-9 w-20 rounded-xl" />
        </div>
      </div>
      <Sk className="h-4 w-36 mb-3" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g}>
            <div className="flex items-center gap-3 mb-2">
              <Sk className="h-3 w-10 shrink-0" />
              <Sk className="flex-1 h-px" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => <Sk key={i} className="h-24 rounded-2xl" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
