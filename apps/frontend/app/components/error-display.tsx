/**
 * Error display component
 * Shows error messages with optional retry action
 */

import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ 
  title = 'Something went wrong', 
  message, 
  onRetry 
}: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 p-6">
      <div className="rounded-full bg-destructive/10 p-3">
        <svg
          className="h-6 w-6 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
