function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function DashboardLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Sk className="h-8 w-48 mb-2" />
        <Sk className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
            <Sk className="h-3 w-20 mb-3" />
            <Sk className="h-8 w-12 mb-1" />
            <Sk className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
          <Sk className="h-3 w-24 mb-3" />
          <Sk className="h-4 w-full mb-2" />
          <Sk className="h-4 w-3/4" />
        </div>
        <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
          <Sk className="h-3 w-20 mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
