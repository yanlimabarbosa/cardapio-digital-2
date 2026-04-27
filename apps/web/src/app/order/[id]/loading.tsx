export default function OrderLoading() {
  return (
    <main className="min-h-dvh bg-terra-50 pb-8">
      <header className="bg-terra-600 px-4 py-4">
        <div className="container flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-terra-500" />
          <div className="h-6 w-36 animate-pulse rounded bg-terra-500" />
        </div>
      </header>
      <div className="container space-y-6 px-4 py-6">
        <div className="rounded-lg border border-terra-200 bg-white p-8">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 animate-pulse rounded-full bg-terra-200" />
            <div className="mt-4 h-6 w-40 animate-pulse rounded bg-terra-200" />
            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-terra-100" />
          </div>
        </div>
        <div className="flex items-start justify-between px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-4 w-4 animate-pulse rounded-full bg-terra-200" />
              <div className="h-3 w-14 animate-pulse rounded bg-terra-100" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-terra-200 bg-white p-4">
          <div className="mb-3 h-5 w-32 animate-pulse rounded bg-terra-200" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between py-2">
              <div className="h-4 w-36 animate-pulse rounded bg-terra-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-terra-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
