import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TokenInfo } from '@/components/TokenInfo';
import { TeslaMateConnectModal } from '@/components/tokens/TeslaMateConnectModal';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import {
  useTokenStore,
  type StoredTokens,
  type TokenType,
} from '@/contexts/TokenStoreContext';
import {
  decodeJwt,
  getTokenExpiry,
  isTokenExpired,
} from '@/lib/jwt';
import { testToken, type TokenTestResult } from '@/lib/tokenTest';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, View } from 'react-native';

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StoredTokenCard({ type }: { type: TokenType }) {
  const { fleetTokens, ownerTokens } = useTokenStore();
  const tokens = type === 'fleet' ? fleetTokens : ownerTokens;

  const ordered = useMemo(
    () =>
      tokens
        .map((token, index) => ({ token, number: index + 1 }))
        .reverse(),
    [tokens]
  );

  if (ordered.length === 0) return null;

  return (
    <View style={styles.list}>
      {ordered.map(({ token, number }) => (
        <SingleTokenCard
          key={token.id}
          type={type}
          token={token}
          number={number}
        />
      ))}
    </View>
  );
}

function SingleTokenCard({
  type,
  token,
  number,
}: {
  type: TokenType;
  token: StoredTokens;
  number: number;
}) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { clearToken } = useTokenStore();

  const [testResult, setTestResult] = useState<TokenTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [connectVisible, setConnectVisible] = useState(false);

  useEffect(() => {
    setTestResult(null);
  }, [token.accessToken]);

  const expiryInfo = useMemo(() => {
    const payload = decodeJwt(token.accessToken);
    if (!payload) return null;
    return {
      expiry: getTokenExpiry(payload),
      expired: isTokenExpired(payload),
    };
  }, [token.accessToken]);

  const cardStyles = createStyles(colors);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert(t('tokenCard.copied'), label);
    } catch {
      Alert.alert(t('common.error'), t('tokenCard.copyError'));
    }
  };

  const shareTokens = async () => {
    const typeLabel = t(type === 'fleet' ? 'home.typeFleet' : 'home.typeOwner');
    const regionLabel = t(
      token.region === 'cn' ? 'home.regionCn' : 'home.regionIntl'
    );
    const message = [
      t('tokenCard.shareHeader', { type: typeLabel }),
      '',
      `${t('tokenCard.accessToken')}:`,
      token.accessToken,
      '',
      `${t('tokenCard.refreshToken')}:`,
      token.refreshToken,
      '',
      `${t('home.regionSectionTitle')}: ${regionLabel}`,
    ].join('\n');
    try {
      await Share.share({ message });
    } catch {
      Alert.alert(t('common.error'), t('tokenCard.shareError'));
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testToken(type, token.accessToken, token.region);
    setTestResult(result);
    setTesting(false);
  };

  const confirmClear = () => {
    Alert.alert(t('tokenCard.clearTitle'), t('tokenCard.clearMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tokenCard.clear'),
        style: 'destructive',
        onPress: () => clearToken(type, token.id),
      },
    ]);
  };

  const testColor =
    testResult?.status === 'valid'
      ? colors.success
      : testResult?.status === 'invalid'
        ? colors.danger
        : colors.textSecondary;

  return (
    <ThemedView style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Ionicons name="bookmark" size={18} color={colors.primary} />
        <View style={cardStyles.headerTitleBlock}>
          <ThemedText type="defaultSemiBold">
            {t('tokenCard.titleNumbered', { number })}
          </ThemedText>
          <ThemedText style={cardStyles.headerSubtitle}>
            {t('tokenCard.generatedOn', {
              date: formatDate(new Date(token.createdAt)),
            })}
          </ThemedText>
        </View>
        {expiryInfo?.expiry && (
          <View style={cardStyles.headerExpiry}>
            <Ionicons
              name={expiryInfo.expired ? 'alert-circle' : 'time-outline'}
              size={14}
              color={expiryInfo.expired ? colors.danger : colors.textSecondary}
            />
            <ThemedText
              style={[
                cardStyles.headerDate,
                expiryInfo.expired && { color: colors.danger, opacity: 1 },
              ]}
            >
              {expiryInfo.expired
                ? t('tokenInfo.expired')
                : formatDate(expiryInfo.expiry)}
            </ThemedText>
          </View>
        )}
      </View>

      <TokenInfo accessToken={token.accessToken} />

      <View style={cardStyles.tokenRow}>
        <ThemedText style={cardStyles.tokenInlineLabel}>
          {t('tokenCard.accessToken')}
        </ThemedText>
        <ThemedText style={cardStyles.tokenText} numberOfLines={1}>
          {token.accessToken}
        </ThemedText>
        <Pressable
          style={cardStyles.copyButton}
          onPress={() =>
            copyToClipboard(token.accessToken, t('tokenCard.accessToken'))
          }
        >
          <Ionicons name="clipboard" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={cardStyles.tokenRow}>
        <ThemedText style={cardStyles.tokenInlineLabel}>
          {t('tokenCard.refreshToken')}
        </ThemedText>
        <ThemedText style={cardStyles.tokenText} numberOfLines={1}>
          {token.refreshToken}
        </ThemedText>
        <Pressable
          style={cardStyles.copyButton}
          onPress={() =>
            copyToClipboard(token.refreshToken, t('tokenCard.refreshToken'))
          }
        >
          <Ionicons name="clipboard" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {testResult && (
        <View style={cardStyles.row}>
          <Ionicons
            name={
              testResult.status === 'valid'
                ? 'checkmark-circle'
                : testResult.status === 'invalid'
                  ? 'close-circle'
                  : 'help-circle'
            }
            size={16}
            color={testColor}
          />
          <ThemedText
            style={[cardStyles.testText, { color: testColor, flex: 1 }]}
            numberOfLines={1}
          >
            {t(`tokenCard.testResult.${testResult.status}`)}
            {testResult.status === 'valid' &&
              (testResult.fullName || testResult.email) &&
              ` · ${[testResult.fullName, testResult.email]
                .filter(Boolean)
                .join(' · ')}`}
          </ThemedText>
        </View>
      )}

      <View style={cardStyles.actions}>
        <Pressable
          style={[cardStyles.actionButton, cardStyles.testButton]}
          onPress={runTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="pulse" size={18} color="#fff" />
          )}
          <ThemedText style={cardStyles.testButtonText}>
            {t('tokenCard.test')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[cardStyles.actionButton, cardStyles.shareButton]}
          onPress={shareTokens}
        >
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <ThemedText style={[cardStyles.shareButtonText, { color: colors.primary }]}>
            {t('tokenCard.share')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[cardStyles.actionButton, cardStyles.clearButton]}
          onPress={confirmClear}
        >
          <Ionicons name="trash" size={18} color={colors.danger} />
          <ThemedText style={[cardStyles.clearButtonText, { color: colors.danger }]}>
            {t('tokenCard.clear')}
          </ThemedText>
        </Pressable>
      </View>

      {type === 'owner' && (
        <>
          <Pressable
            style={[cardStyles.actionButton, cardStyles.connectButton]}
            onPress={() => setConnectVisible(true)}
          >
            <Ionicons name="car-sport" size={18} color="#fff" />
            <ThemedText style={cardStyles.testButtonText}>
              {t('settings.tokens.ownerGenerator.useModalTitle')}
            </ThemedText>
          </Pressable>
          <TeslaMateConnectModal
            visible={connectVisible}
            onClose={() => setConnectVisible(false)}
            accessToken={token.accessToken}
            refreshToken={token.refreshToken}
            region={token.region}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});

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
    headerTitleBlock: {
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 12,
      opacity: 0.6,
      color: colors.textSecondary,
    },
    headerExpiry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerDate: {
      fontSize: 12,
      opacity: 0.6,
      color: colors.textSecondary,
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    tokenInlineLabel: {
      fontSize: 12,
      fontWeight: '600',
      opacity: 0.7,
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
    connectButton: {
      backgroundColor: colors.primary,
      marginTop: 4,
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
    shareButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    shareButtonText: {
      fontWeight: '600',
    },
  });
