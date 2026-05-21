import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TeslaMateConnectModal } from '@/components/tokens/TeslaMateConnectModal';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useTokenStore } from '@/contexts/TokenStoreContext';
import { Region } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { sha256 } from 'js-sha256';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { WebView } from 'react-native-webview';

const OWNER_REDIRECT_URI = 'tesla://auth/callback';

const REGION_CONFIG = {
  intl: {
    authorizeUrl: 'https://auth.tesla.com/oauth2/v3/authorize',
    tokenUrl: 'https://auth.tesla.com/oauth2/v3/token',
    redirectUri: OWNER_REDIRECT_URI,
  },
  cn: {
    authorizeUrl: 'https://auth.tesla.cn/oauth2/v3/authorize',
    tokenUrl: 'https://auth.tesla.cn/oauth2/v3/token',
    redirectUri: OWNER_REDIRECT_URI,
  },
} as const;

interface TokenOwnerGeneratorProps {
  visible: boolean;
  onClose: () => void;
  region: Region;
  onSuccess?: (tokens: { accessToken: string; refreshToken: string }) => void;
}

function base64UrlEncode(str: string) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlEncodeFromHex(hex: string) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function generateRandomString(length: number) {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}
function sha256Challenge(verifier: string): string {
  const hashHex = sha256(verifier);
  return base64UrlEncodeFromHex(hashHex);
}

export function TokenOwnerGenerator({
  visible,
  onClose,
  region,
  onSuccess,
}: TokenOwnerGeneratorProps) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { saveTokens } = useTokenStore();
  const webviewRef = useRef(null);
  const config = useMemo(() => REGION_CONFIG[region], [region]);
  const [tokens, setTokens] = useState<{
    access_token?: string;
    refresh_token?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [webviewVisible, setWebviewVisible] = useState(true);
  const [useInTeslaMate, setUseInTeslaMate] = useState(false);
  const [authParams, setAuthParams] = useState<{
    code_verifier: string;
    code_challenge: string;
    state: string;
  } | null>(null);
  const handledRef = useRef(false);

  React.useEffect(() => {
    if (visible) {
      const code_verifier = generateRandomString(86);
      const code_challenge = sha256Challenge(code_verifier);
      const state = base64UrlEncode(generateRandomString(12));
      setAuthParams({ code_verifier, code_challenge, state });
      setWebviewVisible(true);
      setTokens(null);
      setUseInTeslaMate(false);
      handledRef.current = false;
    }
  }, [visible]);

  const getOwnerAuthUrl = () => {
    if (!authParams) return '';
    const params = {
      client_id: 'ownerapi',
      code_challenge: authParams.code_challenge,
      code_challenge_method: 'S256',
      prompt: 'login',
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email offline_access',
      state: authParams.state,
    };
    return (
      `${config.authorizeUrl}?` +
      Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
    );
  };

  const handleCallback = async (callbackUrl: string) => {
    setWebviewVisible(false);
    try {
      const urlObj = new URL(callbackUrl.replace('tesla://', 'https://x/'));
      const code = urlObj.searchParams.get('code');
      if (!code || !authParams) {
        Alert.alert(
          t('settings.tokens.ownerGenerator.alerts.error'),
          t('settings.tokens.ownerGenerator.alerts.missingCode')
        );
        if (typeof onClose === 'function') onClose();
        return;
      }
      setLoading(true);
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: 'ownerapi',
          code: code,
          redirect_uri: config.redirectUri,
          code_verifier: authParams.code_verifier,
        }).toString(),
      });
      const tokenData = await response.json();
      if (!response.ok) {
        throw new Error(
          tokenData.error ||
            t('settings.tokens.ownerGenerator.alerts.tokenError')
        );
      }
      setTokens({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });
      if (tokenData.access_token && tokenData.refresh_token) {
        await saveTokens('owner', {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          region,
          createdAt: Date.now(),
        });
        onSuccess?.({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        });
      }
    } catch (err) {
      Alert.alert(
        t('settings.tokens.ownerGenerator.alerts.error'),
        err instanceof Error
          ? err.message
          : t('settings.tokens.ownerGenerator.alerts.unknownError')
      );
      if (typeof onClose === 'function') onClose();
    } finally {
      setLoading(false);
    }
  };

  // The tesla:// redirect URI cannot be loaded by WKWebView. Depending on how
  // Tesla performs the final redirect (JS navigation, 302, scheme failure) it
  // surfaces through different WebView callbacks — so we listen to all of them
  // and de-duplicate with handledRef since the auth code is single-use.
  const maybeHandleCallback = (url?: string | null) => {
    if (!url || handledRef.current) return false;
    if (url.startsWith(OWNER_REDIRECT_URI)) {
      handledRef.current = true;
      handleCallback(url);
      return true;
    }
    return false;
  };

  const handleShouldStartLoad = (request: { url: string }) =>
    !maybeHandleCallback(request.url);

  const handleNavStateChange = (navState: { url?: string }) => {
    maybeHandleCallback(navState.url);
  };

  const handleWebViewError = (event: {
    nativeEvent?: { url?: string };
  }) => {
    // WKWebView raises an error when it cannot open tesla://, but the failing
    // URL still carries the OAuth ?code= — recover it here.
    maybeHandleCallback(event.nativeEvent?.url);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        t('settings.tokens.ownerGenerator.copyValue'),
        `${type}:\n\n${text}`
      );
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
      Alert.alert(
        t('settings.tokens.ownerGenerator.alerts.error'),
        `${t('settings.tokens.ownerGenerator.alerts.copyError')}\n\n${type}:\n\n${text}`
      );
    }
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Ionicons
            name="key"
            size={24}
            color={colors.primary}
            style={styles.headerIcon}
          />
          <ThemedText type="title" style={styles.title}>
            {t('settings.tokens.ownerGenerator.title')}
          </ThemedText>
        </View>
        {webviewVisible && !authParams && (
          <ThemedText style={{ textAlign: 'center', marginTop: 32 }}>
            {t('settings.tokens.ownerGenerator.preparing')}
          </ThemedText>
        )}
        {webviewVisible && authParams && (
          <>
            <WebView
              ref={webviewRef}
              source={{ uri: getOwnerAuthUrl() }}
              originWhitelist={['https://*', 'tesla://*']}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavStateChange}
              onError={handleWebViewError}
              startInLoadingState
              style={styles.webview}
            />
            <Pressable style={styles.closeButton} onPress={onClose}>
              <ThemedText style={styles.closeButtonText}>
                {t('settings.tokens.ownerGenerator.closeButton')}
              </ThemedText>
            </Pressable>
          </>
        )}
        {!webviewVisible && loading && (
          <ThemedText style={{ textAlign: 'center', marginTop: 32 }}>
            {t('settings.tokens.ownerGenerator.retrievingTokens')}
          </ThemedText>
        )}
        {!webviewVisible && tokens && (
          <>
            <View style={styles.successHeader}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.primary}
                style={styles.headerIcon}
              />
              <ThemedText
                type="subtitle"
                style={{ marginTop: 32, marginBottom: 16, textAlign: 'center' }}
              >
                {t('settings.tokens.ownerGenerator.successTitle')}
              </ThemedText>
            </View>
            <ThemedView style={styles.tokenGroup}>
              <ThemedText style={styles.label}>
                {t('settings.tokens.ownerGenerator.accessToken')}
              </ThemedText>
              <ThemedView style={styles.tokenContainer}>
                <ThemedText style={styles.tokenText} numberOfLines={2}>
                  {tokens.access_token}
                </ThemedText>
                <Pressable
                  style={styles.copyButton}
                  onPress={() =>
                    copyToClipboard(tokens.access_token!, 'Access Token')
                  }
                >
                  <Ionicons name="clipboard" size={20} color={colors.primary} />
                </Pressable>
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.tokenGroup}>
              <ThemedText style={styles.label}>
                {t('settings.tokens.ownerGenerator.refreshToken')}
              </ThemedText>
              <ThemedView style={styles.tokenContainer}>
                <ThemedText style={styles.tokenText} numberOfLines={2}>
                  {tokens.refresh_token}
                </ThemedText>
                <Pressable
                  style={styles.copyButton}
                  onPress={() =>
                    copyToClipboard(tokens.refresh_token!, 'Refresh Token')
                  }
                >
                  <Ionicons name="clipboard" size={20} color={colors.primary} />
                </Pressable>
              </ThemedView>
            </ThemedView>
            <Pressable
              style={styles.useButton}
              onPress={() => setUseInTeslaMate(true)}
            >
              <Ionicons
                name="car-sport"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <ThemedText style={styles.useButtonText}>
                {t('settings.tokens.ownerGenerator.useInTeslaMate')}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <ThemedText style={styles.closeButtonText}>
                {t('settings.tokens.ownerGenerator.closeButton')}
              </ThemedText>
            </Pressable>
          </>
        )}

        {tokens?.access_token && tokens?.refresh_token && (
          <TeslaMateConnectModal
            visible={useInTeslaMate}
            onClose={() => setUseInTeslaMate(false)}
            accessToken={tokens.access_token}
            refreshToken={tokens.refresh_token}
            region={region}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 32,
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      gap: 8,
    },
    headerIcon: {
      marginRight: 4,
    },
    title: {
      textAlign: 'center',
    },
    successHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    webview: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    tokenGroup: {
      marginBottom: 16,
    },
    tokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    tokenText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 12,
      opacity: 0.8,
      color: '#000000',
    },
    copyButton: {
      backgroundColor: colors.primary + '20',
      borderRadius: 8,
      padding: 8,
      minWidth: 40,
      alignItems: 'center',
    },
    label: {
      marginBottom: 8,
      fontWeight: '600',
    },
    useButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    useButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    closeButton: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 32,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    closeButtonText: {
      fontWeight: '500',
    },
  });
