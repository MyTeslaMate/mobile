import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { exchangeMtmToken } from '@/lib/mtmExchange';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConnectScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { signIn } = useTeslaMateApi();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [error, setError] = useState<string | null>(null);
  const styles = createStyles(colors);

  useEffect(() => {
    const incoming = (token ?? '').trim();
    if (!incoming) {
      setError(t('settings.mtmToken.errorInvalid'));
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await exchangeMtmToken(incoming);
      if (cancelled) return;

      if (!result.ok) {
        setError(
          result.reason === 'token_invalid'
            ? t('settings.mtmToken.errorInvalid')
            : result.reason === 'network'
              ? t('settings.mtmToken.errorNetwork')
              : (result.message ?? t('settings.mtmToken.errorGeneric'))
        );
        return;
      }

      if (!result.teslamateApiEndpoint) {
        setError(t('settings.mtmToken.errorNoSubscription'));
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
    })();

    return () => {
      cancelled = true;
    };
  }, [token, signIn, t]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.center}>
        {error ? (
          <ThemedView style={styles.errorCard}>
            <Ionicons name="alert-circle" size={28} color={colors.primary} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/now')}
            >
              <ThemedText style={styles.buttonText}>
                {t('connect.continueWithoutSignIn')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <ThemedText style={styles.statusText}>
              {t('connect.signingIn')}
            </ThemedText>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 16,
    },
    statusText: { fontSize: 15, opacity: 0.8 },
    errorCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      gap: 14,
      alignItems: 'center',
      maxWidth: 360,
    },
    errorText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
    button: {
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  });
