import { create } from 'zustand';
import { wsService } from '@/services/websocket.service';
import type { ServerMessage, SnapshotMessage } from '@/services/websocket-protocol';
import type { Project } from '@/types';

interface ProjectsStoreState {
  projects: Project[];
  loading: boolean;
  subscribed: boolean;
  subscribe: () => () => void;
}

export const useProjectsStore = create<ProjectsStoreState>((set, get) => ({
  projects: [],
  loading: false,
  subscribed: false,

  subscribe: () => {
    if (get().subscribed) return () => {};
    set({ loading: true, subscribed: true });

    const unsub = wsService.subscribe('projects-list', {}, (message: ServerMessage) => {
      if (message.type === 'snapshot') {
        const snap = message as SnapshotMessage;
        const data: Project[] = Array.isArray(snap.data) ? snap.data : (snap.data?.projects ?? []);
        set({ projects: data, loading: false });
      } else if (message.type === 'delta') {
        const { op } = message.data;
        const state = get();

        if (op === 'add' && message.data.item) {
          set({ projects: [...state.projects, message.data.item as Project] });
        } else if (op === 'add-batch' && message.data.items) {
          set({ projects: [...state.projects, ...(message.data.items as Project[])] });
        } else if (op === 'modify' && message.data.itemId && message.data.changes) {
          set({
            projects: state.projects.map(p =>
              p.id === message.data.itemId ? { ...p, ...message.data.changes } : p
            ),
          });
        } else if (op === 'delete' && message.data.itemId) {
          set({ projects: state.projects.filter(p => p.id !== message.data.itemId) });
        } else if (op === 'replace' && message.data.item) {
          const incoming: Project[] = Array.isArray(message.data.item)
            ? message.data.item
            : message.data.item.projects ?? [];
          set({ projects: incoming });
        }
      }
    });

    return () => {
      unsub();
      set({ subscribed: false, loading: false });
    };
  },
}));
