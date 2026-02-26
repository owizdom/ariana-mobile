import { API_URL } from '@/config';

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

export function getApiToken(): string | null {
  return _token;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
// The only login path is GitHub OAuth → deep link → JWT token → session verify

// Fetches the real GitHub OAuth URL from the Ariana backend.
// The backend returns { url, message } — we then open `url` in the browser.
export async function getGitHubOAuthUrl(deepLink = false): Promise<string> {
  const qs = deepLink ? '?deep_link=true' : '';
  const res = await fetch(`${API_URL}/api/auth/sign-in/github${qs}`);
  if (!res.ok) throw new Error(`Failed to get OAuth URL: ${res.status}`);
  const data = await res.json();
  if (!data.url) throw new Error('No OAuth URL returned from server');
  return data.url as string;
}

export async function fetchSession(token: string) {
  const res = await fetch(`${API_URL}/api/auth/session`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Session check failed: ${res.status}`);
  return res.json() as Promise<{ user: any }>;
}

export async function fetchMe() {
  return request<{ user: any }>('GET', '/api/auth/session');
}

// ─── Projects ────────────────────────────────────────────────────────────────
export async function fetchProjects() {
  return request<any[]>('GET', '/api/projects');
}

export async function createProject(data: { name: string; cloneUrl?: string }) {
  return request<any>('POST', '/api/projects', data);
}

// ─── Agents ──────────────────────────────────────────────────────────────────
export async function fetchAgents(projectId?: string) {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return request<any[]>('GET', `/api/agents${qs}`);
}

export async function fetchAgent(agentId: string) {
  return request<any>('GET', `/api/agents/${agentId}`);
}

// Agent creation is POST /api/projects/:projectId/agents
export async function createAgent(projectId: string, data: {
  baseBranch?: string;
  machineType?: 'hetzner' | 'custom';
  customMachineId?: string;
}) {
  return request<any>('POST', `/api/projects/${projectId}/agents`, data);
}

export async function deleteAgent(agentId: string) {
  return request<void>('DELETE', `/api/agents/${agentId}`);
}

export async function sendPromptToAgent(agentId: string, prompt: string, model?: string) {
  return request<any>('POST', `/api/agents/${agentId}/prompt`, { prompt, model });
}

export async function stopAgent(agentId: string) {
  return request<void>('POST', `/api/agents/${agentId}/stop`);
}

export async function archiveAgent(agentId: string) {
  return request<void>('POST', `/api/agents/${agentId}/archive`);
}

// ─── Machines ────────────────────────────────────────────────────────────────
export async function fetchMachines() {
  return request<any[]>('GET', '/api/machines');
}

// ─── Agent provider config ───────────────────────────────────────────────────
export async function fetchAgentProviderConfig() {
  return request<any>('GET', '/api/auth/agent-provider-config');
}

export async function saveAnthropicApiKey(apiKey: string) {
  return request<void>('POST', '/api/auth/anthropic-api-key', { apiKey });
}

// ─── Limits ──────────────────────────────────────────────────────────────────
export async function fetchAgentLifetimeUnit() {
  return request<{ minutes: number }>('GET', '/api/agents/lifetime-unit');
}
