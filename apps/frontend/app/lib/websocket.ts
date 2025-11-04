/**
 * Socket.IO client wrapper for Trivia Room System
 * Normalizes event handling to previous WebSocket-style API
 */

import { io, type Socket } from 'socket.io-client';
import { API_CONFIG } from './config';

type MessageHandler = (data: unknown) => void;

interface SocketClientConfig {
  url?: string;
  options?: Record<string, unknown>;
}

export class SocketClient {
  private socket: Socket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private url: string;
  private options: Record<string, unknown>;

  constructor(config: SocketClientConfig = {}) {
    this.url = config.url || API_CONFIG.socketUrl;
    this.options = config.options || {};
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, { 
          transports: ['websocket'], 
          autoConnect: true,
          ...this.options
        });

        this.socket.on('connect', () => {
          console.log('[Socket.IO] connected', this.socket?.id);
          resolve();
        });

        this.socket.on('disconnect', (reason: unknown) => {
          console.log('[Socket.IO] disconnected', reason);
          this.emit('disconnect', { reason });
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('[Socket.IO] connection error', error);
          this.emit('connection_error', { error: error.message });
        });

        this.socket.io.on('reconnect_attempt', (attempt: number) => {
          console.log('[Socket.IO] reconnect attempt', attempt);
          this.emit('reconnect_attempt', { attempt });
        });

        this.socket.io.on('reconnect_failed', () => {
          console.error('[Socket.IO] reconnection failed');
          this.emit('reconnect_failed', {});
        });

        this.socket.onAny((event: string, ...args: unknown[]) => {
          const payload = args.length > 0 ? args[0] : null;
          this.handleMessage({ type: event, payload });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  send(event: string, payload: Record<string, unknown> = {}) {
    if (!this.socket) return console.warn('[Socket.IO] not connected');
    console.log('[Socket.IO] Sending event:', event, payload);
    this.socket.emit(event, payload);
  }

  on(messageType: string, handler: MessageHandler) {
    if (!this.handlers.has(messageType)) this.handlers.set(messageType, []);
    this.handlers.get(messageType)!.push(handler);
  }

  off(messageType: string, handler: MessageHandler) {
    const hs = this.handlers.get(messageType);
    if (!hs) return;
    const i = hs.indexOf(handler);
    if (i >= 0) hs.splice(i, 1);
  }

  private handleMessage(message: { type: string; payload: unknown }) {
    const hs = this.handlers.get(message.type);
    if (hs) hs.forEach((h) => h(message.payload));
  }

  private emit(type: string, payload: unknown) {
    this.handleMessage({ type, payload });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return !!this.socket && this.socket.connected;
  }
}

export default SocketClient;
