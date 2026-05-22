import { ScrollTimeline } from '@/components/ScrollTimeline';
import { SignedOutState } from '@/components/SignedOutState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CarPicker } from '@/components/teslamate/CarPicker';
import { DateRangePickerButton } from '@/components/teslamate/DateRangePicker';
import { RecommendationsButton } from '@/components/teslamate/RecommendationsButton';
import { useDateRange } from '@/contexts/DateRangeContext';
import { TopMapPanel, type MapMarker } from '@/components/teslamate/TopMapPanel';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useSelectedCar } from '@/contexts/SelectedCarContext';
import { formatCost, formatDate, formatDuration, formatKwh } from '@/lib/format';
import { listCharges, TeslaMateApiError, type TmCharge } from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<TmCharge>);

export default function ChargesScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const { cars, selectedCarId, setSelectedCarId } = useSelectedCar();

  const [charges, setCharges] = useState<TmCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { value: range } = useDateRange();

  const listRef = useRef<FlatList<TmCharge>>(null);
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const layoutHeight = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const load = useCallback(async (opts: { refresh?: boolean } = {}) => {
    if (!session || !selectedCarId) return;
    if (opts.refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setCharges(
        await listCharges(session, selectedCarId, {
          startDate: range.start?.toISOString(),
          endDate: range.end?.toISOString(),
        })
      );
    } catch (e) {
      setCharges([]);
      if (e instanceof TeslaMateApiError) {
        setError(`${e.code}${e.status ? ` (${e.status})` : ''}`);
      } else {
        setError('network');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, selectedCarId, range.start, range.end]);

  useEffect(() => {
    setCharges([]);
    load();
  }, [selectedCarId, load]);

  const markers = useMemo<MapMarker[]>(
    () =>
      charges
        .map((c, i) => ({ c, rank: i + 1 }))
        .filter(({ c }) => c.latitude != null && c.longitude != null)
        .map(({ c, rank }) => ({
          id: c.charge_id,
          latitude: c.latitude as number,
          longitude: c.longitude as number,
          type: 'charge' as const,
          label: rank,
        })),
    [charges]
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('charges.title')}</ThemedText>
        {session && (
          <View style={styles.headerActions}>
            <RecommendationsButton
              screen="charges"
              carId={selectedCarId}
              range={range}
            />
            <DateRangePickerButton />
          </View>
        )}
      </View>

      {!session ? (
        <SignedOutState />
      ) : (
        <>
          <CarPicker
            cars={cars}
            selectedCarId={selectedCarId}
            onSelect={setSelectedCarId}
          />

          <View style={styles.listWrapper}>
            <AnimatedFlatList
              ref={listRef as any}
              data={charges}
              keyExtractor={(item) => String((item as TmCharge).charge_id)}
              style={styles.list}
              contentContainerStyle={styles.container}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              onContentSizeChange={(_, h) => {
                contentHeight.value = h;
              }}
              onLayout={(e) => {
                layoutHeight.value = e.nativeEvent.layout.height;
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => load({ refresh: true })}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              ListHeaderComponent={
                markers.length > 0 ? (
                  <TopMapPanel
                    markers={markers}
                    onMarkerPress={(m) =>
                      router.push({
                        pathname: '/charges/[id]',
                        params: {
                          id: String(m.id),
                          carId: String(selectedCarId ?? ''),
                        },
                      })
                    }
                  />
                ) : null
              }
              renderItem={({ item, index }) => {
                const charge = item as TmCharge;
                const costLabel = formatCost(charge.cost, charge.currency);
                const rank = index + 1;
                return (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/charges/[id]',
                        params: {
                          id: String(charge.charge_id),
                          carId: String(selectedCarId ?? ''),
                        },
                      })
                    }
                  >
                    <ThemedView style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.dateRow}>
                          <View
                            style={[
                              styles.rankBadge,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <ThemedText style={styles.rankText}>{rank}</ThemedText>
                          </View>
                          <ThemedText style={styles.date}>
                            {formatDate(charge.start_date, currentLanguage)}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.duration}>
                          {formatDuration(charge.duration_min)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.address} numberOfLines={1}>
                        <Ionicons
                          name="location"
                          size={12}
                          color={colors.textSecondary}
                        />{' '}
                        {charge.address || '—'}
                      </ThemedText>
                      <View style={styles.metrics}>
                        <Metric
                          icon="flash"
                          label={t('charges.energy')}
                          value={formatKwh(charge.charge_energy_added)}
                        />
                        {costLabel && (
                          <Metric
                            icon="card"
                            label={t('charges.cost')}
                            value={costLabel}
                          />
                        )}
                      </View>
                    </ThemedView>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                !loading ? (
                  <ThemedView style={styles.emptyCard}>
                    <ThemedText style={styles.emptyText}>
                      {error
                        ? `${t('charges.empty')} (${error})`
                        : t('charges.empty')}
                    </ThemedText>
                  </ThemedView>
                ) : null
              }
              ListFooterComponent={
                loading ? (
                  <View style={styles.footer}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null
              }
            />
            {charges.length >= 10 && (
              <ScrollTimeline
                listRef={listRef}
                itemCount={charges.length}
                getDateAt={(i) => charges[i]?.start_date}
                scrollY={scrollY}
                contentHeight={contentHeight}
                layoutHeight={layoutHeight}
                locale={currentLanguage}
              />
            )}
          </View>
        </>
      )}
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    listWrapper: {
      flex: 1,
      position: 'relative',
    },
    list: { flex: 1 },
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
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    rankBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14 },
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
