import { Suspense } from "react";
import Skeleton from "@/components/layout/Skeleton";

export default async function CategoryPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black mb-8 capitalize">recommendations series</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton variant="shimmer" className="aspect-[2/3] w-full rounded-2xl" />
            <Skeleton variant="shimmer" className="h-4 w-3/4 mt-2" />
            <Skeleton variant="shimmer" className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}