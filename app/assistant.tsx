import { AssistantOutput } from '@/components/teslamate/AssistantOutput';
import { ThemedText } from '@/components/ThemedText';
import { type DateRangeValue } from '@/contexts/DateRangeContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useSelectedCar } from '@/contexts/SelectedCarContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { sendChatMessage, type ChatToolCall } from '@/lib/chatApi';
import { startChatStream, type ChatStreamHandle } from '@/lib/chatStream';
import {
  buildRecommendationsPrompt,
  type RecommendationsScreen,
} from '@/lib/recommendationsPrompt';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VALID_SCREENS: RecommendationsScreen[] = ['now', 'drives', 'charges'];

const SUBTITLE_KEY: Record<RecommendationsScreen, string> = {
  now: 'recommendations.subtitleNow',
  drives: 'recommendations.subtitleDrives',
  charges: 'recommendations.subtitleCharges',
};

// Deep link: mtm://assistant?screen=<now|drives|charges>&start=<ISO>&end=<ISO>&carId=<id>
// start/end fall back to the last 30 days when both are absent.
// carId falls back to the currently selected car.
export default function AssistantScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const { selectedCarId } = useSelectedCar();
  const params = useLocalSearchParams<{
    screen?: string;
    start?: string;
    end?: string;
    carId?: string;
  }>();

  const [content, setContent] = useState('');
  const [thinking, setThinking] = useState('');
  const [toolCalls, setToolCalls] = useState<ChatToolCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<ChatStreamHandle | null>(null);
  const mounted = useRef(true);
  const startedRef = useRef(false);

  useEffect(
    () => () => {
      mounted.current = false;
      streamRef.current?.close();
      streamRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (startedRef.current) return;
    if (!session?.token) {
      // No active session — surface a clear message instead of spinning forever.
      setError(t('signedOut.title'));
      setLoading(false);
      return;
    }

    const screenParam = params.screen;
    if (
      typeof screenParam !== 'string' ||
      !VALID_SCREENS.includes(screenParam as RecommendationsScreen)
    ) {
      setError(t('recommendations.error'));
      setLoading(false);
      return;
    }

    const carIdParam =
      typeof params.carId === 'string' ? parseInt(params.carId, 10) : NaN;
    const resolvedCarId = Number.isFinite(carIdParam) ? carIdParam : selectedCarId;
    if (resolvedCarId == null) return;

    const range = parseRangeOrLast30Days(
      typeof params.start === 'string' ? params.start : undefined,
      typeof params.end === 'string' ? params.end : undefined
    );

    startedRef.current = true;

    const prompt = buildRecommendationsPrompt(
      screenParam as RecommendationsScreen,
      resolvedCarId,
      range,
      currentLanguage
    );

    (async () => {
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
            // Filter on the message we just sent — other turns on the same
            // user channel must not bleed into this modal.
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
    })();
  }, [
    params.screen,
    params.start,
    params.end,
    params.carId,
    session?.token,
    selectedCarId,
    currentLanguage,
    t,
  ]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleClose = () => {
    streamRef.current?.close();
    streamRef.current = null;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView
      style={[styles.modal, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <View style={styles.titleStack}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {t('recommendations.title')}
            </ThemedText>
            {VALID_SCREENS.includes(params.screen as RecommendationsScreen) && (
              <ThemedText style={styles.subtitle}>
                {t(SUBTITLE_KEY[params.screen as RecommendationsScreen])}
              </ThemedText>
            )}
          </View>
        </View>
        <Pressable onPress={handleClose} hitSlop={12}>
          <ThemedText style={[styles.action, { color: colors.primary }]}>
            {t('common.close')}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
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
  );
}

function parseRangeOrLast30Days(
  startISO: string | undefined,
  endISO: string | undefined
): DateRangeValue {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (start || end) return { start, end };

  const fallbackEnd = new Date();
  const fallbackStart = new Date();
  fallbackStart.setDate(fallbackStart.getDate() - 30);
  return { start: fallbackStart, end: fallbackEnd };
}

function parseISO(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const createStyles = (colors: any) =>
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
  });
