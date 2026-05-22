import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

interface ChartCardProps {
  title: string;
  icon: any;
  iconColor?: string;
  data: (number | null | undefined)[];
  unit?: string;
  decimals?: number;
  color?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
  secondaryData?: (number | null | undefined)[];
  secondaryColor?: string;
  secondaryUnit?: string;
  secondaryLabel?: string;
  secondaryIcon?: any;
}

/**
 * Compact line chart used by the drive/charge detail screens. The input is a
 * plain `(number|null)[]` so callers don't have to know about gifted-charts
 * specific shapes. Null/undefined entries are dropped — they're TeslaMate's
 * sentinel for "no reading", not zero.
 */
export function ChartCard({
  title,
  icon,
  iconColor,
  data,
  unit = '',
  decimals = 0,
  color,
  yMin,
  yMax,
  height = 140,
  secondaryData,
  secondaryColor,
  secondaryUnit = '',
  secondaryLabel,
  secondaryIcon,
}: ChartCardProps) {
  const colors = useThemeColors();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32 - 28;

  const lineColor = color ?? colors.primary;
  const line2Color = secondaryColor ?? colors.primary;

  const points = useMemo(
    () =>
      data
        .map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
        .filter((v): v is number => v != null)
        .map((value) => ({ value })),
    [data]
  );

  const secondaryPoints = useMemo(() => {
    if (!secondaryData) return null;
    return secondaryData
      .map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
      .filter((v): v is number => v != null)
      .map((value) => ({ value }));
  }, [secondaryData]);

  if (points.length < 2) {
    return (
      <ThemedView style={styles.card}>
        <View style={styles.header}>
          <Ionicons name={icon} size={18} color={iconColor ?? lineColor} />
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {title}
          </ThemedText>
        </View>
        <ThemedText style={styles.empty}>—</ThemedText>
      </ThemedView>
    );
  }

  const values = points.map((p) => p.value);
  const max = yMax ?? Math.max(...values);
  const min = yMin ?? Math.min(...values);

  const hasSecondary = secondaryPoints && secondaryPoints.length >= 2;
  const sec2Values = hasSecondary ? secondaryPoints!.map((p) => p.value) : [];
  const sec2Max = hasSecondary ? Math.max(...sec2Values) : 0;
  const sec2Min = hasSecondary ? Math.min(...sec2Values) : 0;

  const axisMax = hasSecondary ? Math.max(max, sec2Max) : max;
  const axisMin = hasSecondary ? Math.min(min, sec2Min) : min;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={18} color={iconColor ?? lineColor} />
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {title}
          {secondaryLabel ? ` · ${secondaryLabel}` : ''}
        </ThemedText>
        <View style={styles.rangeGroup}>
          <ThemedText style={[styles.range, { color: lineColor }]}>
            {min.toFixed(decimals)}–{max.toFixed(decimals)}
            {unit ? ` ${unit}` : ''}
          </ThemedText>
          {hasSecondary && (
            <ThemedText style={[styles.range, { color: line2Color }]}>
              {sec2Min.toFixed(decimals)}–{sec2Max.toFixed(decimals)}
              {secondaryUnit ? ` ${secondaryUnit}` : ''}
            </ThemedText>
          )}
        </View>
      </View>
      <LineChart
        data={points}
        secondaryData={hasSecondary ? secondaryPoints! : undefined}
        width={chartWidth}
        height={height}
        thickness={2}
        color={lineColor}
        secondaryLineConfig={
          hasSecondary
            ? { color: line2Color, thickness: 2, hideDataPoints: true }
            : undefined
        }
        maxValue={axisMax}
        mostNegativeValue={axisMin < 0 ? axisMin : undefined}
        noOfSectionsBelowXAxis={axisMin < 0 ? 1 : undefined}
        hideDataPoints
        hideRules
        adjustToWidth
        yAxisColor="transparent"
        xAxisColor="transparent"
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        noOfSections={3}
        initialSpacing={4}
        endSpacing={4}
        backgroundColor="transparent"
        areaChart
        startFillColor={lineColor}
        endFillColor={lineColor}
        startOpacity={0.25}
        endOpacity={0.02}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: undefined,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, flex: 1 },
  rangeGroup: { alignItems: 'flex-end' },
  range: { fontSize: 11, opacity: 0.85 },
  empty: { textAlign: 'center', opacity: 0.5, paddingVertical: 24 },
});
