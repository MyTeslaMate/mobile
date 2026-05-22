import { ScrollTimeline } from '@/components/ScrollTimeline';
import { SignedOutState } from '@/components/SignedOutState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CarPicker } from '@/components/teslamate/CarPicker';
import { DateRangePickerButton } from '@/components/teslamate/DateRangePicker';
import { RecommendationsButton } from '@/components/teslamate/RecommendationsButton';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useSelectedCar } from '@/contexts/SelectedCarContext';
import { formatDate, formatDuration, formatKm } from '@/lib/format';
import { listDrives, TeslaMateApiError, type TmDrive } from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<TmDrive>);

export default function DrivesScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const { cars, selectedCarId, setSelectedCarId } = useSelectedCar();

  const [drives, setDrives] = useState<TmDrive[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { value: range } = useDateRange();

  const listRef = useRef<FlatList<TmDrive>>(null);
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
      setDrives(
        await listDrives(session, selectedCarId, {
          startDate: range.start?.toISOString(),
          endDate: range.end?.toISOString(),
        })
      );
    } catch (e) {
      setDrives([]);
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
    setDrives([]);
    load();
  }, [selectedCarId, load]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('drives.title')}</ThemedText>
        {session && (
          <View style={styles.headerActions}>
            <RecommendationsButton
              screen="drives"
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
              data={drives}
              keyExtractor={(item) => String((item as TmDrive).drive_id)}
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
              renderItem={({ item }) => {
                const drive = item as TmDrive;
                return (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/drives/[id]',
                        params: {
                          id: String(drive.drive_id),
                          carId: String(selectedCarId ?? ''),
                        },
                      })
                    }
                  >
                    <ThemedView style={styles.card}>
                      <View style={styles.cardHeader}>
                        <ThemedText style={styles.date}>
                          {formatDate(drive.start_date, currentLanguage)}
                        </ThemedText>
                        <ThemedText style={styles.duration}>
                          {formatDuration(drive.duration_min)}
                        </ThemedText>
                      </View>
                      <View style={styles.addresses}>
                        <ThemedText style={styles.address} numberOfLines={1}>
                          <Ionicons
                            name="ellipse-outline"
                            size={12}
                            color={colors.textSecondary}
                          />{' '}
                          {drive.start_address || '—'}
                        </ThemedText>
                        <ThemedText style={styles.address} numberOfLines={1}>
                          <Ionicons name="flag" size={12} color={colors.primary} />{' '}
                          {drive.end_address || '—'}
                        </ThemedText>
                      </View>
                      <View style={styles.metrics}>
                        <Metric
                          icon="speedometer"
                          label={t('drives.distance')}
                          value={formatKm(drive.odometer_details?.odometer_distance)}
                        />
                        {drive.consumption_net != null && (
                          <Metric
                            icon="leaf"
                            label={t('drives.consumption')}
                            value={`${Math.round(drive.consumption_net)} Wh/km`}
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
                        ? `${t('drives.empty')} (${error})`
                        : t('drives.empty')}
                    </ThemedText>
                    <ThemedText
                      style={[styles.emptyText, { fontSize: 11, marginTop: 6 }]}
                    >
                      cars: {cars.length} · selected: {String(selectedCarId)}
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
            {drives.length >= 10 && (
              <ScrollTimeline
                listRef={listRef}
                itemCount={drives.length}
                getDateAt={(i) => drives[i]?.start_date}
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
