# Ariana Mobile

React Native / Expo mobile app for [Ariana](https://ariana.dev) — run parallel AI coding agents from your phone.

---

## What We Built

A full iOS + Android app that connects to the Ariana backend (`ariana.dev`) and gives you:

| Feature | Details |
|---------|---------|
| **Auth** | Sign in with Anthropic API key or anonymously |
| **Projects** | Browse all your projects, live via WebSocket |
| **Agents list** | View all agents with real-time state (running / idle / provisioning) |
| **Agent chat** | Send prompts, see responses, tool calls, git commits — all streaming live |
| **Remote desktop** | WebView to Moonlight/Sunshine desktop stream from the VPS |
| **Create agent** | Launch a new agent on a Hetzner VPS with machine size selection |
| **Profile** | Account info, sign out |
| **App Store ready** | EAS build config for iOS App Store + Google Play |

### Architecture

```
ariana-mobile/
├── App.tsx                         Root — hydration + WS connect
├── src/
│   ├── config.ts                   API_URL, WS_URL
│   ├── navigation/index.tsx        React Navigation (stack + bottom tabs)
│   ├── services/
│   │   ├── websocket.service.ts    Persistent WS (ported 1:1 from desktop)
│   │   ├── websocket-protocol.ts   Protocol types (shared with backend)
│   │   └── api.service.ts          REST calls (auth, projects, agents)
│   ├── stores/
│   │   ├── useAppStore.ts          User, token, model, drafts (persisted)
│   │   ├── useAgentEventsStore.ts  Real-time chat events (WS subscriptions)
│   │   ├── useAgentsListStore.ts   Live agents list (WS)
│   │   └── useProjectsStore.ts     Live projects list (WS)
│   ├── screens/
│   │   ├── Auth/AuthScreen.tsx     Login screen
│   │   ├── Dashboard/
│   │   │   ├── DashboardScreen.tsx Projects tab
│   │   │   ├── AgentsScreen.tsx    All agents tab (search + filter)
│   │   │   └── ProjectScreen.tsx   Agents for a project
│   │   ├── Agent/AgentScreen.tsx   Full chat + prompt input + stop/desktop
│   │   ├── CreateAgent/            Launch new agent (machine, branch, key)
│   │   ├── Streaming/              Remote desktop (WebView → Moonlight)
│   │   └── Profile/ProfileScreen.tsx
│   ├── components/
│   │   ├── agent/AgentCard.tsx     Agent list item
│   │   ├── common/ConnectionBadge  WS status indicator
│   │   └── terminal/EventItem.tsx  Chat bubble for each event type
│   ├── types/index.ts              All TypeScript types (matches backend)
│   └── utils/
│       ├── theme.ts                Colors, spacing, fonts
│       └── agentState.ts           State → color/label helpers
```

---

## Run It Now (iOS Simulator)

### 1. Prerequisites

```bash
# Node.js 18+ (you have 24 ✓)
# Xcode 14+ (you have Xcode 26 ✓)

# Install CocoaPods (needed for iOS native modules)
sudo gem install cocoapods
# OR if you can't sudo:
brew install cocoapods
```

### 2. Install dependencies

```bash
cd ~/Desktop/ariana-mobile
npm install
```

### 3. Start the dev server

```bash
npx expo start
```

Press **`i`** to open in iOS simulator.

### 4. Sign in

Use your Anthropic API key or hit "Continue anonymously" to browse Ariana.

---

## Build for App Stores

### Setup EAS (one time)

```bash
npm install -g eas-cli
eas login          # create account at expo.dev if needed
eas build:configure
```

### iOS (App Store)

```bash
# Build
npm run build:ios

# Submit to App Store Connect
npm run submit:ios
```

EAS handles signing, provisioning profiles, and notarization automatically.

### Android (Google Play)

```bash
# Build AAB (Android App Bundle)
npm run build:android

# Submit to Play Store
npm run submit:android
```

Fill in your Apple/Google credentials in `eas.json` before submitting.

---

## Key decisions

- **Expo managed workflow** — no ejecting needed, EAS handles native builds
- **WebSocket service** ported 1:1 from the Tauri desktop app — same channel/subscription model
- **Zustand** stores reused exactly, with AsyncStorage instead of Tauri's store
- **Remote desktop** via WebView → Moonlight stream URL (HTTP from agent VPS)
- **No xterm.js** — native `FlatList` + custom `EventItem` bubbles replace it for mobile
- **Offline-first** — drafts, auth token, model selection all persisted with AsyncStorage

---

## What's next

- [ ] GitHub OAuth flow (deep link callback)
- [ ] Push notifications for agent state changes (via Expo Notifications)
- [ ] Port forwarding UI (view public ports opened by agents)
- [ ] Diff viewer (integrate diffs.com)
- [ ] Haptic feedback on agent state changes
- [ ] iPad layout (split view: agent list + chat)
