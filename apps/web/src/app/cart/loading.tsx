export default function CartLoading() {
  return (
    <main className="order-flow-brown min-h-dvh bg-cream-warm pb-32">
      <header className="bg-cocoa-noise px-4 py-4">
        <div className="container flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-cream-warm0" />
          <div className="h-6 w-32 animate-pulse rounded bg-cream-warm0" />
        </div>
      </header>
      <div className="container space-y-4 px-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-terra-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-terra-100" />
              </div>
              <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
              <div className="h-5 w-6 animate-pulse rounded bg-terra-200" />
              <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
            </div>
          </div>
        ))}
        <div className="h-px w-full bg-terra-200" />
        <div className="space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-terra-200" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 animate-pulse rounded-lg border-2 bg-terra-100" />
            <div className="h-12 animate-pulse rounded-lg border-2 bg-terra-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
