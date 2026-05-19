import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBiometric } from '@/contexts/BiometricContext';
import {
  useLocalization,
  type SupportedLanguage,
} from '@/contexts/LocalizationContext';
import {
  useTheme,
  useThemeColors,
  type ThemeMode,
} from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import appConfig from '@/app.json';

const APP_VERSION = appConfig.expo.version;
const APP_BUILD =
  Platform.OS === 'ios'
    ? appConfig.expo.ios.buildNumber
    : String(appConfig.expo.android.versionCode);
const WEBSITE_URL = 'https://app.myteslamate.com';

export default function AboutScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage, changeLanguage, availableLanguages } =
    useLocalization();
  const { state: themeState, setThemeMode } = useTheme();
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    enable: enableBiometric,
    disable: disableBiometric,
  } = useBiometric();
  const styles = createStyles(colors);

  const features: { icon: any; label: string }[] = [
    { icon: 'cloud', label: t('about.featureFleet') },
    { icon: 'person', label: t('about.featureOwner') },
    { icon: 'lock-closed', label: t('about.featureSecure') },
    { icon: 'color-palette', label: t('about.featureTheme') },
    { icon: 'language', label: t('about.featureI18n') },
  ];

  const handleBiometricToggle = (value: boolean) => {
    if (value) enableBiometric();
    else disableBiometric();
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: t('home.themeLight'), icon: 'sunny' },
    { mode: 'dark', label: t('home.themeDark'), icon: 'moon' },
    { mode: 'auto', label: t('home.themeAuto'), icon: 'phone-portrait' },
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

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('biometric.sectionTitle')}
          </ThemedText>
          <View style={styles.settingRow}>
            <Ionicons
              name="finger-print"
              size={22}
              color={colors.primary}
            />
            <View style={styles.settingTextGroup}>
              <ThemedText style={styles.settingLabel}>
                {t('biometric.toggleLabel')}
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                {biometricAvailable
                  ? t('biometric.toggleDescription')
                  : t('biometric.unavailable')}
              </ThemedText>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              trackColor={{ false: colors.borderColor, true: colors.primary }}
            />
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
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

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
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
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingTextGroup: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 12,
      opacity: 0.6,
      marginTop: 2,
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
  });
