function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function OrdersLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <Sk className="h-6 w-28 mb-1" />
          <Sk className="h-3 w-20" />
        </div>
        <Sk className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <Sk className="h-4 w-28" />
              <Sk className="h-5 w-10 rounded-full" />
            </div>
            <Sk className="h-3 w-40 mb-3" />
            <div className="flex gap-2">
              <Sk className="h-10 w-32 rounded-xl" />
              <Sk className="h-10 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <Sk className="h-14 rounded-2xl" />
    </div>
  )
}
