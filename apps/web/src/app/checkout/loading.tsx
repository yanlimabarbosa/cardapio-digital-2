export default function CheckoutLoading() {
  return (
    <main className="order-flow-brown min-h-dvh bg-cream-warm pb-32">
      <header className="bg-cocoa-noise px-4 py-4">
        <div className="container flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-cream-warm0" />
          <div className="h-6 w-28 animate-pulse rounded bg-cream-warm0" />
        </div>
      </header>
      <div className="container space-y-6 px-4 py-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 h-5 w-36 animate-pulse rounded bg-terra-200" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-40 animate-pulse rounded bg-terra-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-terra-100" />
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3">
            <div className="flex justify-between">
              <div className="h-5 w-12 animate-pulse rounded bg-terra-200" />
              <div className="h-5 w-20 animate-pulse rounded bg-terra-200" />
            </div>
          </div>
        </div>
        <div className="h-10 w-full animate-pulse rounded bg-terra-200" />
        <div className="h-24 w-full animate-pulse rounded-lg border bg-terra-100" />
      </div>
    </main>
  );
}
