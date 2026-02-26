import { AgentState } from '@/types';
import { colors } from './theme';

export function getAgentStateColor(state: AgentState): string {
  switch (state) {
    case AgentState.RUNNING: return colors.stateRunning;
    case AgentState.IDLE: return colors.stateIdle;
    case AgentState.READY: return colors.blue;
    case AgentState.PROVISIONING:
    case AgentState.PROVISIONED:
    case AgentState.CLONING: return colors.stateProvisioning;
    case AgentState.ERROR: return colors.stateError;
    case AgentState.ARCHIVING:
    case AgentState.ARCHIVED: return colors.stateArchived;
    default: return colors.textDim;
  }
}

export function getAgentStateLabel(state: AgentState): string {
  switch (state) {
    case AgentState.PROVISIONING: return 'Provisioning';
    case AgentState.PROVISIONED: return 'Provisioned';
    case AgentState.CLONING: return 'Cloning';
    case AgentState.READY: return 'Ready';
    case AgentState.IDLE: return 'Idle';
    case AgentState.RUNNING: return 'Running';
    case AgentState.ERROR: return 'Error';
    case AgentState.ARCHIVING: return 'Archiving';
    case AgentState.ARCHIVED: return 'Archived';
    default: return state;
  }
}

export function isAgentActive(state: AgentState): boolean {
  return [AgentState.RUNNING, AgentState.IDLE, AgentState.READY].includes(state);
}

export function isAgentBusy(state: AgentState): boolean {
  return [
    AgentState.PROVISIONING,
    AgentState.PROVISIONED,
    AgentState.CLONING,
    AgentState.ARCHIVING,
  ].includes(state);
}
