import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_VERSION = '1.0.0';
const APP_BUILD = '1';
const WEBSITE_URL = 'https://app.myteslamate.com';

export default function AboutScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const styles = createStyles(colors);

  const features: { icon: any; label: string }[] = [
    { icon: 'cloud', label: t('about.featureFleet') },
    { icon: 'person', label: t('about.featureOwner') },
    { icon: 'color-palette', label: t('about.featureTheme') },
    { icon: 'language', label: t('about.featureI18n') },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <View style={styles.appIcon}>
            <Ionicons name="key" size={48} color="#fff" />
          </View>
          <ThemedText type="title" style={styles.title}>
            {t('about.title')}
          </ThemedText>
          <ThemedText style={styles.version}>
            {t('about.version', { version: APP_VERSION, build: APP_BUILD })}
          </ThemedText>
          <ThemedText style={styles.copyright}>
            {t('about.copyright')}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('about.descriptionTitle')}
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            {t('about.description')}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('about.featuresTitle')}
          </ThemedText>
          {features.map(feature => (
            <View key={feature.label} style={styles.featureRow}>
              <Ionicons
                name={feature.icon}
                size={20}
                color={colors.primary}
              />
              <ThemedText style={styles.featureLabel}>
                {feature.label}
              </ThemedText>
            </View>
          ))}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('about.linksTitle')}
          </ThemedText>
          <Pressable
            style={styles.linkRow}
            onPress={() => Linking.openURL(WEBSITE_URL)}
          >
            <Ionicons name="globe" size={20} color={colors.primary} />
            <ThemedText style={styles.linkLabel}>
              {t('about.website')}
            </ThemedText>
            <Ionicons
              name="open-outline"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </ThemedView>
      </ScrollView>
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
      gap: 6,
    },
    appIcon: {
      width: 88,
      height: 88,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      textAlign: 'center',
      fontSize: 26,
    },
    version: {
      opacity: 0.6,
      fontSize: 14,
    },
    copyright: {
      opacity: 0.6,
      fontSize: 13,
    },
    section: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      marginBottom: 4,
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 21,
      opacity: 0.8,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    featureLabel: {
      flex: 1,
      fontSize: 14,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    linkLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
  });
