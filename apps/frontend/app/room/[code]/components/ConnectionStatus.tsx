'use client';

import React from 'react';

export default function ConnectionStatus({ status }: { status: 'connected' | 'reconnecting' | 'disconnected' }) {
  if (status === 'connected') {
    return (
      <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2">
        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
        Connected
      </div>
    );
  }
  if (status === 'reconnecting') {
    return (
      <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-2">
        <span className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></span>
        Reconnecting...
      </div>
    );
  }
  return (
    <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2">
      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
      Disconnected
    </div>
  );
}
