import Skeleton from "../layout/Skeleton";

export function MovieCardSkeleton({ isSmall }) {
    const widthClass = isSmall
        ? "min-w-[120px] w-[30vw] sm:w-[20vw] md:min-w-[140px] md:w-[160px]"
        : "min-w-[140px] w-[35vw] sm:w-[25vw] md:w-[calc((100%-120px)/6)]";

    return (
        <div className={`flex-none ${widthClass}`}>
            <div className="bg-bg-surface rounded-md overflow-hidden flex flex-col h-full shadow-lg border border-white/5">
                {/* Poster Area */}
                <div className="aspect-[2/3] bg-bg-base relative overflow-hidden shrink-0">
                    <Skeleton className="w-full h-full" variant="shimmer" />
                </div>

                {/* Content Area */}
                <div className="p-4 flex-grow flex flex-col -mt-6 z-10 min-h-[130px] md:min-h-[150px] bg-bg-surface rounded-t-xl">
                    {/* Title */}
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-4 opacity-50" />
                    
                    {/* Meta info */}
                    <div className="flex gap-2 mb-4">
                         <Skeleton className="h-3 w-10" />
                         <Skeleton className="h-3 w-10" />
                    </div>

                    {/* Description lines */}
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PersonCardSkeleton() {
    return (
        <div className="flex flex-col items-center gap-3 p-4 min-w-[120px] flex-none">
            {/* Avatar */}
            <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full" variant="shimmer" />

            {/* Name */}
            <div className="flex flex-col items-center gap-1.5 w-full">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-12 opacity-50" />
            </div>
        </div>
    );
}

export function MovieListSkeleton({ title, count = 6, isSmall = false }) {
    const containerClass = `flex overflow-x-auto ${isSmall ? 'gap-3 md:gap-4' : 'gap-4 md:gap-6'} pb-4 pt-2 hide-scrollbar`;

    return (
        <section className="mb-10">
            <div className="flex justify-between items-end mb-4">
                {title ? (
                    <h2 className={`${isSmall ? 'text-xl md:text-2xl' : 'text-2xl'} font-bold text-text-primary`}>
                        {title}
                    </h2>
                ) : (
                    <Skeleton className="h-8 w-64" />
                )}
            </div>
            <div className={containerClass}>
                {Array.from({ length: count }).map((_, i) => (
                    <MovieCardSkeleton key={i} isSmall={isSmall} />
                ))}
            </div>
        </section>
    );
}

export function PersonListSkeleton({ title, count = 6 }) {
    return (
        <section className="mb-10">
            <div className="flex justify-between items-end mb-4">
                {title ? (
                    <h2 className="text-2xl font-bold text-text-primary">
                        {title}
                    </h2>
                ) : (
                    <Skeleton className="h-8 w-48" />
                )}
            </div>
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <PersonCardSkeleton key={i} />
                ))}
            </div>
        </section>
    );
}
