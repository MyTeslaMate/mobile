import { ChartCard } from '@/components/charts/ChartCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { rdp, strideDownsample } from '@/lib/downsample';
import { formatDate, formatDuration, formatKm } from '@/lib/format';
import { getDrive, type TmDriveDetail } from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriveDetailScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const params = useLocalSearchParams<{ id: string; carId?: string }>();

  const driveId = parseInt(params.id || '0', 10);
  const carId = parseInt(params.carId || '0', 10);

  const [drive, setDrive] = useState<TmDriveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !carId || !driveId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDrive(session, carId, driveId)
      .then((d) => {
        if (cancelled) return;
        setDrive(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? 'unknown');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, carId, driveId]);

  const route = useMemo(() => {
    const points = drive?.drive_details ?? [];
    const raw = points
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({ latitude: p.latitude as number, longitude: p.longitude as number }));
    return rdp(raw, 0.0001);
  }, [drive]);

  const chartSeries = useMemo(() => {
    const points = drive?.drive_details ?? [];
    if (points.length < 2) {
      return { battery: [], speed: [], power: [] };
    }
    const sampled = strideDownsample(points, 300);
    return {
      battery: sampled.map((d) => d.battery_level),
      speed: sampled.map((d) => d.speed),
      power: sampled.map((d) => d.power),
    };
  }, [drive]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: t('details.driveTitle') }} />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <ThemedView style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.primary} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}

      {!loading && !error && drive && (
        <ScrollView contentContainerStyle={styles.container}>
          {(() => {
            const driven = drive.odometer_details?.odometer_distance ?? null;
            const rangeDiff =
              drive.range_rated?.range_diff ??
              (drive.range_rated?.end_range != null &&
              drive.range_rated?.start_range != null
                ? drive.range_rated.end_range - drive.range_rated.start_range
                : null);
            const rangeUsed = rangeDiff != null ? Math.abs(rangeDiff) : null;
            const efficiency =
              rangeUsed != null && driven != null && driven > 0
                ? rangeUsed / driven
                : null;
            const efficiencyColor =
              efficiency == null
                ? colors.text
                : efficiency <= 1
                  ? '#4CAF50'
                  : efficiency <= 1.3
                    ? '#FFB74D'
                    : '#FF8A80';
            return (
              <View style={styles.heroRow}>
                {route.length > 0 && (
                  <ThemedView style={[styles.heroCard, styles.heroMap]}>
                    <View style={styles.mapWrap}>
                      <MapView
                        provider={PROVIDER_DEFAULT}
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={fitRegion(route)}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                      >
                        <Polyline
                          coordinates={route}
                          strokeColor={colors.primary}
                          strokeWidth={4}
                        />
                        <Marker coordinate={route[0]}>
                          <View style={[styles.pin, { backgroundColor: '#4CAF50' }]} />
                        </Marker>
                        <Marker coordinate={route[route.length - 1]}>
                          <View style={[styles.pin, { backgroundColor: colors.primary }]} />
                        </Marker>
                      </MapView>
                      <View style={styles.mapOverlay}>
                        <Ionicons name="navigate" size={14} color="#fff" />
                        <ThemedText style={styles.overlayValue}>
                          {formatKm(driven)}
                        </ThemedText>
                        <ThemedText style={styles.overlayMuted}>
                          · {drive.duration_str ?? formatDuration(drive.duration_min)}
                        </ThemedText>
                      </View>
                    </View>
                  </ThemedView>
                )}
                <ThemedView style={[styles.heroCard, styles.heroSide]}>
                  <SideMetric
                    icon="leaf"
                    label={t('details.consumption')}
                    value={
                      drive.consumption_net != null
                        ? `${Math.round(drive.consumption_net)} Wh/km`
                        : '—'
                    }
                    iconColor={colors.textSecondary}
                    valueColor={colors.text}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
                  <SideMetric
                    icon="speedometer-outline"
                    label={t('details.rangeUsed')}
                    value={rangeUsed != null ? `${rangeUsed.toFixed(1)} km` : '—'}
                    iconColor={colors.textSecondary}
                    valueColor={colors.text}
                  />
                  {efficiency != null && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
                      <SideMetric
                        icon={efficiency <= 1 ? 'trending-down' : 'trending-up'}
                        label={t('details.efficiency')}
                        value={`${efficiency.toFixed(2)}×`}
                        iconColor={efficiencyColor}
                        valueColor={efficiencyColor}
                      />
                    </>
                  )}
                </ThemedView>
              </View>
            );
          })()}

          <ThemedView style={styles.card}>
            <View style={styles.routeBlock}>
              <View style={styles.locRow}>
                <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                <ThemedText style={styles.addr} numberOfLines={1}>
                  {drive.start_address ?? '—'}
                </ThemedText>
              </View>
              <View style={styles.locRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <ThemedText style={styles.addr} numberOfLines={1}>
                  {drive.end_address ?? '—'}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.dateText}>
              {formatDate(drive.start_date, currentLanguage)}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={styles.grid}>
              {drive.speed_avg != null && (
                <Stat icon="speedometer" label={t('details.avgSpeed')} value={`${Math.round(drive.speed_avg)} km/h`} />
              )}
              {drive.speed_max != null && (
                <Stat icon="rocket" label={t('details.maxSpeed')} value={`${Math.round(drive.speed_max)} km/h`} />
              )}
              {drive.energy_consumed_net != null && (
                <Stat icon="flash" label={t('details.energy')} value={`${drive.energy_consumed_net.toFixed(1)} kWh`} />
              )}
              {drive.outside_temp_avg != null && (
                <Stat icon="thermometer-outline" label={t('details.outsideTemp')} value={`${drive.outside_temp_avg.toFixed(1)}°`} />
              )}
              {drive.inside_temp_avg != null && (
                <Stat icon="thermometer" label={t('details.insideTemp')} value={`${drive.inside_temp_avg.toFixed(1)}°`} />
              )}
              {drive.battery_details?.start_battery_level != null && (
                <Stat
                  icon="battery-half"
                  label={`${t('details.battery')} ${t('details.start')}`}
                  value={`${drive.battery_details.start_battery_level}%`}
                />
              )}
              {drive.battery_details?.end_battery_level != null && (
                <Stat
                  icon="battery-charging"
                  label={`${t('details.battery')} ${t('details.end')}`}
                  value={`${drive.battery_details.end_battery_level}%`}
                />
              )}
              {drive.range_rated?.start_range != null && (
                <Stat
                  icon="speedometer-outline"
                  label={`${t('details.range')} ${t('details.start')}`}
                  value={formatKm(drive.range_rated.start_range)}
                />
              )}
              {drive.range_rated?.end_range != null && (
                <Stat
                  icon="map-outline"
                  label={`${t('details.range')} ${t('details.end')}`}
                  value={formatKm(drive.range_rated.end_range)}
                />
              )}
            </View>
          </ThemedView>

          {chartSeries.battery.length >= 2 && (
            <>
              <ChartCard
                title={t('details.battery')}
                icon="battery-half"
                iconColor="#4CAF50"
                color="#4CAF50"
                data={chartSeries.battery}
                unit="%"
                yMin={0}
                yMax={100}
                height={80}
              />
              <ChartCard
                title={t('details.avgSpeed')}
                icon="speedometer"
                iconColor="#2196F3"
                color="#2196F3"
                data={chartSeries.speed}
                unit="km/h"
                height={80}
                secondaryData={chartSeries.power}
                secondaryColor="#FF9800"
                secondaryUnit="kW"
                secondaryLabel={t('details.power')}
              />
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({
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
    <View style={statStyles.stat}>
      <View style={[statStyles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={statStyles.label}>{label}</ThemedText>
        <ThemedText type="defaultSemiBold" style={statStyles.value}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function SideMetric({
  icon,
  label,
  value,
  iconColor,
  valueColor,
}: {
  icon: any;
  label: string;
  value: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <View style={sideStyles.row}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <View style={{ flex: 1 }}>
        <ThemedText style={sideStyles.label} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText
          type="defaultSemiBold"
          style={[sideStyles.value, { color: valueColor }]}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const sideStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 10, opacity: 0.65 },
  value: { fontSize: 14 },
});

function fitRegion(coords: { latitude: number; longitude: number }[]) {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.01),
  };
}

const statStyles = StyleSheet.create({
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '31%' },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, opacity: 0.65 },
  value: { fontSize: 13 },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 12, gap: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorCard: {
      margin: 16,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.cardBackground,
    },
    errorText: { flex: 1, opacity: 0.85 },
    heroRow: { flexDirection: 'row', gap: 8 },
    heroCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      overflow: 'hidden',
    },
    heroMap: { flex: 1.7 },
    heroSide: { flex: 1, padding: 10, justifyContent: 'space-around' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
    mapWrap: { height: 170, backgroundColor: colors.background },
    mapOverlay: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    overlayValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
    overlayMuted: { color: '#fff', fontSize: 12, opacity: 0.8 },
    pin: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: '#fff',
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 12,
      gap: 10,
    },
    routeBlock: { gap: 4 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    addr: { flex: 1, fontSize: 12 },
    dateText: { fontSize: 11, opacity: 0.65 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 6 },
  });
