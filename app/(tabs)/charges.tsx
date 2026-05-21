import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CarPicker } from '@/components/teslamate/CarPicker';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useTeslaMateCars } from '@/hooks/useTeslaMateCars';
import { formatCost, formatDate, formatDuration, formatKwh } from '@/lib/format';
import { listCharges, TeslaMateApiError, type TmCharge } from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChargesScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const { cars, selectedCarId, setSelectedCarId } = useTeslaMateCars();

  const [charges, setCharges] = useState<TmCharge[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!session || !selectedCarId) return;
      setLoading(true);
      try {
        const list = await listCharges(session, selectedCarId, nextPage);
        setCharges((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length > 0);
        setPage(nextPage);
      } catch (e) {
        if (e instanceof TeslaMateApiError && e.code === 'unauthorized') {
          setCharges([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [session, selectedCarId]
  );

  useEffect(() => {
    setCharges([]);
    setPage(1);
    setHasMore(true);
    load(1, false);
  }, [selectedCarId, load]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('charges.title')}</ThemedText>
      </View>

      <CarPicker
        cars={cars}
        selectedCarId={selectedCarId}
        onSelect={setSelectedCarId}
      />

      <FlatList
        data={charges}
        keyExtractor={(item) => String(item.charge_id)}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => {
          const costLabel = formatCost(item.cost, item.currency);
          return (
            <ThemedView style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.date}>
                  {formatDate(item.start_date, currentLanguage)}
                </ThemedText>
                <ThemedText style={styles.duration}>
                  {formatDuration(item.duration_min)}
                </ThemedText>
              </View>
              <View style={styles.metrics}>
                <Metric
                  icon="flash"
                  label={t('charges.energy')}
                  value={formatKwh(item.charge_energy_added)}
                />
                {costLabel && (
                  <Metric icon="card" label={t('charges.cost')} value={costLabel} />
                )}
              </View>
              {item.address && (
                <ThemedText style={styles.address} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={colors.textSecondary} />{' '}
                  {item.address}
                </ThemedText>
              )}
            </ThemedView>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.emptyCard}>
              <ThemedText style={styles.emptyText}>
                {t('charges.empty')}
              </ThemedText>
            </ThemedView>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : hasMore && charges.length > 0 ? (
            <Pressable
              style={[styles.loadMore, { borderColor: colors.borderColor }]}
              onPress={() => load(page + 1, true)}
            >
              <ThemedText style={styles.loadMoreLabel}>
                {t('charges.loadMore')}
              </ThemedText>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={metricStyles.metric}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <View>
        <ThemedText style={metricStyles.metricLabel}>{label}</ThemedText>
        <ThemedText style={metricStyles.metricValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontSize: 11, opacity: 0.6 },
  metricValue: { fontSize: 14, fontWeight: '600' },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    container: {
      padding: 16,
      gap: 10,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    date: { fontWeight: '600', fontSize: 14 },
    duration: { fontSize: 13, opacity: 0.7 },
    metrics: { flexDirection: 'row', gap: 24 },
    address: { fontSize: 12, opacity: 0.75 },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: { opacity: 0.7, textAlign: 'center' },
    footer: { paddingVertical: 16, alignItems: 'center' },
    loadMore: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    loadMoreLabel: { fontWeight: '500' },
  });
