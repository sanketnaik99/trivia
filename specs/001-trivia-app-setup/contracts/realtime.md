# Realtime Contracts: Quizable Rooms

This document describes the WebSocket interface handled by Cloudflare Durable Objects (one object per room).

## WebSocket Endpoint
- URL: wss://<worker-domain>/ws/rooms/{roomId}
- Path params:
  - roomId: UUID (must match existing room in Supabase; rejected if not found or room full)
- Auth: Client attaches a Clerk JWT (Bearer token) via `Authorization` header; the worker validates it (or the TanStack Start server issues a signed room token to present here).

## Connection Lifecycle
1. Client connects with roomId and Authorization
2. Durable Object validates capacity (<=16), membership, and room status
3. On success, server sends `welcome` payload and current `participants` snapshot
4. Server broadcasts `join` to others
5. Heartbeats: client sends `ping` every 25s; server replies `pong`
6. On disconnect, server broadcasts `leave`

## Message Format
All messages are JSON objects with a `type` field and `data` payload.

### Server → Client
- type: `welcome`
  - data: { roomId: string, userId: string }
- type: `participants`
  - data: { members: Array<{ userId: string; displayName?: string; joinedAt: string }> }
- type: `join`
  - data: { userId: string, displayName?: string, joinedAt: string }
- type: `leave`
  - data: { userId: string, leftAt: string }
- type: `error`
  - data: { code: string, message: string }

### Client → Server
- type: `ping`
  - data: { ts?: number }
- type: `ready`
  - data: { }
- type: `rename` (optional UX)
  - data: { displayName: string }

## Error Codes
- ROOM_NOT_FOUND
- ROOM_FULL
- UNAUTHORIZED
- INVALID_ROOM_ID
- INTERNAL_ERROR

## Notes
- Durable Object enforces max 16 participants (from spec)
- Supabase remains the source of truth for persistent data (rooms, groups, sessions, scores)
- Realtime presence is ephemeral and maintained in memory inside the Durable Object
