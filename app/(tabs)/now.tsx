import { SignedOutState } from '@/components/SignedOutState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CarPicker } from '@/components/teslamate/CarPicker';
import { RecommendationsButton } from '@/components/teslamate/RecommendationsButton';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useSelectedCar } from '@/contexts/SelectedCarContext';
import { formatCarName } from '@/lib/format';
import {
  getCarBatteryHealth,
  getCarStatus,
  TeslaMateApiError,
  type TmBatteryHealth,
  type TmCar,
  type TmCarStatus,
} from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const POLL_INTERVAL_MS = 30_000;

export default function NowScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const {
    cars,
    selectedCarId,
    setSelectedCarId,
    isLoading: carsLoading,
    refresh: refreshCars,
  } = useSelectedCar();

  const [status, setStatus] = useState<TmCarStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [batteryHealth, setBatteryHealth] = useState<TmBatteryHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!session || !selectedCarId) return;
    setStatusError(null);
    try {
      const [nextStatus, healthRes] = await Promise.all([
        getCarStatus(session, selectedCarId),
        getCarBatteryHealth(session, selectedCarId).catch(() => null),
      ]);
      setStatus(nextStatus);
      setBatteryHealth(healthRes?.battery_health ?? null);
    } catch (e) {
      setStatus(null);
      setBatteryHealth(null);
      setStatusError(e instanceof TeslaMateApiError ? e.code : 'network');
    }
  }, [session, selectedCarId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Soft refresh every 30s while the tab is mounted. Cheap (one GET) and the
  // user expects "Now" to be live.
  useEffect(() => {
    if (!session || !selectedCarId) return;
    const id = setInterval(loadStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session, selectedCarId, loadStatus]);

  // Only true during a real pull-to-refresh gesture — background polling
  // (the 30 s interval and tab focus refetches) must NOT trigger the native
  // RefreshControl spinner, which would otherwise hover at the top of the
  // scroll content even though the user didn't pull.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshCars();
      await loadStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const car = useMemo(
    () => cars.find((c) => c.car_id === selectedCarId) ?? null,
    [cars, selectedCarId]
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('now.title')}</ThemedText>
        {session && (
          <RecommendationsButton screen="now" carId={selectedCarId} />
        )}
      </View>

      {!session && <SignedOutState />}

      {session && (
        <>
          <CarPicker
            cars={cars}
            selectedCarId={selectedCarId}
            onSelect={setSelectedCarId}
          />

          <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {!carsLoading && cars.length === 0 && (
              <ThemedView style={styles.emptyCard}>
                <ThemedText style={styles.emptyText}>
                  {t('now.noVehicles')}
                </ThemedText>
              </ThemedView>
            )}

            {statusError && (
              <ThemedView style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={colors.primary} />
                <ThemedText style={styles.errorText}>
                  {t('now.noData')} ({statusError})
                </ThemedText>
              </ThemedView>
            )}

            {status && (
              <CarNowCard
                car={car}
                status={status}
                batteryHealth={batteryHealth}
                colors={colors}
                t={t}
                locale={currentLanguage}
              />
            )}

            {!status && !statusError && !carsLoading && cars.length > 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function CarNowCard({
  car,
  status,
  batteryHealth,
  colors,
  t,
  locale,
}: {
  car: TmCar | null;
  status: TmCarStatus;
  batteryHealth: TmBatteryHealth | null;
  colors: any;
  t: (k: string, p?: Record<string, string | number>) => string;
  locale: string;
}) {
  const styles = createStyles(colors);

  const lat = status.car_geodata?.latitude ?? null;
  const lng = status.car_geodata?.longitude ?? null;
  const hasCoords = lat != null && lng != null;

  const title = formatCarName({
    name: car?.name,
    car_id: car?.car_id ?? status.car_id,
    display_name: status.display_name,
    car_details: car?.car_details ?? status.car_details,
  });

  const range =
    status.battery_details?.rated_battery_range ??
    status.battery_details?.est_battery_range_km ??
    status.battery_details?.est_battery_range ??
    null;

  const soc =
    status.battery_details?.usable_battery_level ??
    status.battery_details?.battery_level ??
    null;

  const odometer = status.car_details?.odometer ?? status.odometer ?? null;
  const version = status.car_versions?.version ?? status.car_details?.car_version ?? null;
  const updateAvailable = status.car_versions?.update_available ?? false;
  const updateVersion = status.car_versions?.update_version ?? null;

  const isCharging = status.charging_details?.charging_state === 'Charging';
  const timeToFull = status.charging_details?.time_to_full_charge ?? null;
  const chargeEnd =
    isCharging && timeToFull != null && timeToFull > 0
      ? formatChargeEnd(timeToFull, locale)
      : null;

  const tpms = status.tpms_details ?? null;
  const tireUnit = status.units?.unit_of_pressure ?? 'bar';
  const tireFront = tpms
    ? formatTirePair(tpms.tpms_pressure_fl, tpms.tpms_pressure_fr, tireUnit)
    : null;
  const tireRear = tpms
    ? formatTirePair(tpms.tpms_pressure_rl, tpms.tpms_pressure_rr, tireUnit)
    : null;
  const frontWarning = !!(
    tpms?.tpms_soft_warning_fl || tpms?.tpms_soft_warning_fr
  );
  const rearWarning = !!(
    tpms?.tpms_soft_warning_rl || tpms?.tpms_soft_warning_rr
  );

  const insideTemp = status.climate_details?.inside_temp ?? null;
  const outsideTemp = status.climate_details?.outside_temp ?? null;
  const temperatures =
    insideTemp != null || outsideTemp != null
      ? `${insideTemp != null ? `${insideTemp.toFixed(1)}°` : '—'} / ${
          outsideTemp != null ? `${outsideTemp.toFixed(1)}°` : '—'
        }`
      : null;

  return (
    <ThemedView style={styles.card}>
      {hasCoords ? (
        <View style={styles.mapWrap}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFillObject}
            region={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }}>
              <View style={styles.carPin}>
                <Ionicons name="car-sport" size={18} color="#fff" />
              </View>
            </Marker>
          </MapView>
        </View>
      ) : (
        <View style={[styles.mapWrap, styles.mapPlaceholder]}>
          <Ionicons name="location-outline" size={28} color={colors.textSecondary} />
          <ThemedText style={styles.mapPlaceholderText}>
            {t('now.locationUnknown')}
          </ThemedText>
        </View>
      )}

      <View style={styles.titleRow}>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        {odometer != null && (
          <ThemedText style={styles.titleMileage} numberOfLines={1}>
            {`${Math.round(odometer).toLocaleString(locale)} km`}
          </ThemedText>
        )}
      </View>
      <View style={styles.badgeRow}>
          {status.charging_details?.charging_state === 'Charging' && (
            <StatusBadge
              icon="flash"
              label={t('now.badge.charging')}
              color={colors.primary}
              colors={colors}
            />
          )}
          {status.car_status?.sentry_mode && (
            <StatusBadge
              icon="shield-checkmark"
              label={t('now.badge.sentry')}
              color={colors.primary}
              colors={colors}
            />
          )}
          {status.car_status?.locked === true && (
            <StatusBadge
              icon="lock-closed"
              label={t('now.badge.locked')}
              color={colors.textSecondary}
              colors={colors}
            />
          )}
          {status.car_status?.locked === false && (
            <StatusBadge
              icon="lock-open"
              label={t('now.badge.unlocked')}
              color={colors.primary}
              colors={colors}
            />
          )}
      </View>

      <InfoRow label={t('now.status')} value={formatStatus(status, t, locale)} />
      {chargeEnd && (
        <InfoRow
          label={t('now.endOfCharge')}
          value={chargeEnd}
          valueColor={colors.primary}
        />
      )}
      {range != null && (
        <InfoRow
          label={t('now.range')}
          value={`${range.toFixed(2)} km`}
        />
      )}
      {soc != null && <InfoRow label={t('now.soc')} value={`${soc}%`} />}
      {version && (
        <InfoRow
          label={t('now.version')}
          value={updateAvailable && updateVersion ? `${version} → ${updateVersion}` : version}
          valueColor={updateAvailable ? colors.primary : undefined}
        />
      )}
      {status.car_geodata?.geofence ? (
        <InfoRow label={t('now.location')} value={status.car_geodata.geofence} />
      ) : null}
      {temperatures && (
        <InfoRow label={t('now.temperatures')} value={temperatures} />
      )}
      {tireFront && (
        <InfoRow
          label={t('now.tireFront')}
          value={`↖ ${tireFront.l}  ↗ ${tireFront.r} ${tireFront.unit}`}
          valueColor={frontWarning ? '#ff3b30' : undefined}
        />
      )}
      {tireRear && (
        <InfoRow
          label={t('now.tireRear')}
          value={`↙ ${tireRear.l}  ↘ ${tireRear.r} ${tireRear.unit}`}
          valueColor={rearWarning ? '#ff3b30' : undefined}
        />
      )}

      {batteryHealth && <BatteryHealthSection health={batteryHealth} colors={colors} t={t} locale={locale} />}
    </ThemedView>
  );
}

function BatteryHealthSection({
  health,
  colors,
  t,
  locale,
}: {
  health: TmBatteryHealth;
  colors: any;
  t: (k: string, p?: Record<string, string | number>) => string;
  locale: string;
}) {
  const soh = health.battery_health_percentage;
  const curCap = health.current_capacity;
  const maxCap = health.max_capacity;
  const curRange = health.current_range;
  const maxRange = health.max_range;
  const eff = health.rated_efficiency;

  if (
    soh == null &&
    curCap == null &&
    maxCap == null &&
    curRange == null &&
    maxRange == null &&
    eff == null
  ) {
    return null;
  }

  const sohColor =
    soh == null
      ? colors.primary
      : soh >= 95
        ? '#34c759'
        : soh >= 90
          ? '#ff9500'
          : '#ff3b30';

  const capLost = curCap != null && maxCap != null ? maxCap - curCap : null;
  const rangeLost =
    curRange != null && maxRange != null ? maxRange - curRange : null;

  return (
    <View style={bhStyles.section}>
      <ThemedText type="defaultSemiBold" style={bhStyles.sectionTitle}>
        {t('now.batteryHealthTitle')}
      </ThemedText>

      <View style={bhStyles.gaugeRow}>
        <SohGauge value={soh} color={sohColor} trackColor={colors.borderColor ?? 'rgba(127,127,127,0.2)'} />
        <View style={bhStyles.gaugeMeta}>
          {capLost != null && (
            <MetricRow
              label={t('now.capacityLost')}
              value={`−${capLost.toFixed(1)} kWh`}
              hint={
                maxCap != null
                  ? t('now.outOf', { value: `${maxCap.toFixed(1)} kWh` })
                  : undefined
              }
              colors={colors}
            />
          )}
          {rangeLost != null && (
            <MetricRow
              label={t('now.rangeLost')}
              value={`−${Math.round(rangeLost).toLocaleString(locale)} km`}
              hint={
                maxRange != null
                  ? t('now.outOf', {
                      value: `${Math.round(maxRange).toLocaleString(locale)} km`,
                    })
                  : undefined
              }
              colors={colors}
            />
          )}
          {eff != null && (
            <MetricRow
              label={t('now.ratedEfficiency')}
              value={`${eff.toFixed(1)} kWh/100km`}
              colors={colors}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function SohGauge({
  value,
  color,
  trackColor,
}: {
  value: number | null | undefined;
  color: string;
  trackColor: string;
}) {
  const size = 116;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circumference;

  return (
    <View style={[bhStyles.gaugeWrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </Svg>
      <View style={bhStyles.gaugeCenter} pointerEvents="none">
        <ThemedText style={[bhStyles.gaugeValue, { color }]}>
          {value != null ? `${value.toFixed(1)}%` : '—'}
        </ThemedText>
        <ThemedText style={bhStyles.gaugeLabel}>SoH</ThemedText>
      </View>
    </View>
  );
}

function MetricRow({
  label,
  value,
  hint,
  colors,
}: {
  label: string;
  value: string;
  hint?: string;
  colors: any;
}) {
  return (
    <View style={bhStyles.metric}>
      <ThemedText style={bhStyles.metricLabel}>{label}</ThemedText>
      <View style={bhStyles.metricValueWrap}>
        <ThemedText style={bhStyles.metricValue}>{value}</ThemedText>
        {hint && (
          <ThemedText style={[bhStyles.metricHint, { color: colors.textSecondary }]}>
            {hint}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const bhStyles = StyleSheet.create({
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.2)',
  },
  sectionTitle: { fontSize: 14, marginBottom: 12 },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gaugeWrap: { alignItems: 'center', justifyContent: 'center' },
  gaugeCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: { fontSize: 22, fontWeight: '700' },
  gaugeLabel: { fontSize: 11, opacity: 0.55, marginTop: 2 },
  gaugeMeta: { flex: 1, gap: 8 },
  metric: { flexDirection: 'row', alignItems: 'center' },
  metricLabel: { fontSize: 13, opacity: 0.7, flex: 1 },
  metricValueWrap: { alignItems: 'flex-end' },
  metricValue: { fontSize: 14, fontWeight: '600' },
  metricHint: { fontSize: 11, marginTop: 1 },
});

function StatusBadge({
  icon,
  label,
  color,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  colors: any;
}) {
  return (
    <View
      style={[
        badgeStyles.badge,
        {
          backgroundColor: colors.background,
          borderColor: 'rgba(127,127,127,0.25)',
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={color} />
      <ThemedText style={[badgeStyles.label, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 12, fontWeight: '600' },
});

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={rowStyles.row}>
      <ThemedText style={rowStyles.label}>{label}</ThemedText>
      <ThemedText
        style={[rowStyles.value, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function formatStatus(
  status: TmCarStatus,
  t: (k: string, p?: Record<string, string | number>) => string,
  locale: string
): string {
  const state = status.state ?? '—';
  const since = status.state_since
    ? formatRelative(status.state_since, locale)
    : null;
  const knownStates = ['online', 'offline', 'asleep', 'charging', 'driving'];
  const stateLabel = knownStates.includes(state)
    ? t(`now.state.${state}`)
    : state;
  return since ? `${stateLabel} · ${since}` : stateLabel;
}

function formatTirePair(
  left: number | null | undefined,
  right: number | null | undefined,
  unit: string
): { l: string; r: string; unit: string } | null {
  // Tesla reports 0 when the data has never been read (e.g. asleep car).
  const hasLeft = left != null && left !== 0;
  const hasRight = right != null && right !== 0;
  if (!hasLeft && !hasRight) return null;
  return {
    l: hasLeft ? left!.toFixed(2) : '—',
    r: hasRight ? right!.toFixed(2) : '—',
    unit,
  };
}

function formatChargeEnd(hoursToFull: number, locale: string): string {
  const end = new Date(Date.now() + hoursToFull * 3600 * 1000);
  const time = end.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const totalMin = Math.max(1, Math.round(hoursToFull * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const dur = h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}m`;
  return `${time} · ${dur}`;
}

function formatRelative(iso: string, locale: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.2)',
  },
  label: { fontSize: 14, fontWeight: '500', flex: 1, opacity: 0.7 },
  value: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    container: { padding: 16, gap: 16 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingBottom: 12,
      overflow: 'hidden',
    },
    mapWrap: {
      height: 200,
      marginHorizontal: -16,
      marginTop: -16,
      marginBottom: 12,
      backgroundColor: colors.background,
    },
    mapPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    mapPlaceholderText: { opacity: 0.6, fontSize: 12 },
    carPin: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      paddingTop: 4,
      paddingBottom: 6,
    },
    title: { fontSize: 18, flex: 1 },
    titleMileage: {
      fontSize: 14,
      fontWeight: '500',
      opacity: 0.7,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingBottom: 8,
    },
    emptyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: { opacity: 0.7, textAlign: 'center' },
    errorCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    errorText: { flex: 1, fontSize: 14, opacity: 0.8 },
    loadingContainer: { padding: 32, alignItems: 'center' },
  });
