import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { colors, spacing, radius, font } from '@/utils/theme';
import { fetchSession, setApiToken, getGitHubOAuthUrl } from '@/services/api.service';
import { useAppStore } from '@/stores/useAppStore';

WebBrowser.maybeCompleteAuthSession();

type Step = 'landing' | 'paste-token' | 'verifying';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('landing');
  const [pastedToken, setPastedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const deepLinkHandled = useRef(false);

  const setUser = useAppStore((s) => s.setUser);
  const setSessionToken = useAppStore((s) => s.setSessionToken);

  // Catch deep link while app is foregrounded (production builds)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Catch deep link that launched the app (cold start)
  useEffect(() => {
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
  }, []);

  async function handleDeepLink(url: string) {
    if (!url || deepLinkHandled.current) return;
    try {
      const parsed = Linking.parse(url);
      const token = parsed.queryParams?.token as string | undefined;
      if (!token) return;
      deepLinkHandled.current = true;
      await completeLogin(token);
    } catch (_) {}
  }

  async function completeLogin(token: string) {
    setStep('verifying');
    setLoading(true);
    try {
      const { user } = await fetchSession(token);
      setApiToken(token);
      setSessionToken(token);
      setUser(user);
    } catch (err: any) {
      deepLinkHandled.current = false;
      setStep('paste-token');
      Alert.alert('Invalid Token', 'Could not verify this token. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setLoading(true);
    try {
      // Fetch the real GitHub OAuth URL from Ariana (deep_link=true → redirects to ariana-ide://auth?token=...)
      const githubUrl = await getGitHubOAuthUrl(true);

      // openAuthSessionAsync intercepts the ariana-ide:// redirect at the OS level
      // This works in production builds AND in Expo Go (ASWebAuthenticationSession handles it natively)
      const result = await WebBrowser.openAuthSessionAsync(githubUrl, 'ariana-ide://auth');

      if (result.type === 'success') {
        // Got the redirect URL — extract token from it
        await handleDeepLink(result.url);
      } else if (result.type === 'dismiss' || (result as any).type === 'cancel') {
        // User closed the browser without completing — not an error
      }
    } catch (err: any) {
      // openAuthSessionAsync threw — fall back to paste-token flow
      setStep('paste-token');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasteSubmit() {
    const token = pastedToken.trim();
    if (!token) { Alert.alert('Empty', 'Paste your token first.'); return; }
    await completeLogin(token);
  }

  // ── Verifying ───────────────────────────────────────────────────────────────
  if (step === 'verifying') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.subText}>Verifying session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoArea}>
            <Text style={s.logo}>Ariana</Text>
            <Text style={s.tagline}>Agentic development, on the go</Text>
          </View>

          {/* ── Landing ── */}
          {step === 'landing' && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Sign in</Text>
              <Text style={s.cardDesc}>
                Ariana uses GitHub for authentication. You'll be redirected to GitHub and back.
              </Text>

              <TouchableOpacity
                style={[s.btnPrimary, loading && s.btnDisabled]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={s.btnPrimaryText}>Sign in with GitHub</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.textLink}
                onPress={() => setStep('paste-token')}
                disabled={loading}
              >
                <Text style={s.textLinkText}>Have a token? Paste it manually →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Paste Token ── */}
          {step === 'paste-token' && (
            <View style={s.card}>
              <TouchableOpacity onPress={() => setStep('landing')} style={s.backRow}>
                <Text style={s.backText}>← Back</Text>
              </TouchableOpacity>

              <Text style={s.cardTitle}>Paste your token</Text>
              <Text style={s.cardDesc}>
                If the automatic redirect didn't work, sign in via the browser below.{'\n\n'}
                After GitHub auth, the success page will show your token — copy and paste it here.
              </Text>

              <TouchableOpacity
                style={s.btnSecondary}
                onPress={async () => {
                  try {
                    const url = await getGitHubOAuthUrl(false);
                    await WebBrowser.openBrowserAsync(url);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Text style={s.btnSecondaryText}>Open GitHub sign-in in browser →</Text>
              </TouchableOpacity>

              <TextInput
                style={s.tokenInput}
                value={pastedToken}
                onChangeText={setPastedToken}
                placeholder="Paste token here…"
                placeholderTextColor={colors.textDim}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[s.btnPrimary, (!pastedToken.trim() || loading) && s.btnDisabled]}
                onPress={handlePasteSubmit}
                disabled={!pastedToken.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={s.btnPrimaryText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  subText: { color: colors.textSecondary, fontSize: font.size.sm },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  logoArea: { alignItems: 'center', gap: spacing.sm },
  logo: { color: colors.primary, fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: colors.textSecondary, fontSize: font.size.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: font.size.xl, fontWeight: '700' },
  cardDesc: { color: colors.textSecondary, fontSize: font.size.sm, lineHeight: 22 },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimaryText: { color: colors.bg, fontSize: font.size.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  btnSecondary: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.primary, fontSize: font.size.sm, fontWeight: '600' },
  textLink: { alignItems: 'center', paddingVertical: spacing.xs },
  textLinkText: { color: colors.textDim, fontSize: font.size.xs },
  backRow: { marginBottom: spacing.xs },
  backText: { color: colors.primary, fontSize: font.size.sm, fontWeight: '600' },
  tokenInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.text,
    fontSize: font.size.xs,
    fontFamily: font.mono,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
