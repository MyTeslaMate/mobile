import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TokenFleetGenerator from '@/components/tokens/TokenFleetGenerator';
import { TokenOwnerGenerator } from '@/components/tokens/TokenOwnerGenerator';
import {
  useLocalization,
  type SupportedLanguage,
} from '@/contexts/LocalizationContext';
import { useTheme, useThemeColors, type ThemeMode } from '@/contexts/ThemeContext';
import { useRegion, type Region } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage, changeLanguage, availableLanguages } =
    useLocalization();
  const { state: themeState, setThemeMode } = useTheme();
  const { region, setRegion } = useRegion();

  const [isFleetModalVisible, setIsFleetModalVisible] = useState(false);
  const [isOwnerModalVisible, setIsOwnerModalVisible] = useState(false);

  const styles = createStyles(colors);

  const themeOptions: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: t('home.themeLight'), icon: 'sunny' },
    { mode: 'dark', label: t('home.themeDark'), icon: 'moon' },
    { mode: 'auto', label: t('home.themeAuto'), icon: 'phone-portrait' },
  ];

  const regionOptions: { value: Region; label: string; flag: string }[] = [
    { value: 'intl', label: t('home.regionIntl'), flag: '🌍' },
    { value: 'cn', label: t('home.regionCn'), flag: '🇨🇳' },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <Ionicons name="key" size={48} color={colors.primary} />
          <ThemedText type="title" style={styles.title}>
            {t('home.title')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>{t('home.subtitle')}</ThemedText>
        </ThemedView>

        <Pressable
          style={styles.generatorCard}
          onPress={() => setIsFleetModalVisible(true)}
        >
          <View style={styles.cardIcon}>
            <Ionicons name="cloud" size={32} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              {t('home.fleetButtonTitle')}
            </ThemedText>
            <ThemedText style={styles.cardDescription}>
              {t('home.fleetButtonDescription')}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>

        <Pressable
          style={styles.generatorCard}
          onPress={() => setIsOwnerModalVisible(true)}
        >
          <View style={styles.cardIcon}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              {t('home.ownerButtonTitle')}
            </ThemedText>
            <ThemedText style={styles.cardDescription}>
              {t('home.ownerButtonDescription')}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>

        <ThemedView style={styles.settingsSection}>
          <ThemedText type="defaultSemiBold" style={styles.settingsTitle}>
            {t('home.regionSectionTitle')}
          </ThemedText>
          <View style={styles.optionRow}>
            {regionOptions.map(option => {
              const isSelected = region === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => setRegion(option.value)}
                >
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.flag} {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        <ThemedView style={styles.settingsSection}>
          <ThemedText type="defaultSemiBold" style={styles.settingsTitle}>
            {t('home.themeSectionTitle')}
          </ThemedText>
          <View style={styles.optionRow}>
            {themeOptions.map(option => {
              const isSelected = themeState.mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => setThemeMode(option.mode)}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={isSelected ? '#fff' : colors.text}
                  />
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        <ThemedView style={styles.settingsSection}>
          <ThemedText type="defaultSemiBold" style={styles.settingsTitle}>
            {t('home.languageSectionTitle')}
          </ThemedText>
          <View style={styles.optionRow}>
            {availableLanguages.map(lang => {
              const isSelected = currentLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    changeLanguage(lang.code as SupportedLanguage)
                  }
                >
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {lang.flag} {lang.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isFleetModalVisible}
        onRequestClose={() => setIsFleetModalVisible(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <TokenFleetGenerator
            onClose={() => setIsFleetModalVisible(false)}
            region={region}
          />
        </SafeAreaView>
      </Modal>

      <TokenOwnerGenerator
        visible={isOwnerModalVisible}
        onClose={() => setIsOwnerModalVisible(false)}
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
    generatorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: 13,
      opacity: 0.7,
      lineHeight: 18,
    },
    settingsSection: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    settingsTitle: {
      marginBottom: 4,
    },
    optionRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    optionLabelSelected: {
      color: '#fff',
    },
    modalContainer: {
      flex: 1,
    },
  });
