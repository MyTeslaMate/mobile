import { ThemedText } from '@/components/ThemedText';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import {
  decodeJwt,
  getTokenExpiry,
  getTokenScopes,
  isTokenExpired,
} from '@/lib/jwt';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TokenInfo({ accessToken }: { accessToken: string }) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const styles = createStyles(colors);

  const info = useMemo(() => {
    const payload = decodeJwt(accessToken);
    if (!payload) return null;
    return {
      expiry: getTokenExpiry(payload),
      scopes: getTokenScopes(payload),
      expired: isTokenExpired(payload),
    };
  }, [accessToken]);

  if (!info) return null;

  return (
    <View style={styles.container}>
      {info.expiry && (
        <View style={styles.row}>
          <Ionicons
            name={info.expired ? 'alert-circle' : 'time-outline'}
            size={16}
            color={info.expired ? colors.danger : colors.textSecondary}
          />
          <ThemedText
            style={[styles.text, info.expired && { color: colors.danger }]}
          >
            {info.expired
              ? t('tokenInfo.expired')
              : t('tokenInfo.expiresOn', { date: formatDate(info.expiry) })}
          </ThemedText>
        </View>
      )}
      {info.scopes.length > 0 && (
        <View>
          <ThemedText style={styles.scopesLabel}>
            {t('tokenInfo.scopes')}
          </ThemedText>
          <View style={styles.scopes}>
            {info.scopes.map(scope => (
              <View key={scope} style={styles.chip}>
                <ThemedText style={styles.chipText}>{scope}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    text: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    scopesLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    scopes: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
