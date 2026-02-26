import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation';
import { colors, spacing, radius, font } from '@/utils/theme';
import { createAgent, fetchProjects } from '@/services/api.service';
import type { Project } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CreateAgent'>;

export default function CreateAgentScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const preselectedProjectId = route.params?.projectId;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(preselectedProjectId ?? null);
  const [baseBranch, setBaseBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setFetchingProjects(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (_) {}
    setFetchingProjects(false);
  }

  async function handleCreate() {
    if (!selectedProjectId) {
      Alert.alert('Missing', 'Please select a project first.');
      return;
    }
    setLoading(true);
    try {
      const res = await createAgent(selectedProjectId, {
        baseBranch: baseBranch.trim() || undefined,
        machineType: 'hetzner',
      });

      if (!res.success) {
        const code = res.code;
        if (code === 'LIMIT_EXCEEDED') {
          Alert.alert('Limit Reached', 'You have reached your agent limit. Archive some agents first.');
        } else if (code === 'MACHINE_POOL_EXHAUSTED') {
          Alert.alert('No Machines Available', 'All machines are currently in use. Please try again shortly.');
        } else {
          Alert.alert('Failed', res.error ?? 'Could not create agent.');
        }
        return;
      }

      const agent = res.agent;
      nav.goBack();
      nav.navigate('Agent', {
        agentId: agent.id,
        agentName: agent.name ?? `agent-${agent.id.slice(0, 6)}`,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <Text style={s.sectionTitle}>Project</Text>
        {fetchingProjects ? (
          <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} />
        ) : projects.length === 0 ? (
          <Text style={s.empty}>No projects found. Create one on ariana.dev first.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chipRow}>
              {projects.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.chip, selectedProjectId === p.id && s.chipActive]}
                  onPress={() => setSelectedProjectId(p.id)}
                >
                  <Text style={[s.chipText, selectedProjectId === p.id && s.chipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={s.sectionTitle}>Branch (optional)</Text>
        <TextInput
          style={s.input}
          value={baseBranch}
          onChangeText={setBaseBranch}
          placeholder="e.g. main, develop, feature/..."
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={s.hint}>Leave empty to use the project's default branch.</Text>

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            A new Hetzner VPS will be provisioned for this agent. It will be running Claude Code and can edit code, run tests, manage git, and more — all remotely.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.btn, (loading || !selectedProjectId) && s.btnDisabled]}
          onPress={handleCreate}
          disabled={loading || !selectedProjectId}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} size="small" />
          ) : (
            <Text style={s.btnText}>Launch Agent</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  chipText: { color: colors.textSecondary, fontSize: font.size.sm, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.text,
    fontSize: font.size.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: font.mono,
  },
  hint: { color: colors.textDim, fontSize: font.size.xs },
  infoBox: {
    backgroundColor: colors.blue + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.blue + '30',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoText: { color: colors.textSecondary, fontSize: font.size.xs, lineHeight: 18 },
  empty: { color: colors.textDim, fontSize: font.size.sm, fontStyle: 'italic' },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.bg, fontSize: font.size.md, fontWeight: '800' },
});
