import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useAppStore } from '@/stores/useAppStore';
import { setApiToken } from '@/services/api.service';
import { wsService } from '@/services/websocket.service';
import Navigation from '@/navigation';
import { colors } from '@/utils/theme';

// Required for expo-web-browser auth sessions to close properly
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const _hasHydrated = useAppStore((s) => s._hasHydrated);
  const sessionToken = useAppStore((s) => s.sessionToken);

  // Restore token + WS on hydration
  useEffect(() => {
    if (!_hasHydrated) return;
    if (sessionToken) {
      setApiToken(sessionToken);
      wsService.connect(sessionToken);
    }
    return () => { wsService.disconnect(); };
  }, [_hasHydrated, sessionToken]);

  if (!_hasHydrated) {
    return (
      <View style={s.splash}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={s.flex}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  splash: { flex: 1, backgroundColor: colors.bg },
});
