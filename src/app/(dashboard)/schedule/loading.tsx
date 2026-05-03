function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function ScheduleLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sk className="h-8 w-8 rounded-xl" />
          <Sk className="h-5 w-32" />
          <Sk className="h-8 w-8 rounded-xl" />
        </div>
        <Sk className="h-4 w-28" />
      </div>
      <div className="grid grid-cols-7 gap-1.5 min-w-[560px]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl border border-neutral-800 min-h-[140px]">
            <div className="flex flex-col items-center pt-2.5 pb-2 border-b border-neutral-800">
              <Sk className="h-3 w-4 mb-1" />
              <Sk className="h-5 w-5 rounded-full" />
            </div>
            <div className="p-1.5 flex flex-col gap-1">
              {i % 3 !== 2 && <Sk className="h-10 rounded-xl" />}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 bg-neutral-900 rounded-2xl border border-neutral-800 px-5 py-4">
        <Sk className="h-3 w-28 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Sk className="h-4 w-40" />
              <Sk className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
