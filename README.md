# MyTeslaMate Tokens

Application React Native (Expo) minimaliste pour générer des tokens d'API Tesla :

- **Fleet API** : enregistre votre application Tesla developer dans les régions NA/EU et récupère vos tokens via OAuth2.
- **Owner API** : récupère les tokens Owner API via PKCE et une WebView dédiée à l'authentification Tesla.

L'app est extraite d'un projet plus large (`myteslamate`) en ne gardant que la fonctionnalité de génération de tokens.

## Fonctionnalités

- Une navigation par onglets : **Fleet API**, **Owner API** et **À propos**.
- Sélection de la région (International / Chine) sur chaque onglet API.
- Thèmes clair / sombre / auto (persistés).
- Internationalisation FR / EN.

## Configuration Fleet API

Le `redirect_uri` utilisé pour enregistrer votre application Tesla est **hardcodé** au début de `components/tokens/TokenFleetGenerator.tsx` :

```ts
const REDIRECT_URI = 'myteslamate://auth/callback/api';
```

L'`Allowed Origin URL` n'est plus une constante : il est saisi par l'utilisateur à l'étape 1 du générateur Fleet API.

Le générateur Owner API peut renvoyer les tokens vers MyTeslaMate via l'URL hardcodée au début de `components/tokens/TokenOwnerGenerator.tsx` :

```ts
const MTM_OWNER_TOKEN_URL = 'https://app.myteslamate.com/owner-token';
```

Modifiez ces valeurs pour correspondre à votre application Tesla Developer / votre instance.

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
