import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Region } from '@/hooks/useRegion';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const OWNER_TOKEN_PATH = '/owner-token';

const MTM_OWNER_TOKEN_URL = 'https://app.myteslamate.com/owner-token';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface TeslaMateConnectModalProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string;
  refreshToken: string;
  region: Region;
}

export function TeslaMateConnectModal({
  visible,
  onClose,
  accessToken,
  refreshToken,
  region,
}: TeslaMateConnectModalProps) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const styles = createStyles(colors);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    if (visible) setIsSyncing(true);
  }, [visible]);

  // The flow loads:
  //  1. the inline data: HTML (auto-submits the form)
  //  2. POST /owner-token — server processes (can take up to ~45s)
  //  3. 302 redirect to the user's TeslaMate URL — final page
  // Keep the loader up until the WebView lands on a URL that's neither the
  // initial data: page nor the /owner-token endpoint itself.
  const handleNavStateChange = (state: { url?: string; loading?: boolean }) => {
    const url = state.url ?? '';
    const onFinalDestination =
      !!url &&
      !url.startsWith('about:') &&
      !url.startsWith('data:') &&
      !url.includes(OWNER_TOKEN_PATH);
    if (onFinalDestination && state.loading === false) {
      setIsSyncing(false);
    }
  };

  const html = `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#111;color:#fff">
    <p>${escapeHtml(t('settings.tokens.ownerGenerator.redirecting'))}</p>
    <form id="mtmForm" method="POST" action="${MTM_OWNER_TOKEN_URL}">
      <input type="hidden" name="access_token" value="${escapeHtml(accessToken)}" />
      <input type="hidden" name="refresh_token" value="${escapeHtml(refreshToken)}" />
      <input type="hidden" name="region" value="${escapeHtml(region)}" />
      <input type="hidden" name="token_type" value="owner" />
    </form>
    <script>document.getElementById('mtmForm').submit();</script>
  </body>
</html>`;

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
            name="car-sport"
            size={24}
            color={colors.primary}
            style={styles.headerIcon}
          />
          <ThemedText type="title" style={styles.title}>
            {t('settings.tokens.ownerGenerator.useModalTitle')}
          </ThemedText>
        </View>
        <View style={styles.webviewWrapper}>
          <WebView
            source={{ html }}
            originWhitelist={['*']}
            startInLoadingState
            onNavigationStateChange={handleNavStateChange}
            style={styles.webview}
          />
          {isSyncing && (
            <View
              pointerEvents="none"
              style={[
                styles.loaderOverlay,
                { backgroundColor: colors.background },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={styles.loaderText}>
                {t('settings.tokens.ownerGenerator.redirecting')}
              </ThemedText>
            </View>
          )}
        </View>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <ThemedText style={styles.closeButtonText}>
            {t('settings.tokens.ownerGenerator.closeButton')}
          </ThemedText>
        </Pressable>
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
    webviewWrapper: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    webview: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    loaderOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      borderRadius: 12,
    },
    loaderText: {
      textAlign: 'center',
      paddingHorizontal: 32,
      opacity: 0.85,
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
