# MyTeslaMate Viewer

[![Version](https://img.shields.io/github/package-json/v/MyTeslaMate/mobile?label=version)](https://github.com/MyTeslaMate/tesla-tokens-generator/releases)
[![EAS Build](https://github.com/MyTeslaMate/tesla-tokens-generator/actions/workflows/eas-build.yml/badge.svg)](https://github.com/MyTeslaMate/tesla-tokens-generator/actions/workflows/eas-build.yml)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-55-000020.svg?logo=expo)](https://docs.expo.dev/versions/v55.0.0/)
[![React Native](https://img.shields.io/badge/React%20Native-0.83-61dafb.svg?logo=react)](https://reactnative.dev/)

The official mobile companion for [MyTeslaMate](https://app.myteslamate.com). View your drives, charges and current vehicle state directly from your TeslaMate instance.

- **Now**: current battery state, charging status and location.
- **Drives**: browse your recent trips with distance, duration and consumption.
- **Charges**: history of your charging sessions with energy added and cost.
- **Settings**: re-connect, language, theme, biometric lock, and advanced tools (Tesla API token management).

Open-source under the **GNU GPL v3.0** — see [LICENSE](LICENSE).

## Download

[![Download on TestFlight](https://img.shields.io/badge/iOS-TestFlight-0D96F6.svg?logo=apple)](https://testflight.apple.com/join/hHaSHUr3)
[![Get it on Google Play](https://img.shields.io/badge/Android-Play%20Store-3DDC84.svg?logo=googleplay&logoColor=white)](https://play.google.com/apps/testing/com.myteslamate.tokens)

- **iOS (TestFlight)**: <https://testflight.apple.com/join/hHaSHUr3>
- **Android (Play Store closed testing)**: <https://play.google.com/apps/testing/com.myteslamate.tokens>

## Features

- Tab navigation: **Now**, **Drives**, **Charges**, **Settings**.
- Connects to your MyTeslaMate account via Tesla OAuth (one-shot Owner API token exchange).
- Reads data from your private TeslaMate API endpoint (`https://<your-instance>.api.myteslamate.com`).
- Advanced: manual Tesla **Fleet API** / **Owner API** token generation under Settings.
- Region selection (International / China).
- Light / dark / auto themes (persisted).
- Internationalization (8 languages).
- Biometric lock with encrypted on-device storage.

## Getting started

Requirements: Node.js 20+, npm, and (for native builds) Xcode / Android Studio.

```bash
npm install
npx expo start
```

Expo Go is not enough — the app uses a custom WebView + deep-link flow that needs a **dev client** native build:

```bash
npx expo run:ios
npx expo run:android
```

After the first native build, you can keep using `npx expo start` and reload on the dev client.

## Fleet API configuration

The `redirect_uri` used to register your Tesla application is **hardcoded** at the top of [components/tokens/TokenFleetGenerator.tsx](components/tokens/TokenFleetGenerator.tsx):

```ts
const REDIRECT_URI = 'mtm://auth/callback/api';
```

If you fork the project and change the scheme, update both this constant and `expo.scheme` / the iOS/Android intent filters in [app.json](app.json).

## Project layout

```
app/           Expo Router screens (tabs: fleet, owner, about)
components/    UI components, including the token generators
contexts/      Theme + biometric lock contexts
hooks/         Reusable hooks (region selection, …)
lib/           Helpers (PKCE, storage, …)
locales/       i18next translation files
assets/        Icons, splash, fonts
```

## Useful scripts

```bash
npm run lint           # expo lint
npm run start          # expo start
npm run ios            # expo run:ios
npm run android        # expo run:android
npm run check:routes   # validate every <Redirect href> / router.push/replace
                       # target against the real Expo Router file tree, and
                       # re-assert documented deep links (mtm://...)
npm test               # run the lib/ unit tests (jest + ts-jest)
npm run test:watch     # same, in watch mode
```

The `Makefile` also exposes orchestration targets used during release work:

```bash
make help              # list all targets
make check             # run check:routes + npm test (used by CI)
make metadata          # eas metadata:push --non-interactive (App Store copy + screenshots)
make ios               # boot iPhone 11 Pro Max sim + expo run:ios
make ipad              # boot iPad Pro 13" sim + expo run:ios
make android           # boot the configured AVD + expo run:android
make connect           # open mtm:///connect?token=$(TOKEN) on a booted iOS sim
make clean-sim         # shutdown all booted iOS simulators
```

## Tests & static checks

Three layers run in CI ([.github/workflows/eas-build.yml](.github/workflows/eas-build.yml)) before any build, in this order:

- **Lint** (`npm run lint`) — `expo lint` (ESLint + the Expo config). CI runs it with `--max-warnings 0`, so a single warning fails the build. Fix or explicitly `// eslint-disable-next-line` with a one-line rationale.
- **Route validator** ([scripts/check-routes.js](scripts/check-routes.js)) — parses `app/**` to derive the Expo Router route table, then greps `<Redirect href="…" />`, `router.push('…')` and `router.push({ pathname: '…' })` across `app/`, `components/`, `contexts/`, `hooks/`, `lib/`. Any literal target that does not match a real route fails the build. The documented deep links (`mtm:///`, `mtm:///generate`, `mtm:///auth`, `mtm:///assistant`, `mtm:///connect`) are re-asserted on each run.
  - To add a new deep link to the contract: edit the `DEEP_LINKS` array in the script.
- **Unit tests** (`__tests__/lib/*.test.ts`) — pure logic only, no React Native: `downsample`, `format`, `jwt`, `recommendationsPrompt`, `mtmExchange`. Components and the WebSocket chat stream are not covered yet.

All three run in under a few seconds. Run `make check` locally — **it must pass green before pushing a PR**, otherwise the CI workflow will reject the branch and block the EAS build.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `make check` (lint, route validator and unit tests). Keep changes focused — one topic per PR.

## Stack

- Expo SDK 55 + Expo Router
- React Native 0.83
- React 19
- TypeScript
- i18next / react-i18next
- expo-clipboard, expo-localization, expo-secure-store, expo-local-authentication
- react-native-webview (Owner API)
- js-sha256 (PKCE)

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for the full text.
