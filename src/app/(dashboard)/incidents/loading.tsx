function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function IncidentsLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Sk className="h-6 w-24" />
        <Sk className="h-6 w-20 rounded-full" />
      </div>
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-7">
        <div className="flex border-b border-neutral-800">
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="flex-1 h-12 rounded-none" />)}
        </div>
        <div className="px-4 pt-3 pb-2">
          <Sk className="h-28 w-full" />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-800">
          <Sk className="h-3 w-12" />
          <Sk className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <Sk className="h-4 w-20 mb-3" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-800/40">
              <div className="flex items-center gap-2">
                <Sk className="h-5 w-5 rounded" />
                <Sk className="h-3 w-10" />
              </div>
              <Sk className="h-6 w-16 rounded-full" />
            </div>
            <div className="px-4 py-3">
              <Sk className="h-4 w-full mb-2" />
              <Sk className="h-4 w-2/3" />
            </div>
            <div className="px-4 pb-3">
              <Sk className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
