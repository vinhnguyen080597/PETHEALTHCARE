import { AccountDataSkeleton } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <div
      className="max-w-5xl mx-auto px-5 lg:px-8 py-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mb-6 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[#F0E6D8]" />
        <div className="h-8 w-40 animate-pulse rounded bg-[#F0E6D8]" />
      </div>
      <AccountDataSkeleton />
    </div>
  );
}
