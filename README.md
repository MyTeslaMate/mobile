# MyTeslaMate Tokens

Application React Native (Expo) minimaliste pour générer des tokens d'API Tesla :

- **Fleet API** : enregistre votre application Tesla developer dans les régions NA/EU et récupère vos tokens via OAuth2.
- **Owner API** : récupère les tokens Owner API via PKCE et une WebView dédiée à l'authentification Tesla.

L'app est extraite d'un projet plus large (`myteslamate`) en ne gardant que la fonctionnalité de génération de tokens.

## Fonctionnalités

- Une page d'accueil avec deux boutons (Fleet / Owner).
- Thèmes clair / sombre / auto (persistés).
- Internationalisation FR / EN.

## Configuration Fleet API

Les valeurs `originUrl` et `apiDomain` utilisées pour enregistrer votre application Tesla sont actuellement **hardcodées** au début de `components/tokens/TokenFleetGenerator.tsx` :

```ts
const ORIGIN_URL = 'https://app.myteslamate.com';
const API_DOMAIN = 'example';
const REDIRECT_URI = 'myteslamate://auth/callback/api';
```

Modifiez-les pour correspondre à votre application Tesla Developer.

## Démarrage

```bash
npm install
npx expo start
```

Pour build natif (dev client requis pour la WebView + deep link) :

```bash
npx expo run:ios
npx expo run:android
```

## Stack

- Expo (~53) + Expo Router
- React Native 0.79
- TypeScript
- i18next / react-i18next
- expo-clipboard, expo-localization
- react-native-webview (Owner API)
- js-sha256 (PKCE)
