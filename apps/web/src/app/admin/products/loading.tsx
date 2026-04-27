export default function ProductsLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded bg-terra-200" />
        <div className="h-9 w-32 animate-pulse rounded bg-terra-200" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-36 animate-pulse rounded bg-terra-200" />
                  <div className="h-5 w-16 animate-pulse rounded bg-terra-100" />
                </div>
                <div className="h-4 w-32 animate-pulse rounded bg-terra-100" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
                <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
                <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
