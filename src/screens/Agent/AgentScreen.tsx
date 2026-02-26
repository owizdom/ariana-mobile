import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation';
import { colors, spacing, radius, font } from '@/utils/theme';
import { useAgentEventsStore } from '@/stores/useAgentEventsStore';
import { useAgentsListStore } from '@/stores/useAgentsListStore';
import { useAppStore } from '@/stores/useAppStore';
import EventItem from '@/components/terminal/EventItem';
import { sendPromptToAgent, stopAgent, archiveAgent, fetchAgent } from '@/services/api.service';
import { getAgentStateColor, getAgentStateLabel, isAgentBusy } from '@/utils/agentState';
import { AgentState } from '@/types';
import type { ChatEvent, PromptEvent } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Agent'>;

export default function AgentScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { agentId, agentName } = route.params;

  const flatListRef = useRef<FlatList>(null);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  const selectedModel = useAppStore((s) => s.selectedModel);
  const promptDraft = useAppStore((s) => s.promptDrafts[agentId] ?? '');
  const setPromptDraft = useAppStore((s) => s.setPromptDraft);

  const { eventsCache, isLoadingMore, hasMoreCache, setFocusedAgent, loadOlderEvents, addFrontendOnlyPrompt, updatePromptStatus, removeFrontendOnlyPrompt } = useAgentEventsStore();
  const { agents } = useAgentsListStore();

  const agent = agents.find((a) => a.id === agentId);
  const events: ChatEvent[] = eventsCache.get(agentId) ?? [];
  const loading = isLoadingMore.get(agentId) ?? false;
  const hasMore = hasMoreCache.get(agentId) ?? false;

  useEffect(() => {
    setFocusedAgent(agentId);
    // Restore draft
    setPrompt(promptDraft);
    return () => {
      setFocusedAgent(null);
    };
  }, [agentId]);

  // Save draft on unmount
  useEffect(() => {
    return () => {
      setPromptDraft(agentId, prompt);
    };
  }, [prompt]);

  // Scroll to bottom when new events arrive
  useEffect(() => {
    if (events.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [events.length]);

  async function handleSend() {
    const text = prompt.trim();
    if (!text || sending) return;

    const tempId = `fp-${Date.now()}`;
    const optimisticPrompt: PromptEvent = {
      id: tempId,
      type: 'prompt',
      timestamp: Date.now(),
      taskId: null,
      data: { prompt: text, status: 'sending', is_reverted: false },
    };

    addFrontendOnlyPrompt(agentId, optimisticPrompt);
    setPrompt('');
    setPromptDraft(agentId, '');
    setSending(true);

    try {
      await sendPromptToAgent(agentId, text, selectedModel);
      updatePromptStatus(agentId, tempId, 'queued');
    } catch (err: any) {
      updatePromptStatus(agentId, tempId, 'failed');
      Alert.alert('Send Failed', err.message ?? 'Could not send prompt.');
    } finally {
      setSending(false);
    }
  }

  function handleStop() {
    Alert.alert(
      'Stop Agent',
      'This will interrupt the current task. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopAgent(agentId);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  function handleViewDesktop() {
    if (agent?.machinePublicHostname && agent.streamingPort) {
      nav.navigate('Streaming', {
        agentId,
        hostname: agent.machinePublicHostname,
        port: agent.streamingPort,
      });
    } else {
      Alert.alert('Not Available', 'Desktop streaming is not available for this agent.');
    }
  }

  const stateColor = agent ? getAgentStateColor(agent.state) : colors.textDim;
  const stateLabel = agent ? getAgentStateLabel(agent.state) : 'Unknown';
  const isRunning = agent?.state === AgentState.RUNNING;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Agent status bar */}
      <View style={s.statusBar}>
        <View style={s.statusLeft}>
          <View style={[s.stateDot, { backgroundColor: stateColor }]} />
          <Text style={[s.stateLabel, { color: stateColor }]}>{stateLabel}</Text>
          {agent?.branchName && (
            <Text style={s.branchBadge}>{agent.branchName}</Text>
          )}
        </View>
        <View style={s.statusRight}>
          {isRunning && (
            <TouchableOpacity style={s.stopBtn} onPress={handleStop}>
              <Text style={s.stopBtnText}>■ Stop</Text>
            </TouchableOpacity>
          )}
          {agent?.machinePublicHostname && (
            <TouchableOpacity style={s.desktopBtn} onPress={handleViewDesktop}>
              <Text style={s.desktopBtnText}>Desktop</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Events */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <FlatList
          ref={flatListRef}
          data={events}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <View style={s.eventWrapper}>
              <EventItem event={item} />
            </View>
          )}
          contentContainerStyle={s.eventList}
          onEndReachedThreshold={0.2}
          ListHeaderComponent={
            hasMore ? (
              <TouchableOpacity
                style={s.loadMoreBtn}
                onPress={() => loadOlderEvents(agentId)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={s.loadMoreText}>Load older messages</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Text style={s.emptyChatTitle}>Agent is ready</Text>
              <Text style={s.emptyChatText}>Send a message to start working.</Text>
            </View>
          }
        />

        {/* Input area */}
        <View style={s.inputArea}>
          <View style={s.modelRow}>
            {(['opus', 'sonnet', 'haiku'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.modelTab, selectedModel === m && s.modelTabActive]}
                onPress={() => useAppStore.getState().setSelectedModel(m)}
              >
                <Text style={[s.modelTabText, selectedModel === m && s.modelTabTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.inputRow}>
            <TextInput
              style={s.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Send a message..."
              placeholderTextColor={colors.textDim}
              multiline
              maxLength={10000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[s.sendBtn, (!prompt.trim() || sending) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!prompt.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color={colors.bg} size="small" />
              ) : (
                <Text style={s.sendBtnText}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  stateLabel: { fontSize: font.size.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  branchBadge: {
    color: colors.textSecondary,
    fontSize: font.size.xs,
    fontFamily: font.mono,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusRight: { flexDirection: 'row', gap: spacing.sm },
  stopBtn: {
    backgroundColor: colors.red + '22',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.red + '44',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  stopBtnText: { color: colors.red, fontSize: font.size.xs, fontWeight: '700' },
  desktopBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  desktopBtnText: { color: colors.textSecondary, fontSize: font.size.xs, fontWeight: '600' },
  eventList: { padding: spacing.md, paddingBottom: spacing.xl },
  eventWrapper: { marginBottom: spacing.sm },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  loadMoreText: { color: colors.primary, fontSize: font.size.sm, fontWeight: '600' },
  emptyChat: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyChatTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: '600', marginBottom: spacing.sm },
  emptyChatText: { color: colors.textSecondary, fontSize: font.size.sm, textAlign: 'center' },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    gap: spacing.sm,
  },
  modelRow: { flexDirection: 'row', gap: spacing.xs },
  modelTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelTabActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  modelTabText: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '600' },
  modelTabTextActive: { color: colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  textInput: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.text,
    fontSize: font.size.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.bg, fontSize: font.size.lg, fontWeight: '800', lineHeight: 22 },
});
