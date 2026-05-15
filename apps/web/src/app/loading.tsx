import { CustomerHeaderSkeleton, CustomerPage } from '@/components/customer/customer-page-shell';

export default function HomeLoading() {
  return (
    <CustomerPage className="pb-24">
      <CustomerHeaderSkeleton />
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
    </CustomerPage>
  );
}
