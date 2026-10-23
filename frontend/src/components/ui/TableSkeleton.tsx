import React from 'react';
import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
    rowCount?: number;
    columnCount?: number;
}

export function TableSkeleton({ rowCount = 5, columnCount = 5 }: TableSkeletonProps) {
    return (
        <div className="w-full">
            <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Header row */}
                <div className="flex bg-gray-50 p-4 border-b border-gray-200">
                    {Array.from({ length: columnCount }).map((_, i) => (
                        <div key={`header-col-${i}`} className="flex-1 px-2">
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>

                {/* Body rows */}
                <div className="divide-y divide-gray-200 bg-white">
                    {Array.from({ length: rowCount }).map((_, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="flex p-4">
                            {Array.from({ length: columnCount }).map((_, colIndex) => (
                                <div key={`col-${colIndex}`} className="flex-1 px-2 flex items-center">
                                    <Skeleton className={`h-4 w-full ${colIndex === 0 ? 'max-w-[50%]' : 'max-w-[80%]'}`} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
