import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <>
      <div className="flex flex-col gap-3 px-6 py-6 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="p-6 space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    </>
  );
}
