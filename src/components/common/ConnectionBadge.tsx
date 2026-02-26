import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { wsService } from '@/services/websocket.service';
import { colors, spacing, radius, font } from '@/utils/theme';

type ConnState = 'disconnected' | 'connecting' | 'connected';

export default function ConnectionBadge() {
  const [state, setState] = useState<ConnState>(wsService.connectionState);
  const opacity = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsub = wsService.onStateChange(setState);
    return unsub;
  }, []);

  useEffect(() => {
    if (state === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      opacity.setValue(1);
    }
  }, [state]);

  const dotColor =
    state === 'connected' ? colors.green :
    state === 'connecting' ? colors.yellow :
    colors.red;

  const label =
    state === 'connected' ? 'Live' :
    state === 'connecting' ? 'Connecting' :
    'Offline';

  if (state === 'connected') return null;

  return (
    <View style={s.container}>
      <Animated.View style={[s.dot, { backgroundColor: dotColor, opacity }]} />
      <Text style={[s.label, { color: dotColor }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: font.size.xs, fontWeight: '600' },
});
