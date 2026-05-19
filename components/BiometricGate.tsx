import { ThemedText } from '@/components/ThemedText';
import { useBiometric } from '@/contexts/BiometricContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

function LockOverlay({ onUnlock }: { onUnlock: () => void }) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const styles = createStyles(colors);

  useEffect(() => {
    onUnlock();
  }, [onUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') onUnlock();
    });
    return () => subscription.remove();
  }, [onUnlock]);

  return (
    <View style={styles.overlay}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={48} color="#fff" />
      </View>
      <ThemedText type="title" style={styles.title}>
        {t('biometric.lockedTitle')}
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        {t('biometric.lockedSubtitle')}
      </ThemedText>
      <Pressable style={styles.unlockButton} onPress={onUnlock}>
        <Ionicons name="finger-print" size={20} color="#fff" />
        <ThemedText style={styles.unlockButtonText}>
          {t('biometric.unlock')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function BiometricGate({ children }: { children: ReactNode }) {
  const { isEnabled, isLocked, unlock } = useBiometric();

  return (
    <View style={styles.root}>
      {children}
      {isEnabled && isLocked && <LockOverlay onUnlock={unlock} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
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
      marginBottom: 16,
    },
    unlockButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
    },
    unlockButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
  });
