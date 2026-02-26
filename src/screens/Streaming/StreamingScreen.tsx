import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation';
import WebView from 'react-native-webview';
import { colors, spacing, radius, font } from '@/utils/theme';

type Route = RouteProp<RootStackParamList, 'Streaming'>;

export default function StreamingScreen() {
  const route = useRoute<Route>();
  const { agentId, hostname, port } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ariana uses Moonlight-based streaming — served over HTTP from the agent's VPS
  const streamUrl = `http://${hostname}:${port}`;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.info}>
        <Text style={s.infoLabel}>Remote Desktop</Text>
        <Text style={s.infoHost}>{hostname}:{port}</Text>
      </View>

      <View style={s.webviewContainer}>
        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.loadingText}>Connecting to desktop...</Text>
          </View>
        )}

        {error ? (
          <View style={s.errorContainer}>
            <Text style={s.errorTitle}>Connection Failed</Text>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => {
                setError(null);
                setLoading(true);
              }}
            >
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            style={s.webview}
            source={{ uri: streamUrl }}
            onLoadEnd={() => setLoading(false)}
            onError={(e) => {
              setLoading(false);
              setError(e.nativeEvent.description ?? 'Could not load remote desktop.');
            }}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            mixedContentMode="always"
            // Allow interaction (mouse/keyboard forwarding via WebView)
            scrollEnabled={false}
          />
        )}
      </View>

      <View style={s.toolbar}>
        <Text style={s.toolbarNote}>
          Tap and drag on the desktop to interact. Keyboard input is forwarded automatically.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.text, fontSize: font.size.sm, fontWeight: '600' },
  infoHost: { color: colors.textDim, fontSize: font.size.xs, fontFamily: font.mono },
  webviewContainer: { flex: 1, position: 'relative', backgroundColor: colors.bg },
  webview: { flex: 1, backgroundColor: colors.bg },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
    zIndex: 10,
  },
  loadingText: { color: colors.textSecondary, fontSize: font.size.sm },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: { color: colors.red, fontSize: font.size.lg, fontWeight: '700' },
  errorText: { color: colors.textSecondary, fontSize: font.size.sm, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryBtnText: { color: colors.bg, fontSize: font.size.md, fontWeight: '700' },
  toolbar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  toolbarNote: { color: colors.textDim, fontSize: font.size.xs, textAlign: 'center' },
});
