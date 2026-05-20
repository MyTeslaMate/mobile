import { ThemedText } from '@/components/ThemedText';
import { useThemeColors } from '@/contexts/ThemeContext';
import { decodeJwt, getTokenScopes } from '@/lib/jwt';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export function TokenInfo({ accessToken }: { accessToken: string }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const scopes = useMemo(() => {
    const payload = decodeJwt(accessToken);
    if (!payload) return [];
    return getTokenScopes(payload);
  }, [accessToken]);

  if (scopes.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scopes}
    >
      {scopes.map(scope => (
        <View key={scope} style={styles.chip}>
          <ThemedText style={styles.chipText}>{scope}</ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    scopes: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chip: {
      backgroundColor: colors.primary + '15',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
  });
