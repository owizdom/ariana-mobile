import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '@/utils/theme';
import { getAgentStateColor, getAgentStateLabel, isAgentBusy } from '@/utils/agentState';
import type { Agent } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  agent: Agent;
  onPress: () => void;
}

export default function AgentCard({ agent, onPress }: Props) {
  const stateColor = getAgentStateColor(agent.state);
  const stateLabel = getAgentStateLabel(agent.state);
  const busy = isAgentBusy(agent.state);

  const timeAgo = formatDistanceToNow(new Date(agent.updatedAt), { addSuffix: true });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.header}>
        <View style={s.nameRow}>
          <View style={[s.stateDot, { backgroundColor: stateColor }]} />
          <Text style={s.name} numberOfLines={1}>
            {agent.name ?? `agent-${agent.id.slice(0, 6)}`}
          </Text>
        </View>
        <View style={[s.badge, { borderColor: stateColor + '40', backgroundColor: stateColor + '18' }]}>
          <Text style={[s.badgeText, { color: stateColor }]}>{stateLabel}</Text>
        </View>
      </View>

      {agent.branchName && (
        <Text style={s.branch} numberOfLines={1}>
          {agent.branchName}
        </Text>
      )}

      <View style={s.footer}>
        <Text style={s.time}>{timeAgo}</Text>
        {agent.machinePublicIp && (
          <Text style={s.ip}>{agent.machinePublicIp}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  name: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: font.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  branch: {
    color: colors.textSecondary,
    fontSize: font.size.xs,
    fontFamily: font.mono,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: { color: colors.textDim, fontSize: font.size.xs },
  ip: { color: colors.textDim, fontSize: font.size.xs, fontFamily: font.mono },
});
