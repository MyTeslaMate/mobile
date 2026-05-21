import { Redirect } from 'expo-router';

// Deep-link shortcut: `mtm://generate` now lands on the API tokens management
// sub-screen under Settings, where users can manually generate Owner or
// Fleet API tokens. Pre-v1.1 it landed on the legacy Owner tab.
export default function GenerateRedirect() {
  return <Redirect href="/settings/tokens" />;
}
