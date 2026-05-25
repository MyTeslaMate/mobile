import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

// Header back button that falls back to a fixed route when the navigation
// stack is empty (i.e. the screen was reached via a deep link). Use as the
// `headerLeft` of a Stack.Screen on any sub-page accessible via mtm:// link.
export function BackOrCloseHeaderLeft({
  fallbackHref = '/settings',
}: {
  fallbackHref?: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace(fallbackHref as any)
      }
      hitSlop={12}
      style={{ paddingHorizontal: 4 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.primary} />
    </Pressable>
  );
}
