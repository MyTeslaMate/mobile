import { RegionSelector } from '@/components/RegionSelector';
import { StoredTokenCard } from '@/components/StoredTokenCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TokenFleetGenerator from '@/components/tokens/TokenFleetGenerator';
import { TokenOwnerGenerator } from '@/components/tokens/TokenOwnerGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ApiTokensScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region } = useRegion();

  const [ownerModalVisible, setOwnerModalVisible] = useState(false);
  const [fleetModalVisible, setFleetModalVisible] = useState(false);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: t('settings.apiTokens.title') }} />

      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.actionCard}>
          <RegionSelector />
        </ThemedView>

        <ThemedView style={styles.actionCard}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            {t('settings.apiTokens.ownerSection')}
          </ThemedText>
          <Pressable
            style={styles.generateButton}
            onPress={() => setOwnerModalVisible(true)}
          >
            <Ionicons name="person" size={20} color="#fff" />
            <ThemedText style={styles.generateButtonText}>
              {t('settings.apiTokens.generateOwner')}
            </ThemedText>
          </Pressable>
          <StoredTokenCard type="owner" />
        </ThemedView>

        <ThemedView style={styles.actionCard}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            {t('settings.apiTokens.fleetSection')}
          </ThemedText>
          <Pressable
            style={styles.generateButton}
            onPress={() => setFleetModalVisible(true)}
          >
            <Ionicons name="cloud" size={20} color="#fff" />
            <ThemedText style={styles.generateButtonText}>
              {t('settings.apiTokens.generateFleet')}
            </ThemedText>
          </Pressable>
          <StoredTokenCard type="fleet" />
        </ThemedView>
      </ScrollView>

      <TokenOwnerGenerator
        visible={ownerModalVisible}
        onClose={() => setOwnerModalVisible(false)}
        region={region}
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={fleetModalVisible}
        onRequestClose={() => setFleetModalVisible(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <TokenFleetGenerator
            onClose={() => setFleetModalVisible(false)}
            region={region}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 16, gap: 16 },
    actionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    cardTitle: { fontSize: 16 },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
    },
    generateButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    modalContainer: { flex: 1 },
  });
