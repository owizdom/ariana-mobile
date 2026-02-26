// Ported from ariana/frontend/src/stores/useAgentEventsStore.ts
import { create } from 'zustand';
import { wsService } from '@/services/websocket.service';
import type { ServerMessage, SnapshotMessage } from '@/services/websocket-protocol';
import type { ChatEvent, PromptEvent } from '@/types';

const DEFAULT_LIMIT = 80;
const LOAD_MORE_INCREMENT = 100;
const MAX_LIMIT = 500;

let currentUnsubscribe: (() => void) | null = null;
let currentHandler: ((message: ServerMessage) => void) | null = null;
let currentLimit = DEFAULT_LIMIT;

interface AgentEventsState {
  focusedAgentId: string | null;
  eventsCache: Map<string, ChatEvent[]>;
  hasMoreCache: Map<string, boolean>;
  isLoadingMore: Map<string, boolean>;
  frontendOnlyPrompts: Map<string, PromptEvent[]>;

  setFocusedAgent: (agentId: string | null) => void;
  loadOlderEvents: (agentId: string) => void;
  addFrontendOnlyPrompt: (agentId: string, prompt: PromptEvent) => void;
  updatePromptStatus: (agentId: string, promptId: string, status: 'sending' | 'queued' | 'failed') => void;
  removeFrontendOnlyPrompt: (agentId: string, promptId: string) => void;
  cleanup: () => void;
}

function makeHandler(
  agentId: string,
  get: () => AgentEventsState,
  set: (partial: Partial<AgentEventsState>) => void
) {
  return (message: ServerMessage) => {
    if (message.type === 'snapshot') {
      const snap = message as SnapshotMessage;
      if (!snap.data?.events) return;

      const state = get();
      const serverEvents: ChatEvent[] = snap.data.events;
      const frontendPrompts = state.frontendOnlyPrompts.get(agentId) || [];
      const remainingFp = frontendPrompts.filter(
        fp => !serverEvents.some(e => e.type === 'prompt' && e.data.prompt === fp.data.prompt)
      );

      const merged = [...serverEvents, ...remainingFp];
      merged.sort((a, b) => a.timestamp - b.timestamp);

      const newCache = new Map(state.eventsCache);
      newCache.set(agentId, merged);

      const newFp = new Map(state.frontendOnlyPrompts);
      newFp.set(agentId, remainingFp);

      const newHasMore = new Map(state.hasMoreCache);
      if (snap.data.hasMore !== undefined) newHasMore.set(agentId, snap.data.hasMore);

      const newLoadingMore = new Map(state.isLoadingMore);
      newLoadingMore.set(agentId, false);

      set({ eventsCache: newCache, frontendOnlyPrompts: newFp, hasMoreCache: newHasMore, isLoadingMore: newLoadingMore });

    } else if (message.type === 'delta') {
      const { op } = message.data;
      const state = get();
      const existing = state.eventsCache.get(agentId) || [];

      if ((op === 'add-batch' || op === 'add') && (message.data.items || message.data.item)) {
        const newEvents: ChatEvent[] = op === 'add-batch' ? message.data.items : [message.data.item];
        const existingIds = new Set(existing.map(e => e.id));
        const toAdd = newEvents.filter(e => !existingIds.has(e.id));
        if (toAdd.length === 0) return;

        const frontendPrompts = state.frontendOnlyPrompts.get(agentId) || [];
        const remainingFp = frontendPrompts.filter(
          fp => !toAdd.some(e => e.type === 'prompt' && e.data.prompt === fp.data.prompt)
        );

        const merged = [...existing, ...toAdd];
        merged.sort((a, b) => a.timestamp - b.timestamp);

        const newCache = new Map(state.eventsCache);
        newCache.set(agentId, merged);

        const newFp = new Map(state.frontendOnlyPrompts);
        newFp.set(agentId, remainingFp);

        set({ eventsCache: newCache, frontendOnlyPrompts: newFp });

      } else if (op === 'modify' && message.data.item && message.data.itemId) {
        const idx = existing.findIndex(e => e.id === message.data.itemId);
        if (idx === -1) return;
        const updated = [...existing];
        updated[idx] = message.data.item as ChatEvent;
        const newCache = new Map(state.eventsCache);
        newCache.set(agentId, updated);
        set({ eventsCache: newCache });

      } else if (op === 'replace' && message.data.item) {
        // treat as snapshot
        const serverEvents: ChatEvent[] = message.data.item.events || [];
        const merged = [...serverEvents].sort((a, b) => a.timestamp - b.timestamp);
        const newCache = new Map(state.eventsCache);
        newCache.set(agentId, merged);
        set({ eventsCache: newCache });
      }
    }
  };
}

export const useAgentEventsStore = create<AgentEventsState>((set, get) => ({
  focusedAgentId: null,
  eventsCache: new Map(),
  hasMoreCache: new Map(),
  isLoadingMore: new Map(),
  frontendOnlyPrompts: new Map(),

  setFocusedAgent: (agentId) => {
    const state = get();
    if (state.focusedAgentId === agentId) return;

    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
      currentHandler = null;
    }

    set({ focusedAgentId: agentId });

    if (agentId) {
      currentLimit = DEFAULT_LIMIT;
      currentHandler = makeHandler(agentId, get, set);
      currentUnsubscribe = wsService.subscribe(
        'agent-events',
        { agentId, limit: currentLimit },
        currentHandler
      );
    }
  },

  loadOlderEvents: (agentId) => {
    const state = get();
    if (state.isLoadingMore.get(agentId) || !state.hasMoreCache.get(agentId)) return;
    if (!currentHandler || !currentUnsubscribe || currentLimit >= MAX_LIMIT) return;

    const newLoadingMore = new Map(state.isLoadingMore);
    newLoadingMore.set(agentId, true);
    set({ isLoadingMore: newLoadingMore });

    currentUnsubscribe();
    currentLimit = Math.min(currentLimit + LOAD_MORE_INCREMENT, MAX_LIMIT);
    currentUnsubscribe = wsService.subscribe('agent-events', { agentId, limit: currentLimit }, currentHandler);
  },

  addFrontendOnlyPrompt: (agentId, prompt) => {
    const state = get();
    const newFp = new Map(state.frontendOnlyPrompts);
    newFp.set(agentId, [...(newFp.get(agentId) || []), prompt]);

    const newCache = new Map(state.eventsCache);
    newCache.set(agentId, [...(newCache.get(agentId) || []), prompt]);

    set({ frontendOnlyPrompts: newFp, eventsCache: newCache });
  },

  updatePromptStatus: (agentId, promptId, status) => {
    const state = get();

    const update = <T extends ChatEvent>(e: T): T =>
      e.id === promptId && e.type === 'prompt'
        ? ({ ...e, data: { ...e.data, status } } as T)
        : e;

    const newFp = new Map(state.frontendOnlyPrompts);
    newFp.set(agentId, (newFp.get(agentId) || []).map(update));

    const newCache = new Map(state.eventsCache);
    newCache.set(agentId, (newCache.get(agentId) || []).map(update));

    set({ frontendOnlyPrompts: newFp, eventsCache: newCache });
  },

  removeFrontendOnlyPrompt: (agentId, promptId) => {
    const state = get();
    const newFp = new Map(state.frontendOnlyPrompts);
    newFp.set(agentId, (newFp.get(agentId) || []).filter(p => p.id !== promptId));

    const newCache = new Map(state.eventsCache);
    newCache.set(agentId, (newCache.get(agentId) || []).filter(e => e.id !== promptId));

    set({ frontendOnlyPrompts: newFp, eventsCache: newCache });
  },

  cleanup: () => {
    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
      currentHandler = null;
    }
    currentLimit = DEFAULT_LIMIT;
    set({
      focusedAgentId: null,
      eventsCache: new Map(),
      hasMoreCache: new Map(),
      isLoadingMore: new Map(),
      frontendOnlyPrompts: new Map(),
    });
  },
}));
