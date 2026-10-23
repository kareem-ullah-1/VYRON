import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function StatCardSkeleton() {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">
                                <Skeleton className="h-3 w-20 mb-2" />
                            </dt>
                            <dd>
                                <div className="text-lg font-medium text-gray-900">
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    );
}
