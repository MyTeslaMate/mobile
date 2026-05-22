import { ThemedText } from '@/components/ThemedText';
import { useThemeColors } from '@/contexts/ThemeContext';
import { type ChatToolCall } from '@/lib/chatApi';
import { buildMarkdownStyles } from '@/lib/markdownStyles';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

interface Props {
  content: string;
  thinking: string;
  toolCalls: ChatToolCall[];
  loading: boolean;
  error: string | null;
  thinkingLabel: string;
  loadingLabel: string;
}

// Single source of truth for the assistant modal body. Both the deep-link
// `app/assistant.tsx` modal and the in-app RecommendationsButton sheet render
// through here.
export function AssistantOutput({
  content,
  thinking,
  toolCalls,
  loading,
  error,
  thinkingLabel,
  loadingLabel,
}: Props) {
  const colors = useThemeColors();
  const markdownStyles = useMemo(() => buildMarkdownStyles(colors, false), [colors]);

  return (
    <>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={18} color={colors.primary} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {!!thinking && (
        <ThinkingBlock
          text={thinking}
          label={thinkingLabel}
          colors={colors}
          contentStarted={!!content}
        />
      )}

      {toolCalls.length > 0 && (
        <View style={styles.toolList}>
          {toolCalls.map((call, i) => (
            <View key={`${call.name ?? 'tool'}-${i}`} style={styles.toolRow}>
              <Ionicons
                name={call.output != null ? 'checkmark-circle' : 'sync'}
                size={14}
                color={call.output != null ? colors.primary : colors.textSecondary}
              />
              <ThemedText style={styles.toolName} numberOfLines={1}>
                {humanizeToolName(call.name)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {!!content && <Markdown style={markdownStyles}>{content}</Markdown>}

      {loading && !content && !error && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <ThemedText style={styles.loadingText}>{loadingLabel}</ThemedText>
        </View>
      )}
    </>
  );
}

function ThinkingBlock({
  text,
  label,
  colors,
  contentStarted,
}: {
  text: string;
  label: string;
  colors: any;
  /** True once the assistant has started producing its final answer. */
  contentStarted: boolean;
}) {
  // Expanded while we're still reasoning so the user sees progress, then folds
  // automatically the moment the final answer starts streaming. Once the user
  // taps, they own the state — we stop auto-collapsing.
  const [expanded, setExpanded] = useState(true);
  const userToggledRef = useRef(false);
  const autoCollapsedRef = useRef(false);
  useEffect(() => {
    if (contentStarted && !autoCollapsedRef.current && !userToggledRef.current) {
      autoCollapsedRef.current = true;
      setExpanded(false);
    }
  }, [contentStarted]);
  const cleaned = stripMarkdown(text);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View
      style={[
        thinkStyles.block,
        { backgroundColor: colors.cardBackground, borderColor: colors.borderColor },
      ]}
    >
      <Pressable
        onPress={() => {
          userToggledRef.current = true;
          setExpanded((v) => !v);
        }}
        style={thinkStyles.header}
        hitSlop={6}
      >
        <Ionicons name="bulb-outline" size={14} color={colors.textSecondary} />
        <ThemedText style={[thinkStyles.label, { color: colors.textSecondary }]}>
          {label}
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded && (
        <ThinkingScroller scrollRef={scrollRef} style={thinkStyles.scroll}>
          <ThemedText style={[thinkStyles.body, { color: colors.textSecondary }]}>
            {cleaned}
          </ThemedText>
        </ThinkingScroller>
      )}
    </View>
  );
}

/**
 * ScrollView that auto-sticks to the bottom while streaming, but lets the
 * user scroll up to read past content without being yanked back. Re-enables
 * the auto-stick the moment they scroll back to the tail.
 */
export function ThinkingScroller({
  scrollRef,
  style,
  children,
}: {
  scrollRef: React.RefObject<ScrollView | null>;
  style: any;
  children: React.ReactNode;
}) {
  const stickRef = useRef(true);
  const STICK_THRESHOLD = 24;

  return (
    <ScrollView
      ref={scrollRef}
      style={style}
      onScroll={(e) => {
        const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
        const distance =
          contentSize.height - (contentOffset.y + layoutMeasurement.height);
        stickRef.current = distance < STICK_THRESHOLD;
      }}
      scrollEventThrottle={32}
      onContentSizeChange={() => {
        if (stickRef.current) scrollRef.current?.scrollToEnd({ animated: false });
      }}
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  );
}

function humanizeToolName(name: string | undefined): string {
  if (!name) return 'Tool';
  const cleaned = name.replace(/^teslamate_get_car_/, '').replace(/_/g, ' ');
  return `Reading ${cleaned}`;
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const styles = StyleSheet.create({
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  errorText: { flex: 1, fontSize: 13, opacity: 0.85 },
  toolList: { gap: 2, marginBottom: 8 },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  toolName: { fontSize: 12, opacity: 0.75, flex: 1 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 13, opacity: 0.7 },
});

const thinkStyles = StyleSheet.create({
  block: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: { maxHeight: 280 },
  body: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
