export default function CategoriesLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-32 animate-pulse rounded bg-terra-200" />
        <div className="h-9 w-36 animate-pulse rounded bg-terra-200" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-terra-200" />
              <div className="h-4 w-48 animate-pulse rounded bg-terra-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
              <div className="h-8 w-8 animate-pulse rounded bg-terra-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
