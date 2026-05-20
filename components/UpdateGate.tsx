import { ThemedText } from '@/components/ThemedText';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useAppUpdateCheck } from '@/hooks/useAppUpdateCheck';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

const IOS_STORE_URL = 'https://testflight.apple.com/join/hHaSHUr3';
const ANDROID_STORE_URL =
  'https://play.google.com/apps/testing/com.myteslamate.tokens';

export function UpdateGate({ children }: { children: ReactNode }) {
  const { status, currentVersion, latestVersion } = useAppUpdateCheck();
  const colors = useThemeColors();
  const { t } = useLocalization();

  if (status !== 'outdated' || !latestVersion) {
    return <>{children}</>;
  }

  const styles = createStyles(colors);
  const storeUrl = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;

  return (
    <View style={styles.overlay}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-download" size={48} color="#fff" />
      </View>
      <ThemedText type="title" style={styles.title}>
        {t('update.title')}
      </ThemedText>
      <ThemedText style={styles.subtitle}>{t('update.message')}</ThemedText>
      <View style={styles.versionRow}>
        <ThemedText style={styles.versionLine}>
          {t('update.currentVersion', { version: currentVersion })}
        </ThemedText>
        <ThemedText style={[styles.versionLine, styles.versionLatest]}>
          {t('update.latestVersion', { version: latestVersion })}
        </ThemedText>
      </View>
      <Pressable
        style={styles.updateButton}
        onPress={() => Linking.openURL(storeUrl)}
      >
        <Ionicons
          name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
          size={20}
          color="#fff"
        />
        <ThemedText style={styles.updateButtonText}>
          {t('update.button')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
      opacity: 0.7,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    versionRow: {
      alignItems: 'center',
      gap: 4,
      marginBottom: 16,
    },
    versionLine: {
      fontSize: 13,
      opacity: 0.7,
    },
    versionLatest: {
      color: colors.primary,
      fontWeight: '600',
      opacity: 1,
    },
    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
    },
    updateButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
  });
