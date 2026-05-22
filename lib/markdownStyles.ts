import { StyleSheet } from 'react-native';

export function buildMarkdownStyles(colors: any, isUser: boolean) {
  const textColor = isUser ? '#fff' : colors.text;
  const mutedColor = isUser ? 'rgba(255,255,255,0.85)' : colors.textSecondary;
  const codeBg = isUser ? 'rgba(255,255,255,0.18)' : colors.background;
  const borderColor = isUser ? 'rgba(255,255,255,0.3)' : colors.borderColor;
  return {
    body: { color: textColor, fontSize: 14, lineHeight: 20 },
    paragraph: { color: textColor, marginTop: 0, marginBottom: 6 },
    heading1: { color: textColor, fontSize: 18, fontWeight: '700', marginVertical: 6 },
    heading2: { color: textColor, fontSize: 16, fontWeight: '700', marginVertical: 6 },
    heading3: { color: textColor, fontSize: 15, fontWeight: '600', marginVertical: 4 },
    strong: { color: textColor, fontWeight: '700' },
    em: { color: textColor, fontStyle: 'italic' },
    link: { color: isUser ? '#fff' : colors.primary, textDecorationLine: 'underline' },
    blockquote: {
      backgroundColor: codeBg,
      borderLeftColor: borderColor,
      borderLeftWidth: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginVertical: 4,
    },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { color: textColor },
    code_inline: {
      backgroundColor: codeBg,
      color: textColor,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      fontFamily: 'Courier',
      fontSize: 13,
    },
    code_block: {
      backgroundColor: codeBg,
      color: textColor,
      borderRadius: 8,
      padding: 8,
      fontFamily: 'Courier',
      fontSize: 12,
      marginVertical: 4,
    },
    fence: {
      backgroundColor: codeBg,
      color: textColor,
      borderRadius: 8,
      padding: 8,
      fontFamily: 'Courier',
      fontSize: 12,
      marginVertical: 4,
    },
    hr: { backgroundColor: borderColor, height: StyleSheet.hairlineWidth, marginVertical: 6 },
    table: { borderColor, borderWidth: StyleSheet.hairlineWidth, borderRadius: 4 },
    th: { color: textColor, padding: 4, fontWeight: '600' },
    td: { color: textColor, padding: 4 },
    text: { color: textColor },
    s: { color: mutedColor, textDecorationLine: 'line-through' },
  } as const;
}
