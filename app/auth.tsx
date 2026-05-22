import { ThemedText } from '@/components/ThemedText';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { exchangeMtmToken } from '@/lib/mtmExchange';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Deep link: mtm://auth?token=<mtm-token>&next=<optional-path>
// Exchanges the token via mtm-exchange, signs the user in, then routes to `next`
// (default: home).
export default function AuthScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { signIn } = useTeslaMateApi();
  const params = useLocalSearchParams<{ token?: string; next?: string }>();

  const [state, setState] = useState<'pending' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    const token = typeof params.token === 'string' ? params.token.trim() : '';
    if (!token) {
      setState('error');
      setError(t('settings.mtmToken.errorInvalid'));
      return;
    }
    startedRef.current = true;

    (async () => {
      const result = await exchangeMtmToken(token);
      if (!result.ok) {
        setState('error');
        if (result.reason === 'token_invalid') {
          setError(t('settings.mtmToken.errorInvalid'));
        } else if (result.reason === 'network') {
          setError(t('settings.mtmToken.errorNetwork'));
        } else {
          setError(result.message ?? t('settings.mtmToken.errorGeneric'));
        }
        return;
      }
      if (!result.teslamateApiEndpoint) {
        setState('error');
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

      const next = typeof params.next === 'string' ? params.next : '/';
      router.replace(next as any);
    })();
  }, [params.token, params.next, signIn, t]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {state === 'pending' ? (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <ThemedText style={styles.label}>
              {t('settings.mtmToken.title')}…
            </ThemedText>
          </>
        ) : (
          <>
            <Ionicons name="alert-circle" size={40} color={colors.primary} />
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {t('settings.mtmToken.errorGeneric')}
            </ThemedText>
            {error && <ThemedText style={styles.error}>{error}</ThemedText>}
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/')}
            >
              <ThemedText style={styles.buttonText}>
                {t('common.close')}
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    label: { fontSize: 14, opacity: 0.7 },
    title: { fontSize: 17, textAlign: 'center' },
    error: { fontSize: 13, textAlign: 'center', opacity: 0.8, marginBottom: 8 },
    button: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    buttonText: { color: '#fff', fontWeight: '600' },
  });
