import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

export function SignedOutState() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ThemedView style={styles.card}>
        <Ionicons name="lock-closed" size={32} color={colors.primary} />
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {t('signedOut.title')}
        </ThemedText>
        <ThemedText style={styles.description}>
          {t('signedOut.description')}
        </ThemedText>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/onboarding')}
        >
          <Ionicons name="logo-electron" size={18} color="#fff" />
          <ThemedText style={styles.primaryButtonText}>
            {t('signedOut.signInWithTesla')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.borderColor }]}
          onPress={() => router.push('/settings/mtm-token')}
        >
          <Ionicons name="key" size={16} color={colors.text} />
          <ThemedText style={styles.secondaryButtonText}>
            {t('signedOut.useMtmToken')}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      gap: 14,
      alignItems: 'center',
    },
    title: { fontSize: 18, textAlign: 'center' },
    description: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      opacity: 0.75,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignSelf: 'stretch',
    },
    primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignSelf: 'stretch',
    },
    secondaryButtonText: { fontSize: 14, fontWeight: '500' },
  });
