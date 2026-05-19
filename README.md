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

## Build App Store / Play Store (EAS)

Les builds de production sont compilés dans le cloud via **EAS Build** — aucun Mac requis. La configuration se trouve dans `eas.json` (profils `development`, `preview`, `production`).

Préparation, à faire **une seule fois** :

```bash
npm install -g eas-cli
eas login
eas init                 # ajoute extra.eas.projectId dans app.json
eas credentials          # génère/configure la signature iOS et Android
```

Lancer un build manuellement :

```bash
eas build --platform all --profile production
```

### CI GitHub Actions

Le workflow `.github/workflows/eas-build.yml` lance les builds iOS + Android :

- automatiquement sur un tag `v*` (ex. `git tag v1.0.0 && git push --tags`) ;
- manuellement via *Run workflow* (choix de la plateforme et du profil).

Le runner GitHub ne fait que déclencher (`--no-wait`) ; build et envoi aux stores s'exécutent sur les serveurs EAS. Avec le profil `production`, le workflow ajoute `--auto-submit` : dès qu'un build réussit, il est envoyé automatiquement vers App Store Connect (iOS) et la piste *internal* de Google Play (Android).

### Credentials de publication

Tout est stocké côté EAS (rien de sensible dans le dépôt). À configurer **une seule fois** :

1. **`EXPO_TOKEN`** (secret GitHub) — jeton d'accès Expo.
   - expo.dev → *Account* → *Settings* → *Access tokens* → *Create token*.
   - GitHub → repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*, nommé `EXPO_TOKEN`.

2. **iOS — App Store Connect API Key** (pour l'envoi automatique).
   - App Store Connect → *Users and Access* → onglet *Integrations* → *App Store Connect API* → *Generate API Key*, rôle *App Manager*.
   - Récupérer l'**Issuer ID**, le **Key ID**, et télécharger le fichier **`.p8`** (téléchargeable une seule fois).
   - Enregistrer ces valeurs dans EAS : `eas credentials` → plateforme *iOS* → *App Store Connect API Key*.
   - L'app doit déjà exister dans App Store Connect avec le Bundle ID `fr.opcode.myteslamatetokens`.

3. **Android — compte de service Google Play** (pour l'envoi automatique).
   - Google Play Console → *Users and permissions* → *Invite new users*, ou via Google Cloud Console → créer un *service account* puis une **clé JSON**.
   - Dans la Play Console, accorder à ce compte les droits de publication (*Releases*).
   - Enregistrer la clé JSON dans EAS : `eas credentials` → plateforme *Android* → *Google Service Account*.
   - ⚠️ Google exige que **le tout premier AAB soit envoyé manuellement** via la Play Console ; les envois suivants peuvent être automatisés.

Les builds iOS sont déposés sur App Store Connect / TestFlight — la soumission finale à la revue Apple reste manuelle. Les builds Android arrivent sur la piste *internal* (modifiable dans `eas.json` → `submit.production.android.track`).

## Stack

- Expo (~53) + Expo Router
- React Native 0.79
- TypeScript
- i18next / react-i18next
- expo-clipboard, expo-localization
- react-native-webview (Owner API)
- js-sha256 (PKCE)
