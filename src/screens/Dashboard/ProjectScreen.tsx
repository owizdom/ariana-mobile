import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation';
import { colors, spacing, radius, font } from '@/utils/theme';
import { useAgentsListStore } from '@/stores/useAgentsListStore';
import AgentCard from '@/components/agent/AgentCard';
import type { Agent } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Project'>;

export default function ProjectScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId, projectName } = route.params;

  const { agents, loading, subscribeToProject } = useAgentsListStore();
  const projectAgents = agents.filter((a) => a.projectId === projectId);

  useEffect(() => {
    const unsub = subscribeToProject(projectId);
    return unsub;
  }, [projectId]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.header}>
        <Text style={s.subtitle}>{projectAgents.length} agent{projectAgents.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => nav.navigate('CreateAgent', { projectId })}
        >
          <Text style={s.newBtnText}>+ New Agent</Text>
        </TouchableOpacity>
      </View>

      {loading && projectAgents.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={projectAgents}
          keyExtractor={(a) => a.id}
          renderItem={({ item }: { item: Agent }) => (
            <AgentCard
              agent={item}
              onPress={() =>
                nav.navigate('Agent', {
                  agentId: item.id,
                  agentName: item.name ?? `agent-${item.id.slice(0, 6)}`,
                })
              }
            />
          )}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No agents</Text>
              <Text style={s.emptyText}>Start a new agent to run tasks in this project.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: { color: colors.textSecondary, fontSize: font.size.sm },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  newBtnText: { color: colors.bg, fontSize: font.size.sm, fontWeight: '700' },
  list: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: '600', marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: font.size.sm, textAlign: 'center', lineHeight: 22 },
});
