import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useDateRange, type DateRangeValue } from '@/contexts/DateRangeContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PresetId = 'all' | '7d' | '30d' | '90d' | 'year' | 'custom';

/**
 * Compact button shown in the top-right of the Drives / Charges headers.
 * Reads/writes the shared `useDateRange` so the filter persists across tabs.
 * Tap → bottom-sheet with the preset chips + a `custom` row that opens the
 * native date pickers.
 */
export function DateRangePickerButton() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { value, setValue } = useDateRange();
  const [open, setOpen] = useState(false);

  const activeId = useMemo<PresetId>(() => detectPreset(value), [value]);
  const label = compactLabel(activeId, value, t);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.button,
          { borderColor: colors.borderColor, backgroundColor: colors.cardBackground },
        ]}
      >
        <Ionicons name="calendar-outline" size={14} color={colors.primary} />
        <ThemedText style={styles.buttonLabel} numberOfLines={1}>
          {label}
        </ThemedText>
        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
      </Pressable>

      <PickerSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onApply={(v) => {
          setValue(v);
          setOpen(false);
        }}
      />
    </>
  );
}

function PickerSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: DateRangeValue;
  onClose: () => void;
  onApply: (v: DateRangeValue) => void;
}) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const [customOpen, setCustomOpen] = useState(false);
  const sheetStyles = createSheetStyles(colors);

  const activeId = useMemo<PresetId>(() => detectPreset(value), [value]);

  const presets: { id: PresetId; label: string }[] = [
    { id: 'all', label: t('dateRange.all') },
    { id: '7d', label: t('dateRange.7d') },
    { id: '30d', label: t('dateRange.30d') },
    { id: '90d', label: t('dateRange.90d') },
    { id: 'year', label: t('dateRange.year') },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[sheetStyles.sheet, { backgroundColor: colors.cardBackground }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={sheetStyles.handle} />
          <ThemedText type="defaultSemiBold" style={sheetStyles.title}>
            {t('dateRange.customTitle')}
          </ThemedText>

          {presets.map((p) => {
            const isActive = p.id === activeId;
            return (
              <Pressable
                key={p.id}
                style={[sheetStyles.row, isActive && { backgroundColor: colors.primary + '22' }]}
                onPress={() => onApply(presetRange(p.id))}
              >
                <ThemedText style={[sheetStyles.rowLabel, isActive && { color: colors.primary }]}>
                  {p.label}
                </ThemedText>
                {isActive && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            );
          })}

          <View style={[sheetStyles.divider, { backgroundColor: colors.borderColor }]} />

          <Pressable
            style={[sheetStyles.row, activeId === 'custom' && { backgroundColor: colors.primary + '22' }]}
            onPress={() => setCustomOpen(true)}
          >
            <ThemedText style={[sheetStyles.rowLabel, activeId === 'custom' && { color: colors.primary }]}>
              {t('dateRange.custom')}
              {activeId === 'custom' && value.start ? `  ·  ${formatRange(value)}` : ''}
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        </Pressable>
      </Pressable>

      <CustomRangeModal
        visible={customOpen}
        initialValue={value}
        onCancel={() => setCustomOpen(false)}
        onApply={(v) => {
          setCustomOpen(false);
          onApply(v);
        }}
      />
    </Modal>
  );
}

function CustomRangeModal({
  visible,
  initialValue,
  onCancel,
  onApply,
}: {
  visible: boolean;
  initialValue: DateRangeValue;
  onCancel: () => void;
  onApply: (v: DateRangeValue) => void;
}) {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const [start, setStart] = useState<Date>(
    initialValue.start ?? new Date(Date.now() - 30 * 86_400_000)
  );
  const [end, setEnd] = useState<Date>(initialValue.end ?? new Date());
  const modalStyles = createModalStyles(colors);

  const onStartChange = (_: DateTimePickerEvent, d?: Date) => {
    if (d) setStart(d);
  };
  const onEndChange = (_: DateTimePickerEvent, d?: Date) => {
    if (d) setEnd(d);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView
        style={[modalStyles.modal, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={modalStyles.modalHeader}>
          <Pressable onPress={onCancel} hitSlop={12}>
            <ThemedText style={[modalStyles.modalAction, { color: colors.primary }]}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={modalStyles.modalTitle}>
            {t('dateRange.customTitle')}
          </ThemedText>
          <Pressable
            onPress={() => onApply({ start: startOfDay(start), end: endOfDay(end) })}
            hitSlop={12}
          >
            <ThemedText style={[modalStyles.modalAction, { color: colors.primary }]}>
              {t('common.apply')}
            </ThemedText>
          </Pressable>
        </View>

        <View style={modalStyles.pickerWrap}>
          <ThemedView style={modalStyles.pickerCard}>
            <ThemedText type="defaultSemiBold" style={modalStyles.pickerLabel}>
              {t('dateRange.from')}
            </ThemedText>
            <DateTimePicker
              value={start}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onStartChange}
              maximumDate={end}
            />
          </ThemedView>

          <ThemedView style={modalStyles.pickerCard}>
            <ThemedText type="defaultSemiBold" style={modalStyles.pickerLabel}>
              {t('dateRange.to')}
            </ThemedText>
            <DateTimePicker
              value={end}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onEndChange}
              minimumDate={start}
              maximumDate={new Date()}
            />
          </ThemedView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function compactLabel(
  id: PresetId,
  value: DateRangeValue,
  t: (k: string) => string
): string {
  switch (id) {
    case 'all':
      return t('dateRange.all');
    case '7d':
      return t('dateRange.7d');
    case '30d':
      return t('dateRange.30d');
    case '90d':
      return t('dateRange.90d');
    case 'year':
      return t('dateRange.year');
    case 'custom':
      return value.start && value.end ? formatRange(value) : t('dateRange.custom');
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function presetRange(id: PresetId): DateRangeValue {
  if (id === 'all' || id === 'custom') return {};
  const end = endOfDay(new Date());
  const start = new Date(end);
  if (id === '7d') start.setDate(end.getDate() - 7);
  if (id === '30d') start.setDate(end.getDate() - 30);
  if (id === '90d') start.setDate(end.getDate() - 90);
  if (id === 'year') {
    start.setMonth(0, 1);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function detectPreset(value: DateRangeValue): PresetId {
  if (!value.start && !value.end) return 'all';
  for (const id of ['7d', '30d', '90d', 'year'] as const) {
    const candidate = presetRange(id);
    if (sameDay(candidate.start, value.start) && sameDay(candidate.end, value.end)) {
      return id;
    }
  }
  return 'custom';
}

function sameDay(a?: Date, b?: Date): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(v: DateRangeValue): string {
  if (!v.start || !v.end) return '';
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(v.start)}–${fmt(v.end)}`;
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
    maxWidth: 160,
  },
  buttonLabel: { fontSize: 12, fontWeight: '600' },
});

const createSheetStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
      gap: 4,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderColor,
      marginBottom: 8,
    },
    title: { fontSize: 15, marginBottom: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
    },
    rowLabel: { fontSize: 15 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  });

const createModalStyles = (colors: any) =>
  StyleSheet.create({
    modal: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderColor,
    },
    modalTitle: { fontSize: 17 },
    modalAction: { fontSize: 16, fontWeight: '600' },
    pickerWrap: { padding: 16, gap: 12 },
    pickerCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 12,
      gap: 6,
    },
    pickerLabel: { fontSize: 13, opacity: 0.7 },
  });
