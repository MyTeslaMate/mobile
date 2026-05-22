import { RegionSelector } from '@/components/RegionSelector';
import { StoredTokenCard } from '@/components/StoredTokenCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TokenOwnerGenerator } from '@/components/tokens/TokenOwnerGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OwnerTokenScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region } = useRegion();
  const [modalVisible, setModalVisible] = useState(false);
  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: t('settings.apiTokens.ownerSection') }} />

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
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="person" size={20} color="#fff" />
            <ThemedText style={styles.generateButtonText}>
              {t('settings.apiTokens.generateOwner')}
            </ThemedText>
          </Pressable>
          <StoredTokenCard type="owner" />
        </ThemedView>
      </ScrollView>

      <TokenOwnerGenerator
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        region={region}
      />
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
  });
