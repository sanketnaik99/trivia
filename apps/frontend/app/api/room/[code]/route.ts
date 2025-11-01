import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid room code format' },
        { status: 400 }
      );
    }

    const roomCode = code.toUpperCase();

    // Get WebSocket URL from environment
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';
    const websocketUrl = `${wsUrl}/room/${roomCode}`;

    // For now, assume room exists and can be joined
    // The actual validation will happen when the WebSocket connection is established
    return NextResponse.json(
      {
        exists: true,
        roomCode,
        participantCount: 0,
        gameState: 'lobby',
        canJoin: true,
        websocketUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
