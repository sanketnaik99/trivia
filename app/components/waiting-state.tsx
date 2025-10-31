'use client';

import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface WaitingStateProps {
  answeredCount: number;
  totalCount: number;
}

export function WaitingState({ answeredCount, totalCount }: WaitingStateProps) {
  const percentage = (answeredCount / totalCount) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto p-8 md:p-12">
      <div className="flex flex-col items-center justify-center space-y-6">
        <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-blue-500" />
        
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Waiting for others...
          </h2>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            {answeredCount} of {totalCount} players have answered
          </p>
        </div>

        {/* Progress indicator */}
        <div className="w-full space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 md:h-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-sm md:text-base text-center text-gray-500 dark:text-gray-400">
            {Math.round(percentage)}% complete
          </p>
        </div>

        <p className="text-sm md:text-base text-center text-gray-500 dark:text-gray-400 max-w-md">
          The round will end when everyone answers or time runs out
        </p>
      </div>
    </Card>
  );
}
