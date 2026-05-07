export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-32 animate-pulse rounded-lg bg-[#E8DDD0]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-5 shadow-[0_0_8px_rgba(61,43,31,0.12)]">
            <div className="flex items-center justify-between pb-3">
              <div className="h-3 w-20 animate-pulse rounded bg-[#E8DDD0]" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-[#FAF6F1]" />
            </div>
            <div className="h-9 w-16 animate-pulse rounded-lg bg-[#E8DDD0]" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-6 shadow-[0_0_8px_rgba(61,43,31,0.12)]">
        <div className="mb-5 flex items-center justify-between">
          <div className="h-3 w-48 animate-pulse rounded bg-[#E8DDD0]" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-[#FAF6F1]" />
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="h-11 w-32 animate-pulse rounded-xl bg-[#FAF6F1]" />
            <div className="h-11 w-32 animate-pulse rounded-xl bg-[#FAF6F1]" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-[#FAF6F1]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
