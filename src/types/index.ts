// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  githubProfileId: string | null;
  createdAt: string;
  updatedAt: string;
  isAnonymous?: boolean;
  name?: string;
  email?: string;
  image?: string | null;
}

// ─── Agent ───────────────────────────────────────────────────────────────────
export enum AgentState {
  PROVISIONING = 'provisioning',
  PROVISIONED = 'provisioned',
  CLONING = 'cloning',
  READY = 'ready',
  IDLE = 'idle',
  RUNNING = 'running',
  ERROR = 'error',
  ARCHIVING = 'archiving',
  ARCHIVED = 'archived',
}

export interface Agent {
  id: string;
  name: string | null;
  state: AgentState;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  branchName: string | null;
  machinePublicIp: string | null;
  machinePublicHostname: string | null;
  streamingPort: number | null;
  terminalPort: number | null;
  creator?: {
    id: string;
    name: string;
    image: string | null;
  } | null;
}

// ─── Project ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  cloneUrl: string | null;
  defaultBranch: string | null;
}

// ─── Chat Events ──────────────────────────────────────────────────────────────
interface BaseEvent {
  id: string;
  timestamp: number;
  taskId: string | null;
}

export interface PromptEvent extends BaseEvent {
  type: 'prompt';
  data: {
    prompt: string;
    status: 'sending' | 'queued' | 'running' | 'finished' | 'failed';
    is_reverted: boolean;
  };
}

export interface ResponseEvent extends BaseEvent {
  type: 'response';
  data: {
    content: string;
    model: string | null;
    tools?: Array<{ use: ToolUse; result?: ToolResult }>;
    is_reverted: boolean;
    is_streaming?: boolean;
  };
}

export interface GitCheckpointEvent extends BaseEvent {
  type: 'git_checkpoint';
  data: {
    commitSha: string;
    commitMessage: string;
    commitUrl: string | null;
    branch: string;
    filesChanged: number;
    additions: number;
    deletions: number;
    timestamp: number;
    pushed: boolean;
    is_reverted: boolean;
  };
}

export interface ResetEvent extends BaseEvent {
  type: 'reset';
  data: Record<string, never>;
}

export interface AutomationEvent extends BaseEvent {
  type: 'automation';
  data: {
    automationId: string;
    automationName: string;
    trigger: string;
    output: string | null;
    status: 'running' | 'finished' | 'failed' | 'killed';
    exitCode: number | null;
    startedAt: number | null;
    finishedAt: number | null;
    blocking: boolean;
    feedOutput: boolean;
  };
}

export interface ContextWarningEvent extends BaseEvent {
  type: 'context_warning';
  data: {
    contextUsedPercent: number;
    contextRemainingPercent: number;
    inputTokens: number;
    cacheTokens: number;
    contextWindow: number;
  };
}

export interface CompactionStartEvent extends BaseEvent {
  type: 'compaction_start';
  data: { triggerReason: string; contextUsedPercent: number };
}

export interface CompactionCompleteEvent extends BaseEvent {
  type: 'compaction_complete';
  data: {
    summary: string;
    tokensBefore: number;
    tokensAfter: number | null;
    tokensSaved: number | null;
  };
}

export type ChatEvent =
  | PromptEvent
  | ResponseEvent
  | GitCheckpointEvent
  | ResetEvent
  | AutomationEvent
  | ContextWarningEvent
  | CompactionStartEvent
  | CompactionCompleteEvent;

// ─── Tool types ───────────────────────────────────────────────────────────────
export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string | unknown[];
  is_error?: boolean;
}

// ─── Machine ─────────────────────────────────────────────────────────────────
export interface Machine {
  id: string;
  name: string;
  publicIp: string | null;
  status: 'online' | 'offline' | 'unknown';
  cpuUsage: number | null;
  memoryUsage: number | null;
  currentAgentId: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type AgentProvider = 'claude-code' | 'codex';
export type ClaudeAuthMethod = 'subscription' | 'api-key';
export type ApiKeyProvider = 'anthropic' | 'openrouter';

export interface ProviderConfig {
  provider: AgentProvider;
  authMethod: ClaudeAuthMethod;
  apiKeyProvider?: ApiKeyProvider;
  apiKey?: string;
  oauthToken?: string;
}
