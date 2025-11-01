import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Generate a unique 6-character room code
    const roomCode = generateRoomCode();
    const playerId = generatePlayerId();

    // Get WebSocket URL from environment
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8787';
    const websocketUrl = `${wsUrl}/room/${roomCode}`;

    return NextResponse.json(
      {
        roomCode,
        playerId,
        websocketUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRoomCode(): string {
  // Use unambiguous characters (exclude 0, O, 1, I, L)
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function generatePlayerId(): string {
  // Simple UUID-like ID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
