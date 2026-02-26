import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation';
import { colors, spacing, radius, font } from '@/utils/theme';
import { useAgentsListStore } from '@/stores/useAgentsListStore';
import AgentCard from '@/components/agent/AgentCard';
import type { Agent, AgentState } from '@/types';
import { AgentState as AgentStateEnum } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'all' | 'running' | 'idle' | 'archived';

export default function AgentsScreen() {
  const nav = useNavigation<Nav>();
  const { agents, loading, subscribeAll } = useAgentsListStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeAll();
    return unsub;
  }, []);

  const filtered = agents.filter((a) => {
    const matchSearch =
      !search ||
      (a.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      a.id.includes(search);

    const matchFilter =
      filter === 'all' ||
      (filter === 'running' && a.state === AgentStateEnum.RUNNING) ||
      (filter === 'idle' && [AgentStateEnum.IDLE, AgentStateEnum.READY].includes(a.state as AgentStateEnum)) ||
      (filter === 'archived' && a.state === AgentStateEnum.ARCHIVED);

    return matchSearch && matchFilter;
  });

  const filterTabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running' },
    { key: 'idle', label: 'Idle' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Agents</Text>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => nav.navigate('CreateAgent', {})}
        >
          <Text style={s.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search agents..."
          placeholderTextColor={colors.textDim}
        />
      </View>

      <View style={s.filterRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.filterTab, filter === tab.key && s.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[s.filterTabText, filter === tab.key && s.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && filtered.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
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
              <Text style={s.emptyTitle}>No agents found</Text>
              <Text style={s.emptyText}>Start a new agent or adjust your filter.</Text>
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
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: '700' },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  newBtnText: { color: colors.bg, fontSize: font.size.sm, fontWeight: '700' },
  searchRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.size.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  filterTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  filterTabText: { color: colors.textSecondary, fontSize: font.size.xs, fontWeight: '600' },
  filterTabTextActive: { color: colors.primary },
  list: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: '600', marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: font.size.sm, textAlign: 'center', lineHeight: 22 },
});
