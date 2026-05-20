import { RegionSelector } from '@/components/RegionSelector';
import { StoredTokenCard } from '@/components/StoredTokenCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TokenOwnerGenerator } from '@/components/tokens/TokenOwnerGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OwnerScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region } = useRegion();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { generate } = useLocalSearchParams<{ generate?: string }>();

  // Deep link: `mtm:///?generate=1` opens the Owner tab and auto-launches
  // the token generator modal. We clear the param right after so backing
  // out and re-entering this tab does not re-trigger the modal.
  useEffect(() => {
    if (generate === '1') {
      setIsModalVisible(true);
      router.setParams({ generate: undefined });
    }
  }, [generate]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <Ionicons name="person" size={48} color={colors.primary} />
          <ThemedText type="title" style={styles.title}>
            {t('home.ownerButtonTitle')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('home.ownerButtonDescription')}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actionCard}>
          <RegionSelector />
          <Pressable
            style={styles.generateButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="key" size={20} color="#fff" />
            <ThemedText style={styles.generateButtonText}>
              {t('home.generateButton', {
                type: t('home.typeOwner'),
                region: t(region === 'cn' ? 'home.regionCn' : 'home.regionIntl'),
              })}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <StoredTokenCard type="owner" />
      </ScrollView>

      <TokenOwnerGenerator
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        region={region}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: 16,
      gap: 16,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    title: {
      textAlign: 'center',
      marginTop: 8,
    },
    subtitle: {
      textAlign: 'center',
      opacity: 0.7,
      paddingHorizontal: 16,
    },
    actionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
    },
    generateButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
  });
