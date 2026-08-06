/** Warm Amber pulse block for API-bound UI only. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-[#F0E6D8] ${className}`}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BreederCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="relative px-4 pb-4 pt-8">
        <div className="absolute -top-6 left-4 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-[#FDFBF7]">
          <Skeleton className="h-full w-full rounded-full" />
        </div>
        <Skeleton className="mb-2 h-4 w-2/3" />
        <Skeleton className="mb-3 h-3 w-1/2" />
        <Skeleton className="mb-4 h-2 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function MetricTileSkeleton() {
  return (
    <div className="rounded-2xl border border-[#F0E6D8] bg-white p-4">
      <Skeleton className="mb-2 h-3 w-16" />
      <Skeleton className="h-8 w-12" />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#FDFBF7] p-2.5">
      <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({
  count = 6,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BreederGridSkeleton({
  count = 6,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <BreederCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HomeBreederRowSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#F0E6D8] bg-white/80 p-4"
        >
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-8 lg:grid-cols-2"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div>
        <Skeleton className="mb-3 aspect-[4/3] w-full rounded-2xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="rounded-2xl border border-[#F0E6D8] bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FarmDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-6 h-44 w-full rounded-2xl lg:h-64" />
      <div className="relative -mt-12 mb-6 flex items-end gap-4 px-2">
        <Skeleton className="h-20 w-20 rounded-full border-4 border-[#FDFBF7]" />
        <div className="flex-1 space-y-2 pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <ListingGridSkeleton count={3} />
    </div>
  );
}

export function FarmHealthSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading">
      <div className="flex justify-center py-6">
        <Skeleton className="h-36 w-36 rounded-full" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AccountDataSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricTileSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-[#F0E6D8] bg-white p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ConversationsSkeleton() {
  return (
    <div
      className="grid min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white md:grid-cols-[280px_1fr]"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <aside className="border-b border-[#F0E6D8] md:border-b-0 md:border-r">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-[#F0E6D8] px-4 py-3">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </aside>
      <section className="flex items-center justify-center p-4">
        <Skeleton className="h-4 w-40" />
      </section>
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-3/5 rounded-xl" />
      <Skeleton className="ml-auto h-10 w-2/5 rounded-xl" />
      <Skeleton className="h-10 w-1/2 rounded-xl" />
    </div>
  );
}

export function AdminSectionSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricTileSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
