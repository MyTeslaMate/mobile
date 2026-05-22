import { AssistantOutput } from '@/components/teslamate/AssistantOutput';
import { ThemedText } from '@/components/ThemedText';
import type { DateRangeValue } from '@/contexts/DateRangeContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { sendChatMessage, type ChatToolCall } from '@/lib/chatApi';
import { startChatStream, type ChatStreamHandle } from '@/lib/chatStream';
import {
  buildRecommendationsPrompt,
  type RecommendationsScreen,
} from '@/lib/recommendationsPrompt';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  screen: RecommendationsScreen;
  carId: number | null;
  range?: DateRangeValue;
};

const BUTTON_KEY: Record<RecommendationsScreen, string> = {
  now: 'recommendations.buttonNow',
  drives: 'recommendations.buttonDrives',
  charges: 'recommendations.buttonCharges',
};

const SUBTITLE_KEY: Record<RecommendationsScreen, string> = {
  now: 'recommendations.subtitleNow',
  drives: 'recommendations.subtitleDrives',
  charges: 'recommendations.subtitleCharges',
};

// Compact label suffix telling the user how big the analysis window will be.
// Falls back to "all" when no range is set (since the screens default to "all
// time" when both bounds are missing). Day counts get rounded into idiomatic
// buckets so the label stays short.
function formatRangeHint(range: DateRangeValue | undefined): string {
  if (!range || (!range.start && !range.end)) return 'all';
  const now = Date.now();
  const start = range.start?.getTime() ?? null;
  const end = range.end?.getTime() ?? now;
  if (start == null) return 'all';
  const days = Math.max(1, Math.round((end - start) / 86_400_000));
  if (days <= 1) return '1d';
  if (days <= 7) return `${days}d`;
  if (days <= 31) return `${days}d`;
  if (days <= 365) return `${Math.round(days / 30)}m`;
  return `${Math.round(days / 365)}y`;
}

export function RecommendationsButton({ screen, carId, range }: Props) {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [thinking, setThinking] = useState('');
  const [toolCalls, setToolCalls] = useState<ChatToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<ChatStreamHandle | null>(null);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
      streamRef.current?.close();
      streamRef.current = null;
    },
    []
  );

  const disabled = !session?.token || carId == null;

  const handleOpen = useCallback(async () => {
    if (disabled || !session?.token) return;

    setOpen(true);
    setLoading(true);
    setContent('');
    setThinking('');
    setToolCalls([]);
    setError(null);

    const prompt = buildRecommendationsPrompt(screen, carId, range, currentLanguage);

    try {
      const sent = await sendChatMessage(session.token, {
        conversationId: null,
        content: prompt,
      });
      if (!mounted.current) return;

      const targetId = sent.assistant_message_id;

      streamRef.current?.close();
      streamRef.current = startChatStream({
        token: session.token,
        channel: sent.channel,
        onEvent: (ev) => {
          if (!mounted.current) return;
          if ('message_id' in ev && ev.message_id !== targetId) return;

          switch (ev.kind) {
            case 'text_delta':
              setContent((prev) => prev + ev.text);
              break;
            case 'reasoning_delta':
              setThinking((prev) => prev + ev.text);
              break;
            case 'tool_use_start':
              setToolCalls((prev) => [
                ...prev,
                { index: ev.index, name: ev.name, server: ev.server_label },
              ]);
              break;
            case 'tool_result':
              setToolCalls((prev) =>
                prev.map((c) =>
                  c.index === ev.index
                    ? { ...c, output: ev.output, status: ev.error ? 'error' : 'ok' }
                    : c
                )
              );
              break;
            case 'done':
              setLoading(false);
              streamRef.current?.close();
              streamRef.current = null;
              if (ev.error) setError(ev.error);
              break;
            case 'error':
              setError(ev.message);
              setLoading(false);
              streamRef.current?.close();
              streamRef.current = null;
              break;
          }
        },
        onError: (err) => {
          if (!mounted.current) return;
          setError(err.message);
          setLoading(false);
        },
      });
    } catch (e: any) {
      if (mounted.current) {
        setError(e?.message ?? t('recommendations.error'));
        setLoading(false);
      }
    }
  }, [disabled, session?.token, screen, carId, range, currentLanguage, t]);

  const handleClose = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setOpen(false);
    setLoading(false);
  }, []);

  const sheetStyles = useMemo(() => createSheetStyles(colors), [colors]);

  return (
    <>
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        style={[
          styles.button,
          {
            borderColor: colors.borderColor,
            backgroundColor: colors.cardBackground,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <Ionicons name="sparkles" size={14} color={colors.primary} />
        <ThemedText style={styles.buttonLabel} numberOfLines={1}>
          {t(BUTTON_KEY[screen])}
          {screen !== 'now' && (
            <ThemedText
              style={[styles.buttonHint, { color: colors.textSecondary }]}
            >
              {` · ${formatRangeHint(range)}`}
            </ThemedText>
          )}
        </ThemedText>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView
          style={[sheetStyles.modal, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
        >
          <View style={sheetStyles.header}>
            <View style={sheetStyles.headerTitle}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <View style={sheetStyles.titleStack}>
                <ThemedText type="defaultSemiBold" style={sheetStyles.title}>
                  {t('recommendations.title')}
                </ThemedText>
                <ThemedText style={sheetStyles.subtitle}>
                  {t(SUBTITLE_KEY[screen])}
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <ThemedText style={[sheetStyles.action, { color: colors.primary }]}>
                {t('common.close')}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={sheetStyles.body}>
            <AssistantOutput
              content={content}
              thinking={thinking}
              toolCalls={toolCalls}
              loading={loading}
              error={error}
              thinkingLabel="Thinking"
              loadingLabel={t('recommendations.thinking')}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  buttonLabel: { fontSize: 12, fontWeight: '600' },
  buttonHint: { fontSize: 11, fontWeight: '500' },
});

const createSheetStyles = (colors: any) =>
  StyleSheet.create({
    modal: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    titleStack: { flex: 1 },
    title: { fontSize: 17 },
    subtitle: { fontSize: 12, opacity: 0.65, marginTop: 1 },
    action: { fontSize: 16, fontWeight: '600' },
    body: { padding: 16, gap: 12 },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    loadingText: { fontSize: 13, opacity: 0.7 },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
    },
    errorText: { flex: 1, fontSize: 13, opacity: 0.85 },
  });
