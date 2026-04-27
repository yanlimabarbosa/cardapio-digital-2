export default function KitchenLoading() {
  return (
    <main className="min-h-dvh bg-terra-50">
      <header className="border-b border-terra-200 bg-white px-4 py-4">
        <div className="container flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-terra-200" />
            <div className="h-4 w-36 animate-pulse rounded bg-terra-100" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 animate-pulse rounded bg-terra-100" />
            <div className="h-8 w-16 animate-pulse rounded bg-terra-200" />
          </div>
        </div>
      </header>
      <div className="container px-4 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, col) => (
            <div key={col}>
              <div className="mb-4 flex items-center gap-2 border-b-2 border-terra-200 pb-2">
                <div className="h-5 w-24 animate-pulse rounded bg-terra-200" />
                <div className="h-5 w-8 animate-pulse rounded-full bg-terra-100" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-lg border bg-white p-4">
                    <div className="space-y-2">
                      <div className="h-5 w-16 animate-pulse rounded bg-terra-200" />
                      <div className="h-4 w-32 animate-pulse rounded bg-terra-100" />
                      <div className="h-4 w-24 animate-pulse rounded bg-terra-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
