function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function ChecklistLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Sk className="h-6 w-28" />
        <Sk className="h-4 w-20" />
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-9 w-24 rounded-xl" />)}
      </div>
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <Sk className="h-3 w-12" />
          <Sk className="h-3 w-20" />
        </div>
        <Sk className="h-2 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl px-4 py-4 border border-neutral-800 flex items-center gap-3">
            <Sk className="h-5 w-5 rounded-full shrink-0" />
            <Sk className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
