export default function HomeLoading() {
  return (
    <main className="min-h-dvh bg-terra-50 pb-24">
      <header className="relative overflow-hidden bg-terra-600 px-4 pb-6 pt-8">
        <div className="container">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 animate-pulse rounded-full bg-terra-500" />
            <div className="space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-terra-500" />
              <div className="h-4 w-32 animate-pulse rounded bg-terra-500/60" />
            </div>
          </div>
          <div className="mt-3 flex gap-4">
            <div className="h-4 w-48 animate-pulse rounded bg-terra-500/40" />
            <div className="h-6 w-28 animate-pulse rounded-full bg-terra-500/40" />
          </div>
        </div>
      </header>
      <div className="container px-4 py-4">
        <div className="flex gap-2 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-terra-200" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-terra-200 bg-white">
              <div className="aspect-[4/3] w-full animate-pulse bg-terra-100" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-terra-200" />
                <div className="h-4 w-full animate-pulse rounded bg-terra-100" />
                <div className="flex items-center justify-between">
                  <div className="h-6 w-20 animate-pulse rounded bg-terra-200" />
                  <div className="h-8 w-24 animate-pulse rounded bg-terra-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
