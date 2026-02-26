import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '@/utils/theme';

import AuthScreen from '@/screens/Auth/AuthScreen';
import DashboardScreen from '@/screens/Dashboard/DashboardScreen';
import AgentsScreen from '@/screens/Dashboard/AgentsScreen';
import AgentScreen from '@/screens/Agent/AgentScreen';
import StreamingScreen from '@/screens/Streaming/StreamingScreen';
import CreateAgentScreen from '@/screens/CreateAgent/CreateAgentScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import ProjectScreen from '@/screens/Dashboard/ProjectScreen';
import { useAppStore } from '@/stores/useAppStore';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Agent: { agentId: string; agentName?: string };
  Streaming: { agentId: string; hostname: string; port: number };
  CreateAgent: { projectId?: string };
  Project: { projectId: string; projectName: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Agents: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '⬡',
    Agents: '⚡',
    Profile: '◉',
  };
  return null; // Using text labels only for simplicity
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Projects' }} />
      <Tab.Screen name="Agents" component={AgentsScreen} options={{ title: 'Agents' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const sessionToken = useAppStore((s) => s.sessionToken);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        {!sessionToken ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Project"
              component={ProjectScreen}
              options={({ route }) => ({ title: route.params.projectName })}
            />
            <Stack.Screen
              name="Agent"
              component={AgentScreen}
              options={({ route }) => ({
                title: route.params.agentName ?? 'Agent',
                headerBackTitle: 'Back',
              })}
            />
            <Stack.Screen
              name="Streaming"
              component={StreamingScreen}
              options={{ title: 'Desktop', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="CreateAgent"
              component={CreateAgentScreen}
              options={{ title: 'New Agent', presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
