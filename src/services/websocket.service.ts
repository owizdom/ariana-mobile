// Ported from ariana/frontend/src/services/websocket.service.ts
// Adapted for React Native (no document/window, uses AppState instead)
import { AppState, AppStateStatus } from 'react-native';
import { WS_URL } from '@/config';
import type {
  ChannelName,
  ServerMessage,
  SnapshotMessage,
  KeepAliveResponseMessage,
} from './websocket-protocol';

type MessageHandler = (message: ServerMessage) => void;

interface SubscriptionState {
  channel: ChannelName;
  params: Record<string, any>;
  requestId: string;
  active: boolean;
}

function getSubscriptionKey(channel: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  return `${channel}:${JSON.stringify(sortedParams)}`;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 60000;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private subscriptions: Map<string, SubscriptionState> = new Map();
  private requestIdCounter = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  private _connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private stateListeners: Set<(state: 'disconnected' | 'connecting' | 'connected') => void> = new Set();

  constructor() {
    // React Native: use AppState instead of document visibilitychange
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && this._connectionState === 'disconnected' && !this.intentionallyClosed) {
        this.reconnectAttempts = 0;
        this.attemptReconnect();
      }
    });
  }

  get connectionState() {
    return this._connectionState;
  }

  connect(token: string): void {
    if (this._connectionState === 'connected' || this._connectionState === 'connecting') {
      if (this.token === token) return;
      this.disconnect();
    }
    this.token = token;
    this.intentionallyClosed = false;
    this.doConnect();
  }

  private doConnect(): void {
    if (!this.token) return;

    this._connectionState = 'connecting';
    this.notifyStateChange();

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.send({ type: 'authenticate', token: this.token! });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (_err) {
          // ignore parse errors
        }
      };

      this.ws.onclose = (event) => {
        this._connectionState = 'disconnected';
        this.notifyStateChange();
        if (!this.intentionallyClosed) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        // handled via onclose
      };
    } catch (_err) {
      this._connectionState = 'disconnected';
      this.notifyStateChange();
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.intentionallyClosed || this.reconnectTimer) return;

    this.reconnectAttempts++;
    const baseDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = baseDelay * (0.75 + Math.random() * 0.5);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token && !this.intentionallyClosed) {
        this.doConnect();
      }
    }, Math.round(jitter));
  }

  subscribe(
    channel: ChannelName,
    params: Record<string, any>,
    handler: MessageHandler
  ): () => void {
    const key = getSubscriptionKey(channel, params);

    if (!this.messageHandlers.has(key)) {
      this.messageHandlers.set(key, new Set());
    }
    this.messageHandlers.get(key)!.add(handler);

    if (!this.subscriptions.has(key)) {
      const requestId = this.generateRequestId();
      this.subscriptions.set(key, { channel, params, requestId, active: true });

      if (this._connectionState === 'connected') {
        this.send({ type: 'subscribe', channel, params, requestId });
      }
    }

    return () => {
      this.messageHandlers.get(key)?.delete(handler);
      if (this.messageHandlers.get(key)?.size === 0) {
        this.unsubscribe(channel, params);
      }
    };
  }

  private unsubscribe(channel: ChannelName, params: Record<string, any>): void {
    const key = getSubscriptionKey(channel, params);
    this.subscriptions.delete(key);
    this.messageHandlers.delete(key);
    if (this._connectionState === 'connected') {
      this.send({ type: 'unsubscribe', channel, params });
    }
  }

  sendKeepAlive(agentIds: string[]): void {
    if (this._connectionState !== 'connected' || agentIds.length === 0) return;
    this.send({ type: 'keep-alive', agentIds, requestId: this.generateRequestId() });
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'authenticated': {
        this._connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.notifyStateChange();
        this.resumeSubscriptions();
        break;
      }
      case 'snapshot': {
        const snapshotMsg = message as SnapshotMessage;
        const key = getSubscriptionKey(snapshotMsg.channel, snapshotMsg.params);
        const handlers = this.messageHandlers.get(key);
        handlers?.forEach(h => h(message));
        break;
      }
      case 'delta': {
        const key = getSubscriptionKey(message.channel, message.params);
        const handlers = this.messageHandlers.get(key);
        handlers?.forEach(h => h(message));
        break;
      }
      case 'error': {
        if (message.error.code === 'AUTHENTICATION_FAILED') {
          this.intentionallyClosed = true;
          this.ws?.close();
        }
        break;
      }
      case 'ping': {
        this.send({ type: 'pong', timestamp: message.timestamp });
        break;
      }
      case 'keep-alive-response': {
        // handled silently
        break;
      }
    }
  }

  private resumeSubscriptions(): void {
    for (const [, sub] of this.subscriptions.entries()) {
      const freshRequestId = this.generateRequestId();
      sub.requestId = freshRequestId;
      this.send({ type: 'subscribe', channel: sub.channel, params: sub.params, requestId: freshRequestId });
    }
  }

  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private generateRequestId(): string {
    return `req-${++this.requestIdCounter}-${Date.now()}`;
  }

  private notifyStateChange(): void {
    this.stateListeners.forEach(l => l(this._connectionState));
  }

  onStateChange(
    listener: (state: 'disconnected' | 'connecting' | 'connected') => void
  ): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  forceReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.intentionallyClosed = false;
    this._connectionState = 'disconnected';
    this.notifyStateChange();
    this.doConnect();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this._connectionState = 'disconnected';
    this.notifyStateChange();
  }
}

export const wsService = new WebSocketService();
