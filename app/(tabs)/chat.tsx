import { SignedOutState } from '@/components/SignedOutState';
import { ThinkingScroller } from '@/components/teslamate/AssistantOutput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import {
  loadChatHistory,
  sendChatMessage,
  type ChatMessage,
  type ChatToolCall,
} from '@/lib/chatApi';
import { startChatStream, type ChatStreamHandle } from '@/lib/chatStream';
import { buildMarkdownStyles } from '@/lib/markdownStyles';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { session } = useTeslaMateApi();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const streamRef = useRef<ChatStreamHandle | null>(null);

  const styles = createStyles(colors);

  const refreshHistory = useCallback(
    async (convId?: number | null) => {
      if (!session?.token) return null;
      try {
        const data = await loadChatHistory(session.token, convId ?? conversationId);
        setMessages(data.messages);
        if (data.conversation_id) setConversationId(data.conversation_id);
        return data;
      } catch {
        return null;
      }
    },
    [session?.token, conversationId]
  );

  useEffect(() => {
    if (!session?.token) return;
    refreshHistory(conversationId);
    return () => {
      streamRef.current?.close();
      streamRef.current = null;
    };
    // Intentional: re-fetch history only when the session changes. Re-running on
    // `conversationId` would refetch on every selection and on `refreshHistory`
    // would loop since the callback's identity tracks `conversationId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  // Mutate the in-progress assistant message in place. Used by each stream
  // event handler.
  const patchMessage = useCallback(
    (id: number, patch: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) {
          // The placeholder isn't in our state yet (we haven't refreshed). Insert.
          return [
            ...prev,
            patch({
              id,
              role: 'assistant',
              content: '',
              tool_calls: null,
              usage: null,
              created_at: null,
            }),
          ];
        }
        const next = prev.slice();
        next[idx] = patch(next[idx]);
        return next;
      });
    },
    []
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !session?.token) return;

    setSending(true);
    setError(null);
    setInput('');

    try {
      const sent = await sendChatMessage(session.token, {
        conversationId,
        content: text,
      });
      setConversationId(sent.conversation_id);
      await refreshHistory(sent.conversation_id);

      const targetId = sent.assistant_message_id;

      streamRef.current?.close();
      streamRef.current = startChatStream({
        token: session.token,
        channel: sent.channel,
        onEvent: (ev) => {
          if ('message_id' in ev && ev.message_id !== targetId) return;

          switch (ev.kind) {
            case 'text_delta':
              patchMessage(targetId, (m) => ({ ...m, content: m.content + ev.text }));
              break;
            case 'reasoning_delta':
              patchMessage(targetId, (m) => ({
                ...m,
                reasoning: (m.reasoning ?? '') + ev.text,
              }));
              break;
            case 'tool_use_start':
              patchMessage(targetId, (m) => ({
                ...m,
                tool_calls: [
                  ...(m.tool_calls ?? []),
                  { index: ev.index, name: ev.name, server: ev.server_label },
                ],
              }));
              break;
            case 'tool_result':
              patchMessage(targetId, (m) => ({
                ...m,
                tool_calls: (m.tool_calls ?? []).map((c) =>
                  c.index === ev.index
                    ? { ...c, output: ev.output, status: ev.error ? 'error' : 'ok' }
                    : c
                ),
              }));
              break;
            case 'done':
              setSending(false);
              streamRef.current?.close();
              streamRef.current = null;
              if (ev.error) setError(ev.error);
              break;
            case 'error':
              setError(ev.message);
              setSending(false);
              streamRef.current?.close();
              streamRef.current = null;
              break;
          }
        },
        onError: (err) => {
          setError(err.message);
          setSending(false);
        },
      });
    } catch (e: any) {
      setError(e?.message ?? 'unknown');
      setSending(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('chat.title')}</ThemedText>
      </View>

      {!session ? (
        <SignedOutState />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {messages.length === 0 && !sending && (
              <ThemedView style={styles.placeholder}>
                <Ionicons name="chatbubbles" size={24} color={colors.primary} />
                <ThemedText style={styles.placeholderText}>
                  {t('chat.placeholder')}
                </ThemedText>
              </ThemedView>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} colors={colors} />
            ))}

            {sending && (
              <View style={styles.typingRow}>
                <ActivityIndicator color={colors.primary} />
                <ThemedText style={styles.typingText}>{t('chat.typing')}</ThemedText>
              </View>
            )}

            {error && (
              <ThemedView style={styles.errorCard}>
                <Ionicons name="alert-circle" size={18} color={colors.primary} />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </ThemedView>
            )}
          </ScrollView>

          <View style={[styles.composer, { borderTopColor: colors.borderColor }]}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.borderColor,
                },
              ]}
              value={input}
              onChangeText={setInput}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              editable={!sending}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
                (!input.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  colors,
}: {
  message: ChatMessage;
  colors: any;
}) {
  const isUser = message.role === 'user';
  const styles = createStyles(colors);
  const markdownStyles = useMemo(
    () => buildMarkdownStyles(colors, isUser),
    [colors, isUser]
  );
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.cardBackground },
        ]}
      >
        {!isUser && !!message.reasoning && (
          <ReasoningLine
            text={message.reasoning}
            colors={colors}
            contentStarted={!!message.content}
          />
        )}
        {message.content
          ? isUser
            ? (
              <ThemedText
                style={[styles.bubbleText, { color: '#fff' }]}
                selectable
              >
                {message.content}
              </ThemedText>
            )
            : (
              <Markdown style={markdownStyles}>{message.content}</Markdown>
            )
          : null}
        {message.tool_calls?.map((call, i) => (
          <ToolCallChip key={i} call={call} colors={colors} />
        ))}
      </View>
    </View>
  );
}

function ReasoningLine({
  text,
  colors,
  contentStarted,
}: {
  text: string;
  colors: any;
  contentStarted: boolean;
}) {
  // Expanded by default while reasoning, auto-collapses once the answer starts.
  // After the user taps, we stop touching the state.
  const [expanded, setExpanded] = useState(true);
  const userToggledRef = useRef(false);
  const autoCollapsedRef = useRef(false);
  useEffect(() => {
    if (contentStarted && !autoCollapsedRef.current && !userToggledRef.current) {
      autoCollapsedRef.current = true;
      setExpanded(false);
    }
  }, [contentStarted]);
  const cleaned = stripMarkdownInline(text);
  const scrollRef = useRef<ScrollView>(null);
  return (
    <View>
      <Pressable
        onPress={() => {
          userToggledRef.current = true;
          setExpanded((v) => !v);
        }}
        style={reasoningStyles.row}
        hitSlop={6}
      >
        <Ionicons name="bulb-outline" size={12} color={colors.textSecondary} />
        <ThemedText style={[reasoningStyles.label, { color: colors.textSecondary }]}>
          Thinking
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded && (
        <ThinkingScroller scrollRef={scrollRef} style={reasoningStyles.scroll}>
          <ThemedText style={[reasoningStyles.text, { color: colors.textSecondary }]}>
            {cleaned}
          </ThemedText>
        </ThinkingScroller>
      )}
    </View>
  );
}

function stripMarkdownInline(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const reasoningStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  scroll: { maxHeight: 220, marginTop: 4 },
  text: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    opacity: 0.85,
  },
});

function ToolCallChip({
  call,
  colors,
}: {
  call: ChatToolCall;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const styles = createStyles(colors);
  const name = call.name ?? 'tool';

  return (
    <Pressable
      style={[styles.toolChip, { borderColor: colors.borderColor }]}
      onPress={() => setOpen((v) => !v)}
    >
      <Ionicons name="build" size={12} color={colors.textSecondary} />
      <ThemedText style={styles.toolChipText}>{name}</ThemedText>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={12}
        color={colors.textSecondary}
      />
      {open && (
        <View style={styles.toolChipBody}>
          {call.input != null && (
            <ThemedText style={styles.toolChipCode} selectable>
              IN: {safeStringify(call.input)}
            </ThemedText>
          )}
          {call.output != null && (
            <ThemedText style={styles.toolChipCode} selectable>
              OUT: {safeStringify(call.output).slice(0, 400)}
            </ThemedText>
          )}
        </View>
      )}
    </Pressable>
  );
}

function safeStringify(v: unknown): string {
  try {
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    flex: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    scroll: { padding: 12, gap: 8 },
    placeholder: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 40,
      backgroundColor: 'transparent',
    },
    placeholderText: { opacity: 0.6, fontSize: 14, textAlign: 'center' },
    bubbleRow: { flexDirection: 'row' },
    bubbleRowLeft: { justifyContent: 'flex-start' },
    bubbleRowRight: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '85%',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 6,
    },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    toolChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
      flexWrap: 'wrap',
    },
    toolChipText: { fontSize: 11, opacity: 0.75 },
    toolChipBody: { width: '100%', marginTop: 4, gap: 4 },
    toolChipCode: { fontSize: 10, opacity: 0.7, fontFamily: 'Courier' },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 8,
      paddingVertical: 4,
    },
    typingText: { fontSize: 12, opacity: 0.6 },
    errorCard: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      padding: 10,
      borderRadius: 10,
    },
    errorText: { fontSize: 12, opacity: 0.85, flex: 1 },
    composer: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      alignItems: 'flex-end',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      maxHeight: 120,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.4 },
  });
