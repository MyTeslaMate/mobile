import { RegionSelector } from '@/components/RegionSelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TokenOwnerGenerator } from '@/components/tokens/TokenOwnerGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion } from '@/hooks/useRegion';
import { MTM_SIGNUP_URL } from '@/lib/mtmConfig';
import { exchangeTeslaToken } from '@/lib/mtmExchange';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ExchangeError =
  | { kind: 'no_account'; email: string; signupUrl: string }
  | { kind: 'token_invalid' }
  | { kind: 'no_subscription' }
  | { kind: 'generic'; message?: string };

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region } = useRegion();
  const { signIn } = useTeslaMateApi();

  const [modalVisible, setModalVisible] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<ExchangeError | null>(null);

  const styles = createStyles(colors);

  const handleOwnerSuccess = async ({
    accessToken,
  }: {
    accessToken: string;
    refreshToken: string;
  }) => {
    setModalVisible(false);
    setExchanging(true);
    setError(null);

    const result = await exchangeTeslaToken({
      accessToken,
      type: 'owner',
      region,
    });

    setExchanging(false);

    if (!result.ok) {
      if (result.reason === 'no_account') {
        setError({
          kind: 'no_account',
          email: result.email ?? '',
          signupUrl: result.signupUrl ?? MTM_SIGNUP_URL,
        });
      } else if (result.reason === 'token_invalid') {
        setError({ kind: 'token_invalid' });
      } else {
        setError({ kind: 'generic', message: result.message });
      }
      return;
    }

    if (!result.teslamateApiEndpoint) {
      setError({ kind: 'no_subscription' });
      return;
    }

    await signIn({
      token: result.token,
      endpoint: result.teslamateApiEndpoint,
      authType: result.authType,
      email: result.email,
      name: result.name,
    });

    router.replace('/now');
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {router.canGoBack() && (
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
      )}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBlock}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.appIcon}
          />
          <ThemedText type="title" style={styles.title}>
            {t('onboarding.title')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('onboarding.subtitle')}
          </ThemedText>
        </View>

        <ThemedView style={styles.actionCard}>
          <ThemedText type="defaultSemiBold">{t('onboarding.regionLabel')}</ThemedText>
          <RegionSelector />
          <Pressable
            style={[
              styles.primaryButton,
              exchanging && { opacity: 0.6 },
            ]}
            onPress={() => {
              setError(null);
              setModalVisible(true);
            }}
            disabled={exchanging}
          >
            <Ionicons name="logo-electron" size={20} color="#fff" />
            <ThemedText style={styles.primaryButtonText}>
              {t('onboarding.connectButton')}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {exchanging && (
          <ThemedView style={styles.statusCard}>
            <ActivityIndicator color={colors.primary} />
            <ThemedText style={styles.statusText}>
              {t('onboarding.exchanging')}
            </ThemedText>
          </ThemedView>
        )}

        {error && <ErrorBlock error={error} t={t} colors={colors} />}
      </ScrollView>

      <TokenOwnerGenerator
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        region={region}
        onSuccess={handleOwnerSuccess}
      />
    </SafeAreaView>
  );
}

function ErrorBlock({
  error,
  t,
  colors,
}: {
  error: ExchangeError;
  t: (k: string, p?: Record<string, unknown>) => string;
  colors: any;
}) {
  const styles = createStyles(colors);

  if (error.kind === 'no_account') {
    return (
      <ThemedView style={styles.statusCard}>
        <Ionicons name="information-circle" size={22} color={colors.primary} />
        <View style={{ flex: 1, gap: 10 }}>
          <ThemedText style={styles.statusText}>
            {t('onboarding.errorNoAccount', { email: error.email })}
          </ThemedText>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => Linking.openURL(error.signupUrl)}
          >
            <ThemedText style={styles.secondaryButtonText}>
              {t('onboarding.errorNoAccountCta')}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const message =
    error.kind === 'token_invalid'
      ? t('onboarding.errorTokenInvalid')
      : error.kind === 'no_subscription'
        ? t('onboarding.errorNoSubscription')
        : t('onboarding.errorGeneric');

  return (
    <ThemedView style={styles.statusCard}>
      <Ionicons name="alert-circle" size={22} color={colors.primary} />
      <ThemedText style={styles.statusText}>{message}</ThemedText>
    </ThemedView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    backButton: {
      position: 'absolute',
      top: 8,
      left: 8,
      zIndex: 10,
      padding: 8,
    },
    container: { padding: 16, gap: 16 },
    heroBlock: { alignItems: 'center', paddingVertical: 32, gap: 12 },
    appIcon: {
      width: 96,
      height: 96,
      borderRadius: 22,
      marginBottom: 4,
    },
    title: { textAlign: 'center', fontSize: 24 },
    subtitle: {
      textAlign: 'center',
      opacity: 0.75,
      paddingHorizontal: 8,
      lineHeight: 21,
    },
    actionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
    },
    primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    statusCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    statusText: { flex: 1, fontSize: 14, lineHeight: 20, opacity: 0.85 },
    secondaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
    },
    secondaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  });
