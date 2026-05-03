function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800 ${className ?? ''}`} />
}

export default function ManualsLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Sk className="h-6 w-20" />
        <Sk className="h-9 w-20 rounded-xl" />
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-9 w-24 rounded-xl" />)}
      </div>
      <Sk className="h-10 rounded-xl mb-4" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl px-5 py-4 border border-neutral-800 flex items-center justify-between">
            <div className="flex-1">
              <Sk className="h-4 w-2/3 mb-2" />
              <Sk className="h-3 w-1/3" />
            </div>
            <Sk className="h-4 w-3 ml-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
