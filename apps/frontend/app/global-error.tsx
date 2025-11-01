'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 space-y-4 bg-card rounded-lg border">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
              <p className="text-gray-600">
                We encountered an unexpected error. Please try again.
              </p>
              {error.message && (
                <p className="text-sm text-gray-500 mt-2 p-2 bg-gray-100 rounded">
                  {error.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={reset}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
