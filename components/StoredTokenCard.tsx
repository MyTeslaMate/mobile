import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TokenInfo } from '@/components/TokenInfo';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useTokenStore, type TokenType } from '@/contexts/TokenStoreContext';
import { testToken, type TokenTestResult } from '@/lib/tokenTest';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StoredTokenCard({ type }: { type: TokenType }) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { fleetTokens, ownerTokens, clearTokens } = useTokenStore();
  const tokens = type === 'fleet' ? fleetTokens : ownerTokens;

  const [testResult, setTestResult] = useState<TokenTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const createdAt = tokens?.createdAt;
  useEffect(() => {
    setTestResult(null);
  }, [createdAt]);

  const styles = createStyles(colors);

  if (!tokens) return null;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert(t('tokenCard.copied'), label);
    } catch {
      Alert.alert(t('common.error'), t('tokenCard.copyError'));
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testToken(type, tokens.accessToken, tokens.region);
    setTestResult(result);
    setTesting(false);
  };

  const confirmClear = () => {
    Alert.alert(t('tokenCard.clearTitle'), t('tokenCard.clearMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tokenCard.clear'),
        style: 'destructive',
        onPress: () => clearTokens(type),
      },
    ]);
  };

  const testColor =
    testResult === 'valid'
      ? colors.success
      : testResult === 'invalid'
        ? colors.danger
        : colors.textSecondary;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bookmark" size={18} color={colors.primary} />
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {t('tokenCard.title')}
        </ThemedText>
      </View>
      <ThemedText style={styles.date}>
        {t('tokenCard.generatedOn', { date: formatDate(tokens.createdAt) })}
      </ThemedText>

      <TokenInfo accessToken={tokens.accessToken} />

      <View style={styles.tokenGroup}>
        <ThemedText style={styles.label}>
          {t('tokenCard.accessToken')}
        </ThemedText>
        <View style={styles.tokenRow}>
          <ThemedText style={styles.tokenText} numberOfLines={2}>
            {tokens.accessToken}
          </ThemedText>
          <Pressable
            style={styles.copyButton}
            onPress={() =>
              copyToClipboard(tokens.accessToken, t('tokenCard.accessToken'))
            }
          >
            <Ionicons name="clipboard" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.tokenGroup}>
        <ThemedText style={styles.label}>
          {t('tokenCard.refreshToken')}
        </ThemedText>
        <View style={styles.tokenRow}>
          <ThemedText style={styles.tokenText} numberOfLines={2}>
            {tokens.refreshToken}
          </ThemedText>
          <Pressable
            style={styles.copyButton}
            onPress={() =>
              copyToClipboard(tokens.refreshToken, t('tokenCard.refreshToken'))
            }
          >
            <Ionicons name="clipboard" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {testResult && (
        <View style={styles.row}>
          <Ionicons
            name={
              testResult === 'valid'
                ? 'checkmark-circle'
                : testResult === 'invalid'
                  ? 'close-circle'
                  : 'help-circle'
            }
            size={16}
            color={testColor}
          />
          <ThemedText style={[styles.testText, { color: testColor }]}>
            {t(`tokenCard.testResult.${testResult}`)}
          </ThemedText>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.testButton]}
          onPress={runTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="pulse" size={18} color="#fff" />
          )}
          <ThemedText style={styles.testButtonText}>
            {t('tokenCard.test')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.clearButton]}
          onPress={confirmClear}
        >
          <Ionicons name="trash" size={18} color={colors.danger} />
          <ThemedText style={[styles.clearButtonText, { color: colors.danger }]}>
            {t('tokenCard.clear')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      flex: 1,
    },
    date: {
      fontSize: 13,
      opacity: 0.6,
      marginTop: -4,
    },
    tokenGroup: {
      gap: 6,
    },
    label: {
      fontWeight: '600',
      fontSize: 13,
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    tokenText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 12,
      opacity: 0.85,
    },
    copyButton: {
      backgroundColor: colors.primary + '20',
      borderRadius: 8,
      padding: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    testText: {
      fontSize: 13,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 12,
      paddingVertical: 12,
    },
    testButton: {
      backgroundColor: colors.primary,
    },
    testButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    clearButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    clearButtonText: {
      fontWeight: '600',
    },
  });
