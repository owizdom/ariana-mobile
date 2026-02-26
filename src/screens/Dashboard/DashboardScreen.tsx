import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation';
import { colors, spacing, radius, font } from '@/utils/theme';
import { fetchProjects } from '@/services/api.service';
import { useAppStore } from '@/stores/useAppStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { wsService } from '@/services/websocket.service';
import ConnectionBadge from '@/components/common/ConnectionBadge';
import type { Project } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const sessionToken = useAppStore((s) => s.sessionToken);
  const user = useAppStore((s) => s.user);
  const { projects, loading, subscribe } = useProjectsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (sessionToken) {
      wsService.connect(sessionToken);
    }
  }, [sessionToken]);

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchProjects();
      useProjectsStore.setState({ projects: data, loading: false });
    } catch (_) {}
    setRefreshing(false);
  }, []);

  function renderProject({ item }: { item: Project }) {
    return (
      <TouchableOpacity
        style={s.projectCard}
        onPress={() => nav.navigate('Project', { projectId: item.id, projectName: item.name })}
        activeOpacity={0.75}
      >
        <View style={s.projectIcon}>
          <Text style={s.projectIconText}>{item.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={s.projectInfo}>
          <Text style={s.projectName} numberOfLines={1}>{item.name}</Text>
          {item.cloneUrl && (
            <Text style={s.projectUrl} numberOfLines={1}>{item.cloneUrl}</Text>
          )}
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Projects</Text>
          {user?.name && <Text style={s.headerSub}>{user.name}</Text>}
        </View>
        <View style={s.headerRight}>
          <ConnectionBadge />
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => nav.navigate('CreateAgent', {})}
          >
            <Text style={s.newBtnText}>+ Agent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No projects yet</Text>
              <Text style={s.emptyText}>
                Create a project from the web dashboard or via the agent.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={s.sep} />}
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
  headerTitle: { color: colors.text, fontSize: font.size.xl, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: font.size.xs, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  newBtnText: { color: colors.bg, fontSize: font.size.sm, fontWeight: '700' },
  list: { padding: spacing.md, gap: spacing.sm },
  projectCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIconText: { color: colors.primary, fontSize: font.size.lg, fontWeight: '700' },
  projectInfo: { flex: 1 },
  projectName: { color: colors.text, fontSize: font.size.md, fontWeight: '600' },
  projectUrl: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2, fontFamily: font.mono },
  chevron: { color: colors.textDim, fontSize: font.size.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: '600', marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: font.size.sm, textAlign: 'center', lineHeight: 22 },
  sep: { height: spacing.sm },
});
