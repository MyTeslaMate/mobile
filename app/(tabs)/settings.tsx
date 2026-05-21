import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBiometric } from '@/contexts/BiometricContext';
import {
  useLocalization,
  type SupportedLanguage,
} from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import {
  useTheme,
  useThemeColors,
  type ThemeMode,
} from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_VERSION =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
const APP_BUILD = Application.nativeBuildVersion ?? '';
const WEBSITE_URL = 'https://app.myteslamate.com';
const SOURCE_URL = 'https://github.com/MyTeslaMate/tesla-tokens-generator';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage, changeLanguage, availableLanguages } =
    useLocalization();
  const { state: themeState, setThemeMode } = useTheme();
  const { session, signOut } = useTeslaMateApi();
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    enable: enableBiometric,
    disable: disableBiometric,
  } = useBiometric();
  const styles = createStyles(colors);

  const features: { icon: any; label: string }[] = [
    { icon: 'car-sport', label: t('about.featureNow') },
    { icon: 'map', label: t('about.featureDrives') },
    { icon: 'flash', label: t('about.featureCharges') },
    { icon: 'lock-closed', label: t('about.featureSecure') },
    { icon: 'color-palette', label: t('about.featureTheme') },
  ];

  const themeOptions: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: t('home.themeLight'), icon: 'sunny' },
    { mode: 'dark', label: t('home.themeDark'), icon: 'moon' },
    { mode: 'auto', label: t('home.themeAuto'), icon: 'phone-portrait' },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.replace('/onboarding');
  };

  const handleReconnect = () => {
    router.push('/onboarding');
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.appIcon}
          />
          <ThemedText type="title" style={styles.title}>
            {t('about.title')}
          </ThemedText>
          <ThemedText style={styles.version}>
            {t('about.version', { version: APP_VERSION, build: APP_BUILD })}
            {' · © 2026 Tesflow'}
          </ThemedText>
        </ThemedView>

        {session && (
          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('settings.account.title')}
            </ThemedText>
            <View style={styles.settingRow}>
              <Ionicons name="person-circle" size={24} color={colors.primary} />
              <View style={styles.settingTextGroup}>
                <ThemedText style={styles.settingLabel}>
                  {session.name || session.email}
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('settings.account.signedInAs', { email: session.email })}
                </ThemedText>
              </View>
            </View>
            <Pressable style={styles.linkRow} onPress={handleReconnect}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <ThemedText style={styles.linkLabel}>
                {t('settings.account.reconnect')}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={handleSignOut}>
              <Ionicons name="log-out" size={20} color={colors.primary} />
              <ThemedText style={styles.linkLabel}>
                {t('settings.account.signOut')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('about.descriptionTitle')}
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            {t('about.description')}
          </ThemedText>

          <Pressable
            style={styles.linkRow}
            onPress={() => Linking.openURL(SOURCE_URL)}
          >
            <Ionicons name="logo-github" size={20} color={colors.primary} />
            <ThemedText style={styles.linkLabel}>Source code</ThemedText>
            <Ionicons
              name="open-outline"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
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

          <View style={styles.divider} />

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('about.featuresTitle')}
          </ThemedText>
          {features.map((feature) => (
            <View key={feature.label} style={styles.featureRow}>
              <Ionicons name={feature.icon} size={20} color={colors.primary} />
              <ThemedText style={styles.featureLabel}>
                {feature.label}
              </ThemedText>
            </View>
          ))}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('biometric.sectionTitle')}
          </ThemedText>
          <View style={styles.settingRow}>
            <Ionicons name="finger-print" size={22} color={colors.primary} />
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
              onValueChange={(v) => (v ? enableBiometric() : disableBiometric())}
              disabled={!biometricAvailable}
              trackColor={{ false: colors.borderColor, true: colors.primary }}
            />
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('home.themeSectionTitle')}
          </ThemedText>
          <View style={styles.segmentedRow}>
            {themeOptions.map((option) => {
              const isSelected = themeState.mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  style={[
                    styles.segmentedButton,
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
          <View style={styles.languageGrid}>
            {availableLanguages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.languageButton,
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
                    numberOfLines={1}
                  >
                    {lang.flag} {lang.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {t('settings.advanced.title')}
          </ThemedText>
          <Pressable
            style={styles.linkRow}
            onPress={() => router.push('/settings/tokens')}
          >
            <Ionicons name="key" size={20} color={colors.primary} />
            <View style={styles.settingTextGroup}>
              <ThemedText style={styles.settingLabel}>
                {t('settings.advanced.apiTokens')}
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                {t('settings.advanced.apiTokensDescription')}
              </ThemedText>
            </View>
            <Ionicons
              name="chevron-forward"
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
    safeArea: { flex: 1 },
    container: { padding: 16, gap: 16 },
    header: { alignItems: 'center', paddingVertical: 24, gap: 6 },
    appIcon: { width: 88, height: 88, borderRadius: 20, marginBottom: 8 },
    title: { textAlign: 'center', fontSize: 26 },
    version: { opacity: 0.6, fontSize: 14 },
    section: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    sectionTitle: { marginBottom: 4 },
    paragraph: { fontSize: 14, lineHeight: 21, opacity: 0.8 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureLabel: { flex: 1, fontSize: 14 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    linkLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderColor,
      marginVertical: 4,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingTextGroup: { flex: 1 },
    settingLabel: { fontSize: 14, fontWeight: '500' },
    settingDescription: { fontSize: 12, opacity: 0.6, marginTop: 2 },
    segmentedRow: { flexDirection: 'row', gap: 8 },
    segmentedButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    languageButton: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionLabel: { fontSize: 14, fontWeight: '500' },
    optionLabelSelected: { color: '#fff' },
  });
