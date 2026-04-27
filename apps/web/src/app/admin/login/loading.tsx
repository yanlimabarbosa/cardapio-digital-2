export default function LoginLoading() {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-terra-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-terra-200 bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center">
          <div className="mb-2 h-16 w-16 animate-pulse rounded-full bg-terra-200" />
          <div className="h-7 w-20 animate-pulse rounded bg-terra-200" />
          <div className="mt-1 h-4 w-32 animate-pulse rounded bg-terra-100" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-terra-100" />
            <div className="h-10 w-full animate-pulse rounded bg-terra-100" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-terra-100" />
            <div className="h-10 w-full animate-pulse rounded bg-terra-100" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-terra-200" />
        </div>
      </div>
    </main>
  );
}
