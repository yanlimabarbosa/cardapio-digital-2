export default function OrdersLoading() {
  return (
    <div>
      <div className="mb-6 h-7 w-24 animate-pulse rounded bg-terra-200" />
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded bg-terra-100" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 animate-pulse rounded bg-terra-100" />
                <div className="h-5 w-20 animate-pulse rounded bg-terra-200" />
                <div className="h-5 w-12 animate-pulse rounded bg-terra-100" />
              </div>
              <div className="h-5 w-32 animate-pulse rounded bg-terra-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-terra-100" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded bg-terra-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
