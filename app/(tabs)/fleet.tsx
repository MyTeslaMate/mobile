import { RegionSelector } from '@/components/RegionSelector';
import { StoredTokenCard } from '@/components/StoredTokenCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TokenFleetGenerator from '@/components/tokens/TokenFleetGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FleetScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region } = useRegion();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [initialOriginUrl, setInitialOriginUrl] = useState<string | undefined>(
    undefined
  );
  const { origin, generate } = useLocalSearchParams<{
    origin?: string;
    generate?: string;
  }>();

  // Deep link: `mtm://fleet?origin=<url>` (or `?generate=1`) opens the Fleet
  // tab and auto-launches the token generator pre-filled with `origin`.
  // We clear the params right after so revisiting the tab does not re-trigger.
  useEffect(() => {
    if (origin || generate === '1') {
      if (origin) setInitialOriginUrl(origin);
      setIsModalVisible(true);
      router.setParams({ origin: undefined, generate: undefined });
    }
  }, [origin, generate]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <Ionicons name="cloud" size={48} color={colors.primary} />
          <ThemedText type="title" style={styles.title}>
            {t('home.fleetButtonTitle')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('home.fleetButtonDescription')}
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
                type: t('home.typeFleet'),
                region: t(region === 'cn' ? 'home.regionCn' : 'home.regionIntl'),
              })}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <StoredTokenCard type="fleet" />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <TokenFleetGenerator
            onClose={() => setIsModalVisible(false)}
            region={region}
            initialOriginUrl={initialOriginUrl}
          />
        </SafeAreaView>
      </Modal>
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
    modalContainer: {
      flex: 1,
    },
  });
