import { RegionSelector } from '@/components/RegionSelector';
import { StoredTokenCard } from '@/components/StoredTokenCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TokenFleetGenerator from '@/components/tokens/TokenFleetGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FleetScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region } = useRegion();
  const [isModalVisible, setIsModalVisible] = useState(false);

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

        <RegionSelector />

        <Pressable
          style={styles.generateButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="key" size={20} color="#fff" />
          <ThemedText style={styles.generateButtonText}>
            {t('home.generateButton')}
          </ThemedText>
        </Pressable>

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
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 18,
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
