import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CarPicker } from '@/components/teslamate/CarPicker';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useTeslaMateCars } from '@/hooks/useTeslaMateCars';
import { formatDate, formatDuration, formatKm } from '@/lib/format';
import { listDrives, TeslaMateApiError, type TmDrive } from '@/lib/teslaMateApi';
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

export default function DrivesScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const { cars, selectedCarId, setSelectedCarId } = useTeslaMateCars();

  const [drives, setDrives] = useState<TmDrive[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!session || !selectedCarId) return;
      setLoading(true);
      try {
        const list = await listDrives(session, selectedCarId, nextPage);
        setDrives((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length > 0);
        setPage(nextPage);
      } catch (e) {
        if (e instanceof TeslaMateApiError && e.code === 'unauthorized') {
          setDrives([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [session, selectedCarId]
  );

  useEffect(() => {
    setDrives([]);
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
        <ThemedText type="title">{t('drives.title')}</ThemedText>
      </View>

      <CarPicker
        cars={cars}
        selectedCarId={selectedCarId}
        onSelect={setSelectedCarId}
      />

      <FlatList
        data={drives}
        keyExtractor={(item) => String(item.drive_id)}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
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
                icon="speedometer"
                label={t('drives.distance')}
                value={formatKm(item.distance)}
              />
              {item.consumption != null && (
                <Metric
                  icon="leaf"
                  label={t('drives.consumption')}
                  value={`${Math.round(item.consumption)} Wh/km`}
                />
              )}
            </View>
            {(item.start_address || item.end_address) && (
              <View style={styles.addresses}>
                <ThemedText style={styles.address} numberOfLines={1}>
                  <Ionicons name="ellipse-outline" size={12} color={colors.textSecondary} />{' '}
                  {item.start_address ?? '—'}
                </ThemedText>
                <ThemedText style={styles.address} numberOfLines={1}>
                  <Ionicons name="flag" size={12} color={colors.primary} />{' '}
                  {item.end_address ?? '—'}
                </ThemedText>
              </View>
            )}
          </ThemedView>
        )}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.emptyCard}>
              <ThemedText style={styles.emptyText}>{t('drives.empty')}</ThemedText>
            </ThemedView>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : hasMore && drives.length > 0 ? (
            <Pressable
              style={[styles.loadMore, { borderColor: colors.borderColor }]}
              onPress={() => load(page + 1, true)}
            >
              <ThemedText style={styles.loadMoreLabel}>
                {t('drives.loadMore')}
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
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
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
    date: {
      fontWeight: '600',
      fontSize: 14,
    },
    duration: {
      fontSize: 13,
      opacity: 0.7,
    },
    metrics: {
      flexDirection: 'row',
      gap: 24,
    },
    addresses: {
      gap: 4,
    },
    address: {
      fontSize: 12,
      opacity: 0.75,
    },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: { opacity: 0.7, textAlign: 'center' },
    footer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    loadMore: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    loadMoreLabel: { fontWeight: '500' },
  });
