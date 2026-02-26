import { create } from 'zustand';
import { wsService } from '@/services/websocket.service';
import type { ServerMessage, SnapshotMessage } from '@/services/websocket-protocol';
import type { Agent } from '@/types';

interface AgentsListState {
  agents: Agent[];
  loading: boolean;
  subscriptions: Map<string, () => void>; // projectId or 'all' -> unsub fn

  subscribeToProject: (projectId: string) => () => void;
  subscribeAll: () => () => void;
}

function applyDelta(agents: Agent[], message: ServerMessage & { type: 'delta' }): Agent[] {
  const { op } = message.data;
  if (op === 'add' && message.data.item) return [...agents, message.data.item as Agent];
  if (op === 'add-batch' && message.data.items) return [...agents, ...(message.data.items as Agent[])];
  if (op === 'modify' && message.data.itemId) {
    return agents.map(a =>
      a.id === message.data.itemId ? { ...a, ...message.data.changes } : a
    );
  }
  if (op === 'delete' && message.data.itemId) {
    return agents.filter(a => a.id !== message.data.itemId);
  }
  if (op === 'replace') {
    const items = message.data.item;
    return Array.isArray(items) ? items : [];
  }
  return agents;
}

export const useAgentsListStore = create<AgentsListState>((set, get) => ({
  agents: [],
  loading: false,
  subscriptions: new Map(),

  subscribeToProject: (projectId: string) => {
    const state = get();
    if (state.subscriptions.has(projectId)) return () => {};

    set({ loading: true });

    const handler = (message: ServerMessage) => {
      if (message.type === 'snapshot') {
        const snap = message as SnapshotMessage;
        const incoming: Agent[] = Array.isArray(snap.data) ? snap.data : (snap.data?.agents ?? []);
        const state = get();
        // Merge: replace agents for this project, keep others
        const otherAgents = state.agents.filter(a => a.projectId !== projectId);
        set({ agents: [...otherAgents, ...incoming], loading: false });
      } else if (message.type === 'delta') {
        set((s) => ({ agents: applyDelta(s.agents, message as any) }));
      }
    };

    const unsub = wsService.subscribe('agents-list', { projectId }, handler);
    const newSubs = new Map(get().subscriptions);
    newSubs.set(projectId, unsub);
    set({ subscriptions: newSubs });

    return () => {
      unsub();
      const s = get();
      const subs = new Map(s.subscriptions);
      subs.delete(projectId);
      set({ subscriptions: subs });
    };
  },

  subscribeAll: () => {
    const key = 'all';
    const state = get();
    if (state.subscriptions.has(key)) return () => {};

    set({ loading: true });

    const handler = (message: ServerMessage) => {
      if (message.type === 'snapshot') {
        const snap = message as SnapshotMessage;
        const incoming: Agent[] = Array.isArray(snap.data) ? snap.data : (snap.data?.agents ?? []);
        set({ agents: incoming, loading: false });
      } else if (message.type === 'delta') {
        set((s) => ({ agents: applyDelta(s.agents, message as any) }));
      }
    };

    const unsub = wsService.subscribe('agents-list', {}, handler);
    const newSubs = new Map(get().subscriptions);
    newSubs.set(key, unsub);
    set({ subscriptions: newSubs });

    return () => {
      unsub();
      const s = get();
      const subs = new Map(s.subscriptions);
      subs.delete(key);
      set({ subscriptions: subs, agents: [] });
    };
  },
}));
