import { Redirect } from 'expo-router';

// Deep-link shortcut: `mtm://generate` (or `mtm:///generate`) opens the Owner
// tab and triggers the token generator modal via the `generate=1` query param
// picked up by `app/(tabs)/index.tsx`.
export default function GenerateRedirect() {
  return <Redirect href="/?generate=1" />;
}
