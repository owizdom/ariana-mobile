import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '@/utils/theme';
import { useAppStore } from '@/stores/useAppStore';
import { wsService } from '@/services/websocket.service';
import { logout as apiLogout, setApiToken } from '@/services/api.service';
import { useAgentEventsStore } from '@/stores/useAgentEventsStore';

function SettingRow({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={s.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[s.settingLabel, danger && { color: colors.red }]}>{label}</Text>
      {value && <Text style={s.settingValue}>{value}</Text>}
      {onPress && <Text style={s.settingChevron}>›</Text>}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const cleanupEvents = useAgentEventsStore((s) => s.cleanup);

  function handleLogout() {
    Alert.alert(
      'Sign Out',
      'You will need to sign in again to use Ariana.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try { await apiLogout(); } catch (_) {}
            wsService.disconnect();
            setApiToken(null);
            cleanupEvents();
            logout();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.profileHeader}>
          {user?.image ? (
            <Image source={{ uri: user.image }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.name ?? 'Anonymous'}</Text>
            {user?.email && <Text style={s.profileEmail}>{user.email}</Text>}
            {user?.isAnonymous && (
              <View style={s.anonBadge}>
                <Text style={s.anonBadgeText}>Anonymous</Text>
              </View>
            )}
          </View>
        </View>

        {/* Account */}
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.section}>
          <SettingRow label="User ID" value={user?.id?.slice(0, 12) + '...' ?? '—'} />
          <View style={s.divider} />
          <SettingRow
            label="ariana.dev"
            value="Open web dashboard"
            onPress={() => {
              // Could open with Linking.openURL
            }}
          />
        </View>

        {/* App info */}
        <Text style={s.sectionTitle}>App</Text>
        <View style={s.section}>
          <SettingRow label="Version" value="1.0.0" />
          <View style={s.divider} />
          <SettingRow label="Backend" value="ariana.dev" />
        </View>

        {/* Danger */}
        <Text style={s.sectionTitle}>Session</Text>
        <View style={s.section}>
          <SettingRow
            label="Sign Out"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '22',
    borderWidth: 2,
    borderColor: colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: font.size.xxl, fontWeight: '800' },
  profileInfo: { flex: 1, gap: spacing.xs },
  profileName: { color: colors.text, fontSize: font.size.lg, fontWeight: '700' },
  profileEmail: { color: colors.textSecondary, fontSize: font.size.sm },
  anonBadge: {
    backgroundColor: colors.yellow + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.yellow + '44',
  },
  anonBadgeText: { color: colors.yellow, fontSize: font.size.xs, fontWeight: '700' },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: font.size.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  section: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingLabel: { flex: 1, color: colors.text, fontSize: font.size.sm, fontWeight: '500' },
  settingValue: { color: colors.textSecondary, fontSize: font.size.sm, marginRight: spacing.sm },
  settingChevron: { color: colors.textDim, fontSize: font.size.lg },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md },
});
