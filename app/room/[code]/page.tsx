'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // WebSocket connection logic will be implemented in Phase 3
    console.log('Room page mounted for room:', roomCode);
    
    // Simulate connection - will be replaced with real WebSocket connection
    const timer = setTimeout(() => {
      setConnectionStatus('connected');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [roomCode]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Room: {roomCode}</h1>
          <div className="text-sm text-muted-foreground">
            Status: {connectionStatus}
          </div>
        </div>
        
        <div className="border rounded-lg p-6">
          <p className="text-muted-foreground">Room lobby will be implemented in Phase 3</p>
        </div>
      </div>
    </div>
  );
}
