import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '@/utils/theme';
import type { ChatEvent } from '@/types';

interface Props {
  event: ChatEvent;
}

function PromptBubble({ event }: { event: Extract<ChatEvent, { type: 'prompt' }> }) {
  const statusColor =
    event.data.status === 'running' ? colors.yellow :
    event.data.status === 'finished' ? colors.green :
    event.data.status === 'failed' ? colors.red :
    colors.textDim;

  return (
    <View style={[s.promptBubble, event.data.is_reverted && s.reverted]}>
      <View style={s.promptHeader}>
        <Text style={s.promptLabel}>You</Text>
        <Text style={[s.promptStatus, { color: statusColor }]}>{event.data.status}</Text>
      </View>
      <Text style={s.promptText}>{event.data.prompt}</Text>
    </View>
  );
}

function ResponseBubble({ event }: { event: Extract<ChatEvent, { type: 'response' }> }) {
  return (
    <View style={[s.responseBubble, event.data.is_reverted && s.reverted]}>
      <View style={s.promptHeader}>
        <Text style={s.responseLabel}>Ariana</Text>
        {event.data.model && <Text style={s.modelBadge}>{event.data.model}</Text>}
        {event.data.is_streaming && <Text style={s.streaming}>streaming...</Text>}
      </View>
      <Text style={s.responseText}>{event.data.content}</Text>
      {event.data.tools && event.data.tools.length > 0 && (
        <View style={s.toolsRow}>
          {event.data.tools.map((t, i) => (
            <View key={i} style={s.toolChip}>
              <Text style={s.toolName}>{t.use.name}</Text>
              {t.result?.is_error && <Text style={s.toolError}>⚠</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function GitCheckpointBubble({ event }: { event: Extract<ChatEvent, { type: 'git_checkpoint' }> }) {
  return (
    <View style={s.gitBubble}>
      <Text style={s.gitIcon}>⎇</Text>
      <View style={s.gitInfo}>
        <Text style={s.gitMessage} numberOfLines={2}>{event.data.commitMessage}</Text>
        <View style={s.gitMeta}>
          <Text style={s.gitBranch}>{event.data.branch}</Text>
          <Text style={s.gitStats}>
            +{event.data.additions} -{event.data.deletions} ({event.data.filesChanged} files)
          </Text>
        </View>
      </View>
    </View>
  );
}

function ContextWarningBubble({ event }: { event: Extract<ChatEvent, { type: 'context_warning' }> }) {
  return (
    <View style={s.warnBubble}>
      <Text style={s.warnText}>
        ⚠ Context {event.data.contextUsedPercent.toFixed(0)}% used
      </Text>
    </View>
  );
}

function CompactionBubble({ event }: { event: Extract<ChatEvent, { type: 'compaction_complete' }> }) {
  return (
    <View style={s.compactBubble}>
      <Text style={s.compactTitle}>Context compacted</Text>
      {event.data.tokensSaved && (
        <Text style={s.compactText}>{event.data.tokensSaved.toLocaleString()} tokens saved</Text>
      )}
    </View>
  );
}

function AutomationBubble({ event }: { event: Extract<ChatEvent, { type: 'automation' }> }) {
  const statusColor =
    event.data.status === 'finished' ? colors.green :
    event.data.status === 'failed' ? colors.red :
    event.data.status === 'running' ? colors.yellow :
    colors.textDim;

  return (
    <View style={s.automationBubble}>
      <View style={s.promptHeader}>
        <Text style={s.automationLabel}>Automation: {event.data.automationName}</Text>
        <Text style={[s.promptStatus, { color: statusColor }]}>{event.data.status}</Text>
      </View>
      {event.data.output && (
        <Text style={s.automationOutput} numberOfLines={5}>{event.data.output}</Text>
      )}
    </View>
  );
}

const EventItem = memo(function EventItem({ event }: Props) {
  switch (event.type) {
    case 'prompt': return <PromptBubble event={event} />;
    case 'response': return <ResponseBubble event={event} />;
    case 'git_checkpoint': return <GitCheckpointBubble event={event} />;
    case 'context_warning': return <ContextWarningBubble event={event} />;
    case 'compaction_complete': return <CompactionBubble event={event} />;
    case 'automation': return <AutomationBubble event={event} />;
    case 'reset': return <View style={s.resetLine}><Text style={s.resetText}>— reset —</Text></View>;
    default: return null;
  }
});

export default EventItem;

const s = StyleSheet.create({
  promptBubble: {
    backgroundColor: colors.primary + '18',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    padding: spacing.md,
    marginLeft: spacing.xxl,
    gap: spacing.xs,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  promptLabel: { color: colors.primary, fontSize: font.size.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  promptStatus: { fontSize: font.size.xs, fontWeight: '600' },
  promptText: { color: colors.text, fontSize: font.size.sm, lineHeight: 20 },
  responseBubble: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.xl,
    gap: spacing.xs,
  },
  responseLabel: { color: colors.textSecondary, fontSize: font.size.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  modelBadge: { color: colors.textDim, fontSize: font.size.xs, fontFamily: font.mono },
  streaming: { color: colors.yellow, fontSize: font.size.xs },
  responseText: { color: colors.text, fontSize: font.size.sm, lineHeight: 20 },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  toolName: { color: colors.textSecondary, fontSize: font.size.xs, fontFamily: font.mono },
  toolError: { color: colors.red, fontSize: font.size.xs },
  gitBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.green + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green + '30',
    padding: spacing.md,
    gap: spacing.sm,
  },
  gitIcon: { color: colors.green, fontSize: font.size.lg, fontWeight: '700', marginTop: 1 },
  gitInfo: { flex: 1, gap: spacing.xs },
  gitMessage: { color: colors.text, fontSize: font.size.sm, lineHeight: 18 },
  gitMeta: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  gitBranch: { color: colors.green, fontSize: font.size.xs, fontFamily: font.mono },
  gitStats: { color: colors.textDim, fontSize: font.size.xs },
  warnBubble: {
    backgroundColor: colors.yellow + '12',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.yellow + '30',
    padding: spacing.sm,
    alignItems: 'center',
  },
  warnText: { color: colors.yellow, fontSize: font.size.xs, fontWeight: '600' },
  compactBubble: {
    backgroundColor: colors.purple + '12',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.purple + '30',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  compactTitle: { color: colors.purple, fontSize: font.size.xs, fontWeight: '700' },
  compactText: { color: colors.textSecondary, fontSize: font.size.xs },
  automationBubble: {
    backgroundColor: colors.blue + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.blue + '30',
    padding: spacing.md,
    gap: spacing.xs,
  },
  automationLabel: { color: colors.blue, fontSize: font.size.xs, fontWeight: '700' },
  automationOutput: {
    color: colors.textSecondary,
    fontSize: font.size.xs,
    fontFamily: font.mono,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  resetLine: { alignItems: 'center', paddingVertical: spacing.sm },
  resetText: { color: colors.textDim, fontSize: font.size.xs },
  reverted: { opacity: 0.5 },
});
