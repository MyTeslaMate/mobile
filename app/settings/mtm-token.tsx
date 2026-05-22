import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { exchangeMtmToken } from '@/lib/mtmExchange';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function maskToken(token: string): string {
  if (token.length <= 8) return '••••••••';
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

export default function MtmTokenScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { session, signIn } = useTeslaMateApi();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const styles = createStyles(colors);

  const handleSubmit = async () => {
    const trimmed = token.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await exchangeMtmToken(trimmed);

    if (!result.ok) {
      setSubmitting(false);
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
      setSubmitting(false);
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

    setToken('');
    setSubmitting(false);
    router.back();
  };

  const handleCopy = async () => {
    if (!session?.token) return;
    await Clipboard.setStringAsync(session.token);
    Alert.alert(t('settings.mtmToken.copiedTitle'), t('settings.mtmToken.copiedMessage'));
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: t('settings.mtmToken.title') }} />

      <ScrollView contentContainerStyle={styles.container}>
        {session?.token && (
          <ThemedView style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {t('settings.mtmToken.currentTokenTitle')}
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              {t('settings.mtmToken.currentTokenDescription')}
            </ThemedText>

            <View
              style={[
                styles.tokenBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <ThemedText style={styles.tokenText} selectable>
                {revealed ? session.token : maskToken(session.token)}
              </ThemedText>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.secondaryButton, { borderColor: colors.borderColor }]}
                onPress={() => setRevealed((v) => !v)}
              >
                <Ionicons
                  name={revealed ? 'eye-off' : 'eye'}
                  size={16}
                  color={colors.text}
                />
                <ThemedText style={styles.secondaryButtonText}>
                  {revealed
                    ? t('settings.mtmToken.hide')
                    : t('settings.mtmToken.show')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { borderColor: colors.borderColor }]}
                onPress={handleCopy}
              >
                <Ionicons name="copy" size={16} color={colors.text} />
                <ThemedText style={styles.secondaryButtonText}>
                  {t('settings.mtmToken.copy')}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            {session?.token
              ? t('settings.mtmToken.replaceTitle')
              : t('settings.mtmToken.title')}
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            {t('settings.mtmToken.description')}
          </ThemedText>

          <ThemedText style={styles.label}>
            {t('settings.mtmToken.inputLabel')}
          </ThemedText>
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder={t('settings.mtmToken.placeholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            multiline
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.borderColor,
              },
            ]}
          />

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!token.trim() || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!token.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="key" size={18} color="#fff" />
                <ThemedText style={styles.submitButtonText}>
                  {t('settings.mtmToken.submit')}
                </ThemedText>
              </>
            )}
          </Pressable>

          {error && (
            <ThemedView style={styles.errorRow}>
              <Ionicons name="alert-circle" size={18} color={colors.primary} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 16, gap: 16 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    cardTitle: { fontSize: 15 },
    paragraph: { fontSize: 14, lineHeight: 21, opacity: 0.8 },
    label: { fontSize: 13, fontWeight: '500', marginTop: 4 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 90,
      textAlignVertical: 'top',
    },
    tokenBox: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    tokenText: {
      fontFamily: 'Courier',
      fontSize: 13,
      letterSpacing: 0.5,
    },
    actionRow: { flexDirection: 'row', gap: 8 },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
    },
    secondaryButtonText: { fontSize: 13, fontWeight: '500' },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 14,
    },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    errorRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      backgroundColor: 'transparent',
    },
    errorText: { flex: 1, fontSize: 13, lineHeight: 19, opacity: 0.85 },
  });
