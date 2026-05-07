export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#E8DDD0]/40" />
      <div className="h-4 w-72 animate-pulse rounded bg-[#E8DDD0]/30" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[4.5rem] animate-pulse rounded-xl bg-[#E8DDD0]/30" />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-11 animate-pulse rounded-xl bg-[#E8DDD0]/30" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#E8DDD0]/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
