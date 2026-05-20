# Tesla Tokens Generator

A minimalist React Native (Expo) app to generate Tesla API tokens:

- **Fleet API**: register your Tesla developer application in the NA/EU regions and retrieve your tokens via OAuth2.
- **Owner API**: retrieve Owner API tokens via PKCE and a dedicated WebView for Tesla authentication.

## Features

- Tab navigation: **Fleet API**, **Owner API**, and **About**.
- Region selection (International / China) on each API tab.
- Light / dark / auto themes (persisted).
- Internationalization.

## Fleet API configuration

The `redirect_uri` used to register your Tesla application is **hardcoded** at the top of `components/tokens/TokenFleetGenerator.tsx`:

```ts
const REDIRECT_URI = 'mtm://auth/callback/api';
```

## Getting started

```bash
npm install
npx expo start
```

For native builds (dev client required for the WebView + deep link):

```bash
npx expo run:ios
npx expo run:android
```

## App Store / Play Store build (EAS)

Production builds are compiled in the cloud via **EAS Build** — no Mac required. The configuration lives in `eas.json` (profiles `development`, `preview`, `production`).

One-time setup:

```bash
npm install -g eas-cli
eas login
eas init                 # adds extra.eas.projectId to app.json
eas credentials          # generates/configures iOS and Android signing
```

Run a build manually:

```bash
eas build --platform all --profile production
```

### GitHub Actions CI

The `.github/workflows/eas-build.yml` workflow triggers iOS + Android builds:

- automatically on a `v*` tag (e.g. `git tag v1.0.0 && git push --tags`);
- manually via *Run workflow* (choose the platform and profile).

The GitHub runner only triggers the build (`--no-wait`); compilation and store submission run on EAS servers. With the `production` profile, the workflow adds `--auto-submit`: as soon as a build succeeds, it is automatically sent to App Store Connect (iOS) and the Google Play *internal* track (Android).

### Publishing credentials

Everything is stored on the EAS side (nothing sensitive in the repo). One-time setup:

1. **`EXPO_TOKEN`** (GitHub secret) — Expo access token.
   - expo.dev → *Account* → *Settings* → *Access tokens* → *Create token*.
   - GitHub → repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*, named `EXPO_TOKEN`.

2. **iOS — App Store Connect API Key** (for automatic submission).
   - App Store Connect → *Users and Access* → *Integrations* tab → *App Store Connect API* → *Generate API Key*, role *App Manager*.
   - Note the **Issuer ID**, the **Key ID**, and download the **`.p8`** file (downloadable only once).
   - Save these values in EAS: `eas credentials` → *iOS* platform → *App Store Connect API Key*.
   - The app must already exist in App Store Connect with the bundle ID `com.myteslamate.tokens`.

3. **Android — Google Play service account** (for automatic submission).
   - Google Play Console → *Users and permissions* → *Invite new users*, or via Google Cloud Console → create a *service account* and a **JSON key**.
   - In the Play Console, grant this account release permissions (*Releases*).
   - Save the JSON key in EAS: `eas credentials` → *Android* platform → *Google Service Account*.
   - ⚠️ Google requires that **the very first AAB be uploaded manually** via the Play Console; subsequent uploads can be automated.

iOS builds are pushed to App Store Connect / TestFlight — the final submission to Apple review remains manual. Android builds land on the *internal* track (configurable in `eas.json` → `submit.production.android.track`).

## Stack

- Expo (~53) + Expo Router
- React Native 0.79
- TypeScript
- i18next / react-i18next
- expo-clipboard, expo-localization
- react-native-webview (Owner API)
- js-sha256 (PKCE)
