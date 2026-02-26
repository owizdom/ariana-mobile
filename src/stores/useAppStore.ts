import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Project, Agent, ProviderConfig } from '@/types';

interface AppState {
  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // Auth
  user: User | null;
  sessionToken: string | null;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  logout: () => void;

  // Provider config (for agent creation)
  providerConfig: ProviderConfig | null;
  setProviderConfig: (config: ProviderConfig | null) => void;

  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;

  // UI
  selectedModel: 'opus' | 'sonnet' | 'haiku';
  setSelectedModel: (m: 'opus' | 'sonnet' | 'haiku') => void;

  // Prompt drafts per agent
  promptDrafts: Record<string, string>;
  setPromptDraft: (agentId: string, text: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      user: null,
      sessionToken: null,
      setUser: (user) => set({ user }),
      setSessionToken: (sessionToken) => set({ sessionToken }),
      logout: () =>
        set({
          user: null,
          sessionToken: null,
          agents: [],
          projects: [],
          promptDrafts: {},
        }),

      providerConfig: null,
      setProviderConfig: (config) => set({ providerConfig: config }),

      projects: [],
      setProjects: (projects) => set({ projects }),

      agents: [],
      setAgents: (agents) => set({ agents }),
      updateAgent: (agent) =>
        set((state) => ({
          agents: state.agents.map((a) => (a.id === agent.id ? agent : a)),
        })),
      removeAgent: (agentId) =>
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== agentId),
        })),

      selectedModel: 'sonnet',
      setSelectedModel: (selectedModel) => set({ selectedModel }),

      promptDrafts: {},
      setPromptDraft: (agentId, text) =>
        set((state) => ({
          promptDrafts: { ...state.promptDrafts, [agentId]: text },
        })),
    }),
    {
      name: 'ariana-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        user: state.user,
        sessionToken: state.sessionToken,
        providerConfig: state.providerConfig,
        selectedModel: state.selectedModel,
        promptDrafts: state.promptDrafts,
      }),
    }
  )
);
