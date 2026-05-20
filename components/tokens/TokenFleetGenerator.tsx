import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useTokenStore } from '@/contexts/TokenStoreContext';
import { Region } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

// Hardcoded values — change these to match your registered Tesla application
const REDIRECT_URI = 'mtm://auth/callback/api';

const FORM_STORAGE_KEYS = {
  originUrl: 'fleet_form_origin_url',
  clientId: 'fleet_form_client_id',
  clientSecret: 'fleet_form_client_secret',
} as const;

// Extract the bare domain (hostname) from an origin URL entered by the user
const extractDomain = (url: string) =>
  url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

// Tesla's OAuth errors carry an error_description that's much more actionable
// than the OAuth2 error code alone (e.g. "unauthorized_client" vs "Client does
// not have the requested scopes enabled").
const formatOAuthError = (
  data: { error?: string; error_description?: string } | null | undefined,
  fallback: string
) => {
  if (!data) return fallback;
  if (data.error && data.error_description) {
    return `${data.error}: ${data.error_description}`;
  }
  return data.error_description || data.error || fallback;
};

const REGION_CONFIG = {
  intl: {
    tokenUrl: 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
    authorizeUrl:
      'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/authorize',
    audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
    partnerAccounts: [
      {
        id: 'register_na',
        labelKey: 'settings.tokens.fleetGenerator.step3.registerNA',
        url: 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts',
      },
      {
        id: 'register_eu',
        labelKey: 'settings.tokens.fleetGenerator.step3.registerEU',
        url: 'https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/partner_accounts',
      },
    ],
  },
  cn: {
    tokenUrl: 'https://auth.tesla.cn/oauth2/v3/token',
    authorizeUrl: 'https://auth.tesla.cn/oauth2/v3/authorize',
    audience: 'https://fleet-api.prd.cn.vn.cloud.tesla.cn',
    partnerAccounts: [
      {
        id: 'register_cn',
        labelKey: 'settings.tokens.fleetGenerator.step3.registerCN',
        url: 'https://fleet-api.prd.cn.vn.cloud.tesla.cn/api/1/partner_accounts',
      },
    ],
  },
} as const;

interface TokenFleetGeneratorProps {
  onClose?: () => void;
  region: Region;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface ProgressItem {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function TokenFleetGenerator({
  onClose,
  region,
}: TokenFleetGeneratorProps) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { saveTokens } = useTokenStore();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [originUrl, setOriginUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [finalTokens, setFinalTokens] = useState<{
    access_token?: string;
    refresh_token?: string;
  } | null>(null);
  const [authWebViewVisible, setAuthWebViewVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const handledRef = useRef(false);

  const config = useMemo(() => REGION_CONFIG[region], [region]);
  const styles = createStyles(colors);

  useEffect(() => {
    (async () => {
      try {
        const [savedOrigin, savedClientId, savedClientSecret] =
          await Promise.all([
            SecureStore.getItemAsync(FORM_STORAGE_KEYS.originUrl),
            SecureStore.getItemAsync(FORM_STORAGE_KEYS.clientId),
            SecureStore.getItemAsync(FORM_STORAGE_KEYS.clientSecret),
          ]);
        if (savedOrigin) setOriginUrl(savedOrigin);
        if (savedClientId) setClientId(savedClientId);
        if (savedClientSecret) setClientSecret(savedClientSecret);
      } catch (error) {
        console.error('Failed to load saved Fleet form values:', error);
      }
    })();
  }, []);

  const persistFormValue = async (
    key: (typeof FORM_STORAGE_KEYS)[keyof typeof FORM_STORAGE_KEYS],
    value: string
  ) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to persist ${key}:`, error);
    }
  };

  const processAuthCallback = useCallback(
    async (code: string) => {
      if (!clientId || !clientSecret) {
        Alert.alert(
          t('settings.tokens.fleetGenerator.alerts.error'),
          t('settings.tokens.fleetGenerator.alerts.missingAuth')
        );
        return;
      }

      try {
        setIsLoading(true);

        const response = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: REDIRECT_URI,
          }).toString(),
        });

        const tokenData = await response.json();

        if (!response.ok) {
          throw new Error(
            formatOAuthError(
              tokenData,
              t('settings.tokens.fleetGenerator.alerts.tokenError')
            )
          );
        }

        if (tokenData.access_token && tokenData.refresh_token) {
          setFinalTokens({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
          });
          setCurrentStep(5);
          await saveTokens('fleet', {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            region,
            createdAt: Date.now(),
          });
          Alert.alert(
            t('settings.tokens.fleetGenerator.alerts.success'),
            t('settings.tokens.fleetGenerator.alerts.tokensGenerated')
          );
        } else {
          throw new Error(
            t('settings.tokens.fleetGenerator.alerts.tokensNotReceived')
          );
        }
      } catch (error) {
        console.error('Callback processing failed:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : t('settings.tokens.fleetGenerator.alerts.unknownError');
        Alert.alert(
          t('settings.tokens.fleetGenerator.alerts.error'),
          errorMessage
        );
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, clientSecret, config, region, saveTokens, t]
  );

  const handleCallbackUrl = useCallback(
    async (callbackUrl: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      setAuthWebViewVisible(false);

      const parsed = new URL(callbackUrl.replace('mtm://', 'https://'));
      const code = parsed.searchParams.get('code');
      const error = parsed.searchParams.get('error');

      if (error) {
        Alert.alert(
          t('settings.tokens.fleetGenerator.alerts.teslaAuthError'),
          t('settings.tokens.fleetGenerator.alerts.authorizationError', {
            error,
          })
        );
        return;
      }

      if (code) {
        await processAuthCallback(code);
      }
    },
    [processAuthCallback, t]
  );

  // The mtm:// redirect URI cannot be loaded by WKWebView — capture it
  // from any of the load callbacks and de-duplicate with handledRef since the
  // auth code is single-use.
  const maybeHandleCallback = (url?: string | null) => {
    if (!url || handledRef.current) return false;
    if (url.startsWith(REDIRECT_URI)) {
      handleCallbackUrl(url);
      return true;
    }
    return false;
  };

  const handleShouldStartLoad = (request: { url: string }) =>
    !maybeHandleCallback(request.url);

  const handleNavStateChange = (navState: { url?: string }) => {
    maybeHandleCallback(navState.url);
  };

  const handleWebViewError = (event: { nativeEvent?: { url?: string } }) => {
    maybeHandleCallback(event.nativeEvent?.url);
  };

  useEffect(() => {
    // Fallback: if for any reason the redirect escapes the WebView and lands
    // back into the app via OS deep link, still process it.
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.includes(REDIRECT_URI)) {
        await handleCallbackUrl(event.url);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription?.remove();
  }, [handleCallbackUrl]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        t('settings.tokens.fleetGenerator.copyValue'),
        `${type}:\n\n${text}`
      );
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
      Alert.alert(
        t('settings.tokens.fleetGenerator.alerts.error'),
        `${t('settings.tokens.fleetGenerator.alerts.copyError')}\n\n${type}:\n\n${text}`
      );
    }
  };

  const executeApiRequests = async () => {
    if (!clientId || !clientSecret) {
      Alert.alert(
        t('settings.tokens.fleetGenerator.alerts.error'),
        t('settings.tokens.fleetGenerator.alerts.missingCredentials')
      );
      return;
    }

    setIsLoading(true);
    setCurrentStep(3);

    await Promise.all([
      persistFormValue(FORM_STORAGE_KEYS.clientId, clientId),
      persistFormValue(FORM_STORAGE_KEYS.clientSecret, clientSecret),
    ]);

    const progressItems: ProgressItem[] = [
      {
        id: 'partner_token',
        label: t('settings.tokens.fleetGenerator.step3.partnerToken'),
        status: 'pending',
      },
      ...config.partnerAccounts.map(pa => ({
        id: pa.id,
        label: t(pa.labelKey),
        status: 'pending' as const,
      })),
    ];

    setProgress(progressItems);

    try {
      setProgress(prev =>
        prev.map(p =>
          p.id === 'partner_token' ? { ...p, status: 'loading' } : p
        )
      );

      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope:
            'openid vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds energy_device_data energy_cmds',
          audience: config.audience,
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(
          formatOAuthError(
            tokenData,
            t('settings.tokens.fleetGenerator.alerts.tokenError')
          )
        );
      }

      setProgress(prev =>
        prev.map(p =>
          p.id === 'partner_token' ? { ...p, status: 'success' } : p
        )
      );

      for (const pa of config.partnerAccounts) {
        setProgress(prev =>
          prev.map(p => (p.id === pa.id ? { ...p, status: 'loading' } : p))
        );

        const response = await fetch(pa.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          body: JSON.stringify({
            domain: extractDomain(originUrl),
          }),
        });

        const data = await response.json();

        if (!response.ok && data.error && !data.error.includes('already')) {
          throw new Error(
            `${pa.id}: ${formatOAuthError(data, data.error)}`
          );
        }

        setProgress(prev =>
          prev.map(p => (p.id === pa.id ? { ...p, status: 'success' } : p))
        );
      }

      setCurrentStep(4);
    } catch (error) {
      console.error('API request failed:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('settings.tokens.fleetGenerator.alerts.unknownError');

      setProgress(prev =>
        prev.map(p =>
          p.status === 'loading'
            ? { ...p, status: 'error', error: errorMessage }
            : p
        )
      );

      Alert.alert(
        t('settings.tokens.fleetGenerator.alerts.error'),
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openTeslaAuth = () => {
    const redirectUri = encodeURIComponent(REDIRECT_URI);
    const scope = encodeURIComponent(
      'openid offline_access user_data vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds energy_device_data energy_cmds'
    );

    const url = `${config.authorizeUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&prompt=login&state=${clientId}`;

    handledRef.current = false;
    setAuthUrl(url);
    setAuthWebViewVisible(true);
  };

  const renderStep1 = () => (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="list" size={20} color={colors.text} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.tokens.fleetGenerator.step1.title')}
        </ThemedText>
      </View>
      <ThemedText style={styles.instruction}>
        {t('settings.tokens.fleetGenerator.step1.instruction')}
      </ThemedText>
      <Pressable
        style={styles.linkButton}
        onPress={() => Linking.openURL('https://developer.tesla.com')}
      >
        <Ionicons name="open-outline" size={18} color={colors.primary} />
        <ThemedText style={styles.linkButtonText}>
          {t('settings.tokens.fleetGenerator.step1.openDeveloperPortal')}
        </ThemedText>
      </Pressable>
      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>
          {t('settings.tokens.fleetGenerator.step1.allowedOriginUrl')}
        </ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={t(
            'settings.tokens.fleetGenerator.step1.allowedOriginUrlPlaceholder'
          )}
          placeholderTextColor={colors.text + '80'}
          value={originUrl}
          onChangeText={setOriginUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>
      <View style={styles.copyableField}>
        <ThemedText style={styles.label}>
          {t('settings.tokens.fleetGenerator.step1.allowedRedirectUri')}
        </ThemedText>
        <View style={styles.copyContainer}>
          <ThemedText style={styles.copyableText}>{REDIRECT_URI}</ThemedText>
          <Pressable
            style={styles.copyButton}
            onPress={() => copyToClipboard(REDIRECT_URI, 'Redirect URI')}
          >
            <Ionicons name="clipboard" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.buttonRow}>
        <Pressable style={styles.backButton} onPress={onClose}>
          <ThemedText style={styles.backButtonText}>
            {t('settings.tokens.fleetGenerator.step1.backButton')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.nextButton,
            !originUrl.trim() && styles.disabledButton,
          ]}
          onPress={() => {
            persistFormValue(FORM_STORAGE_KEYS.originUrl, originUrl.trim());
            setCurrentStep(2);
          }}
          disabled={!originUrl.trim()}
        >
          <ThemedText style={styles.nextButtonText}>
            {t('settings.tokens.fleetGenerator.step1.nextButton')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );

  const renderStep2 = () => (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="key" size={20} color={colors.text} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.tokens.fleetGenerator.step2.title')}
        </ThemedText>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>
          {t('settings.tokens.fleetGenerator.step2.clientId')}
        </ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={t(
            'settings.tokens.fleetGenerator.step2.clientIdPlaceholder'
          )}
          placeholderTextColor={colors.text + '80'}
          value={clientId}
          onChangeText={setClientId}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>
          {t('settings.tokens.fleetGenerator.step2.clientSecret')}
        </ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={t(
            'settings.tokens.fleetGenerator.step2.clientSecretPlaceholder'
          )}
          placeholderTextColor={colors.text + '80'}
          value={clientSecret}
          onChangeText={setClientSecret}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.backButton} onPress={() => setCurrentStep(1)}>
          <ThemedText style={styles.backButtonText}>
            {t('settings.tokens.fleetGenerator.step2.backButton')}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.nextButton,
            (!clientId || !clientSecret) && styles.disabledButton,
          ]}
          onPress={executeApiRequests}
          disabled={!clientId || !clientSecret}
        >
          <ThemedText style={styles.nextButtonText}>
            {t('settings.tokens.fleetGenerator.step2.nextButton')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );

  const renderStep3 = () => (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="cog" size={20} color={colors.text} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.tokens.fleetGenerator.step3.title')}
        </ThemedText>
      </View>
      {progress.map(item => (
        <View key={item.id} style={styles.progressItem}>
          <View style={styles.progressIcon}>
            {item.status === 'loading' && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
            {item.status === 'success' && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.primary}
              />
            )}
            {item.status === 'error' && (
              <Ionicons name="close-circle" size={24} color={colors.danger} />
            )}
            {item.status === 'pending' && (
              <Ionicons
                name="time"
                size={24}
                color={colors.text}
                style={{ opacity: 0.5 }}
              />
            )}
          </View>
          <View style={styles.progressContent}>
            <ThemedText style={styles.progressLabel}>{item.label}</ThemedText>
            {item.error && (
              <ThemedText style={styles.progressError}>{item.error}</ThemedText>
            )}
          </View>
        </View>
      ))}
      <View style={styles.buttonRow}>
        <Pressable style={styles.backButton} onPress={() => setCurrentStep(2)}>
          <ThemedText style={styles.backButtonText}>
            {t('settings.tokens.fleetGenerator.step3.backButton')}
          </ThemedText>
        </Pressable>
        {!isLoading && progress.every(p => p.status === 'success') && (
          <Pressable style={styles.nextButton} onPress={openTeslaAuth}>
            <ThemedText style={styles.nextButtonText}>
              {t('settings.tokens.fleetGenerator.step3.nextButton')}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );

  const renderStep4 = () => (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="lock-closed" size={20} color={colors.text} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.tokens.fleetGenerator.step4.title')}
        </ThemedText>
      </View>
      <ThemedText style={styles.instruction}>
        {t('settings.tokens.fleetGenerator.step4.instruction')}
      </ThemedText>
      <View style={styles.buttonRow}>
        <Pressable style={styles.backButton} onPress={() => setCurrentStep(3)}>
          <ThemedText style={styles.backButtonText}>
            {t('settings.tokens.fleetGenerator.step4.backButton')}
          </ThemedText>
        </Pressable>
        <Pressable style={styles.teslaAuthButton} onPress={openTeslaAuth}>
          <Ionicons
            name="car-sport"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <ThemedText style={styles.teslaAuthButtonText}>
            {t('settings.tokens.fleetGenerator.step4.authorizeButton')}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText style={styles.waitingText}>
      </ThemedText>
    </ThemedView>
  );

  const renderStep5 = () => (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('settings.tokens.fleetGenerator.step5.title')}
        </ThemedText>
      </View>
      {finalTokens && (
        <>
          <View style={styles.tokenGroup}>
            <ThemedText style={styles.label}>
              {t('settings.tokens.fleetGenerator.step5.accessToken')}
            </ThemedText>
            <View style={styles.tokenContainer}>
              <ThemedText style={styles.tokenText} numberOfLines={2}>
                {finalTokens.access_token}
              </ThemedText>
              <Pressable
                style={styles.copyButton}
                onPress={() =>
                  copyToClipboard(finalTokens.access_token!, 'Access Token')
                }
              >
                <Ionicons name="clipboard" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.tokenGroup}>
            <ThemedText style={styles.label}>
              {t('settings.tokens.fleetGenerator.step5.refreshToken')}
            </ThemedText>
            <View style={styles.tokenContainer}>
              <ThemedText style={styles.tokenText} numberOfLines={2}>
                {finalTokens.refresh_token}
              </ThemedText>
              <Pressable
                style={styles.copyButton}
                onPress={() =>
                  copyToClipboard(finalTokens.refresh_token!, 'Refresh Token')
                }
              >
                <Ionicons name="clipboard" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </>
      )}
      <View style={styles.buttonRow}>
        <Pressable style={styles.backButton} onPress={() => setCurrentStep(4)}>
          <ThemedText style={styles.backButtonText}>
            {t('settings.tokens.fleetGenerator.step5.backButton')}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText style={styles.instruction}>
        {t('settings.tokens.fleetGenerator.step5.instruction')}
      </ThemedText>
    </ThemedView>
  );

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">
          {t('settings.tokens.fleetGenerator.title')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('settings.tokens.fleetGenerator.subtitle')}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepIndicator}>
        {[1, 2, 3, 4, 5].map(step => (
          <View
            key={step}
            style={[
              styles.stepDot,
              currentStep >= step && styles.stepDotActive,
            ]}
          >
            <ThemedText
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {step}
            </ThemedText>
          </View>
        ))}
      </ThemedView>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
      {currentStep === 5 && renderStep5()}

      {onClose && (
        <Pressable style={styles.closeButton} onPress={onClose}>
          <ThemedText style={styles.closeButtonText}>
            {t('settings.tokens.fleetGenerator.closeButton')}
          </ThemedText>
        </Pressable>
      )}

      <Modal
        visible={authWebViewVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAuthWebViewVisible(false)}
        presentationStyle="pageSheet"
      >
        <ThemedView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Ionicons name="car-sport" size={24} color={colors.primary} />
            <ThemedText type="title" style={styles.modalTitle}>
              {t('settings.tokens.fleetGenerator.step4.title')}
            </ThemedText>
          </View>
          {authUrl ? (
            <WebView
              source={{ uri: authUrl }}
              originWhitelist={['https://*', 'mtm://*']}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavStateChange}
              onError={handleWebViewError}
              startInLoadingState
              style={styles.webview}
            />
          ) : null}
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setAuthWebViewVisible(false)}
          >
            <ThemedText style={styles.closeButtonText}>
              {t('settings.tokens.fleetGenerator.closeButton')}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    header: {
      marginBottom: 24,
      alignItems: 'center',
    },
    subtitle: {
      marginTop: 8,
      opacity: 0.7,
      textAlign: 'center',
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    stepDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.borderColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepDotActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stepNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      opacity: 0.5,
    },
    stepNumberActive: {
      color: '#fff',
      opacity: 1,
    },
    section: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      marginBottom: 0,
    },
    copyableField: {
      marginBottom: 16,
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      marginBottom: 16,
    },
    linkButtonText: {
      color: colors.primary,
      fontWeight: '600',
    },
    copyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    copyableText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 14,
      opacity: 0.9,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 8,
      fontWeight: '600',
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    backButton: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    backButtonText: {
      fontWeight: '500',
      color: colors.text,
    },
    nextButton: {
      flex: 2,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    nextButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    disabledButton: {
      backgroundColor: colors.borderColor,
      opacity: 0.5,
    },
    teslaAuthButton: {
      flex: 2,
      flexDirection: 'row',
      backgroundColor: '#E31E3E',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teslaAuthButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    progressItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      gap: 12,
    },
    progressIcon: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressContent: {
      flex: 1,
    },
    progressLabel: {
      fontWeight: '500',
    },
    progressError: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 4,
    },
    tokenGroup: {
      marginBottom: 16,
    },
    tokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    tokenText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 12,
      opacity: 0.8,
    },
    copyButton: {
      backgroundColor: colors.primary + '20',
      borderRadius: 8,
      padding: 8,
      minWidth: 40,
      alignItems: 'center',
    },
    instruction: {
      fontSize: 14,
      opacity: 0.8,
      lineHeight: 20,
      marginBottom: 16,
    },
    waitingText: {
      textAlign: 'center',
      fontStyle: 'italic',
      opacity: 0.7,
      marginTop: 16,
    },
    closeButton: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 32,
    },
    closeButtonText: {
      fontWeight: '500',
    },
    modalContainer: {
      flex: 1,
      paddingTop: 32,
      paddingHorizontal: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      gap: 8,
    },
    modalTitle: {
      textAlign: 'center',
    },
    webview: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    modalCloseButton: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 32,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
  });
