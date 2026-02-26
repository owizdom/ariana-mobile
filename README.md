# Ariana Mobile

React Native / Expo mobile app for [Ariana](https://ariana.dev) — run parallel AI coding agents from your phone.

---

## What We Built

A full iOS + Android app connecting to the Ariana backend (`ariana.dev`) with:

| Feature | Details |
|---------|---------|
| **Auth** | GitHub OAuth via in-app browser → JWT deep link |
| **Projects** | Live list via WebSocket, tap to drill into project agents |
| **Agents list** | All agents with real-time state (running / idle / provisioning) + search + filter |
| **Agent chat** | Send prompts, see responses, tool calls, git commits — all streaming live |
| **Remote desktop** | WebView to Moonlight/Sunshine stream on the agent's VPS |
| **Create agent** | Launch new agent on a Hetzner VPS, pick branch |
| **Profile** | Account info, sign out |
| **App Store ready** | EAS build config for iOS App Store + Google Play |

---

## Project Structure

```
ariana-mobile/
├── App.tsx                              Root — hydration + WS connect
├── index.js                             Expo entry point
├── app.json                             Expo config (schemes: ariana + ariana-ide)
├── eas.json                             EAS build/submit profiles
├── babel.config.js
├── tsconfig.json
└── src/
    ├── config.ts                        API_URL, WS_URL
    ├── navigation/index.tsx             React Navigation (native stack + bottom tabs)
    ├── services/
    │   ├── websocket.service.ts         Persistent WS — ported 1:1 from desktop app
    │   ├── websocket-protocol.ts        Protocol types — shared with Ariana backend
    │   └── api.service.ts               REST calls (auth, projects, agents)
    ├── stores/
    │   ├── useAppStore.ts               User, token, model, drafts (AsyncStorage persist)
    │   ├── useAgentEventsStore.ts       Real-time chat events (WS subscriptions)
    │   ├── useAgentsListStore.ts        Live agents list (WS)
    │   └── useProjectsStore.ts          Live projects list (WS)
    ├── screens/
    │   ├── Auth/AuthScreen.tsx          GitHub OAuth login + token paste fallback
    │   ├── Dashboard/
    │   │   ├── DashboardScreen.tsx      Projects tab
    │   │   ├── AgentsScreen.tsx         All agents (search + filter)
    │   │   └── ProjectScreen.tsx        Agents for a single project
    │   ├── Agent/AgentScreen.tsx        Chat + prompt input + stop + desktop link
    │   ├── CreateAgent/                 Launch new agent (branch, machine type)
    │   ├── Streaming/StreamingScreen    Remote desktop via WebView
    │   └── Profile/ProfileScreen.tsx    Account info + sign out
    ├── components/
    │   ├── agent/AgentCard.tsx          Agent list item with state badge
    │   ├── common/ConnectionBadge.tsx   Live WS connection indicator
    │   └── terminal/EventItem.tsx       Chat bubble per event type
    ├── types/index.ts                   All TypeScript types (mirrors backend)
    └── utils/
        ├── theme.ts                     Colors, spacing, fonts
        └── agentState.ts               State → color/label helpers
```

---

## Auth Flow

Ariana uses **GitHub OAuth only** — no username/password, no API key login.

```
App → GET /api/auth/sign-in/github?deep_link=true
    → returns { url: "https://github.com/login/oauth/authorize?..." }

App opens that GitHub URL via openAuthSessionAsync()
    → User authorizes on GitHub
    → Ariana backend receives callback
    → Redirects to ariana-ide://auth?token=<jwt>

openAuthSessionAsync intercepts the deep link → returns result.url
    → App extracts token
    → GET /api/auth/session (verify + get user)
    → Stored in AsyncStorage, WS connected
```

**Fallback (Expo Go / if auto fails):** tap "Have a token?" → browser opens GitHub sign-in → after auth, copy the token from the URL bar → paste it in the app.

> The Anthropic API key / Claude credentials are configured **after** login via the agent creation flow on the backend — not at login time.

---

## Run It (iOS Simulator)

### Prerequisites

```bash
# Xcode must be installed (you have it ✓)
# Install CocoaPods
brew install cocoapods
```

### Start

```bash
cd ~/Desktop/ariana-mobile
npm install
npx expo start --clear
# press i → iOS Simulator
```

Sign in with GitHub. The auto flow works in Simulator. On a physical device with Expo Go, use the "paste token" fallback.

---

## What Still Needs Work

### For Expo Go (physical device)
- `openAuthSessionAsync` with custom URL schemes is unreliable in Expo Go
- **Workaround**: use the paste-token fallback (tap "Have a token?")
- **Proper fix**: build a development client with `eas build --profile development`

### Not yet implemented
- [ ] GitHub Issues mentions in prompts
- [ ] Port forwarding UI (view public ports agents expose)
- [ ] Diff viewer (diffs.com integration)
- [ ] Push notifications for agent state changes
- [ ] iPad split-view layout
- [ ] Automation management
- [ ] Environment variables editor

---

## Build for App Stores

### One-time setup

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Fill in `eas.json` with your Apple ID, App Store Connect app ID, team ID, and Google Play service account.

### Build + submit

```bash
# iOS App Store
eas build --platform ios --profile production
eas submit --platform ios

# Google Play
eas build --platform android --profile production
eas submit --platform android
```

EAS handles all signing, provisioning profiles, and certificates automatically.

### Why Expo Go auth doesn't work fully
Expo Go's native binary doesn't register the `ariana-ide://` URL scheme, so `ASWebAuthenticationSession` can't complete the OAuth redirect back to the app. A production build (via EAS) registers the scheme and everything works in one tap.

---

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| Expo managed workflow | EAS handles native builds + app store submission without ejecting |
| WebSocket service ported 1:1 | Same subscription/channel protocol as desktop, same reconnect logic |
| Zustand + AsyncStorage | Same stores as desktop, swapped Tauri storage for AsyncStorage |
| Native FlatList instead of xterm.js | xterm.js is browser-only; native list is smoother on mobile |
| WebView for remote desktop | Moonlight stream is HTTP — WebView handles it without native video setup |
| `ariana-ide` + `ariana` both registered | Backend deep links use `ariana-ide://`; we register both schemes |
